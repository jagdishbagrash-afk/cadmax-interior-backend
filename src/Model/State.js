const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema(
  {
    country: {
      type: String,
      required: true,
    },
    countryCode: {
      type: String,
    },
    state: {
      type: String,
      required: true,
    },
    stateCode: {
      type: String,
    },
    cities: [String],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Location", locationSchema);