const mongoose = require("mongoose");
const categorySchema = mongoose.Schema({
    name: {
        type: String,
        required: true
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
        default: true
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
    { timestamps: true }
);

module.exports = mongoose.model("category", categorySchema);
