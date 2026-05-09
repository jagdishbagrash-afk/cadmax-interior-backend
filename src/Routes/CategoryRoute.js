const express = require('express');
const { addCategory, getAllCategorys, getCategoryById, updateCategory, toggleCategoryStatus, getAllCategoryStatus } = require('../Controller/CategoryControlller');
const { AddSubCategory, GetAllSubCategorys, GetAllSubCategoryStatus, GetSubCategoryById, UpdateSubCategory, ToggleSubCategoryStatus, getSubCategoryByCategory, GetSubCategoryByNameCategory } = require('../Controller/SubCategoryController');
const { upload } = require("../Utill/S3");

const router = express.Router();


// Category   List 


router.post(
    "/category/add",
    upload.single("Image"),
    addCategory
);

router.post(
    "/category/update/:id",
    upload.single("Image"),
    updateCategory
);

router.get("/category/get", getAllCategorys);

router.get("/category/get-status", getAllCategoryStatus);

router.get("/category/get/:id", getCategoryById);

router.get("/category/status/:id", toggleCategoryStatus);

router.get("/category/status", getAllCategoryStatus);

router.get("/subcategory/category/:id", getSubCategoryByCategory);

//Sub Category   List 

router.post("/subcategory/add", upload.single("Image"), AddSubCategory);

router.get("/subcategory/get", GetAllSubCategorys);
router.get("/subcategory/get-status", GetAllSubCategoryStatus);

router.get("/subcategory/get/:id", GetSubCategoryById);

router.post("/subcategory/update/:id", upload.single("Image"), UpdateSubCategory);

router.get("/subcategory/status/:id", ToggleSubCategoryStatus);

router.get("/subcategory/category_name/:name", GetSubCategoryByNameCategory);




module.exports = router;