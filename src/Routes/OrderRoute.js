const router = require("express").Router();
const { addOrder, getAllOrders, getOrdersByUser } = require("../Controller/OrderController");

router.post("/order/add", addOrder); 
router.get("/order/getAll", getAllOrders);       
router.get("/order/getbyUser", getOrdersByUser);       

module.exports = router;