const mongoose = require("mongoose");
const ProductSchema = mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    Stock: {
        type: String,
        requirte: true,
        default: "instock",
    },
    productImage: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    superCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "superCategory",
    },
    subcategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "subcategory",
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "category",
    },
    deletedAt: {
        type: Date,
        default: null
    },
},
    {
        timestamps: true
    });

mongoose.model("product", ProductSchema);