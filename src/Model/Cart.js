const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },

  variant: {
    type: String,
    required: true,
  },

  size: {
    type: String,
    default: null
  },

  quantity: {
    type: Number,
    required: true,
    min: 1,
  },

  price: {
    type: Number,
    default: 0,
  },

  originalPrice: {
    type: Number,
    default: 0,
  },

  discount: {
    type: Number,
    default: 0,
  },

priceSection: {
  type: String,
  default: null
}
}, { _id: false });

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
    subtotal: {
      type: Number,
      default: 0
    },
    totalAmount: {
      type: Number,
      default: 0
    },
    tax: {
      type: Number,
      default: 2
    },
    discount: {
      type: Number,
      default: 2
    },
    status: {
      type: String,
      enum: ["pending", "completed", "cancelled"],
      default: "pending"
    },
  },
  { timestamps: true }
);

// Pre-save middleware to calculate totals
CartSchema.pre("save", function(next) {
  if (this.product && this.product.length > 0) {
    this.subtotal = this.product.reduce((total, item) => {
      return total + ((item.price || 0) * (item.quantity || 0));
    }, 0);
    
    const discountAmount = (this.subtotal * (this.discount || 0)) / 100;
    const taxAmount = (this.subtotal * (this.tax || 0)) / 100;
    this.totalAmount = this.subtotal - discountAmount + taxAmount;
  }
  next();
});

module.exports = mongoose.model("Cart", CartSchema);