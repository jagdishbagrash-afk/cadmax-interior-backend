const mongoose = require("mongoose");

const ProjectSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
    },
    designed: {
      type: String,
      required: [true, "Designed is required"],
    },
    brief: {
      type: String,
      required: [true, "Brief is required"],
    },
    image: {
      type: String,
      required: [true, "Image is required"],
    },
    solution: {
      type: String,
      required: [true, "Solution is required"],
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Project", ProjectSchema);