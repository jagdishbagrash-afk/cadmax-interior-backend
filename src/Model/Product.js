const mongoose = require("mongoose");
const ProductSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
    },
    stock: {
      type: Number,
      required: [true, "Stock is required"],
    },
    image: {
      type: String,
      required: [true, "Image is required"],
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
    },
    superCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "superCategory",
      required: [true, "SuperCategory is required"],
    },
    subcategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "subcategory",
      required: [true, "Subcategory is required"],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "category",
      required: [true, "Category is required"],
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },{ timestamps: true,}
);

mongoose.model("product", ProductSchema);