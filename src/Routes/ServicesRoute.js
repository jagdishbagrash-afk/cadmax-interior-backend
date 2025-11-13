const express = require("express");
const router = express.Router();
const servicesController = require("../Controller/ServicesController.js");

router.post("/services/add", servicesController.addService);        
router.get("/services/list", servicesController.getAllServices);    
router.get("/services/list/:id", servicesController.getServiceById);  
router.post("/services/edit/:id", servicesController.updateService);   
router.post("/services/delete/:id", servicesController.deleteService);

module.exports = router;
