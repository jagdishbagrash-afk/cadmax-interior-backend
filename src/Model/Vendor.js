const mongoose = require("mongoose");

const vendorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },

    experience: {
        type: Number,
        required: true
    },
    sepectailze: {
        type: String,
        required: true
    },

    Image: {
        type: String,
        required: true
    },

    VendorCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "VendorCategory",
        required: true
    },



    phone: {
        type: String,
        required: true
    },
    deletedAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model("Vendor", vendorSchema);
