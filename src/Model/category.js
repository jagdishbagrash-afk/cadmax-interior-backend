const mongoose = require("mongoose");

const categorySchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    Image: {
        type: String,
    },
    deletedAt: {
        type: Date,
        default: null
    },
    SuperCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SuperCategory",   
        required: false
    }
});

module.exports = mongoose.model("category", categorySchema);
