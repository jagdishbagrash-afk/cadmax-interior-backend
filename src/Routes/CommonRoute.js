const { GetAllBanner } = require("../Controller/BannerController");
const { bestSellerProducts, latestProducts, GetAllCommonProject, getCart ,clearCart ,deleteImage, LeadWebsite , CommonAddToCart, updateCommonCart, removeProductVariantFromCart, testNotification, globalSearch} = require("../Controller/CommonController");
const { verifyToken } = require("../Utill/tokenVerify");
const CommonRoute = require("express").Router();
CommonRoute.get("/common/bestseller", bestSellerProducts);

CommonRoute.get("/common/product", latestProducts);

CommonRoute.get("/common/project", GetAllCommonProject);

CommonRoute.get("/common/banner", GetAllBanner);

CommonRoute.post("/common/delete-image", deleteImage);

CommonRoute.post("/common/lead-form", verifyToken, LeadWebsite);


CommonRoute.post("/cart/add", verifyToken, CommonAddToCart);
CommonRoute.post("/cart/update", verifyToken, updateCommonCart);
CommonRoute.get("/cart/get", verifyToken, getCart);
CommonRoute.get("/cart/clear", verifyToken, clearCart);

CommonRoute.get("/cart/remove/:productId/:variant", verifyToken, removeProductVariantFromCart)


CommonRoute.post("/test-notification", testNotification);


CommonRoute.get("/global-search", globalSearch);


module.exports = CommonRoute;