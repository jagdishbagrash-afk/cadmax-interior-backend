const router = require("express").Router();
const { addOrder, getAllOrders, getOrdersByUser, updateStatus } = require("../Controller/OrderController");

router.post("/order/add", addOrder); 
router.get("/order/getAll", getAllOrders);  
router.post("/order/status/update/:id", updateStatus);       
router.get("/order/getbyUser", getOrdersByUser);       

module.exports = router;