const { signup, login, profilegettoken } = require("../Controller/AuthController");
const { verifyToken } = require("../Utill/tokenVerify");

const userRoute = require("express").Router();

userRoute.post("/user/signup", signup)
userRoute.post("/user/login", login)

// userRoute.post("/user/reset-password", verifyToken, resetpassword)

userRoute.get("/user/profile", verifyToken,  profilegettoken)

// userRoute.post("/user/profile-update", verifyToken ,  updateProfile)


module.exports = userRoute;