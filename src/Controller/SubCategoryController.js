const Category = require("../Model/Category");
const SubCategory = require("../Model/SubCategory");
const CatchAsync = require("../Utill/catchAsync");
const { errorResponse, successResponse, validationErrorResponse } = require("../Utill/ErrorHandling");
const { deleteFile } = require("../Utill/S3");

exports.AddSubCategory = CatchAsync(async (req, res) => {
    try {
        const { name, category } = req.body;

        if (!name) {
            return validationErrorResponse(res, "Category name is required", 400);
        }

        let imageUrl = null;

        if (req.file) {
            imageUrl = req.file.location;   // ✅ S3 image URL
        }

        const Categorys = new SubCategory({
            name,
            Image: imageUrl,
            category
        });

        const record = await Categorys.save();
        return successResponse(res, "Category created successfully.", 201, record);

    } catch (error) {
        console.log(error);
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});

exports.GetAllSubCategorys = CatchAsync(
    async (req, res) => {
        try {
            const SubCategorys = await SubCategory.find().sort({ createdAt: -1 }).populate("category");
            return successResponse(res, "SubCategorys list successfully.", 201, SubCategorys);
        } catch (error) {
            return errorResponse(res, error.message || "Internal Server Error", 500);
        }
    }
);

exports.GetSubCategoryById = CatchAsync(
    async (req, res) => {
        try {
            const SubCategory = await SubCategory.findById(req.params.id).populate("category");
            if (!SubCategory) {
                return validationErrorResponse(res, "SubCategory not found.", 400, SubCategory);
            }
            return successResponse(res, "SubCategorys Details successfully.", 201, SubCategory);
        } catch (error) {
            return errorResponse(res, error.message || "Internal Server Error", 500);

        }
    }
);

exports.getSubCategoryByCategory = CatchAsync(async (req, res) => {
    try {
        const categoryId = req.params.id;
        const subCategories = await SubCategory.find({
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

exports.UpdateSubCategory = CatchAsync(
    async (req, res) => {
        try {
            const { name, category } = req.body;
            const data = await SubCategory.findById(req.params.id);

            if (!data) {
                return validationErrorResponse(res, "Category not found.", 404);
            }

            if (name) data.name = name;
            if (category) data.category = category;

            if (req.file && req.file.location) {

                if (data.Image) {
                    try {
                        await deleteFile(data.Image);
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

exports.ToggleSubCategoryStatus = CatchAsync(
    async (req, res) => {
        try {
            const { id } = req.params;
            const superCategory = await SubCategory.findById(id);
            if (!superCategory) {
                return validationErrorResponse(res, "SubCategory not found.", 400);
            }
            // Toggle logic
            const newStatus = superCategory.status === true ? false : true;
            superCategory.status = newStatus;
            await superCategory.save();
            return successResponse(
                res,
                `Sub Category ${newStatus === true ? "Blocked" : "Activated"} successfully.`,
                200,
                superCategory
            );
        } catch (error) {
            return errorResponse(res, error.message || "Internal Server Error", 500);
        }
    }
);

exports.GetAllSubCategoryStatus = CatchAsync(
    async (req, res) => {
        try {
            const SubCategorys = await SubCategory.find().sort({ createdAt: -1, status: true }).populate("category");
            return successResponse(res, "SubCategorys list successfully.", 201, SubCategorys);
        } catch (error) {
            return errorResponse(res, error.message || "Internal Server Error", 500);
        }
    }
);


exports.GetSubCategoryByNameCategory = CatchAsync(async (req, res) => {
    try {
        console.log("hello")
        const { name } = req.params;
        console.log("req.params", req.params)
        console.log("name", name)
        const cleanName = name.replaceAll("-", " ");

        const category = await Category.findOne({ name: cleanName });


        if (!category) {
            return validationErrorResponse(res, "Category not found.", 404);
        }
        const subCategories = await SubCategory.find({
            category: category._id,
            deletedAt: null,
        });

        if (!subCategories || subCategories.length === 0) {
            return validationErrorResponse(
                res,
                "No Subcategories found for this category.",
                404
            );
        }
        return successResponse(res, "Subcategories fetched successfully.", 200, subCategories);
    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});
