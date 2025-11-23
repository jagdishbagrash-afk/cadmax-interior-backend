const express = require('express');
const { addSuperCategory, getAllSuperCategorys, getSuperCategoryById, updateSuperCategory, deleteSuperCategory } = require("../Controller/SuperCategoryController");
const { addCategory, getAllCategorys, getCategoryById, updateCategory, deleteCategory } = require('../Controller/CategoryControlller');
const { addSubCategory, getSubCategoryById, getAllSubCategorys, updateSubCategory, deleteSubCategory } = require('../Controller/SubCategoryController');
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

router.post("/supercategory/update/:id", updateSuperCategory);

router.get("/supercategory/delete/:id", deleteSuperCategory);



// Category   List 

router.post("/category/add", upload.fields([
    { name: "Image", maxCount: 1 },
]), addCategory);

router.get("/category/get", getAllCategorys);

router.get("/category/get/:id", getCategoryById);

router.post("/category/update/:id", updateCategory);

router.get("/category/delete/:id", deleteCategory);



//Sub Category   List 

router.post("/subcategory/add", upload.fields([
    { name: "Image", maxCount: 1 },
]), addSubCategory);

router.get("/subcategory/get", getAllSubCategorys);

router.get("/subcategory/get/:id", getSubCategoryById);

router.post("/category/update/:id", updateSubCategory);

router.get("/category/delete/:id", deleteSubCategory);


module.exports = router;