const Category = require("../Model/Category");
const CatchAsync = require("../Utill/catchAsync");
const { errorResponse, successResponse, validationErrorResponse } = require("../Utill/ErrorHandling");

exports.addCategory = CatchAsync(
    async (req, res) => {
        try {
            const { name, Image, superCategory } = req.body;
            if (!name || !Image) {
                return validationErrorResponse(res, "All fields are required", 400,);
            }
            const Category = new Category({ name, Image, superCategory });
            const record = await Category.save();
            return successResponse(res, "Category created successfully.", 201, record);
        } catch (error) {
            console.log(error);
            return errorResponse(res, error.message || "Internal Server Error", 500);
        }
    }
)


exports.getAllCategorys = CatchAsync(
    async (req, res) => {
        try {
            const Categorys = await Category.find().sort({ createdAt: -1 }).populate("superCategory");
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
        const { name, Image, superCategory } = req.body;

        const updatedCategory = await Category.findByIdAndUpdate(
            req.params.id,
            { name, Image, superCategory },
            { new: true, runValidators: true }
        );

        if (!updatedCategory) {
            return validationErrorResponse(res, "Category not found.", 400, updatedCategory);
        }
        return successResponse(res, "Categorys updated successfully.", 201, updatedCategory);

    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);

    }
};

exports.deleteCategory = async (req, res) => {
    try {
        const deletedCategory = await Category.findByIdAndUpdate(
            req.params.id,
            { deletedAt: new Date() },
            { new: true, runValidators: true }
        );

        if (!deletedCategory) {
            return validationErrorResponse(res, "Category not found.", 400, deletedCategory);

        }
        return successResponse(res, "Category deleted successfully.", 201, deletedCategory);


    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);

    }
};