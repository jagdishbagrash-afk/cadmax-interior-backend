const Review = require("../Model/Review");
const Product = require("../Model/Product");
const Order = require("../Model/Order");
const { successResponse, errorResponse } = require("../Utill/ErrorHandling");
const catchAsync = require("../Utill/catchAsync");
const mongoose = require("mongoose");
const { deleteFile } = require("../Utill/S3");


  //  HELPER: Recalculate product rating

async function recalculateProductRating(productId) {
  const result = await Review.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId), isDeleted: false, status: "active" } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
        totalRating: { $sum: "$rating" },
        star1: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
        star2: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
        star3: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
        star4: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
        star5: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
      },
    },
  ]);

  const stats = result[0] || {
    averageRating: 0,
    totalReviews: 0,
    totalRating: 0,
    star1: 0,
    star2: 0,
    star3: 0,
    star4: 0,
    star5: 0,
  };

  await Product.findByIdAndUpdate(productId, {
    averageRating: Math.round(stats.averageRating * 10) / 10,
    totalReviews: stats.totalReviews,
    totalRating: stats.totalRating,
    ratingBreakdown: {
      star1: stats.star1,
      star2: stats.star2,
      star3: stats.star3,
      star4: stats.star4,
      star5: stats.star5,
    },
  });
}


  //  HELPER: Check if user purchased product

async function checkVerifiedPurchase(userId, productId) {
  const order = await Order.findOne({
    userId,
    "product.id": productId,
    status: "delivered",
  });
  return !!order;
}


  //  1. ADD REVIEW

exports.addReview = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { productId, rating, title, message } = req.body;

  if (!productId || !rating || !message) {
    return errorResponse(res, "Product ID, rating, and message are required", 400);
  }

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return errorResponse(res, "Invalid product ID", 400);
  }

  if (rating < 1 || rating > 5) {
    return errorResponse(res, "Rating must be between 1 and 5", 400);
  }

  const product = await Product.findById(productId);
  if (!product) {
    return errorResponse(res, "Product not found", 404);
  }

  // Check verified purchase
  const verifiedPurchase = await checkVerifiedPurchase(userId, productId);

  const review = await Review.create({
    product: productId,
    user: userId,
    rating,
    title: title || "",
    message,
    verifiedPurchase,
  });

  // Recalculate product rating
  await recalculateProductRating(productId);

  const populatedReview = await Review.findById(review._id)
    .populate("user", "name profileImage")
    .lean();

  return successResponse(res, "Review added successfully", 201, {
    ...populatedReview,
    verifiedPurchase,
  });
});

  //  2. UPDATE REVIEW

exports.updateReview = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { reviewId } = req.params;
  const { rating, title, message } = req.body;

  if (!mongoose.Types.ObjectId.isValid(reviewId)) {
    return errorResponse(res, "Invalid review ID", 400);
  }

  const review = await Review.findOne({ _id: reviewId, user: userId, isDeleted: false });
  if (!review) {
    return errorResponse(res, "Review not found or you are not authorized", 404);
  }

  if (rating !== undefined) {
    if (rating < 1 || rating > 5) {
      return errorResponse(res, "Rating must be between 1 and 5", 400);
    }
    review.rating = rating;
  }

  if (title !== undefined) review.title = title;
  if (message !== undefined) review.message = message;

  await review.save();

  // Recalculate product rating
  await recalculateProductRating(review.product);

  const updatedReview = await Review.findById(review._id)
    .populate("user", "name profileImage")
    .lean();

  return successResponse(res, "Review updated successfully", 200, updatedReview);
});


  //  3. DELETE REVIEW (soft delete)

exports.deleteReview = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { reviewId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(reviewId)) {
    return errorResponse(res, "Invalid review ID", 400);
  }

  const review = await Review.findOne({ _id: reviewId, user: userId, isDeleted: false });
  if (!review) {
    return errorResponse(res, "Review not found or you are not authorized", 404);
  }

  review.isDeleted = true;
  review.deletedAt = new Date();
  await review.save();

  // Recalculate product rating
  await recalculateProductRating(review.product);

  return successResponse(res, "Review deleted successfully", 200);
});


  //  4. GET PRODUCT REVIEWS (with pagination, sorting, filtering)

exports.getProductReviews = catchAsync(async (req, res) => {
  const { productId } = req.params;
  let { page = 1, limit = 10, sort = "latest", rating } = req.query;

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return errorResponse(res, "Invalid product ID", 400);
  }

  page = parseInt(page);
  limit = parseInt(limit);
  const skip = (page - 1) * limit;

  // Build filter
  const filter = { product: productId, isDeleted: false, status: { $ne: "hidden" } };
  if (rating) {
    const ratingNum = parseInt(rating);
    if (ratingNum >= 1 && ratingNum <= 5) {
      filter.rating = ratingNum;
    }
  }

  // Build sort
  let sortOption = {};
  switch (sort) {
    case "latest":
      sortOption = { createdAt: -1 };
      break;
    case "highest":
      sortOption = { rating: -1, createdAt: -1 };
      break;
    case "lowest":
      sortOption = { rating: 1, createdAt: -1 };
      break;
    case "most_helpful":
      // Only show reviews that have at least 1 helpful vote
      filter.helpfulCount = { $gte: 1 };
      sortOption = { helpfulCount: -1, createdAt: -1 };
      break;
    case "positive":
      // Filter for rating >= 3
      filter.rating = { $gte: 3 };
      sortOption = { rating: -1, createdAt: -1 };
      break;
    case "negative":
      // Filter for rating < 3
      filter.rating = { $lt: 3 };
      sortOption = { rating: 1, createdAt: -1 };
      break;
    case "relevant":
    default:
      sortOption = { verifiedPurchase: -1, helpfulCount: -1, createdAt: -1 };
      break;
  }

  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .populate("user", "name profileImage")
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .lean(),
    Review.countDocuments(filter),
  ]);

  return successResponse(res, "Reviews fetched successfully", 200, {
    reviews,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
  });
});

  //  5. GET PRODUCT RATING SUMMARY
