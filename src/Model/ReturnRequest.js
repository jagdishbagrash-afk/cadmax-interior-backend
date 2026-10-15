const mongoose = require("mongoose");

const ReturnRequestSchema = new mongoose.Schema(
  {
    returnId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    orderNumber: {
      type: String,
      default: "",
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    productTitle: {
      type: String,
      default: "",
    },
    productImage: {
      type: String,
      default: "",
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    requestType: {
      type: String,
      enum: ["return", "replacement"],
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    comments: {
      type: String,
      default: "",
    },
    supportingImages: [
      {
        url: { type: String, default: "" },
        key: { type: String, default: "" },
      },
    ],
    pickupAddress: {
      name: { type: String, default: "" },
      phone: { type: String, default: "" },
      fullAddress: { type: String, default: "" },
      city: { type: String, default: "" },
      state: { type: String, default: "" },
      pincode: { type: String, default: "" },
    },
    status: {
      type: String,
      enum: [
        "requested",
        "under_review",
        "approved",
        "rejected",
        "pickup_scheduled",
        "picked_up",
        "in_transit",
        "received",
        "quality_check",
        "refund_initiated",
        "refund_completed",
        "replacement_created",
        "replacement_shipped",
        "replacement_delivered",
        "cancelled",
        "completed",
      ],
      default: "requested",
      index: true,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    eligibleUntil: {
      type: Date,
      default: null,
    },
    adminNote: {
      type: String,
      default: "",
    },
    rejectionReason: {
      type: String,
      default: "",
    },
    reverseShipment: {
      provider: { type: String, default: "" },
      awbNumber: { type: String, default: "" },
      pickupRequestId: { type: String, default: "" },
      trackingStatus: { type: String, default: "" },
    },
    refund: {
      amount: { type: Number, default: 0 },
      paymentId: { type: String, default: "" },
      refundId: { type: String, default: "" },
      status: {
        type: String,
        enum: ["refund_initiated", "refund_completed"],
        default: "refund_initiated",
      },
    },
    replacementOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ReturnRequest", ReturnRequestSchema);
