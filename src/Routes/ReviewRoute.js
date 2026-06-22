const router = require("express").Router();
const {
  addReview,
  updateReview,
  deleteReview,
  getProductReviews,
  getProductRatingSummary,
  markHelpful,
  markNotHelpful,
  checkReviewEligibility,
} = require("../Controller/ReviewController");
const {
  uploadReviewImages,
  deleteReviewImage,
} = require("../Controller/ReviewImageController");
const { verifyToken } = require("../Utill/tokenVerify");
const { upload } = require("../Utill/S3");

// ========== PUBLIC ROUTES ==========
// Note: userId is passed as optional query param for logged-in users (visibility logic)
router.get("/review/product/:productId", getProductReviews);
router.get("/review/rating-summary/:productId", getProductRatingSummary);

// ========== USER ROUTES (Authenticated) ==========
router.post("/review/add", verifyToken, addReview);
router.post("/review/update/:reviewId", verifyToken, updateReview);
router.post("/review/delete/:reviewId", verifyToken, deleteReview);
router.post("/review/helpful/:reviewId", verifyToken, markHelpful);
router.post("/review/not-helpful/:reviewId", verifyToken, markNotHelpful);
router.get("/review/eligibility/:productId", verifyToken, checkReviewEligibility);
router.post("/review/images/upload/:reviewId", verifyToken, upload.array("reviewImages", 5), uploadReviewImages);
router.post("/review/images/delete/:reviewId/:imageIndex", verifyToken, deleteReviewImage);

module.exports = router;