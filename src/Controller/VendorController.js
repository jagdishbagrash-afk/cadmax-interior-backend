const VendorCategory = require("../Model/VendorCategory");
const Vendor = require("../Model/Vendor");

const CatchAsync = require("../Utill/catchAsync");
const { errorResponse, successResponse, validationErrorResponse } = require("../Utill/ErrorHandling");
const { deleteFile } = require("../Utill/S3");

exports.AddVendorCategory = CatchAsync(async (req, res) => {
    try {
        const { name } = req.body;
        console.log("vendorcategory", req.body)
        if (!name) {
            return validationErrorResponse(res, "Category name is required", 400);
        }
        let imageUrl = null;

        if (req.file) {
            imageUrl = req.file.location;   // ✅ S3 image URL
        }

        const Categorys = new VendorCategory({
            name,
            Image: imageUrl
        });

        const record = await Categorys.save();
        return successResponse(res, "Category created successfully.", 201, record);

    } catch (error) {
        console.log(error);
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});

exports.getAllVendorCategorys = CatchAsync(
    async (req, res) => {
        try {
            const Categorys = await VendorCategory.find().sort({ createdAt: -1 });
            return successResponse(res, "Vendor Categorys list successfully.", 201, Categorys);
        } catch (error) {
            return errorResponse(res, error.message || "Internal Server Error", 500);
        }
    }
);

exports.updateCategory = CatchAsync(
    async (req, res) => {
        try {
            const { name } = req.body;

            const data = await VendorCategory.findById(req.params.id);

            if (!data) {
                return validationErrorResponse(res, "Vendor Category not found.", 404);
            }

            // ✅ Update name if provided
            if (name) data.name = name;

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
            return successResponse(res, "Category updated successfully.", 200, updatedCategory);

        } catch (error) {
            console.log(error);
            return errorResponse(res, error.message || "Internal Server Error", 500);
        }
    }
);

exports.AddVendor = CatchAsync(async (req, res) => {
    try {
        const { name, experience, sepectailze, VendorCategory, phone } = req.body;
        console.log("vendorcategory", req.body)
        if (!name) {
            return validationErrorResponse(res, "Category name is required", 400);
        }
        let imageUrl = null;

        if (req.file) {
            imageUrl = req.file.location;   // ✅ S3 image URL
        }

        const Categorys = new Vendor({
            Image: imageUrl,
            name, experience, sepectailze, VendorCategory, phone
        });

        const record = await Categorys.save();
        return successResponse(res, "vendor created successfully.", 201, record);

    } catch (error) {
        console.log(error);
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});

exports.getAllVendors = CatchAsync(
    async (req, res) => {
        try {
            const Categorys = await Vendor.find().sort({ createdAt: -1 }).populate("VendorCategory");
            return successResponse(res, "Vendor Categorys list successfully.", 201, Categorys);
        } catch (error) {
            return errorResponse(res, error.message || "Internal Server Error", 500);
        }
    }
);

exports.updatevendor = CatchAsync(
    async (req, res) => {
        try {
            console.log(req.body)
            const { name ,phone, VendorCategory , sepectailze , experience } = req.body;

            const data = await Vendor.findById(req.params.id);

            if (!data) {
                return validationErrorResponse(res, "Vendor Category not found.", 404);
            }
            // ✅ Update name if provided
            if (name) data.name = name;
            if (phone) data.phone = phone;
            if (VendorCategory) data.VendorCategory = VendorCategory;
            if (sepectailze) data.sepectailze = sepectailze;
            if (experience) data.experience = experience;

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
            return successResponse(res, "Vendor updated successfully.", 200, updatedCategory);

        } catch (error) {
            console.log(error);
            return errorResponse(res, error.message || "Internal Server Error", 500);
        }
    }
);

exports.DeleteVendor = CatchAsync(async (req, res) => {
  try {
    const id = req.params.id;
    const Vendors = await Vendor.findById(id);

    if (!Vendors) {
      return validationErrorResponse(res, "Vendor not found", 404);
    }

    if (Vendors.deletedAt) {
      Vendors.deletedAt = null;
      await Vendors.save();
      return successResponse(res, "Vendor restored successfully", 200);
    }

    Vendors.deletedAt = new Date();
    await Vendors.save();

    return successResponse(res, "Vendor deleted successfully", 200);

  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.getVendors = CatchAsync(
    async (req, res) => {
        try {
            const Categorys = await Vendor.find({deletedAt :null }).sort({ createdAt: -1 }).populate("VendorCategory");
            return successResponse(res, "Vendor Categorys list successfully.", 201, Categorys);
        } catch (error) {
            return errorResponse(res, error.message || "Internal Server Error", 500);
        }
    }
);

exports.getVendorCategoryIds = CatchAsync(async (req, res) => {
  try {
    const id = req.params.id;

    if (!id) {
      return errorResponse(res, "Category id is required", 400);
    }

    // Get Category
    const category = await VendorCategory.findById(id);

    if (!category) {
      return errorResponse(res, "Vendor Category not found", 404);
    }

    // Get Vendors of this Category
    const vendors = await Vendor.find({
      deletedAt: null,
      VendorCategory: id,
    }).sort({ createdAt: -1 });

    return successResponse(
      res,
      "Vendor Category details fetched successfully.",
      200,
      {
        category,
        vendors,
      }
    );
  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});
