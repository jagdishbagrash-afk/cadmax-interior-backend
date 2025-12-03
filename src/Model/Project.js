const mongoose = require("mongoose");

const ProjectSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
    },
    designed: {
      type: String,
    },
    brief: {
      type: String,
      required: [true, "Brief is required"],
    },
    Image: {
      type: String,
      required: [true, "Image is required"],
    },
    solution: {
      type: String,
      required: [true, "Solution is required"],
    },
    content: {
      type: String,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    status: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Project", ProjectSchema);