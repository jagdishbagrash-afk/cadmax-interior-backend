const express = require("express");
const router = express.Router();
const servicesController = require("../Controller/ServicesController.js");
const { upload } = require("../Utill/S3.js");

router.post("/services/type/add", upload.single("Image"),  servicesController.AddServiceType);        
router.get("/services/type/list", servicesController.getAllServicesType);   
router.post("/services/type/edit/:id", upload.single("Image"), servicesController.UpdateServicesType);   
router.get("/services/type/delete/:id", servicesController.DeleteServicesType);


router.post("/services/add", upload.single("image"),  servicesController.addService);        
router.get("/services/list", servicesController.getAllServices);    
router.get("/services/list/:id", servicesController.getServiceById);  
router.post("/services/edit/:id", upload.single("image"), servicesController.updateService);   
router.post("/services/delete/:id", servicesController.deleteService);
module.exports = router;
