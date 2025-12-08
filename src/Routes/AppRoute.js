const { signup, Login, SendOtp, profilegettoken, PhoneVerify, OTPVerify } = require("../Controller/AppController");
const { AddBanner, UpdateBanner, GetAllBanner } = require("../Controller/BannerController");
const { getAllCategorys } = require("../Controller/CategoryControlller");
const { getProductById, getProductBySubCategory } = require("../Controller/ProductController");
const { getSubCategoryByCategory } = require("../Controller/SubCategoryController");
const { upload } = require("../Utill/S3");
const { verifyToken } = require("../Utill/tokenVerify");
const AppRoute = require("express").Router();

AppRoute.post("/app/signup", signup)
AppRoute.post("/app/login", Login)
AppRoute.post("/app/send_otp", SendOtp)
AppRoute.get("/app/user_get", verifyToken ,profilegettoken)
AppRoute.post("/app/phone_verify", PhoneVerify)
AppRoute.post("/app/otp_verify", OTPVerify)
AppRoute.get("/app/category/get", getAllCategorys);
AppRoute.get("/app/subcategory/:id", getSubCategoryByCategory);
AppRoute.get("/product/subcategory/:id", getProductBySubCategory);
AppRoute.get("/app/product/:id", getProductById);  
AppRoute.post("/admin/banner/add",  upload.single("Image"),AddBanner);
AppRoute.post("/admin/banner/edit/:id", upload.single("Image"), UpdateBanner);
AppRoute.get("/admin/banner/get", GetAllBanner);
AppRoute.get("/app/banner/get", GetAllBanner);

module.exports = AppRoute;