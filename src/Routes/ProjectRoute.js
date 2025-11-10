const express = require("express");
const router = express.Router();
const projectController = require("../Controller/ProjectController");

router.post("/product/add", projectController.addProject);       
router.get("/product/list", projectController.getAllProjects);    
router.get("/product/:id", projectController.getProjectById);  
router.post("/product/edit/:id", projectController.updateProject);  
router.post("/product/delete/:id", projectController.deleteProject);

module.exports = router;
