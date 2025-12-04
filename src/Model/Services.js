const mongoose = require("mongoose");

const ServicesSchema = mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    Image: {
        type: String,
        required: true
    },
    scope: {
        type: Array,
        required: true
    },
    area: {
        type: Array,
        required: true
    },
    deletedAt: {
        type: Date,
        default: null
    }
},
    {
        timestamps: true
    });

mongoose.model("Services", ServicesSchema);