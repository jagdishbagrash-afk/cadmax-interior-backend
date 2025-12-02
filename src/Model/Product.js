const mongoose = require("mongoose");

const ColorVariantSchema = new mongoose.Schema(
  {
    color: {
      type: String,
      required: true,
      lowercase: true, // "Red" → "red"
      trim: true
    },
    images: {
      type: [String], // array of image URLs
      validate: v => v.length > 0
    },
    stock: {
      type: Number,
      default: 0
    }
  },
  { _id: false }
);

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
    // stock: {
    //   type: Number,
    //   required: [true, "Stock is required"],
    // },
    // image: {
    //   type: String,
    //   required: [true, "Image is required"],
    // },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
    },
    variants: {
      type: [ColorVariantSchema],
      required: true
    },
    subcategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "subCategory",
      required: [true, "Subcategory is required"],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "category",
      required: [true, "Category is required"],
    },
    // Newly Added Fields
    dimensions: {
      type: String,
      required: [true, "Dimensions is required"],
    },
    material: {
      type: String,
      required: [true, "Material is required"],
    },
    type: {
      type: String,
      required: [true, "Product is required"],
    },
    terms: {
      type: String,
      required: [true, "Terms is required"],
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", ProductSchema);