exports.getProductRatingSummary = catchAsync(async (req, res) => {
  const { productId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return errorResponse(res, "Invalid product ID", 400);
  }

  const product = await Product.findById(productId)
    .select("averageRating totalRating totalReviews ratingBreakdown")
    .lean();

  if (!product) {
    return errorResponse(res, "Product not found", 404);
  }

  // Calculate percentages for rating breakdown
  const breakdown = product.ratingBreakdown || { star1: 0, star2: 0, star3: 0, star4: 0, star5: 0 };
  const totalReviews = product.totalReviews || 0;

  const breakdownPercentages = {};
  for (let i = 1; i <= 5; i++) {
    const count = breakdown[`star${i}`] || 0;
    breakdownPercentages[`star${i}`] = {
      count,
      percentage: totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0,
    };
  }

  return successResponse(res, "Rating summary fetched successfully", 200, {
    averageRating: product.averageRating || 0,
    totalRating: product.totalRating || 0,
    totalReviews: product.totalReviews || 0,
    ratingBreakdown: breakdownPercentages,
  });
});

  //  6. MARK HELPFUL
exports.markHelpful = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { reviewId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(reviewId)) {
    return errorResponse(res, "Invalid review ID", 400);
  }

  const review = await Review.findOne({ _id: reviewId, isDeleted: false });
  if (!review) {
    return errorResponse(res, "Review not found", 404);
  }

  // Check if already marked as helpful
  const alreadyHelpful = review.helpfulUsers.some((id) => id.toString() === userId);
  // Check if already marked as not helpful
  const alreadyNotHelpful = review.notHelpfulUsers.some((id) => id.toString() === userId);

  if (alreadyHelpful) {
    // Toggle off
    review.helpfulUsers.pull(userId);
    review.helpfulCount = review.helpfulUsers.length;
  } else {
    // Remove from not helpful if present
    if (alreadyNotHelpful) {
      review.notHelpfulUsers.pull(userId);
      review.notHelpfulCount = review.notHelpfulUsers.length;
    }
    review.helpfulUsers.push(userId);
    review.helpfulCount = review.helpfulUsers.length;
  }

  await review.save();

  return successResponse(res, "Marked as helpful", 200, {
    helpfulCount: review.helpfulCount,
    notHelpfulCount: review.notHelpfulCount,
    userMarked: alreadyHelpful ? null : "helpful",
  });
});

  //  7. MARK NOT HELPFUL
exports.markNotHelpful = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { reviewId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(reviewId)) {
    return errorResponse(res, "Invalid review ID", 400);
  }

  const review = await Review.findOne({ _id: reviewId, isDeleted: false });
  if (!review) {
    return errorResponse(res, "Review not found", 404);
  }

  // Check if already marked as not helpful
  const alreadyNotHelpful = review.notHelpfulUsers.some((id) => id.toString() === userId);
  // Check if already marked as helpful
  const alreadyHelpful = review.helpfulUsers.some((id) => id.toString() === userId);

  if (alreadyNotHelpful) {
    // Toggle off
    review.notHelpfulUsers.pull(userId);
    review.notHelpfulCount = review.notHelpfulUsers.length;
  } else {
    // Remove from helpful if present
    if (alreadyHelpful) {
      review.helpfulUsers.pull(userId);
      review.helpfulCount = review.helpfulUsers.length;
    }
    review.notHelpfulUsers.push(userId);
    review.notHelpfulCount = review.notHelpfulUsers.length;
  }

  await review.save();

  return successResponse(res, "Marked as not helpful", 200, {
    helpfulCount: review.helpfulCount,
    notHelpfulCount: review.notHelpfulCount,
    userMarked: alreadyNotHelpful ? null : "not_helpful",
  });
});

  //  8. CHECK REVIEW ELIGIBILITY
  
exports.checkReviewEligibility = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { productId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return errorResponse(res, "Invalid product ID", 400);
  }

  const product = await Product.findById(productId);
  if (!product) {
    return errorResponse(res, "Product not found", 404);
  }

  // Check if purchased
  const hasPurchased = await checkVerifiedPurchase(userId, productId);

  // Check if user already has an active review for this product
  const existingReview = await Review.findOne({
    product: productId,
    user: userId,
    isDeleted: false,
  }).select("_id");

  const hasReviewed = !!existingReview;

  // User can review if they purchased the product
  // They can always write a new review (multiple reviews allowed per schema)
  return successResponse(res, "Eligibility checked", 200, {
    canReview: hasPurchased,
    hasPurchased,
    hasReviewed,
    existingReviewId: hasReviewed ? existingReview._id : null,
  });
});

