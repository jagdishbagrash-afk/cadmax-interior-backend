const crypto = require("crypto");
const Payment = require("../Model/Payment");
const Order = require("../Model/Order");
const Razorpay = require("razorpay");
const catchAsync = require("../Utill/catchAsync");
const { createDhlShipment } = require("../Utill/createDhlShipment");
const {
  createBlueDartWaybill,
  resolveBlueDartShipFrom,
} = require("../Utill/blueDartService");
const { ensureOrderShippingAddress, toCourierAddress } = require("../Utill/orderAddress");
require("dotenv").config();

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const getShipmentTrackingNumber = (shipmentResponse = {}) =>
  shipmentResponse?.shipmentTrackingNumber ||
  shipmentResponse?.trackingNumber ||
  shipmentResponse?.awbNumber ||
  shipmentResponse?.AWBNo ||
  shipmentResponse?.awbNo ||
  shipmentResponse?.packages?.[0]?.trackingNumber ||
  shipmentResponse?.pieces?.[0]?.trackingNumber ||
  null;

const normalizeShippingProvider = (value) => {
  if (!value) {
    return null;
  }

  const normalized = String(value).trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (normalized === "BLUEDART" || normalized === "BLUE_DART") {
    return "BLUE_DART";
  }
  if (normalized === "DHL") {
    return "DHL";
  }

  return null;
};

const resolveDefaultShippingProvider = (value) =>
  normalizeShippingProvider(value) ||
  normalizeShippingProvider(process.env.DEFAULT_SHIPPING_PROVIDER) ||
  "DHL";

const ensureOrderShipFrom = (order) => {
  const shouldReuseSavedShipFrom =
    order?.shipping_status === "shipment_created" && String(order?.tracking_number || "").trim() !== "";
  const shipFrom = resolveBlueDartShipFrom(
    shouldReuseSavedShipFrom ? order?.labelData?.shipFrom : null
  );
  order.labelData = {
    ...(order.labelData || {}),
    shipFrom,
  };

  return shipFrom;
};

const appendTimelineEvent = (order, event) => {
  const currentTimeline = Array.isArray(order.shipping_timeline)
    ? order.shipping_timeline
    : [];
  const normalizedEvent = {
    timestamp: event.timestamp || new Date().toISOString(),
    status: String(event.status || "").trim(),
    location: String(event.location || "").trim(),
    remarks: String(event.remarks || "").trim(),
    source: String(event.source || "system").trim(),
  };

  order.shipping_timeline = [normalizedEvent, ...currentTimeline].filter(
    (item, index, list) =>
      list.findIndex((candidate) => JSON.stringify(candidate) === JSON.stringify(item)) ===
      index
  );
};

const persistShipmentMeta = ({ order, shipment, provider }) => {
  order.shipping_meta = {
    ...(order.shipping_meta || {}),
    provider,
    ...(shipment?.tokenNumber ? { tokenNumber: shipment.tokenNumber } : {}),
    ...(shipment?.pickupRegistrationDate
      ? { pickupRegistrationDate: shipment.pickupRegistrationDate }
      : {}),
    ...(shipment?.requestPayload ? { requestPayload: shipment.requestPayload } : {}),
    lastSyncedAt: new Date().toISOString(),
  };
};

const createShipmentForOrder = async ({
  order,
  receiverAddress,
  shippingProvider,
}) => {
  const provider = resolveDefaultShippingProvider(shippingProvider);
  const receiverName = receiverAddress?.name || order?.shippingAddress?.name || order?.name;
  const receiverMobile = receiverAddress?.mobile || order?.shippingAddress?.mobile || order?.mobile;

  if (provider === "BLUE_DART") {
    const shipFrom = ensureOrderShipFrom(order);

    const shipment = await createBlueDartWaybill({
      orderId: order.orderId,
      name: receiverName,
      mobile: receiverMobile,
      receiverAddress,
      shipFrom,
      products: order.product,
      declaredValue: order.amount,
      isCod: false,
    });

    return {
      provider,
      shipment,
      trackingNumber: shipment.success
        ? shipment.awbNumber || getShipmentTrackingNumber(shipment.data)
        : null,
    };
  }

  const shipment = await createDhlShipment({
    name: receiverName,
    mobile: receiverMobile,
    address: receiverAddress,
    products: order.product,
    totalAmount: order.amount,
    orderId: order.orderId,
  });

  return {
    provider: "DHL",
    shipment,
    trackingNumber: shipment.success ? getShipmentTrackingNumber(shipment.data) : null,
  };
};

