const SubCategory = require("../Model/SubCategory");
const CatchAsync = require("../Utill/catchAsync");
const { errorResponse, successResponse, validationErrorResponse } = require("../Utill/ErrorHandling");

exports.addSubCategory = CatchAsync(
    async (req, res) => {
        try {
            const { name, SuperCategory, category } = req.body;
            if (!name || !SuperCategory || !category) {
                return validationErrorResponse(res, "All fields are required", 400,);
            }
               const uploadedFiles = req.files || {};
            const makeFileUrl = (fieldName) => {
                if (!uploadedFiles[fieldName] || uploadedFiles[fieldName].length === 0) return null;
                const file = uploadedFiles[fieldName][0];
                return `${req.protocol}://${req.get("host")}/Images/${file.filename}`;
            };
            const SubCategorys = new SubCategory({ name, Image: makeFileUrl("Image"), SuperCategory, category });
            const record = await SubCategorys.save();
            return successResponse(res, "SubCategory created successfully.", 201, record);
        } catch (error) {
            console.log(error);
            return errorResponse(res, error.message || "Internal Server Error", 500);
        }
    }
)


exports.getAllSubCategorys = CatchAsync(
    async (req, res) => {
        try {
            const SubCategorys = await SubCategory.find().sort({ createdAt: -1 }).populate("SuperCategory").populate("category");
            return successResponse(res, "SubCategorys list successfully.", 201, SubCategorys);
        } catch (error) {
            return errorResponse(res, error.message || "Internal Server Error", 500);
        }
    }
);

exports.getSubCategoryById = CatchAsync(
    async (req, res) => {
        try {
            const SubCategory = await SubCategory.findById(req.params.id).populate("superCategory").populate("category");
            if (!SubCategory) {
                return validationErrorResponse(res, "SubCategory not found.", 400, SubCategory);
            }
            return successResponse(res, "SubCategorys Details successfully.", 201, SubCategory);
        } catch (error) {
            return errorResponse(res, error.message || "Internal Server Error", 500);

        }
    }
);

exports.updateSubCategory = async (req, res) => {
    try {
        const { name, Image, superCategory, category } = req.body;

        const updatedSubCategory = await SubCategory.findByIdAndUpdate(
            req.params.id,
            { name, Image, superCategory, category },
            { new: true, runValidators: true }
        );

        if (!updatedSubCategory) {
            return validationErrorResponse(res, "SubCategory not found.", 400, updatedSubCategory);
        }
        return successResponse(res, "SubCategorys updated successfully.", 201, updatedSubCategory);

    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);

    }
};

exports.deleteSubCategory = async (req, res) => {
    try {
        const deletedSubCategory = await SubCategory.findByIdAndUpdate(
            req.params.id,
            { deletedAt: new Date() },
            { new: true, runValidators: true }
        );

        if (!deletedSubCategory) {
            return validationErrorResponse(res, "SubCategory not found.", 400, deletedSubCategory);

        }
        return successResponse(res, "SubCategory deleted successfully.", 201, deletedSubCategory);
    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);

    }
};