const { bestSellerProducts, latestProducts } = require("../Controller/CommonController");
const CommonRoute = require("express").Router();

CommonRoute.get("/common/get", bestSellerProducts);

CommonRoute.get("/common/product", latestProducts);



module.exports = CommonRoute;