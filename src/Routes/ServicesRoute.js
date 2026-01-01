const express = require("express");
const router = express.Router();
const servicesController = require("../Controller/ServicesController.js");
const { upload } = require("../Utill/S3.js");

router.post("/services/type/add", upload.single("Image"), servicesController.AddServiceType);
router.get("/services/type/list", servicesController.getAllServicesType);
router.post("/services/type/edit/:id", upload.single("Image"), servicesController.UpdateServicesType);
router.get("/services/type/delete/:id", servicesController.DeleteServicesType);

router.post("/services/add", upload.fields([
    { name: "Image", maxCount: 1 },
    { name: "images[]", maxCount: 10 },
]), servicesController.AddService);


router.get("/services/list", servicesController.getAllServices);
router.post("/services/edit/:id", upload.fields([
    { name: "Image", maxCount: 1 },
    { name: "images[]", maxCount: 10 },
]), servicesController.UpdateServices);
router.get("/services/delete/:id", servicesController.DeleteServices);

router.get("/services/images/delete/:projectId/:images", servicesController.DeleteAWSImages)

//

// fronted 

router.get("/services/type", servicesController.gettypeservices);

router.get("/type-services/:id", servicesController.GetServiceTypeId);

router.get("/services/details/:slug", servicesController.GetServiceDataTypeId);

// router.get("/services/list/:id", servicesController.getServiceById);  
// router.post("/services/edit/:id", upload.single("image"), servicesController.updateService);   
// router.post("/services/delete/:id", servicesController.deleteService);

router.post("/services/contact-add", servicesController.ServicesUserPost);

router.get("/services/contact-get", servicesController.ServciesUserGet);


module.exports = router;
