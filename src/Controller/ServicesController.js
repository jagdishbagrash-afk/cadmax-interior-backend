const Services = require("../Model/Services");
const ServicesType = require("../Model/ServicesType");

const CatchAsync = require("../Utill/catchAsync");
const { errorResponse, successResponse, validationErrorResponse } = require("../Utill/ErrorHandling");

exports.AddServiceType = CatchAsync(
  async (req, res) => {
    try {
      const { title, TypeServices } = req.body;
      let imageUrl = null;

      if (req.file) {
        imageUrl = req.file.location;  
      }

      if (!title || !TypeServices ) {
        return validationErrorResponse(res, "All fields are required", 400,);
      }

      const service = new ServicesType({ title, TypeServices, Image: imageUrl });
      const record = await service.save();
      return successResponse(res, "Services created successfully.", 201, record);
    } catch (error) {
      return errorResponse(res, error.message || "Internal Server Error", 500);

    }
  }
);

exports.getAllServicesType = CatchAsync(
  async (req, res) => {
    try {
      const services = await ServicesType.find().sort({ createdAt: -1 });
      return successResponse(res, "Services Type list successfully.", 201, services);
    } catch (error) {
      return errorResponse(res, error.message || "Internal Server Error", 500);
    }
  }
);

exports.UpdateServicesType = CatchAsync(
    async (req, res) => {
        try {
            const { title , TypeServices} = req.body;

            const data = await ServicesType.findById(req.params.id);

            if (!data) {
                return validationErrorResponse(res, "Vendor Category not found.", 404);
            }

            // ✅ Update name if provided
            if (title) data.title = title;
            if (TypeServices) data.TypeServices = TypeServices;

            // ✅ If new image uploaded → delete old image first
            if (req.file && req.file.location) {

                if (data.Image) {
                    try {
                        await deleteFile(data.Image);   // ✅ S3 old image delete
                    } catch (err) {
                        console.log("Error deleting old image:", err.message);
                    }
                }

                // ✅ Store new S3 image URL
                data.Image = req.file.location;
            }

            const updatedCategory = await data.save();
            console.log("updatedCategory", updatedCategory)
            return successResponse(res, "Services Type updated successfully.", 200, updatedCategory);

        } catch (error) {
            console.log(error);
            return errorResponse(res, error.message || "Internal Server Error", 500);
        }
    }
);

exports.DeleteServicesType = CatchAsync(async (req, res) => {
  try {
    const id = req.params.id;
    const servicedelete = await ServicesType.findById(id);

    if (!servicedelete) {
      return validationErrorResponse(res, "Services type not found", 404);
    }

    if (servicedelete.deletedAt) {
      servicedelete.deletedAt = null;
      servicedelete.status = true;
      await servicedelete.save();
      return successResponse(res, "Services type restored successfully", 200);
    }

    servicedelete.deletedAt = new Date();
    servicedelete.status = false;
    await servicedelete.save();

    return successResponse(res, "Services type deleted successfully", 200);

  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

/// Services  manageem,nt 












exports.addService = CatchAsync(
  async (req, res) => {
    try {
      console.log("servicesImage", req.body)
      const { title, content, scope } = req.body;
      let imageUrl = null;

      if (req.file) {
        imageUrl = req.file.location;   // ✅ S3 image URL
      }

      if (!title || !content || !scope) {
        return validationErrorResponse(res, "All fields are required", 400,);
      }

      const service = new Services({ title, content, Image: imageUrl, scope });
      const record = await service.save();
      return successResponse(res, "Services created successfully.", 201, record);
    } catch (error) {
      return errorResponse(res, error.message || "Internal Server Error", 500);

    }
  }
);

exports.getAllServices = CatchAsync(
  async (req, res) => {
    try {
      const services = await Services.find().sort({ createdAt: -1 });
      return successResponse(res, "Services list successfully.", 201, services);
    } catch (error) {
      return errorResponse(res, error.message || "Internal Server Error", 500);
    }
  }
);

exports.getServiceById = CatchAsync(
  async (req, res) => {
    try {
      const service = await Services.findById(req.params.id);
      if (!service) {
        return validationErrorResponse(res, "Service not found.", 400, service);
      }
      return successResponse(res, "Services Details successfully.", 201, service);
    } catch (error) {
      return errorResponse(res, error.message || "Internal Server Error", 500);

    }
  }
);

exports.updateService = async (req, res) => {
  try {
    const { title, content, servicesImage, scope } = req.body;

    const updatedService = await Services.findByIdAndUpdate(
      req.params.id,
      { title, content, servicesImage, scope },
      { new: true, runValidators: true }
    );

    if (!updatedService) {
      return validationErrorResponse(res, "Service not found.", 400, updatedService);
    }

    return successResponse(res, "Services updated successfully.", 201, updatedService);

  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.deleteService = async (req, res) => {
  try {
    const deletedService = await Services.findByIdAndUpdate(
      req.params.id,
      { deletedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!deletedService) {
      return validationErrorResponse(res, "Service not found.", 400, deletedService);

    }
    return successResponse(res, "Services deleted successfully.", 201, deletedService);


  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};
