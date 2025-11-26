const SuperCategory = require("../Model/SuperCategory");
const CatchAsync = require("../Utill/catchAsync");
const { errorResponse, successResponse, validationErrorResponse } = require("../Utill/ErrorHandling");

exports.addSuperCategory = CatchAsync(
    async (req, res) => {
        try {
            const { name } = req.body;

            const uploadedFiles = req.files || {};
            const makeFileUrl = (fieldName) => {
                if (!uploadedFiles[fieldName] || uploadedFiles[fieldName].length === 0) return null;
                const file = uploadedFiles[fieldName][0];
                return `${req.protocol}://${req.get("host")}/uploads/${file.filename}`;
            };
            if (!name) {
                return validationErrorResponse(res, "All fields are required", 400,);
            }
            const SuperCategorys = new SuperCategory({ name, Image: makeFileUrl("Image") });
            const record = await SuperCategorys.save();
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

        const { name } = req.body;

        const data = await SuperCategory.findById(req.params.id);

        if (!data) {
            return validationErrorResponse(res, "SuperCategory not found.", 404);
        }

        if (name) data.name = name;

        if (req.file && req.file.filename) {

            if (data.Image) {
                try {
                    await deleteUploadedFiles([data.Image]);
                } catch (err) {
                    console.log("Error deleting old image:", err.message);
                }
            }

            const newImageUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
            data.Image = newImageUrl;
        }

        const updatedSuperCategory = await data.save();

        return successResponse(res, "SuperCategory updated successfully.", 200, updatedSuperCategory);

    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
};


exports.toggleSuperCategoryStatus = CatchAsync(
    async (req, res) => {
        try {
            const { id } = req.params;
            const superCategory = await SuperCategory.findById(id);
            if (!superCategory) {
                return validationErrorResponse(res, "SuperCategory not found.", 400);
            }
            // Toggle logic
            const newStatus = superCategory.status === true ? false : true;
            superCategory.status = newStatus;
            await superCategory.save();
            return successResponse(
                res,
                `SuperCategory ${newStatus === true ? "Blocked" : "Activated"} successfully.`,
                200,
                superCategory
            );
        } catch (error) {
            return errorResponse(res, error.message || "Internal Server Error", 500);
        }
    }
);


exports.getAllSuperCategoryStatus = CatchAsync(
    async (req, res) => {
        try {
            const SuperCategorys = await SuperCategory.find({ status: true }).sort({ createdAt: -1 });
            return successResponse(res, "SuperCategorys list successfully.", 201, SuperCategorys);
        } catch (error) {
            return errorResponse(res, error.message || "Internal Server Error", 500);
        }
    }
);