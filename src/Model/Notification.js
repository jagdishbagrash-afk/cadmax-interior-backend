const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    SenderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    ReciverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    text: String,

    IsRead: {
      type: Boolean,
      default: false,
    },

    // 🔥 MAIN CHANGE
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    referenceType: {
      type: String,
      enum: ["product", "project", "service"],
      required: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    }
  },
  { timestamps: true }
);

const NotificationModel = mongoose.model("Notification", NotificationSchema);

module.exports = NotificationModel;