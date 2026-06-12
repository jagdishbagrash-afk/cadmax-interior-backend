const mongoose = require("mongoose");

const ColorVariantSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: "Default Variant",
    },

    color: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    amount: {
      type: Number,
      default: 0
    },

    discount_amount: {
      type: Number,
      default: 10,
    },

    final_amount: {
      type: Number,
      default: 0,
    },

    images: {
      type: [String],
      validate: (v) => v.length > 0,
    },

    stock: {
      type: Number,
      default: 0,
    },
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
    }

  },
  { timestamps: true }
);

/* =========================================
   AUTO CALCULATE FINAL AMOUNT
========================================= */

ProductSchema.pre("save", function (next) {
  // Product Level Price
  const amount = Number(this.amount || 0);
  const discount = Number(this.discount_amount || 10);

  this.final_amount =
    amount - (amount * discount) / 100;

  // Variant Level Price
  if (this.variants && this.variants.length > 0) {
    this.variants.forEach((variant) => {
      const variantAmount = Number(variant.amount || 0);
      const variantDiscount = Number(
        variant.discount_amount || 10
      );

      variant.final_amount =
        variantAmount -
        (variantAmount * variantDiscount) / 100;
    });
  }

  next();
});

module.exports = mongoose.model("Product", ProductSchema);