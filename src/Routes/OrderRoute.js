const router = require("express").Router();
const { addOrder, getAllOrders, getOrdersByUser, updateStatus, getOrderDetailsWeb, getOrderDetailsApp, getOrderById } = require("../Controller/OrderController");
const { verifyToken } = require("../Utill/tokenVerify");

router.post("/order/add", verifyToken, addOrder);
router.get("/order/getAll", getAllOrders);
router.post("/order/status/update/:id", verifyToken, updateStatus);
router.get("/order/getbyUser", verifyToken, getOrdersByUser);   

router.get("/order/:id", getOrderById);


// Order Details APIs based on design screenshot with inner transit tracking hit
router.get("/web/order/details/:orderId", getOrderDetailsWeb);
router.get("/order/web-details/:orderId", getOrderDetailsWeb);
router.get("/order/details/:orderId", getOrderDetailsWeb);
router.get("/order/app-details/:orderId", getOrderDetailsApp);

// ============ ADMIN ORDER MANAGEMENT ============
// All admin endpoints require verifyToken; role=admin check is inside controller
router.get("/admin/orders", verifyToken, getAllOrdersAdmin);
router.post("/admin/order/approve/:id", verifyToken, approveOrder);
router.post("/admin/order/reject/:id", verifyToken, rejectOrder);
router.get("/admin/order/details/:orderId", verifyToken, getOrderDetailsAdmin);

module.exports = router;