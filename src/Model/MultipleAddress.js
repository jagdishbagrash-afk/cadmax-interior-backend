const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
  userId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User"
},
  pincode: {
    type: String,
  },
  city: {
    type: String,
  },
  state: {
    type: String,
  },
  country: {
    type: String,
  },
  street_address: {
    type: String,
  },
  addressType: {
    type: String,
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true
});

module.exports = mongoose.model("Address", addressSchema);
