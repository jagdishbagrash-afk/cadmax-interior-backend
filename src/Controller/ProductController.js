const Project = require("../Model/Project");

exports.addProject = async (req, res) => {
  try {
    const { title, content, Stock, productImage } = req.body;

    if (!title || !content || !productImage) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const project = new Project({ title, content, Stock, productImage });
    await project.save();

    res.status(201).json({
      message: "Project created successfully",
      project,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.getAllProjects = async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    res.status(200).json(projects);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.status(200).json(project);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.updateProject = async (req, res) => {
  try {
    const { title, content, Stock, productImage } = req.body;

    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      { title, content, Stock, productImage },
      { new: true, runValidators: true }
    );

    if (!updatedProject) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.status(200).json({
      message: "Project updated successfully",
      updatedProject,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.deleteProject = async (req, res) => {
  try {
    const deletedProject = await Project.findByIdAndDelete(req.params.id);

    if (!deletedProject) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.status(200).json({ message: "Project deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};
