const Order = require("../Model/Order");
const Address = require("../Model/MultipleAddress");
const catchAsync = require("../Utill/catchAsync");
const { trackDhlShipment, createDhlShipment, normalizeAddress } = require("../Utill/createDhlShipment");
const { trackBlueDartShipment, createBlueDartWaybill } = require("../Utill/blueDartService");

const formatTrackingPayload = (trackingNumber, data) => {
  const shipment = data?.shipments?.[0] || data;

  const events = Array.isArray(shipment?.events)
    ? shipment.events.map((event) => ({
        timestamp: event.timestamp,
        status: event.description || event.status,
        location:
          event?.serviceArea &&
          [event.serviceArea.city, event.serviceArea.countryCode]
            .filter(Boolean)
            .join(", "),
        remarks: event.remarks || null,
      }))
    : [];

  return {
    trackingNumber,
    status: shipment?.status || shipment?.statusCode || "unknown",
    raw: data,
    events,
  };
};

const formatBlueDartTrackingPayload = (trackingNumber, data) => {
  const candidates = [
    data?.Scans,
    data?.scans,
    data?.Shipment?.Scans,
    data?.Shipment?.scans,
    data?.Shipment?.ScanDetails,
    data?.ScanDetails,
    data?.tracking?.Scans,
    data?.tracking?.scans,
  ];

  const scans = candidates.find(Array.isArray) || [];

  const events = scans.map((scan) => ({
    timestamp:
      scan?.ScanDateTime ||
      scan?.scanDateTime ||
      scan?.Timestamp ||
      scan?.timestamp ||
      null,
    status: scan?.Status || scan?.status || scan?.ScanType || scan?.scanType || "unknown",
    location: scan?.Location || scan?.location || scan?.ScanLocation || scan?.scanLocation || null,
    remarks: scan?.Remarks || scan?.remarks || null,
  }));

  const status =
    data?.CurrentStatus ||
    data?.currentStatus ||
    data?.Shipment?.CurrentStatus ||
    data?.Shipment?.currentStatus ||
    (events[0]?.status || "unknown");

  return {
    trackingNumber,
    status,
    raw: data,
    events,
  };
};

