const { signup, login, resetpassword, profilegettoken, verifyToken, updateProfile } = require("../Controller/AuthController");

const userRoute = require("express").Router();

userRoute.post("/user/signup", signup)
userRoute.post("/user/login", login)

userRoute.post("/user/reset-password", verifyToken, resetpassword)

userRoute.get("/user/profile", verifyToken,  profilegettoken)

userRoute.post("/user/profile-update", verifyToken ,  updateProfile)




module.exports = userRoute;