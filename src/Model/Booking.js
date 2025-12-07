const mongoose = require("mongoose");

const bookingschema = mongoose.Schema({
    project_type: {
        type: String,
    },
    servcies_model: {
        type: String,
    },
    area: {
        type: String
    },
    budget_range: {
        type: String
    },
    finish_level: {
        type: String
    },
    scope: {
        type: String
    },
    name: {
        type: String
    },
    email: {
        type: String
    },
    phone_number: {
        type: String
    },
    city: {
        type: String
    },
    phone_mode: {
        type: String
    },
    timeLine: {
        type: String
    },
    rate: {
        type: Number
    },
    subtotal: {
        type: Number
    },
    taxes: {
        type: Number
    },
    total_amount: {
        type: Number
    }
})
module.exports = mongoose.model("booking", bookingschema)