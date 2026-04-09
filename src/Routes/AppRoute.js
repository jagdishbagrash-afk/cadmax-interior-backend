const { signup, Login, SendOtp, profilegettoken, PhoneVerify, OTPVerify, AppOrder, getAllCategorys, getSubCategoryByCategory, getProductBySubCategory, getProductById, AddToCart, getCart, GetAllProject, GetServicesType, GetServiceTypeId, GetServicesDetails, ConceptUserPost, removeProductVariantFromCart, EditProfile, BookingAppAdd, GetVendorCatApp, GetAllVendor, GetVendorCategory, updateCart, clearCart, OrderList, bestSellerProducts, latestProducts, GetAllServicesSubCategorys, getAllBookings } = require("../Controller/AppController");
const {  GetAllBanner  } = require("../Controller/BannerController");
const ServciesSubCategoryController = require("../Controller/ServciesSubCategoryController.js");
const MultipleAddressController = require("../Controller/MultipleAddressController");

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
AppRoute.post("/app/cart/update", verifyToken, updateCart); 
AppRoute.get("/app/cart/get", verifyToken, getCart);
AppRoute.get("/app/cart/clear", verifyToken, clearCart); 
AppRoute.get("/app/cart/remove/:productId/:variant" , verifyToken , removeProductVariantFromCart)

AppRoute.post("/app/order/add" ,  AppOrder); 

AppRoute.get("/app/order/list", verifyToken ,  OrderList); 

AppRoute.get("/app/project/list", GetAllProject);

AppRoute.get("/app/concept/type", GetServicesType);


AppRoute.get("/app/concept/:id", GetServiceTypeId);


AppRoute.get("/app/concept/details/:id", GetServicesDetails);

AppRoute.post("/app/concept/user", verifyToken, ConceptUserPost);

AppRoute.post("/app/booking/add",verifyToken, BookingAppAdd);

AppRoute.post("/app/booking/get",verifyToken, getAllBookings);

AppRoute.get("/app/vendor/category", GetVendorCatApp);

AppRoute.get("/app/vendor/:id",   GetVendorCategory);   

AppRoute.post("/app/user/edit-profile" , verifyToken , upload.single("profileImage"),  EditProfile)

AppRoute.get("/app/bestseller", bestSellerProducts);

AppRoute.get("/app/latest-product", latestProducts);

AppRoute.get("/app/desgin-concept", GetAllServicesSubCategorys);    

AppRoute.get("/app/services/subcategory/list", ServciesSubCategoryController.GetAllServicesSubCategorys);

AppRoute.post("/app/address-add", verifyToken , MultipleAddressController.addAddress);

AppRoute.get("/app/address/list", verifyToken, MultipleAddressController.getAddresses);

AppRoute.get("/app/address/:id", MultipleAddressController.getAddressById);

AppRoute.post("/app/address/update/:id",verifyToken, MultipleAddressController.updateAddress);

AppRoute.get("/app/address/default/:id",  verifyToken, MultipleAddressController.setDefaultAddress);

AppRoute.get("/app/address/delete/:id", MultipleAddressController.DeleteAddress);



module.exports = AppRoute;
