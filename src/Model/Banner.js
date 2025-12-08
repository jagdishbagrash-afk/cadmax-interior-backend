const mongoose = require("mongoose");

const BannerSchema = mongoose.Schema({
    name: {
        type: String
    },
    link: {
        type: String
    },
    Image: {
        type: String
    }
},

    { timestamps: true }


)

const Bannersection = mongoose.model("banner", BannerSchema)

module.exports = Bannersection;