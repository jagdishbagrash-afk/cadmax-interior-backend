const { signup, login, resetpassword, profilegettoken, verifyToken, updateProfile } = require("../Controller/AuthController");

const userRoute = require("express").Router();

userRoute.post("/signup", signup)
userRoute.post("/login", login)

userRoute.post("/reset-password", verifyToken, resetpassword)

userRoute.get("/profile", verifyToken,  profilegettoken)

userRoute.post("/profile-update", verifyToken ,  updateProfile)




module.exports = userRoute;