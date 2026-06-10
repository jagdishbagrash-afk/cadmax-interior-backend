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

},
    { timestamps: true }
);

module.exports = mongoose.model("productsubsubcategory", productsubsubcategorySchema);
