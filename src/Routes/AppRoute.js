const { signup, Login, SendOtp, profilegettoken } = require("../Controller/AppController");
const { verifyToken } = require("../Utill/tokenVerify");

const userRoute = require("express").Router();

userRoute.post("/app/signup", signup)
userRoute.post("/app/login", Login)
userRoute.post("/app/send_otp", SendOtp)
userRoute.get("/app/user_get", verifyToken ,profilegettoken)

module.exports = userRoute;