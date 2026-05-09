const { AddBanner, UpdateBanner, GetAllBanner, BannerDelete } = require("../Controller/BannerController");
const { upload } = require("../Utill/S3");
const BannerRoute = require("express").Router();
BannerRoute.post("/admin/banner/add",  upload.single("Image"),AddBanner);
BannerRoute.post("/admin/banner/edit/:id", upload.single("Image"), UpdateBanner);
BannerRoute.get("/admin/banner/get", GetAllBanner);
BannerRoute.post("/admin/banner/delete/:id", BannerDelete);
module.exports = BannerRoute;