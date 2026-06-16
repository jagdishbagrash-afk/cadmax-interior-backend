const { verifyToken } = require("../Utill/tokenVerify");
const UserRoute = require("express").Router();
const { signup, AdminLogin, GetAllUser, profilegettoken, UserLogin, OTPVerify, SendUserOtp, UserPhoneVerify, EditProfileData, DeleteUser, AdminDeleteUser, SendSingupUserOtp } = require("../Controller/AuthController");
const { upload } = require("../Utill/S3");
const {
  getAllReviews,
  approveReview,
  rejectReview,
  adminDeleteReview,
  getReviewStats,
} = require("../Controller/ReviewController");

UserRoute.post("/user/signup", signup)
UserRoute.post("/user/login", UserLogin)
UserRoute.post("/user/send_otp", SendUserOtp)
UserRoute.post("/user/singup/send_otp", SendSingupUserOtp)

UserRoute.post("/user/phone_verify", UserPhoneVerify)
UserRoute.post("/user/otp_verify", OTPVerify)
UserRoute.post("/admin/login", AdminLogin)
UserRoute.get("/admin/alluser", GetAllUser)
UserRoute.get("/user/profile", verifyToken, profilegettoken)
UserRoute.get("/admin/alluser", GetAllUser)

UserRoute.get("/user/delete", verifyToken , DeleteUser)

UserRoute.get("/admin/user/delete/:id", AdminDeleteUser)


UserRoute.post("/user/edit-profile" , verifyToken , upload.single("profileImage"),  EditProfileData)

// ========== ADMIN REVIEW ROUTES ==========
// Middleware to verify admin role
const adminOnly = async (req, res, next) => {
  try {
    const User = require("../Model/User");
    const user = await User.findById(req.user.id);
    if (!user || user.role !== "admin") {
      return res.status(403).json({
        status: false,
        message: "Access denied. Admin privileges required.",
      });
    }
    next();
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Server error",
    });
  }
};

UserRoute.get("/admin/reviews", verifyToken, adminOnly, getAllReviews);
UserRoute.post("/admin/reviews/approve/:reviewId", verifyToken, adminOnly, approveReview);
UserRoute.post("/admin/reviews/reject/:reviewId", verifyToken, adminOnly, rejectReview);
UserRoute.post("/admin/reviews/delete/:reviewId", verifyToken, adminOnly, adminDeleteReview);
UserRoute.get("/admin/reviews/stats", verifyToken, adminOnly, getReviewStats);

module.exports = UserRoute;
