const { verifyToken } = require("../Utill/tokenVerify");
const UserRoute = require("express").Router();
const { signup, AdminLogin, GetAllUser, profilegettoken, UserLogin, OTPVerify, SendUserOtp, UserPhoneVerify, EditProfileData, DeleteUser, AdminDeleteUser, SendSingupUserOtp } = require("../Controller/AuthController");
const { upload } = require("../Utill/S3");
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

module.exports = UserRoute;