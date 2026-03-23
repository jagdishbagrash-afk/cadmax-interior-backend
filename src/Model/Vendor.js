const mongoose = require("mongoose");

const vendorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    experience: {
        type: String,
        required: true
    },
    specialization: {
        type: String,
        required: true
    },
    content :{type :String},

    Image: {
        type: String,
        required: true
    },

    VendorCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "VendorCategory",
        required: true
    },
    slug: {
        type: String
    },
    multiple_images: {
        type: Array
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
