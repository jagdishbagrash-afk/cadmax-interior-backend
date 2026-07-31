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
    },
    solution: {
      type: String,
      required: [true, "Solution is required"],
    },
    slug: {
      type: String
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
    },
    multiple_images :{
        type :Array
    },
    meta_title :{
        type: String,
        default: null
    },
    meta_description:{
        type: String,
        default: null
    },
    meta_keywords:{
        type: String,
        default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Project", ProjectSchema);