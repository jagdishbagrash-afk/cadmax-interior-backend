const mongoose = require("mongoose");

const OrderBuySchema = new mongoose.Schema({
    orderId: {
        type: String,
        required: true,
    },
    UserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    ProductId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    OrderCount: {
        type: Number,
        required: true,
    }
}, { timestamps: true });

module.exports = mongoose.model("OrderBuy", OrderBuySchema);
