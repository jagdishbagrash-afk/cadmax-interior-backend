const Categroy = require("../Model/Categroy");
const CatchAsync = require("../Utill/catchAsync");
const { errorResponse, successResponse, validationErrorResponse } = require("../Utill/ErrorHandling");

exports.addCategroy = CatchAsync(
    async (req, res) => {
        try {
            const { name, Image } = req.body;
            if (!name || !Image) {
                return validationErrorResponse(res, "All fields are required", 400,);
            }
            const categroy = new Categroy({ name, Image });
            const record = await categroy.save();
            return successResponse(res, "Categroy created successfully.", 201, record);
        } catch (error) {
            console.log(error);
            return errorResponse(res, error.message || "Internal Server Error", 500);
        }
    }
)


exports.getAllCategroys = CatchAsync(
    async (req, res) => {
        try {
            const Categroys = await Categroy.find().sort({ createdAt: -1 });
            return successResponse(res, "Categroys list successfully.", 201, Categroys);
        } catch (error) {
            return errorResponse(res, error.message || "Internal Server Error", 500);
        }
    }
);

exports.getCategroyById = CatchAsync(
    async (req, res) => {
        try {
            const Categroy = await Categroy.findById(req.params.id);
            if (!Categroy) {
                return validationErrorResponse(res, "Categroy not found.", 400, Categroy);
            }
            return successResponse(res, "Categroys Details successfully.", 201, Categroy);
        } catch (error) {
            return errorResponse(res, error.message || "Internal Server Error", 500);

        }
    }
);

exports.updateCategroy = async (req, res) => {
    try {
        const { name, Image } = req.body;

        const updatedCategroy = await Categroy.findByIdAndUpdate(
            req.params.id,
            { name, Image },
            { new: true, runValidators: true }
        );

        if (!updatedCategroy) {
            return validationErrorResponse(res, "Categroy not found.", 400, updatedCategroy);
        }
        return successResponse(res, "Categroys updated successfully.", 201, updatedCategroy);

    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);

    }
};

exports.deleteCategroy = async (req, res) => {
    try {
        const deletedCategroy = await Categroy.findByIdAndUpdate(
            req.params.id,
            { deletedAt: new Date() },
            { new: true, runValidators: true }
        );

        if (!deletedCategroy) {
            return validationErrorResponse(res, "Categroy not found.", 400, deletedCategroy);

        }
        return successResponse(res, "Categroy deleted successfully.", 201, deletedCategroy);


    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);

    }
};