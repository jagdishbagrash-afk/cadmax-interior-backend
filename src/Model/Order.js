const mongoose = require("mongoose");

const OrderProductSchema = new mongoose.Schema(
  {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    title: {
      type: String,
      required: true,
    },

    price: {
      type: Number,
      required: true,
    },

    originalPrice: Number,

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

    variant: String,

    variantTitle: {
      type: String,
      default: null,
    },

    priceSectionTitle: {
      type: String,
      default: null,
    },
  },
  { _id: false }
);

const OrderShippingAddressSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    mobile: { type: String, default: "" },
    street_address: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    country: { type: String, default: "" },
    pincode: { type: String, default: "" },
    addressType: { type: String, default: "" },
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
    shippingAddress: { type: OrderShippingAddressSchema, default: null },
    PaymentId: { type: String },
    paymentMethod: {
      type: String,
      enum: ["ONLINE", "COD"],
      default: "ONLINE",
    },
    amount: { type: Number, required: true },
    tracking_number: { type: String },
    shipping_status: { type: String, default: "pending" },
    courier_name: { type: String },
    labelData: { type: Object, default: null },
    shipping_response: { type: Object },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", OrderSchema);
