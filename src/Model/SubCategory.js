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
    superCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "superCategory",
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "subCategory",
    },
   
});

module.exports = mongoose.model("subCategory", categorySchema);
