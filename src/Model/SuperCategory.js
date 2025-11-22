const mongoose = require("mongoose");

const SuperCategory = mongoose.Schema({
    name: {
        type: String,
    },
    Image: {
        type: String,
    },
    deletedAt: {
        type: Date,
        default: null
    }
});

mongoose.model("superCategory", SuperCategory);