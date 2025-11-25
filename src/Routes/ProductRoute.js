const router = require("express").Router();
const { getAllProducts, addProduct, getProductById, updateProduct, deleteProduct } = require("../Controller/ProductController");
const upload = require("../Utill/uploader");

router.post("/product/add", upload.single("image"), addProduct);       
router.get("/product/list", getAllProducts);    
router.get("/product/:id", getProductById);  
router.post("/product/edit/:id", upload.single("image"), updateProduct);  
router.post("/product/delete/:id", deleteProduct);

module.exports = router;