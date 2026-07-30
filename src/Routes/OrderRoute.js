const router = require("express").Router();
const { addOrder, getAllOrders, getOrdersByUser, updateStatus, getOrderDetailsWeb, getOrderDetailsApp } = require("../Controller/OrderController");
const { verifyToken } = require("../Utill/tokenVerify");
router.post("/order/add", verifyToken,  addOrder);
router.get("/order/getAll", getAllOrders);  
router.post("/order/status/update/:id", verifyToken, updateStatus);
router.get("/order/getbyUser", verifyToken, getOrdersByUser);       

// Order Details APIs based on design screenshot with inner transit tracking hit
router.get("/web/order/details/:orderId", getOrderDetailsWeb);
router.get("/order/web-details/:orderId", getOrderDetailsWeb);
router.get("/order/details/:orderId", getOrderDetailsWeb);

module.exports = router;