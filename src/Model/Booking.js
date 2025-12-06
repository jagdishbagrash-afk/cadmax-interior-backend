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
        type: String
    },
    subtotal: {
        type: String
    },
    taxes: {
        type: String
    },
    total_amount: {
        type: String
    }

})


module.exports = mongoose.model("booking", bookingschema)