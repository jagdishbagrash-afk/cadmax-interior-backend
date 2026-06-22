const mongoose = require("mongoose");

const OrderProductSchema = new mongoose.Schema(
  {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    originalPrice: {
      type: Number,
    },
    discount: {
      type: Number,
      default: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    total: {
      type: Number,
      required: true,
    },
    variant: {
      type: String,
      required: true,
    },
    variantTitle: {              // ✅ NEW: human-readable variant name
      type: String,
      default: null,
    },
    priceSectionTitle: {         // ✅ NEW: package / pricing tier title
      type: String,
      default: null,
    },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    mobile: { type: String, required: true },
    orderId: { type: String, unique: true, index: true, required: true },
    address: { type: String },
    product: { type: [OrderProductSchema], required: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    addressId: { type: mongoose.Schema.Types.ObjectId, ref: "Address" },
    PaymentId: { type: String },
    amount: { type: Number, required: true },
    tracking_number: { type: String },
    shipping_status: { type: String, default: "pending" },
    courier_name: { type: String },
    shipping_response: { type: Object },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", OrderSchema);