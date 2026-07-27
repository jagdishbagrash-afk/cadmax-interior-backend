const mongoose = require("mongoose");

const ServicesTypeSchema = mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    slug: {
        type: String,
        required: true
    },
    Image: {
        type: String,
        required: true
    },
    TypeServices: {
        type: String,
        required: true
    },
    deletedAt: {
        type: Date,
        default: null
    },
    status: {
        type: Boolean,
        default: true
    },
      meta_title :{
        type: String,
        default: null
    },
    meta_description:{
        type: String,
        default: null
    },
    meta_keywords:{
        type: String,
        default: null
    }
},
    {
        timestamps: true
    });



module.exports = mongoose.model("ServicesType", ServicesTypeSchema);