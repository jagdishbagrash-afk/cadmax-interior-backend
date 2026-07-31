const mongoose = require("mongoose");
const productsubsubcategorySchema = mongoose.Schema({
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
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "category",
    },
    subcategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "subCategory",
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

module.exports = mongoose.model("productsubsubcategory", productsubsubcategorySchema);
