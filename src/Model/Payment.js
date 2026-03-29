const mongoose = require('mongoose');


const paymentSchema = new mongoose.Schema({
  order_id: {
    type: String,
    required: true,
  },
  payment_id: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: "INR"
  },
  status: {
    type: String,
    default: 'pending',
  },
  payment_status: {
    type: String,
    default: 'pending',
  },
  OrderID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  type: {
    type: String,
  },
  payment_date: {
    type: Date,
    default: Date.now,
  },
});

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
