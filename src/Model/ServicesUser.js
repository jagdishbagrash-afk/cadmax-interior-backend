const mongoose = require("mongoose");

const ServicesTypeSchema = mongoose.Schema({
    ServicesType: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ServicesType",
        required: [true, "ServicesType is required"],
    },
    concept: {
        type: String,
        required: true
    },
    Services: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Services",
        required: [true, "Services is required"],
    },

    User: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "User is required"],
    },
    deletedAt: {
        type: Date,
        default: null
    },
    status: {
        type: Boolean,
        default: true
    }
},
    {
        timestamps: true
    });



module.exports = mongoose.model("ServicesType", ServicesTypeSchema);