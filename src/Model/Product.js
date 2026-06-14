const mongoose = require("mongoose");

const ColorVariantSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    color: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    images: {
      type: [String],
      validate: v => v.length > 0
    },
    stock: {
      type: Number,
      default: 0
    }
  },
  { _id: false }
);

// New separate schema for product pricing section
const ProductPriceSectionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    amount: {
      type: Number,
      required: true,
      default: 0
    },
    discount_amount: {
      type: Number,
      default: 10  // 10% default discount
    },
    final_amount: {
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

    // New separate product price section (array of pricing options)
    product_price_section: {
      type: [ProductPriceSectionSchema],
      default: []
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
   AUTO CALCULATE FINAL AMOUNTS
========================================= */

ProductSchema.pre("save", function (next) {
  // Calculate main product final amount
  const amount = Number(this.amount || 0);
  const discount = Number(this.discount_amount || 10);
  this.final_amount = amount - (amount * discount) / 100;

  // Calculate final_amount for each product_price_section
  if (this.product_price_section && this.product_price_section.length > 0) {
    this.product_price_section.forEach(section => {
      if (section.amount) {
        const sectionAmount = Number(section.amount || 0);
        const sectionDiscount = Number(section.discount_amount || 10);
        section.final_amount = sectionAmount - (sectionAmount * sectionDiscount) / 100;
      }
    });
  }

  next();
});

module.exports = mongoose.model("Product", ProductSchema);