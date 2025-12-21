const mongoose = require("mongoose");

const ServicesSchema = mongoose.Schema({
    desgin: {
        type: String,
    },
    ServicesType: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ServicesType",
        required: [true, "ServicesType is required"],
    },
    slug: {
        type: String,
        required: true
    },
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
    
    },
    area: {
        type: Array,
      
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

module.exports = mongoose.model("Services", ServicesSchema);