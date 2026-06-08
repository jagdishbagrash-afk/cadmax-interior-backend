const express = require('express');
const { addCategory, getAllCategorys, getCategoryById, updateCategory, toggleCategoryStatus, getAllCategoryStatus, deleteCategory } = require('../Controller/ProductCategoryControlller');
const { AddSubCategory, GetAllSubCategorys, GetAllSubCategoryStatus, GetSubCategoryById, UpdateSubCategory, ToggleSubCategoryStatus, getSubCategoryByCategory, GetSubCategoryByNameCategory, deleteSubCategory } = require('../Controller/ProductSubCategoryController');
const { upload } = require("../Utill/S3");
const { addProductSubSubCategory, getAllProductSubSubCategorys, getProductSubSubCategoryById ,UpdateProductSubSubCategory } = require('../Controller/ProductSubSubCategory');

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



router.get("/subcategory/delete/:id", deleteSubCategory);


router.get("/category/delete/:id", deleteCategory);



router.post("/productsubsubcategory/add", upload.single("Image"), addProductSubSubCategory);

router.get("/productsubsubcategory/get", getAllProductSubSubCategorys);

router.get("/productsubsubcategory/get/:id", getProductSubSubCategoryById);

router.post("/productsubsubcategory/update/:id", upload.single("Image"), UpdateProductSubSubCategory)


module.exports = router;