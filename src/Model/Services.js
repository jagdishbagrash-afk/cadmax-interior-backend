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
    servicesImage: {
        type: String,
        required: true
    },
},
    {
        timestamps: true
    });

mongoose.model("Services", ServicesSchema);