const mongoose = require("mongoose");
const ProjectSchema = mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    Stock: {
        type: String,
        requirte: true,
        default: "instock",
    },
    productImage: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    category :{
    
    },
    deletedAt: {
        type: Date,
        default: null
    },

},
    {
        timestamps: true
    });

mongoose.model("Project", ProjectSchema);