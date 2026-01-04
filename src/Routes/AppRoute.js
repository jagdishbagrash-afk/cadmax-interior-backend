const { signup, Login, SendOtp, profilegettoken, PhoneVerify, OTPVerify, AppOrder, getAllCategorys, getSubCategoryByCategory, getProductBySubCategory, getProductById, AddToCart, getCart, GetAllProject, GetServicesType, GetServiceTypeId, GetServicesDetails, ConceptUserPost, removeProductVariantFromCart, EditProfile } = require("../Controller/AppController");
const {  GetAllBanner  } = require("../Controller/BannerController");
const { upload } = require("../Utill/S3");
const { verifyToken } = require("../Utill/tokenVerify");
const AppRoute = require("express").Router();
AppRoute.post("/app/signup", signup)
AppRoute.post("/app/login", Login)
AppRoute.post("/app/send_otp", SendOtp)
AppRoute.get("/app/user_get", verifyToken ,profilegettoken)
AppRoute.post("/app/phone_verify", PhoneVerify)
AppRoute.post("/app/otp_verify", OTPVerify)
AppRoute.get("/app/category/get",getAllCategorys);
AppRoute.get("/app/subcategory/:id", getSubCategoryByCategory);
AppRoute.get("/app/product/subcategory/:id", getProductBySubCategory);
AppRoute.get("/app/product/:id", getProductById);  
AppRoute.get("/app/banner/get", GetAllBanner);

AppRoute.post("/app/cart/add", verifyToken, AddToCart); 
AppRoute.get("/app/cart/get", verifyToken, getCart);
AppRoute.get("/app/cart/remove/:productId/:variant" , verifyToken , removeProductVariantFromCart)

AppRoute.post("/app/order/add", verifyToken ,  AppOrder); 

AppRoute.get("/app/project/list", GetAllProject);

AppRoute.get("/app/concept/type", GetServicesType);


AppRoute.get("/app/concept/:id", GetServiceTypeId);


AppRoute.get("/app/concept/details/:id", GetServicesDetails);

AppRoute.post("/app/concept/user", ConceptUserPost);


AppRoute.post("/app/user/edit-profile" , verifyToken , upload.single("profileImage"),  EditProfile)


module.exports = AppRoute;
