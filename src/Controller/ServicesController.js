const Services = require("../Model/Services");
const ServicesType = require("../Model/ServicesType");
const CatchAsync = require("../Utill/catchAsync");
const { errorResponse, successResponse, validationErrorResponse } = require("../Utill/ErrorHandling");


const makeSlug = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\_]+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
};

const generateUniqueSlug = async (Model, title) => {
  let baseSlug = makeSlug(title);
  let slug = baseSlug;
  let counter = 1;

  while (await Model.findOne({ slug })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
};


exports.AddServiceType = CatchAsync(
  async (req, res) => {
    try {
      const { title, TypeServices } = req.body;
      const slug = await generateUniqueSlug(ServicesType, req.body.title);
      console.log("slug", slug)
      let imageUrl = null;

      if (req.file) {
        imageUrl = req.file.location;
      }

      if (!title || !TypeServices) {
        return validationErrorResponse(res, "All fields are required", 400,);
      }

      const service = new ServicesType({ title, TypeServices, Image: imageUrl, slug: slug, });
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
      const { title, TypeServices } = req.body;

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
exports.AddService = CatchAsync(
  async (req, res) => {
    try {
      console.log("servicesImage", req.body)
      const { title, content, ServicesType } = req.body;
      let imageUrl = null;

      if (req.file) {
        imageUrl = req.file.location;   // ✅ S3 image URL
      }
      const slug = await generateUniqueSlug(Services, req.body.title);
      console.log("slug", slug)
      if (!title || !content || !ServicesType) {
        return validationErrorResponse(res, "All fields are required", 400,);
      }
      const service = new Services({ title, content, Image: imageUrl, ServicesType, slug: slug });
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
      const services = await Services.find().sort({ createdAt: -1 }).populate("ServicesType");
      return successResponse(res, "Services list successfully.", 201, services);
    } catch (error) {
      return errorResponse(res, error.message || "Internal Server Error", 500);
    }
  }
);

exports.UpdateServices = CatchAsync(
  async (req, res) => {
    try {
      const { title, content, ServicesType } = req.body;

      const data = await Services.findById(req.params.id);

      if (!data) {
        return validationErrorResponse(res, "Vendor Category not found.", 404);
      }

      // ✅ Update name if provided
      if (title) data.title = title;
      if (content) data.content = content;
      if (ServicesType) data.ServicesType = ServicesType;

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
      return successResponse(res, "Services updated successfully.", 200, updatedCategory);

    } catch (error) {
      console.log(error);
      return errorResponse(res, error.message || "Internal Server Error", 500);
    }
  }
);


exports.DeleteServices = CatchAsync(async (req, res) => {
  try {
    const id = req.params.id;
    const servicedelete = await Services.findById(id);

    if (!servicedelete) {
      return validationErrorResponse(res, "Services  not found", 404);
    }

    if (servicedelete.deletedAt) {
      servicedelete.deletedAt = null;
      servicedelete.status = true;
      await servicedelete.save();
      return successResponse(res, "Services  restored successfully", 200);
    }

    servicedelete.deletedAt = new Date();
    servicedelete.status = false;
    await servicedelete.save();

    return successResponse(res, "Services  deleted successfully", 200);

  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

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


// fortend 

exports.gettypeservices = CatchAsync(
  async (req, res) => {
    try {
      const Residentialservices = await ServicesType.find({ TypeServices: "Residential" }).sort({ createdAt: -1 });
      const Commercialservices = await ServicesType.find({ TypeServices: "Commercial" }).sort({ createdAt: -1 });

      return successResponse(res, "Services Type list successfully.", 201, {
        Residentialservices, Commercialservices
      });
    } catch (error) {
      return errorResponse(res, error.message || "Internal Server Error", 500);
    }
  }
);

exports.GetServiceTypeId = CatchAsync(
  async (req, res) => {
    try {
      const service = await Services.find({ServicesType : req.params.id});
      if (!service) {
        return validationErrorResponse(res, "Service not found.", 400, service);
      }
      return successResponse(res, "Services Details successfully.", 201, service);
    } catch (error) {
      return errorResponse(res, error.message || "Internal Server Error", 500);

    }
  }
);