const router = require("express").Router();
const { getAllProducts, addProduct, getProductById, updateProduct, deleteProduct, getProductByCategory, getProductBySubCategory, getProductByName } = require("../Controller/ProductController");
const { upload } = require("../Utill/S3");

router.post("/product/add", upload.any(), addProduct);       
router.get("/product/list", getAllProducts);    
router.get("/product/:id", getProductById);  
router.post("/product/edit/:id", upload.any(), updateProduct);  
router.post("/product/delete/:id", deleteProduct);
router.get("/product/category/:id", getProductByCategory);
router.get("/product/subcategory/:id", getProductBySubCategory);
router.get("/product/details/:id", getProductByName);  

module.exports = router;