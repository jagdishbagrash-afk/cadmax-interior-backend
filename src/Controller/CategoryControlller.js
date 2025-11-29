const Category = require("../Model/Category");
const CatchAsync = require("../Utill/catchAsync");
const { errorResponse, successResponse, validationErrorResponse } = require("../Utill/ErrorHandling");
const { deleteFile } = require("../Utill/S3");

exports.addCategory = CatchAsync(async (req, res) => {
    try {
        const { name } = req.body;

        if (!name) {
            return validationErrorResponse(res, "Category name is required", 400);
        }

        let imageUrl = null;

        if (req.file) {
            imageUrl = req.file.location;   // ✅ S3 image URL
        }

        const Categorys = new Category({
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



exports.getAllCategorys = CatchAsync(
    async (req, res) => {
        try {
            const Categorys = await Category.find().sort({ createdAt: -1 });
            return successResponse(res, "Categorys list successfully.", 201, Categorys);
        } catch (error) {
            return errorResponse(res, error.message || "Internal Server Error", 500);
        }
    }
);

exports.getCategoryById = CatchAsync(
    async (req, res) => {
        try {
            const Category = await Category.findById(req.params.id);
            if (!Category) {
                return validationErrorResponse(res, "Category not found.", 400, Category);
            }
            return successResponse(res, "Categorys Details successfully.", 201, Category);
        } catch (error) {
            return errorResponse(res, error.message || "Internal Server Error", 500);

        }
    }
);

exports.updateCategory = async (req, res) => {
    try {
        const { name } = req.body;

        const data = await Category.findById(req.params.id);

        if (!data) {
            return validationErrorResponse(res, "Category not found.", 404);
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
        console.log("updatedCategory" ,updatedCategory)
        return successResponse(res, "Category updated successfully.", 200, updatedCategory);

    } catch (error) {
        console.log(error);
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
};




exports.toggleCategoryStatus = CatchAsync(
    async (req, res) => {
        try {
            const { id } = req.params;
            const superCategory = await Category.findById(id);
            if (!superCategory) {
                return validationErrorResponse(res, "Category not found.", 400);
            }
            // Toggle logic
            const newStatus = superCategory.status === true ? false : true;
            superCategory.status = newStatus;
            await superCategory.save();
            return successResponse(
                res,
                `Category ${newStatus === true ? "Blocked" : "Activated"} successfully.`,
                200,
                superCategory
            );
        } catch (error) {
            return errorResponse(res, error.message || "Internal Server Error", 500);
        }
    }
);

exports.getAllCategoryStatus = CatchAsync(
    async (req, res) => {
        try {
            const Categorys = await Category.find({ status: false});
            return successResponse(res, "Categorys list successfully.", 201, Categorys);
        } catch (error) {
            return errorResponse(res, error.message || "Internal Server Error", 500);
        }
    }
);