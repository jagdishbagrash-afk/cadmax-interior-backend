const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema(
  {
    title: { type: String,  },
    type: { type: String,  },

    message: { type: String },
    name :  String,
    email :String ,
    phone :String,
    services: { type: String },
    category: { type: String },
    pageurl: String,
    source: {
      type: String,
      default: "Website",
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    notes: String,

    location: String,
    company: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Lead", leadSchema);