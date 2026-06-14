const { signup, Login, SendOtp, profilegettoken, PhoneVerify, OTPVerify, AppOrder, getAllCategorys, getSubCategoryByCategory, getProductBySubCategory, getProductById, AddToCart, getCart, GetAllProject, GetServicesType, GetServiceTypeId, GetServicesDetails, ConceptUserPost, removeProductVariantFromCart, EditProfile, BookingAppAdd, GetVendorCatApp, GetAllVendor, GetVendorCategory, updateCart, clearCart, OrderList, bestSellerProducts, latestProducts, GetAllServicesSubCategorys, getAllBookings, AppDeleteUser, AppAllVendors, globalSearch, LeadApp, GetAllRecordServicesSubCategorys } = require("../Controller/AppController");
const { GetAllBanner } = require("../Controller/BannerController");
const ServciesSubCategoryController = require("../Controller/ServciesSubCategoryController.js");
const MultipleAddressController = require("../Controller/MultipleAddressController");

const { upload } = require("../Utill/S3");
const { verifyToken } = require("../Utill/tokenVerify");
const { removeFromWishlist, removeFromWishlistByProductId, getWishlist } = require("../Controller/WishlistController.js");
const {
  addReview,
  updateReview,
  deleteReview,
  getProductReviews,
  getProductRatingSummary,
  markHelpful,
  markNotHelpful,
  checkReviewEligibility,
} = require("../Controller/ReviewController");
const {
  uploadReviewImages,
  deleteReviewImage,
} = require("../Controller/ReviewImageController");
const AppRoute = require("express").Router();


// With Auth 
AppRoute.post("/app/signup", signup)
AppRoute.post("/app/login", Login)
AppRoute.post("/app/send_otp", SendOtp)
AppRoute.post("/app/otp_verify", OTPVerify)
AppRoute.get("/app/user_get", verifyToken, profilegettoken)
AppRoute.post("/app/phone_verify", PhoneVerify)
AppRoute.get("/app/product/:id", getProductById);
AppRoute.post("/app/cart/add", verifyToken, AddToCart);
AppRoute.post("/app/cart/update", verifyToken, updateCart);
AppRoute.get("/app/cart/get", verifyToken, getCart);
AppRoute.get("/app/cart/clear", verifyToken, clearCart);
AppRoute.get("/app/cart/remove/:productId/:variant", verifyToken, removeProductVariantFromCart)
AppRoute.post("/app/order/add", verifyToken, AppOrder);
AppRoute.get("/app/order/list", verifyToken, OrderList);
AppRoute.post("/app/concept/user", verifyToken, ConceptUserPost);
AppRoute.post("/app/booking/add", verifyToken, BookingAppAdd);
AppRoute.post("/app/booking/get", verifyToken, getAllBookings);
AppRoute.post("/app/user/edit-profile", verifyToken, upload.single("profile_image"), EditProfile)
AppRoute.post("/app/address-add", verifyToken, MultipleAddressController.addAddress);
AppRoute.get("/app/address/list", verifyToken, MultipleAddressController.getAddresses);
AppRoute.get("/app/address/:id", MultipleAddressController.getAddressById);
AppRoute.post("/app/address/update/:id", verifyToken, MultipleAddressController.updateAddress);
AppRoute.get("/app/address/default/:id", verifyToken, MultipleAddressController.setDefaultAddress);
AppRoute.get("/app/address/delete/:id", MultipleAddressController.DeleteAddress);
AppRoute.post("/app/user/delete", verifyToken, AppDeleteUser)

// Witout Auth 

AppRoute.get("/app/banner/get", GetAllBanner);
AppRoute.get("/app/category/get", getAllCategorys);
AppRoute.get("/app/concept/type", GetServicesType);
AppRoute.get("/app/bestseller", bestSellerProducts);
AppRoute.get("/app/desgin-concept", GetAllServicesSubCategorys);
AppRoute.get("/app/latest-product", latestProducts);
AppRoute.get("/app/vendor/category", GetVendorCatApp);
AppRoute.get("/app/project/list", GetAllProject);
AppRoute.get("/app/concept/:id", GetServiceTypeId);
AppRoute.get("/app/vendor/:id", GetVendorCategory);

AppRoute.get("/app/vendor-get", AppAllVendors);
AppRoute.get("/app/concept/details/:id", GetServicesDetails);
AppRoute.get("/app/subcategory/:id", getSubCategoryByCategory);
AppRoute.get("/app/product/subcategory/:id", getProductBySubCategory);
AppRoute.get("/app/services/subcategory/list", GetAllRecordServicesSubCategorys);
AppRoute.get("/app/search-name", globalSearch);
AppRoute.post("/app/lead-form", verifyToken, LeadApp);


AppRoute.get("/app/wishlist/get", verifyToken, getWishlist);

AppRoute.post("/app/wishlist/remove", verifyToken, removeFromWishlist);

AppRoute.delete("/app/wishlist/delete/:productId", verifyToken, removeFromWishlistByProductId);
AppRoute.post("/app/wishlist/add", verifyToken, addToWishlist);



// ========== APP REVIEW ROUTES ==========
// Public
AppRoute.get("/app/review/product/:productId", getProductReviews);
AppRoute.get("/app/review/rating-summary/:productId", getProductRatingSummary);

// Authenticated
AppRoute.post("/app/review/add", verifyToken, addReview);
AppRoute.post("/app/review/update/:reviewId", verifyToken, updateReview);
AppRoute.post("/app/review/delete/:reviewId", verifyToken, deleteReview);
AppRoute.post("/app/review/helpful/:reviewId", verifyToken, markHelpful);
AppRoute.post("/app/review/not-helpful/:reviewId", verifyToken, markNotHelpful);
AppRoute.get("/app/review/eligibility/:productId", verifyToken, checkReviewEligibility);
AppRoute.post("/app/review/images/upload/:reviewId", verifyToken, upload.array("reviewImages", 5), uploadReviewImages);
AppRoute.post("/app/review/images/delete/:reviewId/:imageIndex", verifyToken, deleteReviewImage);

module.exports = AppRoute;
