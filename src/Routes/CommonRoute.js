const { bestSellerProducts, latestProducts } = require("../Controller/CommonController");
const CommonRoute = require("express").Router();

CommonRoute.get("/common/bestseller", bestSellerProducts);

CommonRoute.get("/common/product", latestProducts);



module.exports = CommonRoute;