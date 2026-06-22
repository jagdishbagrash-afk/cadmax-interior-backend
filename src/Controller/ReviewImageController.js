const Review = require("../Model/Review");
const { successResponse, errorResponse } = require("../Utill/ErrorHandling");
const catchAsync = require("../Utill/catchAsync");
const { deleteFile } = require("../Utill/S3");
const mongoose = require("mongoose");

/* 
   UPLOAD REVIEW IMAGES
   S3 handles upload via middleware, this
   controller saves image URLs to the review */
exports.uploadReviewImages = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { reviewId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(reviewId)) {
    return errorResponse(res, "Invalid review ID", 400);
  }

  const review = await Review.findOne({ _id: reviewId, user: userId, isDeleted: false });
  if (!review) {
    return errorResponse(res, "Review not found or unauthorized", 404);
  }

  if (!req.files || req.files.length === 0) {
    return errorResponse(res, "No images uploaded", 400);
  }

  // Collect uploaded image URLs
  const newImages = req.files.map((file) => file.location || file.path);

  // Check limit
  if (review.images.length + newImages.length > 5) {
    return errorResponse(res, "Maximum 5 images allowed per review. You have " + review.images.length + " existing image(s).", 400);
  }

  review.images = [...review.images, ...newImages];
  await review.save();

  return successResponse(res, "Images uploaded successfully", 200, {
    images: review.images,
  });
});

/*
   DELETE REVIEW IMAGE
*/
exports.deleteReviewImage = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { reviewId, imageIndex } = req.params;

  if (!mongoose.Types.ObjectId.isValid(reviewId)) {
    return errorResponse(res, "Invalid review ID", 400);
  }

  const review = await Review.findOne({ _id: reviewId, user: userId, isDeleted: false });
  if (!review) {
    return errorResponse(res, "Review not found or unauthorized", 404);
  }

  const idx = parseInt(imageIndex);
  if (isNaN(idx) || idx < 0 || idx >= review.images.length) {
    return errorResponse(res, "Invalid image index", 400);
  }

  const removedImage = review.images[idx];

  // Remove from array
  review.images.splice(idx, 1);
  await review.save();

  // Attempt to delete from S3 (non-blocking)
  if (removedImage && removedImage.includes("amazonaws.com")) {
    deleteFile(removedImage).catch((err) => console.error("S3 delete error:", err));
  }

  return successResponse(res, "Image removed successfully", 200, {
    images: review.images,
  });
});