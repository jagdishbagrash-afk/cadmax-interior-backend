const express = require("express");
const router = express.Router();
const VendorController = require("../Controller/VendorController.js");
const { upload } = require("../Utill/S3.js");

router.post("/vendor/category/add", upload.single("Image"),  VendorController.AddVendorCategory);        
router.get("/vendor/category/list", VendorController.getAllVendorCategorys);    

router.post("/vendor/category/edit/:id", upload.single("Image"),   VendorController.updateCategory);   

router.post("/vendor/add", upload.single("Image"),  VendorController.AddVendor);        
router.get("/vendor/list", VendorController.getAllVendors);    

router.post("/vendor/edit/:id", upload.single("Image"),   VendorController.updatevendor);   


router.get("/vendor/delete/:id", VendorController.DeleteVendor);


router.get("/vendor/get", VendorController.getVendors);    


// router.get("/vendor/category/list/:id", VendorController.getServiceById);  
// router.post("/vendor/category/delete/:id", VendorController.deleteService);
module.exports = router;
