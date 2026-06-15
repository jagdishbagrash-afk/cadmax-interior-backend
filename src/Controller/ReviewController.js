const Review = require("../Model/Review");
const Product = require("../Model/Product");
const { successResponse, errorResponse } = require("../Utill/ErrorHandling");
const catchAsync = require("../Utill/catchAsync");
const mongoose = require("mongoose");
const { deleteFile } = require("../Utill/S3");

//  HELPER: Recalculate product rating (only approved reviews)
async function recalculateProductRating(productId) {
  const result = await Review.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId), isDeleted: false, status: "approved" } },
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

//  1. ADD REVIEW (any logged-in user, product purchase NOT required)
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

  // Check if user already has a review for this product (not soft-deleted)
  const existingReview = await Review.findOne({
    product: productId,
    user: userId,
    isDeleted: false,
  });
  if (existingReview) {
    return errorResponse(res, "You have already reviewed this product. You can edit or delete your existing review.", 400);
  }

  // Create review with status "pending" by default (schema default)
  const review = await Review.create({
    product: productId,
    user: userId,
    rating,
    title: title || "",
    message,
  });

  // DO NOT recalculate rating for pending reviews - only approved reviews count
  // Rating will be recalculated when admin approves

  const populatedReview = await Review.findById(review._id)
    .populate("user", "name profileImage")
    .lean();

  return successResponse(res, "Review added successfully", 201, populatedReview);
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

  // Reset status to pending on edit so admin can re-review
  review.status = "pending";
  await review.save();

  // Recalculate product rating only if previously approved
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

//  4. GET PRODUCT REVIEWS (with visibility logic)
exports.getProductReviews = catchAsync(async (req, res) => {
  const { productId } = req.params;
  let { page = 1, limit = 10, sort = "latest", rating } = req.query;

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return errorResponse(res, "Invalid product ID", 400);
  }

  page = parseInt(page);
  limit = parseInt(limit);
  const skip = (page - 1) * limit;

  // Get the requesting user's ID from query param (passed by frontend for logged-in users)
  // If no userId provided, treat as guest - show only approved reviews
  const currentUserId = req.query.userId || null;

  // Build filter
  // For non-owners: only show approved reviews
  // For owners: show all their reviews regardless of status
  const filter = {
    product: productId,
    isDeleted: false,
  };

  if (currentUserId) {
    // If user is logged in, show approved reviews + their own reviews (any status)
    filter.$or = [
      { status: "approved" },
      { user: new mongoose.Types.ObjectId(currentUserId) },
    ];
  } else {
    // Guest users: only approved reviews
    filter.status = "approved";
  }

  // Additional rating filter if specified
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
      sortOption = { createdAt: -1 };
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

//  8. CHECK REVIEW ELIGIBILITY (simplified: any logged-in user can review)
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

  // Any logged-in user can review (purchase not required)
  // Check if user already has an existing review for this product
  const existingReview = await Review.findOne({
    product: productId,
    user: userId,
    isDeleted: false,
  }).select("_id status");

  const hasReviewed = !!existingReview;

  return successResponse(res, "Eligibility checked", 200, {
    canReview: true, // Any logged-in user can review
    hasPurchased: false, // Not tracking purchase for review eligibility
    hasReviewed,
    existingReviewId: hasReviewed ? existingReview._id : null,
    existingReviewStatus: hasReviewed ? existingReview.status : null,
  });
});

// ========== ADMIN REVIEW FUNCTIONS ==========

//  9. GET ALL REVIEWS (admin) with filters
exports.getAllReviews = catchAsync(async (req, res) => {
  let { page = 1, limit = 20, status, productId, userId } = req.query;

  page = parseInt(page);
  limit = parseInt(limit);
  const skip = (page - 1) * limit;

  const filter = { isDeleted: false };

  if (status && ["pending", "approved", "rejected"].includes(status)) {
    filter.status = status;
  }

  if (productId && mongoose.Types.ObjectId.isValid(productId)) {
    filter.product = new mongoose.Types.ObjectId(productId);
  }

  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    filter.user = new mongoose.Types.ObjectId(userId);
  }

  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .populate("user", "name email phone profileImage")
      .populate("product", "title slug amount final_amount images")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Review.countDocuments(filter),
  ]);

  return successResponse(res, "Admin reviews fetched successfully", 200, {
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

//  10. APPROVE REVIEW (admin)
exports.approveReview = catchAsync(async (req, res) => {
  const { reviewId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(reviewId)) {
    return errorResponse(res, "Invalid review ID", 400);
  }

  const review = await Review.findOne({ _id: reviewId, isDeleted: false });
  if (!review) {
    return errorResponse(res, "Review not found", 404);
  }

  if (review.status === "approved") {
    return errorResponse(res, "Review is already approved", 400);
  }

  review.status = "approved";
  await review.save();

  // Recalculate product rating (only approved reviews count)
  await recalculateProductRating(review.product);

  const populatedReview = await Review.findById(review._id)
    .populate("user", "name email phone profileImage")
    .populate("product", "title slug amount final_amount images")
    .lean();

  return successResponse(res, "Review approved successfully", 200, populatedReview);
});

//  11. REJECT REVIEW (admin)
exports.rejectReview = catchAsync(async (req, res) => {
  const { reviewId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(reviewId)) {
    return errorResponse(res, "Invalid review ID", 400);
  }

  const review = await Review.findOne({ _id: reviewId, isDeleted: false });
  if (!review) {
    return errorResponse(res, "Review not found", 404);
  }

  if (review.status === "rejected") {
    return errorResponse(res, "Review is already rejected", 400);
  }

  review.status = "rejected";
  await review.save();

  // Recalculate product rating (removes rejected review from rating)
  await recalculateProductRating(review.product);

  const populatedReview = await Review.findById(review._id)
    .populate("user", "name email phone profileImage")
    .populate("product", "title slug amount final_amount images")
    .lean();

  return successResponse(res, "Review rejected successfully", 200, populatedReview);
});

//  12. DELETE REVIEW (admin - soft delete)
exports.adminDeleteReview = catchAsync(async (req, res) => {
  const { reviewId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(reviewId)) {
    return errorResponse(res, "Invalid review ID", 400);
  }

  const review = await Review.findOne({ _id: reviewId, isDeleted: false });
  if (!review) {
    return errorResponse(res, "Review not found", 404);
  }

  review.isDeleted = true;
  review.deletedAt = new Date();
  await review.save();

  // Recalculate product rating
  await recalculateProductRating(review.product);

  return successResponse(res, "Review deleted by admin", 200);
});

//  13. GET REVIEW STATISTICS (admin dashboard)
exports.getReviewStats = catchAsync(async (req, res) => {
  const stats = await Review.aggregate([
    { $match: { isDeleted: false } },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  const result = {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  };

  stats.forEach((s) => {
    result.total += s.count;
    result[s._id] = s.count;
  });

  return successResponse(res, "Review stats fetched", 200, result);
});
