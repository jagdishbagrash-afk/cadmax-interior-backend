const { AddToCart, updateCart, getCart, clearCart } = require("../Controller/AppController");
const { GetAllBanner } = require("../Controller/BannerController");
const { bestSellerProducts, latestProducts, GetAllCommonProject, deleteImage, LeadWebsite , CommonAddToCart, updateCommonCart, removeProductVariantFromCart} = require("../Controller/CommonController");
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




module.exports = CommonRoute;