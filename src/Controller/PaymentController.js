const Payment = require("../Model/Payment");
const Razorpay = require('razorpay');
const catchAsync = require("../Utill/catchAsync");
require('dotenv').config(); 


const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
  
  exports.createOrder = async (req, res) => {
    const { amount, currency = 'INR', receipt } = req.body; 
    try {
      const options = {
        amount: amount*100, 
        currency,
        receipt,
        payment_capture: 1, 
      };
  
      const order = await razorpayInstance.orders.create(options);
  
      res.status(200).json({
        success: true,
        orderId: order.id,
        currency: order.currency,
        amount: order.amount,
      });
    } catch (error) {
      console.error('Order creation error:', error); 
      res.status(500).json({ success: false, message: 'Order creation failed', error: error.message });
    }
  };

  exports.paymentAdd = catchAsync(async (req, res) => {
    const { order_id, payment_id, amount, currency, payment_status, product_name,type ,product_id } = req.body;
    const status = payment_status === 'failed' ? 'failed' : 'success';
    const payment = new Payment({
        order_id: order_id,
        currency: currency,
        payment_id: payment_id,
        amount: amount,
        payment_status: payment_status,
        product_name,
        type,
        status: status, 
        product_id 
    });

    await payment.save();
    if (payment_status === 'failed') {
        return res.status(200).json({ status: 'failed', message: 'Payment failed and saved successfully' });
    } else {
        return res.status(200).json({ status: 'success', message: 'Payment verified and saved successfully' });
    }
});



exports.PaymentGet = catchAsync(async (req, res, next) => {
  try {
    const payment = await Payment.find({}).sort({payment_date:-1});
    if (!payment || payment.length === 0) {
      return res.status(204).json({
        status: false,
        message: "No Payment found for this user.",
        Payment: [],
      });
    }
    res.status(200).json({
      status: true,
      message: "Payment retrieved successfully!",
      Payment: payment,
    });
  } catch (err) {
    console.error("Error retrieving payments:", err.message); 
    return res.status(500).json({
      status: false,
      message: "An unknown error occurred. Please try again later.",
      error: err.message, 
    });
  }
});

