const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    // This is product id referencing to product table
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    variant: {
      type: String, // color
      required: true,
    },
    quantity: {
      type: Number,
      min: 1,
      required: true,
    },
     images: {
      type: [String], // array of image URLs
      validate: v => v.length > 0
    },
  },{ _id: false }
);

const CartSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    product: {
      type: [ProductSchema],
      required: [true, "Product is required"],
    },
    tax: {
      type: Number,
      default: 2
    },
    discount: {
      type: Number,
      default: 2
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Cart", CartSchema);
