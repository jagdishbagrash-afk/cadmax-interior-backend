const SuperCategory = require("../Model/SuperCategory");
const CatchAsync = require("../Utill/catchAsync");
const { errorResponse, successResponse, validationErrorResponse } = require("../Utill/ErrorHandling");

exports.addSuperCategory = CatchAsync(
    async (req, res) => {
        try {
            const { name, Image } = req.body;
            if (!name || !Image) {
                return validationErrorResponse(res, "All fields are required", 400,);
            }
            const SuperCategory = new SuperCategory({ name, Image });
            const record = await SuperCategory.save();
            return successResponse(res, "SuperCategory created successfully.", 201, record);
        } catch (error) {
            console.log(error);
            return errorResponse(res, error.message || "Internal Server Error", 500);
        }
    }
)


exports.getAllSuperCategorys = CatchAsync(
    async (req, res) => {
        try {
            const SuperCategorys = await SuperCategory.find().sort({ createdAt: -1 });
            return successResponse(res, "SuperCategorys list successfully.", 201, SuperCategorys);
        } catch (error) {
            return errorResponse(res, error.message || "Internal Server Error", 500);
        }
    }
);

exports.getSuperCategoryById = CatchAsync(
    async (req, res) => {
        try {
            const SuperCategory = await SuperCategory.findById(req.params.id);
            if (!SuperCategory) {
                return validationErrorResponse(res, "SuperCategory not found.", 400, SuperCategory);
            }
            return successResponse(res, "SuperCategorys Details successfully.", 201, SuperCategory);
        } catch (error) {
            return errorResponse(res, error.message || "Internal Server Error", 500);

        }
    }
);

exports.updateSuperCategory = async (req, res) => {
    try {
        const { name, Image } = req.body;

        const updatedSuperCategory = await SuperCategory.findByIdAndUpdate(
            req.params.id,
            { name, Image },
            { new: true, runValidators: true }
        );

        if (!updatedSuperCategory) {
            return validationErrorResponse(res, "SuperCategory not found.", 400, updatedSuperCategory);
        }
        return successResponse(res, "SuperCategorys updated successfully.", 201, updatedSuperCategory);

    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);

    }
};

exports.deleteSuperCategory = async (req, res) => {
    try {
        const deletedSuperCategory = await SuperCategory.findByIdAndUpdate(
            req.params.id,
            { deletedAt: new Date() },
            { new: true, runValidators: true }
        );

        if (!deletedSuperCategory) {
            return validationErrorResponse(res, "SuperCategory not found.", 400, deletedSuperCategory);

        }
        return successResponse(res, "SuperCategory deleted successfully.", 201, deletedSuperCategory);


    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);

    }
};