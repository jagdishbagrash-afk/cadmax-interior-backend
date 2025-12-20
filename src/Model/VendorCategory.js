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
    deletedAt: {
        type: Date,
        default: null
    },
    status: {
        type: Boolean,
        default: false
    },
}, { timestamps: true });

module.exports = mongoose.model("VendorCategory", VendorCategorySchema);
