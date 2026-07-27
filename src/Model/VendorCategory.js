const mongoose = require("mongoose");

const VendorCategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    Image: {
        type: String,   // icon url if needed
        default: null
    },
    slug: {
        type: String,
    },
    deletedAt: {
        type: Date,
        default: null
    },
    status: {
        type: Boolean,
        default: false
    },
    meta_title :{
        type: String,
        default: null
    },
    meta_description:{
        type: String,
        default: null
    },
    meta_keywords:{
        type: String,
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model("VendorCategory", VendorCategorySchema);