const verifyRazorpaySignature = ({ orderId, paymentId, signature }) => {
  if (!signature) {
    return true;
  }

  if (!process.env.RAZORPAY_KEY_SECRET) {
    return false;
  }

  const generatedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  return generatedSignature === signature;
};

exports.createOrder = async (req, res) => {
  const { amount, currency = "INR", receipt } = req.body;
  const numericAmount = Number(
    typeof amount === "string" ? amount.replace(/,/g, "") : amount
  );

  if (isNaN(numericAmount)) {
    return res.status(400).json({
      success: false,
      message: "Invalid amount",
    });
  }

  try {
    const options = {
      amount: Math.round(numericAmount * 100), // convert ₹ to paise
      currency,
      receipt,
      payment_capture: 1,
    };

    const order = await razorpayInstance.orders.create(options);

    res.status(200).json({
      success: true,
      orderId: order.id,
      currency: order.currency,
      amount: order.amount,
    });
  } catch (error) {
    console.error("Order creation error:", error);
    res.status(500).json({
      success: false,
      message: "Order creation failed",
      error: error.message,
    });
  }
};

exports.paymentAdd = catchAsync(async (req, res) => {
  const user_id = req.user.id;

  const {
    order_id,
    payment_id,
    amount,
    currency = "INR",
    payment_status,
    payment_method,
    paymentMethod,
    type,
    OrderID,

    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,

    shipping_provider,
    shippingProvider,
  } = req.body;

  // Payment method normalize
  const selectedPaymentMethod = String(
    payment_method || paymentMethod || "ONLINE"
  ).toUpperCase();

  const isCOD = selectedPaymentMethod === "COD";

  const effectiveOrderId =
    order_id ||
    razorpay_order_id ||
    (isCOD ? `COD-ORDER-${OrderID}` : null);

  const effectivePaymentId =
    payment_id ||
    razorpay_payment_id ||
    (isCOD ? `COD-PAYMENT-${OrderID}` : null);

  const numericAmount = Number(
    String(amount ?? "").replace(/,/g, "")
  );

  // Common validation
  if (
    !OrderID ||
    !Number.isFinite(numericAmount) ||
    numericAmount <= 0
  ) {
    return res.status(400).json({
      status: false,
      message: "OrderID and a valid amount are required",
    });
  }

  // Online payment validation only
  if (
    !isCOD &&
    (
      !effectiveOrderId ||
      !effectivePaymentId ||
      !razorpay_signature
    )
  ) {
    return res.status(400).json({
      status: false,
      message:
        "Razorpay order ID, payment ID and signature are required for online payment",
    });
  }

  // Verify Razorpay only for online payment
  if (!isCOD) {
    const signatureValid = verifyRazorpaySignature({
      orderId: effectiveOrderId,
      paymentId: effectivePaymentId,
      signature: razorpay_signature,
    });

    if (!signatureValid) {
      return res.status(400).json({
        status: false,
        message: "Invalid Razorpay signature",
      });
    }
  }

  // Find linked order
  const order = await Order.findOne({
    _id: OrderID,
    userId: user_id,
  });

  if (!order) {
    return res.status(404).json({
      status: false,
      message: "Linked order not found for this user",
    });
  }

  /*
   * COD    -> pending
   * Online -> success/failed based on request
   */
  let normalizedPaymentStatus;

  if (isCOD) {
    normalizedPaymentStatus = "pending";
  } else {
    normalizedPaymentStatus =
      payment_status === "failed"
        ? "failed"
        : "success";
  }

  const paymentRecordStatus =
    normalizedPaymentStatus === "failed"
      ? "failed"
      : normalizedPaymentStatus === "pending"
        ? "pending"
        : "success";

  // Save payment record
  const record = await Payment.findOneAndUpdate(
    {
      payment_id: effectivePaymentId,
    },
    {
      order_id: effectiveOrderId,
      currency,
      user_id,
      payment_id: effectivePaymentId,
      amount: numericAmount,

      payment_method: selectedPaymentMethod,
      payment_status: normalizedPaymentStatus,

      type,
      status: paymentRecordStatus,
      OrderID,
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  let shipment = null;

  const { shippingAddress } =
    await ensureOrderShippingAddress(order, {
      userId: user_id,
    });

  ensureOrderShipFrom(order);

  if (!shippingAddress) {
    return res.status(400).json({
      status: false,
      message: "Order shipping address is missing",
    });
  }

  // Update order payment details
  order.paymentMethod = selectedPaymentMethod;
  order.payment_status = normalizedPaymentStatus;

  if (isCOD) {
    // Synthetic reference; not an actual Razorpay payment ID
    order.PaymentId = effectivePaymentId;

    // Use your actual schema field names
    order.cod_amount = numericAmount;
    order.collectable_amount = numericAmount;
  } else {
    order.PaymentId = effectivePaymentId;
    order.cod_amount = 0;
    order.collectable_amount = 0;
  }

  /*
   * Create shipment when:
   * Online payment is successful
   * OR payment method is COD
   */
  const shouldCreateShipment =
    isCOD ||
    normalizedPaymentStatus === "success";

  if (shouldCreateShipment) {
    if (order.status === "pending") {
      order.status = "confirmed";
    }

    // Reuse existing shipment
    if (
      order.shipping_status === "shipment_created" &&
      order.tracking_number
    ) {
      shipment = {
        success: true,
        data: order.shipping_response,
        trackingNumber: order.tracking_number,
        reusedExistingShipment: true,
      };
    } else {
      const desiredProvider =
        shipping_provider || shippingProvider;

      const created = await createShipmentForOrder({
        order,

        receiverAddress:
          toCourierAddress(shippingAddress),

        shippingProvider:
          desiredProvider,

        // Pass COD details to courier service
        paymentMethod:
          selectedPaymentMethod,

        isCOD,

        codAmount:
          isCOD ? numericAmount : 0,

        collectableAmount:
          isCOD ? numericAmount : 0,
      });

      shipment = created.shipment;

      if (shipment.success) {
        order.tracking_number = created.trackingNumber;
        order.shipping_status = "shipment_created";
        order.shipping_response = shipment.data;
        persistShipmentMeta({
          order,
          shipment,
          provider: created.provider,
        });
        appendTimelineEvent(order, {
          status: "Shipment created",
          location: order?.labelData?.shipFrom?.city || "",
          remarks: `Shipment created with ${created.provider}`,
        });
      } else {
        order.shipping_status = "shipment_failed";
        order.shipping_response = shipment.error;
        persistShipmentMeta({
          order,
          shipment,
          provider: created.provider,
        });
        appendTimelineEvent(order, {
          status: "Shipment failed",
          location: order?.labelData?.shipFrom?.city || "",
          remarks: shipment?.error?.message || shipment?.error?.title || "Shipment creation failed",
        });
      }
    }
  }

  await order.save();

  // Online failed response
  if (
    !isCOD &&
    normalizedPaymentStatus === "failed"
  ) {
    return res.status(200).json({
      status: "failed",
      message:
        "Payment failed and was saved successfully",
      record,
      order,
      shipment: null,
    });
  }

  // COD response
  if (isCOD) {
    return res.status(200).json({
      status: shipment?.success
        ? "success"
        : "failed",

      message: shipment?.success
        ? "COD order and shipment created successfully"
        : "COD order saved but shipment creation failed",

      record,
      order,
      shipment,

      trackingNumber:
        order.tracking_number || null,
    });
  }

  // Online success response
  return res.status(200).json({
    status: shipment?.success
      ? "success"
      : "failed",

    message: shipment?.success
      ? "Payment verified and shipment created successfully"
      : "Payment verified but shipment creation failed",

    record,
    order,
    shipment,

    trackingNumber:
      order.tracking_number || null,
  });
});



exports.PaymentGet = catchAsync(async (_req, res) => {
  try {
    const payment = await Payment.find({})
      .populate("OrderID")
      .populate("user_id")
      .sort({ payment_date: -1 });

    if (!payment || payment.length === 0) {
      return res.status(204).json({
        status: false,
        message: "No Payment found for this user.",
        Payment: [],
      });
    }

    res.status(200).json({
      status: true,
      message: "Payment retrieved successfully!",
      Payment: payment,
    });

  } catch (err) {
    console.error("Error retrieving payments:", err.message);
    return res.status(500).json({
      status: false,
      message: "An unknown error occurred. Please try again later.",
      error: err.message,
    });
  }
});
