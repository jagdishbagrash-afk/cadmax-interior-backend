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

},

    { timestamps: true });

module.exports = mongoose.model("SuperCategory", SuperCategorySchema);