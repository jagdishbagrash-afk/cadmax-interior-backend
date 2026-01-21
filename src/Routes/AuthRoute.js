const { verifyToken } = require("../Utill/tokenVerify");
const UserRoute = require("express").Router();
const { signup, AdminLogin, GetAllUser, profilegettoken, UserLogin, OTPVerify, SendUserOtp, UserPhoneVerify, EditProfileData } = require("../Controller/AuthController");
const { upload } = require("../Utill/S3");
UserRoute.post("/user/signup", signup)
UserRoute.post("/user/login", UserLogin)
UserRoute.post("/user/send_otp", SendUserOtp)
UserRoute.post("/user/phone_verify", UserPhoneVerify)
UserRoute.post("/user/otp_verify", OTPVerify)
UserRoute.post("/admin/login", AdminLogin)
UserRoute.get("/admin/alluser", GetAllUser)
UserRoute.get("/user/profile", verifyToken, profilegettoken)
UserRoute.post("/user/edit-profile" , verifyToken , upload.single("profileImage"),  EditProfileData)

module.exports = UserRoute;