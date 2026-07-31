const mongoose = require("mongoose");

const SuperCategorySchema = mongoose.Schema({
    name: {
        type: String,
    },
    Image: {
        type: String,
    },
    deletedAt: {
        type: Date,
        default: null
    },
    status: {
        type: Boolean,
        default: false
    },
    slug: {
        type: String,
        required: true
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

    { timestamps: true });

module.exports = mongoose.model("SuperCategory", SuperCategorySchema);