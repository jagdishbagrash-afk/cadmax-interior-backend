const express = require('express');
const { addSuperCategory, getAllSuperCategorys, getSuperCategoryById, updateSuperCategory, toggleSuperCategoryStatus, getAllSuperCategoryStatus } = require("../Controller/SuperCategoryController");
const { addCategory, getAllCategorys, getCategoryById, updateCategory, toggleCategoryStatus, getAllCategoryStatus } = require('../Controller/CategoryControlller');
const upload = require('../Multer');
const { AddSubCategory, GetAllSubCategorys, GetAllSubCategoryStatus, GetSubCategoryById, UpdateSubCategory, ToggleSubCategoryStatus } = require('../Controller/SubCategoryController');
const router = express.Router();

//Super Category   List 

router.post("/supercategory/add",

    upload.fields([
        { name: "Image", maxCount: 1 },
    ]),
    addSuperCategory);

router.get("/supercategory/get", getAllSuperCategorys);

router.get("/supercategory/get-status", getAllSuperCategoryStatus);


router.get("/supercategory/get/:id", getSuperCategoryById);

router.post("/supercategory/update/:id",
    upload.fields([
        { name: "Image", maxCount: 1 },
    ]), updateSuperCategory);

router.get("/supercategory/status/:id", toggleSuperCategoryStatus);

// Category   List 

router.post("/category/add", upload.fields([
    { name: "Image", maxCount: 1 },
]), addCategory);

router.get("/category/get", getAllCategorys);

router.get("/category/get-status", getAllCategoryStatus);

router.get("/category/get/:id", getCategoryById);

router.post("/category/update/:id", upload.fields([
    { name: "Image", maxCount: 1 },
]), updateCategory);

router.get("/category/status/:id", toggleCategoryStatus);

router.get("/category/status", getAllCategoryStatus);



//Sub Category   List 

router.post("/subcategory/add", upload.fields([
    { name: "Image", maxCount: 1 },
]), AddSubCategory);

router.get("/subcategory/get", GetAllSubCategorys);
router.get("/subcategory/get-status", GetAllSubCategoryStatus);


router.get("/subcategory/get/:id", GetSubCategoryById);

router.post("/subcategory/update/:id", upload.fields([
    { name: "Image", maxCount: 1 },
]), UpdateSubCategory);

router.get("/subcategory/status/:id", ToggleSubCategoryStatus);


module.exports = router;