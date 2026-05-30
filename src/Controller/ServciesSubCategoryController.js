const ServicesSubCategory = require("../Model/ServicesSubCategory");
const ServicesType = require("../Model/ServicesType");
const CatchAsync = require("../Utill/catchAsync");
const { errorResponse, successResponse, validationErrorResponse } = require("../Utill/ErrorHandling");
const { deleteFile } = require("../Utill/S3");


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

exports.AddServicesSubCategory = CatchAsync(async (req, res) => {
    try {
        const { name, category } = req.body;

        if (!name) {
            return validationErrorResponse(res, "Category name is required", 400);
        }

        let imageUrl = null;

        if (req.file) {
            imageUrl = req.file.location;   // ✅ S3 image URL
        }
        const slug = await generateUniqueSlug(ServicesSubCategory, name);
        const Categorys = new ServicesSubCategory({
            name,
            Image: imageUrl,
            category  ,
            slug
        });

        const record = await Categorys.save();
        return successResponse(res, "Vendor SubCategorys created successfully.", 201, record);

    } catch (error) {
        console.log(error);
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});

exports.GetAllServicesSubCategorys = CatchAsync(async (req, res) => {
  try {
    const orderMap = {
      facades: 1,
      "landscaping & gazebo": 2,
      "living room": 3,
      "drwaing room": 4,
      bedroom: 5,
      kitchen: 6,
      staircase: 7,
      "pooja room": 8,
      washroom: 9,
    };

    const subCategories = await ServicesType.find({
      status: true,
    });

    subCategories.sort((a, b) => {
      const titleA = (a.title || "").trim().toLowerCase();
      const titleB = (b.title || "").trim().toLowerCase();

      const orderA = orderMap[titleA] || 999;
      const orderB = orderMap[titleB] || 999;

      if (orderA !== orderB) {
        return orderA - orderB;
      }

      return titleA.localeCompare(titleB);
    });

    return successResponse(
      res,
      "SubCategorys list successfully.",
      200,
      subCategories
    );
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Internal Server Error",
      500
    );
  }
});

exports.GetServicesSubCategoryById = CatchAsync(
    async (req, res) => {
        try {
            const SubCategory = await ServicesSubCategory.findById(req.params.id);
            if (!SubCategory) {
                return validationErrorResponse(res, "SubCategory not found.", 400, SubCategory);
            }
            return successResponse(res, "SubCategorys Details successfully.", 201, SubCategory);
        } catch (error) {
            return errorResponse(res, error.message || "Internal Server Error", 500);

        }
    }
);

exports.getServicesSubCategoryByCategory = CatchAsync(async (req, res) => {
    try {
        const categoryId = req.params.id;
        const subCategories = await ServicesSubCategory.find({
            category: categoryId,
            deletedAt: null
        }).populate("category");

        if (!subCategories || subCategories?.length === 0) {
            return validationErrorResponse(res, "No Subcategories found for this category.", 404);
        }
        return successResponse(res, "Subcategories fetched successfully.", 200, subCategories);
    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
}
);

exports.UpdateServicesSubCategory = CatchAsync(
  async (req, res) => {
    try {
      const { name, category } = req.body;

      const data = await ServicesSubCategory.findById(req.params.id);
      if (!data) {
        return validationErrorResponse(res, "Category not found.", 404);
      }

      // ✅ Update name & regenerate slug only if name changes
      if (name && name !== data.name) {
        data.name = name;
      }

      if (category) data.category = category;

      // ✅ Image update
      if (req.file && req.file.location) {
        if (data.Image) {
          try {
            await deleteFile(data.Image);
          } catch (err) {
            console.log("Error deleting old image:", err.message);
          }
        }
        data.Image = req.file.location;
      }

      const updatedCategory = await data.save();

      return successResponse(
        res,
        "Vendor SubCategory updated successfully.",
        200,
        updatedCategory
      );

    } catch (error) {
      console.log(error);
      return errorResponse(
        res,
        error.message || "Internal Server Error",
        500
      );
    }
  }
);


exports.DeleteServicesSubCategory = CatchAsync(async (req, res) => {
  try {
    const id = req.params.id;
    const servicedelete = await ServicesSubCategory.findById(id);
console.log("servicedelete", servicedelete)
    if (!servicedelete) {
      return validationErrorResponse(res, "Services ServicesSubCategory not found", 404);
    }

    if (servicedelete.deletedAt) {
      servicedelete.deletedAt = null;
      servicedelete.status = true;
      await servicedelete.save();
      return successResponse(res, "Services ServicesSubCategory  restored successfully", 200);
    }

    servicedelete.deletedAt = new Date();
    servicedelete.status = false;
    await servicedelete.save();

    return successResponse(res, "Services ServicesSubCategory deleted successfully", 200);

  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});