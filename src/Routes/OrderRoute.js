const router = require("express").Router();
const { addOrder, getAllOrders, getOrdersByUser, updateStatus } = require("../Controller/OrderController");
const { verifyToken } = require("../Utill/tokenVerify");
router.post("/order/add", verifyToken,  addOrder);
router.get("/order/getAll", getAllOrders);  
router.post("/order/status/update/:id", verifyToken, updateStatus);
router.get("/order/getbyUser", verifyToken, getOrdersByUser);       

module.exports = router;