const { GetAllBanner } = require("../Controller/BannerController");
const { bestSellerProducts, latestProducts, GetAllCommonProject, deleteImage } = require("../Controller/CommonController");
const CommonRoute = require("express").Router();

CommonRoute.get("/common/bestseller", bestSellerProducts);

CommonRoute.get("/common/product", latestProducts);


CommonRoute.get("/common/project", GetAllCommonProject);

CommonRoute.get("/common/banner", GetAllBanner);

CommonRoute.post("/common/delete-image", deleteImage);


module.exports = CommonRoute;