const router = require("express").Router();
const { paymentAdd, createOrder, PaymentGet, createRazorpayOrder } = require("../Controller/PaymentController");
const { verifyToken } = require("../Utill/tokenVerify");

router.post("/verify-payment", verifyToken, paymentAdd);

router.post("/create", createOrder);

router.post("/payment/create-razorpay-order", createRazorpayOrder);

router.get("/payment-get", PaymentGet);


module.exports = router;