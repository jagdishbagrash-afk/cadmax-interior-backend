const Category = require("../Model/Category");
const CatchAsync = require("../Utill/catchAsync");
const { errorResponse, successResponse, validationErrorResponse } = require("../Utill/ErrorHandling");
const deleteUploadedFiles = require("../Utill/fileDeleter");

exports.addCategory = CatchAsync(
    async (req, res) => {
        try {
            const { name } = req.body;

            const uploadedFiles = req.files || {};
            const makeFileUrl = (fieldName) => {
                if (!uploadedFiles[fieldName] || uploadedFiles[fieldName].length === 0) return null;
                const file = uploadedFiles[fieldName][0];
                return `${req.protocol}://${req.get("host")}/uploads/${file.filename}`;
            };
            if (!name ) {
                return validationErrorResponse(res, "All fields are required", 400,);
            }
            const Categorys = new Category({ name, Image: makeFileUrl("Image") });
            const record = await Categorys.save();
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

        const { name, Category } = req.body;

        const data = await SuperCategory.findById(req.params.id);

        if (!data) {
            return validationErrorResponse(res, "Category not found.", 404);
        }

        if (name) data.name = name;
        if (Category) data.Category = Category;

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

        return successResponse(res, "Category updated successfully.", 200, updatedSuperCategory);

    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
};

exports.updateCategory = async (req, res) => {
    try {
        const { name, SuperCategory } = req.body;

        const data = await Category.findById(req.params.id);

        if (name) data.name = name;
        if (SuperCategory) data.SuperCategory = SuperCategory;

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

        const updatedCategory = await data.save();

        if (!updatedCategory) {
            return validationErrorResponse(res, "Category not found.", 400, updatedCategory);
        }
        return successResponse(res, "Categorys updated successfully.", 201, updatedCategory);

    } catch (error) {
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