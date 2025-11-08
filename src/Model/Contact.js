

const mongoose = require("mongoose")

const contactSchema = mongoose.Schema({
    email: {
        type: String,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    services: {
        type: String,
        required: true,
    },
    message: {
        type: String,
        required: true
    },
    phone_number: {
        type: Number,
    },
    created_at: {
        type: Date,
        default: Date.now
    },
})

const Contact = mongoose.model("Contact", contactSchema);
module.exports = Contact;