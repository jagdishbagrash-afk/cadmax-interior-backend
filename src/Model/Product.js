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

    slug: {
      type: String,
    },

    amount: {
      type: Number,
      required: [true, "Amount is required"],
    },

    discount_amount: {
      type: Number,
      default: 10,
    },

    final_amount: {
      type: Number,
      default: 0,
    },

    variants: {
      type: [ColorVariantSchema],
      required: true,
    },

    subcategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "subCategory",
      required: [true, "Subcategory is required"],
    },

     subsubcategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "productsubsubcategory",
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "category",
      required: [true, "Category is required"],
    },

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
    status: {
      type: String,
      default: true,
    },

    stock_status: {
      type: String,
      enum: ["in_stock", "out_of_stock"],
      default: "in_stock"
    },

    /* --- Rating & Review Aggregation --- */
    totalRating: {
      type: Number,
      default: 0,
    },
    averageRating: {
      type: Number,
      default: 0,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
    ratingBreakdown: {
      star1: { type: Number, default: 0 },
      star2: { type: Number, default: 0 },
      star3: { type: Number, default: 0 },
      star4: { type: Number, default: 0 },
      star5: { type: Number, default: 0 },
    },

  },
  { timestamps: true }
);

/* =========================================
   AUTO CALCULATE FINAL AMOUNT
========================================= */

ProductSchema.pre("save", function (next) {
  const amount = Number(this.amount || 0);

  // ✅ default 10%
  const discount = Number(this.discount_amount || 10);

  this.final_amount =
    amount - (amount * discount) / 100;

  next();
});

module.exports = mongoose.model("Product", ProductSchema);