const Wishlist = require("../Model/Wishlist");
const Product = require("../Model/Product");
const { successResponse, errorResponse } = require("../Utill/ErrorHandling");
const catchAsync = require("../Utill/catchAsync");
const mongoose = require("mongoose");

exports.getWishlist = catchAsync(async (req, res) => {
  const userId = req.user.id;

  const wishlist = await Wishlist.findOne({ userId }).populate({
    path: "productIds",
    populate: { path: "category", select: "name slug" }
  });

  const products = wishlist?.productIds || [];

  //  Recommendations: Last 6 recently added products
  let recommendations = [];
  if (products.length > 0) {
    const wishlistedIds = products.map((p) => p._id.toString());

    recommendations = await Product.find({
      _id: { $nin: wishlistedIds },
      deletedAt: null,
    })
      .sort({ createdAt: -1 })
      .limit(10)
  }

  // Calculate stats
  let totalSavings = 0;
  let lowStockCount = 0;

  products.forEach((p) => {
    if (p.amount && p.final_amount) {
      totalSavings += p.amount - p.final_amount;
    }
    if (
      p.stock_status === "out_of_stock" ||
      p.variants?.some((v) => v.stock < 5)
    ) {
      lowStockCount++;
    }
  });

  return successResponse(res, "Wishlist fetched successfully", 200, {
    userId,
    count: products.length,
    products,
    recommendations,
    stats: {
      totalItems: products.length,
      totalSavings,
      lowStockCount,
    },
  });
});

// ADD product to wishlist
exports.addToWishlist = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { productId } = req.body;

  if (!productId) {
    return errorResponse(res, "Product ID is required", 400);
  }

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return errorResponse(res, "Invalid product ID", 400);
  }

  const product = await Product.findById(productId);
  if (!product) {
    return errorResponse(res, "Product not found", 404);
  }

  let wishlist = await Wishlist.findOne({ userId });

  if (!wishlist) {
    wishlist = new Wishlist({ userId, productIds: [] });
  }

  if (wishlist.productIds.includes(productId)) {
    return errorResponse(res, "Product already in wishlist", 400);
  }

  wishlist.productIds.push(productId);
  await wishlist.save();

  return successResponse(res, "Added to Wishlist", 200, wishlist);
});

// REMOVE product from wishlist
exports.removeFromWishlist = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { productId } = req.body;

  if (!productId) {
    return errorResponse(res, "Product ID is required", 400);
  }

  let wishlist = await Wishlist.findOne({ userId });

  if (!wishlist) {
    return errorResponse(res, "Wishlist not found", 404);
  }

  const index = wishlist.productIds.indexOf(productId);
  if (index === -1) {
    return errorResponse(res, "Product not in wishlist", 404);
  }

  wishlist.productIds.splice(index, 1);
  await wishlist.save();

  return successResponse(res, "Removed from Wishlist", 200, wishlist);
});

// REMOVE single product from wishlist via DELETE method (productId in URL params)
exports.removeFromWishlistByProductId = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { productId } = req.params;

  if (!productId) {
    return errorResponse(res, "Product ID is required", 400);
  }

  let wishlist = await Wishlist.findOne({ userId });

  if (!wishlist) {
    return errorResponse(res, "Wishlist not found", 404);
  }

  const index = wishlist.productIds.indexOf(productId);
  if (index === -1) {
    return errorResponse(res, "Product not in wishlist", 404);
  }

  wishlist.productIds.splice(index, 1);
  await wishlist.save();

  return successResponse(res, "Deleted from Wishlist", 200, wishlist);
});

// TOGGLE wishlist status
exports.toggleWishlist = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { productId } = req.body;

  if (!productId) {
    return errorResponse(res, "Product ID is required", 400);
  }

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return errorResponse(res, "Invalid product ID", 400);
  }

  const product = await Product.findById(productId);
  if (!product) {
    return errorResponse(res, "Product not found", 404);
  }

  let wishlist = await Wishlist.findOne({ userId });

  if (!wishlist) {
    wishlist = new Wishlist({ userId, productIds: [] });
  }

  const exists = wishlist.productIds.includes(productId);

  if (exists) {
    const index = wishlist.productIds.indexOf(productId);
    wishlist.productIds.splice(index, 1);
    await wishlist.save();
    return successResponse(res, "Removed from Wishlist", 200, {
      wishlist,
      isWishlisted: false,
    });
  } else {
    wishlist.productIds.push(productId);
    await wishlist.save();
    return successResponse(res, "Added to Wishlist", 200, {
      wishlist,
      isWishlisted: true,
    });
  }
});