const normalizeCourier = (value) => {
  if (!value) {
    return "DHL";
  }

  const normalized = String(value).trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (normalized === "BLUEDART" || normalized === "BLUE_DART") {
    return "BLUE_DART";
  }
  if (normalized === "DHL") {
    return "DHL";
  }
  return "DHL";
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

const getShipmentTrackingNumber = (shipmentResponse = {}) =>
  shipmentResponse?.shipmentTrackingNumber ||
  shipmentResponse?.trackingNumber ||
  shipmentResponse?.awbNumber ||
  shipmentResponse?.AWBNo ||
  shipmentResponse?.awbNo ||
  shipmentResponse?.packages?.[0]?.trackingNumber ||
  shipmentResponse?.pieces?.[0]?.trackingNumber ||
  null;

const resolveDefaultShippingProvider = (value) =>
  normalizeCourier(value) ||
  normalizeCourier(process.env.DEFAULT_SHIPPING_PROVIDER) ||
  "DHL";

const createShipmentForOrder = async ({ order, receiverAddress, shippingProvider }) => {
  const provider = resolveDefaultShippingProvider(shippingProvider);

  if (provider === "BLUE_DART") {
    const shipment = await createBlueDartWaybill({
      orderId: order.orderId,
      name: order.name,
      mobile: order.mobile,
      receiverAddress,
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
    name: order.name,
    mobile: order.mobile,
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

exports.TrackShipment = async (req, res) => {
  try {
    const { trackingNumber } = req.params;
    const courier = normalizeCourier(req.query.courier || req.query.provider);

    if (!trackingNumber) {
      return res.status(400).json({
        status: false,
        message: "Tracking number is required",
      });
    }

    const response =
      courier === "BLUE_DART"
        ? await trackBlueDartShipment(trackingNumber)
        : await trackDhlShipment(trackingNumber);

    if (!response.success) {
      return res.status(502).json({
        status: false,
        message: "Tracking failed",
        error: response.error,
      });
    }

    return res.status(200).json({
      status: true,
      message: "Tracking fetched successfully",
      data:
        courier === "BLUE_DART"
          ? formatBlueDartTrackingPayload(trackingNumber, response.data)
          : formatTrackingPayload(trackingNumber, response.data),
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error?.response?.data || error.message || "Tracking failed",
    });
  }
};

exports.CreateOrderShipment = catchAsync(async (req, res) => {
  const order = await Order.findOne({
    _id: req.params.id,
    userId: req.user.id,
  });

  if (!order) {
    return res.status(404).json({
      status: false,
      message: "Order not found",
    });
  }

  if (order.shipping_status === "shipment_created" && order.tracking_number) {
    return res.status(200).json({
      status: true,
      message: "Shipment already exists for this order",
      data: {
        orderId: order._id,
        courierName: order.courier_name,
        trackingNumber: order.tracking_number,
        shippingStatus: order.shipping_status,
        shipmentResponse: order.shipping_response,
      },
    });
  }

  if (!order.PaymentId) {
    return res.status(400).json({
      status: false,
      message: "Order payment is not verified yet",
    });
  }

  const receiverAddress = await resolveOrderAddress(order);
  const desiredProvider = req.body?.shipping_provider || req.body?.shippingProvider;

  const created = await createShipmentForOrder({
    order,
    receiverAddress,
    shippingProvider: desiredProvider,
  });

  const shipment = created.shipment;
  order.courier_name = created.provider;

  if (shipment.success) {
    order.tracking_number = created.trackingNumber;
    order.shipping_status = "shipment_created";
    order.shipping_response = shipment.data;
  } else {
    order.shipping_status = "shipment_failed";
    order.shipping_response = shipment.error;
  }

  await order.save();

  return res.status(200).json({
    status: shipment.success,
    message: shipment.success
      ? "Shipment created successfully"
      : "Shipment creation failed",
    order,
    shipment,
  });
});

exports.GetOrderShipment = catchAsync(async (req, res) => {
  const order = await Order.findOne({
    _id: req.params.id,
    userId: req.user.id,
  }).lean();

  if (!order) {
    return res.status(404).json({
      status: false,
      message: "Order not found",
    });
  }

  return res.status(200).json({
    status: true,
    message: "Shipment details fetched successfully",
    data: {
      orderId: order._id,
      orderNumber: order.orderId,
      paymentId: order.PaymentId,
      shippingStatus: order.shipping_status,
      courierName: order.courier_name,
      trackingNumber: order.tracking_number,
      shipmentResponse: order.shipping_response,
    },
  });
});

exports.TrackOrderShipment = catchAsync(async (req, res) => {
  const order = await Order.findOne({
    _id: req.params.id,
    userId: req.user.id,
  }).lean();

  if (!order) {
    return res.status(404).json({
      status: false,
      message: "Order not found",
    });
  }

  if (!order.tracking_number) {
    return res.status(404).json({
      status: false,
      message: "Shipment has not been created for this order yet",
    });
  }

  const courier = normalizeCourier(order.courier_name);
  const tracking =
    courier === "BLUE_DART"
      ? await trackBlueDartShipment(order.tracking_number)
      : await trackDhlShipment(order.tracking_number);

  if (!tracking.success) {
    return res.status(502).json({
      status: false,
      message: "Tracking failed",
      error: tracking.error,
    });
  }

  return res.status(200).json({
    status: true,
    message: "Order tracking fetched successfully",
    data:
      courier === "BLUE_DART"
        ? formatBlueDartTrackingPayload(order.tracking_number, tracking.data)
        : formatTrackingPayload(order.tracking_number, tracking.data),
  });
});
