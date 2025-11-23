const express = require('express');
const { addSuperCategory, getAllSuperCategorys, getSuperCategoryById, updateSuperCategory, toggleSuperCategoryStatus } = require("../Controller/SuperCategoryController");
const { addCategory, getAllCategorys, getCategoryById, updateCategory, toggleCategoryStatus } = require('../Controller/CategoryControlller');
const { addSubCategory, getSubCategoryById, getAllSubCategorys, updateSubCategory, toggleSubCategoryStatus } = require('../Controller/SubCategoryController');
const upload = require('../Multer');
const router = express.Router();

//Super Category   List 

router.post("/supercategory/add",

    upload.fields([
        { name: "Image", maxCount: 1 },
    ]),
    addSuperCategory);

router.get("/supercategory/get", getAllSuperCategorys);

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

router.get("/category/get/:id", getCategoryById);

router.post("/category/update/:id", upload.fields([
    { name: "Image", maxCount: 1 },
]), updateCategory);

router.get("/category/status/:id", toggleCategoryStatus);


//Sub Category   List 

router.post("/subcategory/add", upload.fields([
    { name: "Image", maxCount: 1 },
]), addSubCategory);

router.get("/subcategory/get", getAllSubCategorys);

router.get("/subcategory/get/:id", getSubCategoryById);

router.post("/category/update/:id", upload.fields([
    { name: "Image", maxCount: 1 },
]), updateSubCategory);

router.get("/subcategory/status/:id", toggleSubCategoryStatus);


module.exports = router;