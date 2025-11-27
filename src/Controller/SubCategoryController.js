const SubCategory = require("../Model/SubCategory");
const CatchAsync = require("../Utill/catchAsync");
const { errorResponse, successResponse, validationErrorResponse } = require("../Utill/ErrorHandling");
const deleteUploadedFiles = require("../Utill/fileDeleter");

exports.addSubCategory = CatchAsync(
    async (req, res) => {
        try {
            const { name, category } = req.body;
            if (!name || !category) {
                return validationErrorResponse(res, "All fields are required", 400,);
            }
            const uploadedFiles = req.files || {};
            const makeFileUrl = (fieldName) => {
                if (!uploadedFiles[fieldName] || uploadedFiles[fieldName].length === 0) return null;
                const file = uploadedFiles[fieldName][0];
                return `${req.protocol}://${req.get("host")}/uploads/${file.filename}`;
            };
            const SubCategorys = new SubCategory({ name, Image: makeFileUrl("Image"), category });
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
            const SubCategorys = await SubCategory.find().sort({ createdAt: -1 }).populate("category");
            return successResponse(res, "SubCategorys list successfully.", 201, SubCategorys);
        } catch (error) {
            return errorResponse(res, error.message || "Internal Server Error", 500);
        }
    }
);

exports.getSubCategoryById = CatchAsync(
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

exports.updateSubCategory = async (req, res) => {
    try {
        const { name, SuperCategory, category } = req.body;
        const data = await SubCategory.findById(req.params.id);

        if (name) data.name = name;
        //    if (SuperCategory) data.SuperCategory = SuperCategory;
        if (category) data.category = category;


        if (req.file && req.file.filename) {
            if (data.image) {
                try {
                    await deleteUploadedFiles([data.Image]);
                } catch (err) {
                    console.log("Error deleting old data image:", err.message);
                }
            }

            const newImageUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
            data.Image = newImageUrl;
        }

        const updatedSubCategory = await data.save();
        if (!updatedSubCategory) {
            return validationErrorResponse(res, "SubCategory not found.", 400, updatedSubCategory);
        }
        return successResponse(res, "SubCategorys updated successfully.", 201, updatedSubCategory);

    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);

    }
};

exports.toggleSubCategoryStatus = CatchAsync(
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


exports.getAllSubCategoryStatus = CatchAsync(
    async (req, res) => {
        try {
            const SubCategorys = await SubCategory.find().sort({ createdAt: -1, status: true }).populate("category");
            return successResponse(res, "SubCategorys list successfully.", 201, SubCategorys);
        } catch (error) {
            return errorResponse(res, error.message || "Internal Server Error", 500);
        }
    }
);