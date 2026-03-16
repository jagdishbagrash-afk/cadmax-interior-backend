const { bestSellerProducts, latestProducts, GetAllCommonProject } = require("../Controller/CommonController");
const CommonRoute = require("express").Router();

CommonRoute.get("/common/bestseller", bestSellerProducts);

CommonRoute.get("/common/product", latestProducts);


CommonRoute.get("/common/project", GetAllCommonProject);




module.exports = CommonRoute;