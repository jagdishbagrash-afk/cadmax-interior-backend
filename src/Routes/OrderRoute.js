const router = require("express").Router();
const { addOrder, getAllOrders, getOrdersByUser, updateStatus } = require("../Controller/OrderController");
const { verifyToken } = require("../Utill/tokenVerify");

router.post("/order/add", verifyToken,  addOrder);
router.get("/order/getAll", getAllOrders);  
router.post("/order/status/update/:id", updateStatus);       
router.get("/order/getbyUser", getOrdersByUser);       

module.exports = router;