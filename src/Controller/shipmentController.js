const Order = require("../Model/Order");
const catchAsync = require("../Utill/catchAsync");
const { trackDhlShipment } = require("../Utill/createDhlShipment");

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

exports.TrackShipment = async (req, res) => {
  try {
    const { trackingNumber } = req.params;

    if (!trackingNumber) {
      return res.status(400).json({
        status: false,
        message: "Tracking number is required",
      });
    }

    const response = await trackDhlShipment(trackingNumber);

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
      data: formatTrackingPayload(trackingNumber, response.data),
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error?.response?.data || error.message || "Tracking failed",
    });
  }
};

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

  const tracking = await trackDhlShipment(order.tracking_number);

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
    data: formatTrackingPayload(order.tracking_number, tracking.data),
  });
});
