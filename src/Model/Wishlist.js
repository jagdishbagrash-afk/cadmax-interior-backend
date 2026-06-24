const mongoose = require("mongoose");

const wishlistSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    productIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        selectedVariant: {
          color: String,
          images: [String],
        },
        selectedPriceSection: {
          title: String,
          amount: Number,
          final_amount: Number,
          discount_amount: Number,
        },
        selectedSize: {
          title: String,
          amount: Number,
          final_amount: Number,
          discount_amount: Number,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Wishlist", wishlistSchema);