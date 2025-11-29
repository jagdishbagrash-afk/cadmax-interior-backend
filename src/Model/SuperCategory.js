const mongoose = require("mongoose");

const SuperCategorySchema = mongoose.Schema({
    name: {
        type: String,
    },
    Image: {
        type: String,
    },
    deletedAt: {
        type: Date,
        default: null
    },
    status: {
        type: Boolean,
        default: false
    }
},

    { timestamps: true });

module.exports = mongoose.model("SuperCategory", SuperCategorySchema);