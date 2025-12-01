const router = require("express").Router();
const { getAllProducts, addProduct, getProductById, updateProduct, deleteProduct, getProductByCategory, getProductBySubCategory } = require("../Controller/ProductController");
const upload = require("../Utill/uploader");

router.post("/product/add", upload.single("image"), addProduct);       
router.get("/product/list", getAllProducts);    
router.get("/product/:id", getProductById);  
router.post("/product/edit/:id", upload.single("image"), updateProduct);  
router.post("/product/delete/:id", deleteProduct);

router.get("/product/category/:id", getProductByCategory);
router.get("/product/subcategory/:id", getProductBySubCategory);


module.exports = router;