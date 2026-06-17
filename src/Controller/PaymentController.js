const crypto = require("crypto");
const Payment = require("../Model/Payment");
const Order = require("../Model/Order");
const Address = require("../Model/MultipleAddress");
const Razorpay = require("razorpay");
const catchAsync = require("../Utill/catchAsync");
const { createDhlShipment, normalizeAddress } = require("../Utill/createDhlShipment");
require("dotenv").config();

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const getShipmentTrackingNumber = (shipmentResponse = {}) =>
  shipmentResponse?.shipmentTrackingNumber ||
  shipmentResponse?.trackingNumber ||
  shipmentResponse?.packages?.[0]?.trackingNumber ||
  shipmentResponse?.pieces?.[0]?.trackingNumber ||
  null;

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

const resolveOrderAddress = async (order) => {
  if (order?.addressId) {
    const savedAddress = await Address.findById(order.addressId).lean();
    if (savedAddress) {
      return normalizeAddress(savedAddress);
    }
  }

  return normalizeAddress(order?.address);
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
    type,
    OrderID,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  } = req.body;

  const effectiveOrderId = order_id || razorpay_order_id;
  const effectivePaymentId = payment_id || razorpay_payment_id;
  const normalizedPaymentStatus = payment_status === "failed" ? "failed" : "success";
  const status = normalizedPaymentStatus === "failed" ? "failed" : "success";
  const numericAmount = Number(
    String(amount).replace(/,/g, "")
  );

  if (!effectiveOrderId || !effectivePaymentId || !OrderID || !Number.isFinite(numericAmount)) {
    return res.status(400).json({
      status: false,
      message: "order_id, payment_id, OrderID and a valid amount are required",
    });
  }

  if (
    !verifyRazorpaySignature({
      orderId: effectiveOrderId,
      paymentId: effectivePaymentId,
      signature: razorpay_signature,
    })
  ) {
    return res.status(400).json({
      status: false,
      message: "Invalid Razorpay signature",
    });
  }

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

  const record = await Payment.findOneAndUpdate(
    { payment_id: effectivePaymentId },
    {
      order_id: effectiveOrderId,
      currency,
      user_id,
      payment_id: effectivePaymentId,
      amount: numericAmount,
      payment_status: normalizedPaymentStatus,
      type,
      status,
      OrderID,
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  let shipment = null;

  order.PaymentId = effectivePaymentId;

  if (normalizedPaymentStatus === "success") {
    if (order.status === "pending") {
      order.status = "confirmed";
    }

    if (order.shipping_status === "shipment_created" && order.tracking_number) {
      shipment = {
        success: true,
        data: order.shipping_response,
        trackingNumber: order.tracking_number,
        reusedExistingShipment: true,
      };
    } else {
      const receiverAddress = await resolveOrderAddress(order);

      shipment = await createDhlShipment({
        name: order.name,
        mobile: order.mobile,
        address: receiverAddress,
        products: order.product,
        totalAmount: order.amount,
        orderId: order.orderId,
      });

      order.courier_name = "DHL";

      if (shipment.success) {
        order.tracking_number = getShipmentTrackingNumber(shipment.data);
        order.shipping_status = "shipment_created";
        order.shipping_response = shipment.data;
      } else {
        order.shipping_status = "shipment_failed";
        order.shipping_response = shipment.error;
      }
    }
  }

  await order.save();

  if (normalizedPaymentStatus === "failed") {
    return res.status(200).json({
      status: "failed",
      message: "Payment failed and was saved successfully",
      record,
      order,
    });
  }

  return res.status(200).json({
    status: "success",
    message: shipment?.success
      ? "Payment verified and shipment created successfully"
      : "Payment verified but shipment creation failed",
    record,
    order,
    shipment,
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
