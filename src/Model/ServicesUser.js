const mongoose = require("mongoose");

const ServicesUserSchema = new mongoose.Schema(
  {
    ServicesType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServicesType",
      required: true,
    },
    concept: {
      type: String,
      required: true,
    },
    Services: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Services",
      required: true,
    },
    User: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    status: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ServicesUser", ServicesUserSchema);
