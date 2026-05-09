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
        default: false
    },
    slug: {
        type: String,
        required: true
    },

},
    { timestamps: true }
);

module.exports = mongoose.model("category", categorySchema);
