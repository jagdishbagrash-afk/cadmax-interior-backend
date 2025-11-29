const express = require('express');
const { addSuperCategory, getAllSuperCategorys, getSuperCategoryById, updateSuperCategory, toggleSuperCategoryStatus, getAllSuperCategoryStatus } = require("../Controller/SuperCategoryController");
const { addCategory, getAllCategorys, getCategoryById, updateCategory, toggleCategoryStatus, getAllCategoryStatus } = require('../Controller/CategoryControlller');
const { AddSubCategory, GetAllSubCategorys, GetAllSubCategoryStatus, GetSubCategoryById, UpdateSubCategory, ToggleSubCategoryStatus, getSubCategoryByCategory } = require('../Controller/SubCategoryController');
const { upload } = require("../Utill/S3");

const router = express.Router();

//Super Category   List 

// router.post("/supercategory/add",

//     uploadFile.fields([
//         { name: "Image", maxCount: 1 },
//     ]),
//     addSuperCategory);
// router.get("/supercategory/get", getAllSuperCategorys);

// router.get("/supercategory/get-status", getAllSuperCategoryStatus);


// router.get("/supercategory/get/:id", getSuperCategoryById);

// router.post("/supercategory/update/:id",
//     uploadFile.fields([
//         { name: "Image", maxCount: 1 },
//     ]), updateSuperCategory);

// router.get("/supercategory/status/:id", toggleSuperCategoryStatus);

// Category   List 


router.post(
    "/category",
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



// router.post("/subcategory/add", uploadFile.fields([
//     { name: "Image", maxCount: 1 },
// ]), AddSubCategory);

// router.get("/subcategory/get", GetAllSubCategorys);
// router.get("/subcategory/get-status", GetAllSubCategoryStatus);


// router.get("/subcategory/get/:id", GetSubCategoryById);

// router.post("/subcategory/update/:id", uploadFile.fields([
//     { name: "Image", maxCount: 1 },
// ]), UpdateSubCategory);

// router.get("/subcategory/status/:id", ToggleSubCategoryStatus);


module.exports = router;