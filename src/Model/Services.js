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
     ServicesSubCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ServicesSubCategory",
        required: true
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
    concept : {
        type :String ,
        required  : true

    },
    timeline: {
        type: String,
    },
    cost :{
        type :String
    },
    area: {
        type: String,
    },
    material_details: {
        type: String,
    },
    multiple_images :{
        type :Array
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