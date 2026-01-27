const Services = require("../Model/Services");
const ServicesType = require("../Model/ServicesType");
const ServicesUser = require("../Model/ServicesUser");
const VendorSubCategory = require("../Model/ServicesSubCategory");
const CatchAsync = require("../Utill/catchAsync");
const { errorResponse, successResponse, validationErrorResponse } = require("../Utill/ErrorHandling");
const sendEmail = require("../Utill/EmailMailler");
const userEmailTemplate = require("../EmailTemplate/servicesUserEmail");
const adminEmailTemplate = require("../EmailTemplate/servicesAdminEmail");

const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const ServicesSubCategory = require("../Model/ServicesSubCategory");
const { default: mongoose } = require("mongoose");

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

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
      const { title, content, ServicesType, concept, material_details, timeline, cost, ServicesSubCategory } = req.body;
      const imageUrls = req.files["images[]"]?.map((f) => f.location) || [];
      const list_image = req.files["Image"]?.[0]?.location || "";

      const slug = await generateUniqueSlug(Services, req.body.title);

      if (!title || !content || !ServicesType) {
        return validationErrorResponse(res, "All fields are required", 400,);
      }
      const service = new Services({ title, content, multiple_images: imageUrls, ServicesType, slug: slug, concept, Image: list_image, material_details, timeline, cost, ServicesSubCategory });
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


exports.GetAllConcept = CatchAsync(async (req, res) => {
  const { slug } = req.params;

  // Step 1: Find sub-category
  const record = await ServicesSubCategory.findOne({ slug });

  if (!record) {
    return errorResponse(res, "Sub category not found", 404);
  }

  const  Id =  record?._id;

  // Step 2: Find services
const services = await Services.find({
  ServicesSubCategory: new mongoose.Types.ObjectId(Id)
})
  .sort({ createdAt: -1 })
  .populate("ServicesSubCategory");

  console.log("services" ,services)
  return successResponse(
    res,
    "Services list fetched successfully.",
    200,
    { services, record }
  );
});


exports.UpdateServices = CatchAsync(
  async (req, res) => {
    try {
      const { title, content, ServicesType, concept, material_details, timeline, cost,
        ServicesSubCategory } = req.body;

      // Get files (if any new ones uploaded)
      const imageUrls = req.files?.["images[]"]?.map((f) => f.location) || [];
      const Image = req.files?.["Image"]?.[0]?.location;

      const data = await Services.findById(req.params.id);

      if (!data) {
        return validationErrorResponse(res, "Vendor Category not found.", 404);
      }

      // ✅ Update name if provided
      if (title) data.title = title;
      if (ServicesSubCategory) data.ServicesSubCategory = ServicesSubCategory;
      if (content) data.content = content;
      if (ServicesType) data.ServicesType = ServicesType;
      if (concept) data.concept = concept;
      if (material_details) data.material_details = material_details;
      if (timeline) data.timeline = timeline;
      if (cost) data.cost = cost;


      if (Image) data.Image = Image;
      if (imageUrls.length > 0) {
        data.multiple_images = [...data.multiple_images, ...imageUrls]; // append new images
      }
      const updatedCategory = await data.save();
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
      const service = await Services.find({ ServicesType: req.params.id });
      if (!service) {
        return validationErrorResponse(res, "Service not found.", 400, service);
      }
      return successResponse(res, "Services Details successfully.", 201, service);
    } catch (error) {
      return errorResponse(res, error.message || "Internal Server Error", 500);

    }
  }
);


exports.GetServiceDataTypeId = CatchAsync(async (req, res) => {
  try {
    const { slug } = req.params;

    if (!slug) {
      return validationErrorResponse(res, "Slug is required", 400);
    }

    const service = await Services
      .findOne({ slug })
      .populate("ServicesType");

    if (!service) {
      return validationErrorResponse(res, "Service not found", 404);
    }

    return successResponse(res, "Service details fetched successfully.", 200, service);

  } catch (error) {
    console.error("Get Service Error:", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});


exports.DeleteAWSImages = CatchAsync(async (req, res) => {
  try {
    let { projectId, images } = req.params;

    if (!projectId) return res.status(400).json({ status: false, message: "projectId required" });
    if (!images) return res.status(400).json({ status: false, message: "images required" });

    // ensure array
    if (!Array.isArray(images)) images = [images];

    // extract keys
    const keys = images.map(url => url.split(".com/")[1]);

    // 🔥 Delete from S3
    for (const key of keys) {
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: key
        })
      );
    }

    // 🔥 DB se Array se URLs remove karo
    await Services.updateOne(
      { _id: projectId },
      {
        $pull: {
          multiple_images: { $in: images }
        }
      }
    );


    //  // 🔥 banner / list image ho to null kar do
    // await Project.updateOne(
    //   { _id: projectId, banner_image: { $in: images } },
    //   { $set: { banner_image: null } }
    // );

    // await Project.updateOne(
    //   { _id: projectId, list_image: { $in: images } },
    //   { $set: { list_image: null } }
    // );

    return res.status(200).json({
      status: true,
      message: "Images deleted successfully & removed from Services array"
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: false,
      error: err.message
    });
  }
});


exports.ServicesUserPost = CatchAsync(async (req, res) => {
  try {

    const { User, TypeServices, Services, concept } = req.body;

    if (!User || !TypeServices || !Services) {
      return res.status(400).json({
        status: false,
        message: "All fields (services, user, typeservices) are required.",
      });
    }

    const record = new ServicesUser({
      User,
      ServicesType: TypeServices,
      Services,
      concept,
    });

      // Populate for email
  const populated = await record.populate([
    { path: "User", select: "name email" },
    { path: "ServicesType", select: "title" },
    { path: "Services", select: "title" },
  ]);

  console.log("populated" ,populated)

  const emailData = {
    userName: populated.User.name,
    userEmail: populated.User.email,
    serviceType: populated.ServicesType.title,
    serviceName: populated.Services.title,
    concept: populated.concept,
  };

  // User Email
  await sendEmail({
    email: emailData.userEmail,
    subject: "Service Request Received - Cadmax",
    emailHtml: userEmailTemplate(emailData),
  });

  // Admin Email
  await sendEmail({
    email: "ankitkumarjain0748@gmail.com",
    subject: "New Service Request - Cadmax",
    emailHtml: adminEmailTemplate(emailData),
  });
    const result = await record.save();

    if (!result) {
      return res.status(500).json({
        status: false,
        message: "Failed to save contact details.",
      });
    }

    res.json({
      status: true,
      message: "Request submitted & emails sent successfully.",
    });

  } catch (error) {
    res.status(500).json({
      status: false,
      message: "❌ Failed to send contact request.",
      error: error.message,
    });
  }
});


exports.ServciesUserGet = CatchAsync(async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit) || 50, 1);
    const skip = (page - 1) * limit;

    let query = {};

    const totalServicesUser = await ServicesUser.countDocuments(query);

    const contactget = await ServicesUser.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("User")
      .populate("Services")
      .populate("ServicesType");

    const totalPages = Math.ceil(totalServicesUser / limit);

    res.status(200).json({
      data: {
        contactget,
        totalServicesUser,
        totalPages,
        currentPage: page,
        perPage: limit,
        nextPage: page < totalPages ? page + 1 : null,
        previousPage: page > 1 ? page - 1 : null,
      },
      msg: "Contact Get",
    });

  } catch (error) {
    res.status(500).json({
      msg: "Failed to fetch Contact get",
      error: error.message,
    });
  }
});
