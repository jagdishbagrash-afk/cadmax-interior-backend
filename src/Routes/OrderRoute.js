const router = require("express").Router();
const { addOrder, getAllOrders, getOrdersByUser, updateStatus } = require("../Controller/OrderController");
const { verifyToken } = require("../Utill/tokenVerify");

router.post("/order/add", verifyToken,  addOrder);
router.get("/order/getAll", verifyToken, getAllOrders);  
router.post("/order/status/update/:id", verifyToken, updateStatus);
// This api is used on the user side for showing order history to him.
router.get("/order/getbyUser", verifyToken, getOrdersByUser);       

module.exports = router;