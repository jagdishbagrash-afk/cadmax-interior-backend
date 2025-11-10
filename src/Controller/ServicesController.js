const Services = require("../Model/Services");


exports.addService = async (req, res) => {
  try {
    const { title, content, servicesImage } = req.body;

    if (!title || !content || !servicesImage) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const service = new Services({ title, content, servicesImage });
    await service.save();

    res.status(201).json({
      message: "Service created successfully",
      service,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.getAllServices = async (req, res) => {
  try {
    const services = await Services.find().sort({ createdAt: -1 });
    res.status(200).json(services);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.getServiceById = async (req, res) => {
  try {
    const service = await Services.findById(req.params.id);

    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    res.status(200).json(service);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.updateService = async (req, res) => {
  try {
    const { title, content, servicesImage } = req.body;

    const updatedService = await Services.findByIdAndUpdate(
      req.params.id,
      { title, content, servicesImage },
      { new: true, runValidators: true }
    );

    if (!updatedService) {
      return res.status(404).json({ message: "Service not found" });
    }

    res.status(200).json({
      message: "Service updated successfully",
      updatedService,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.deleteService = async (req, res) => {
  try {
    const deletedService = await Services.findByIdAndDelete(req.params.id);

    if (!deletedService) {
      return res.status(404).json({ message: "Service not found" });
    }

    res.status(200).json({
      message: "Service deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};
