const express = require("express");
const router = express.Router();
const ProductController = require("../Controller/ProductController");

router.post("/product/add", ProductController.addProject);       
router.get("/product/list", ProductController.getAllProjects);    
router.get("/product/:id", ProductController.getProjectById);  
router.post("/product/edit/:id", ProductController.updateProject);  
router.post("/product/delete/:id", ProductController.deleteProject);

module.exports = router;
