const mongoose = require("mongoose");

const category = mongoose.Schema({
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

mongoose.model("category", category);