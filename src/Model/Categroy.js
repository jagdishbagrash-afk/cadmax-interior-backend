const mongoose = require("mongoose");

const categroy = mongoose.Schema({
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

mongoose.model("categroy", categroy);