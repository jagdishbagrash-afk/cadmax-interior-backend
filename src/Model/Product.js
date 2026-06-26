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

// New separate schema for individual size within a price section
const SizeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    amount: {
      type: Number,
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

// Updated product pricing section schema with multiple sizes
const ProductPriceSectionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    amount: {
      type: Number,
      default: 0
    },
    discount_amount: {
      type: Number,
      default: 10  // 10% default discount
    },
    final_amount: {
      type: Number,
      default: 0
    },
    sizes: {
      type: [SizeSchema],
      default: []
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
      default : 0
    },

    label_category :{
      type :String
    },
    label_size:{
      type : String
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

    // Updated product price section with multiple sizes
    product_price_section: {
      type: [ProductPriceSectionSchema],
      default: []
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

  // Calculate final_amount for each product_price_section and its sizes
  if (this.product_price_section && this.product_price_section.length > 0) {
    this.product_price_section.forEach(section => {
      // Calculate section main amount
      if (section.amount) {
        const sectionAmount = Number(section.amount || 0);
        const sectionDiscount = Number(section.discount_amount || 10);
        section.final_amount = sectionAmount - (sectionAmount * sectionDiscount) / 100;
      }

      // Calculate final_amount for each size within the section
      if (section.sizes && section.sizes.length > 0) {
        section.sizes.forEach(size => {
          if (size.amount) {
            const sizeAmount = Number(size.amount || 0);
            const sizeDiscount = Number(size.discount_amount || 10);
            size.final_amount = sizeAmount - (sizeAmount * sizeDiscount) / 100;
          }
        });
      }
    });
  }

   // ============================
  // Stock Status Calculation
  // ============================

  if (this.variants?.length) {
    const totalStock = this.variants.reduce(
      (total, variant) => total + Number(variant.stock || 0),
      0
    );

    this.stock_status =
      totalStock > 0 ? "in_stock" : "out_of_stock";
  } else {
    this.stock_status = "out_of_stock";
  }

  next();
});

module.exports = mongoose.model("Product", ProductSchema);