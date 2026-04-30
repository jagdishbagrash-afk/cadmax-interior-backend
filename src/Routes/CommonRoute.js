const { GetAllBanner } = require("../Controller/BannerController");
const { bestSellerProducts, latestProducts, GetAllCommonProject, deleteImage, LeadWebsite } = require("../Controller/CommonController");
const { verifyToken } = require("../Utill/tokenVerify");
const CommonRoute = require("express").Router();

CommonRoute.get("/common/bestseller", bestSellerProducts);

CommonRoute.get("/common/product", latestProducts);


CommonRoute.get("/common/project", GetAllCommonProject);

CommonRoute.get("/common/banner", GetAllBanner);

CommonRoute.post("/common/delete-image", deleteImage);

CommonRoute.post("/common/lead-form", verifyToken, LeadWebsite);


module.exports = CommonRoute;