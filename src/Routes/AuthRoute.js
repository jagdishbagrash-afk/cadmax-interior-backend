const { signup, Login, SendOtp, profilegettoken, PhoneVerify, OTPVerify } = require("../Controller/AppController");
const { login, GetAllUser } = require("../Controller/AuthController");
const { verifyToken } = require("../Utill/tokenVerify");
const UserRoute = require("express").Router();

UserRoute.post("/user/signup", signup)
UserRoute.post("/user/login", Login)
UserRoute.post("/user/send_otp", SendOtp)
UserRoute.post("/user/phone_verify", PhoneVerify)
UserRoute.post("/user/otp_verify", OTPVerify)

UserRoute.post("/admin/login", login)

UserRoute.get("/admin/alluser", GetAllUser)

UserRoute.get("/user/profile", verifyToken ,profilegettoken)


module.exports = UserRoute;