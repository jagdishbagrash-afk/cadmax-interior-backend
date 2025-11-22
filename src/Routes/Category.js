const express = require('express');
const { addSuperCategory, getAllSuperCategorys, getSuperCategoryById, updateSuperCategory, deleteSuperCategory } = require("../Controller/SuperCategory");
const { addCategory, getAllCategorys, getCategoryById, updateCategory, deleteCategory } = require('../Controller/CategoryControlller');
const { addSubCategory, getSubCategoryById, getAllSubCategorys, updateSubCategory, deleteSubCategory } = require('../Controller/SubCategory');
const router = express.Router();

//Super Category   List 

router.post("/supercategory/add", addSuperCategory);

router.get("/supercategory/get", getAllSuperCategorys);

router.get("/supercategory/get/:id", getSuperCategoryById);

router.post("/supercategory/update/:id", updateSuperCategory);

router.get("/supercategory/delete/:id", deleteSuperCategory);



// Category   List 

router.post("/category/add", addCategory);

router.get("/category/get", getAllCategorys);

router.get("/category/get/:id", getCategoryById);

router.post("/category/update/:id", updateCategory);

router.get("/category/delete/:id", deleteCategory);



//Sub Category   List 

router.post("/subcategory/add", addSubCategory);

router.get("/subcategory/get", getAllSubCategorys);

router.get("/subcategory/get/:id", getSubCategoryById);

router.post("/category/update/:id", updateSubCategory);

router.get("/category/delete/:id", deleteSubCategory);


module.exports = router;