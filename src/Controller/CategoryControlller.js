const Category = require("../Model/Categroy");
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

exports.addCategory = CatchAsync(async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return validationErrorResponse(res, "Category name is required", 400);
        }

        const slug = await generateUniqueSlug(Category, req.body.name);

        let imageUrl = null;

        // ✅ Ab yeh kaam karega - req.file.location available hai
        if (req.file && req.file.location) {
            imageUrl = req.file.location;
            console.log("Image uploaded to S3:", imageUrl);

            // Optional: Log processing stats if available
            if (req.imageProcessing) {
                console.log("Image Processing Stats:", req.imageProcessing);
            }
        }

        const categoryData = new Category({
            name,
            Image: imageUrl,
            slug
        });

        const record = await categoryData.save();
        return successResponse(res, "Category created successfully.", 201, record);

    } catch (error) {
        console.log(error);
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});

exports.updateCategory = CatchAsync(async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        const category = await Category.findById(id);
        if (!category) {
            return validationErrorResponse(res, "Category not found", 404);
        }

        if (name) {
            category.name = name;
            category.slug = await generateUniqueSlug(Category, name, id);
        }

        // Update image if new file uploaded
        if (req.file && req.file.location) {
            // Delete old image from S3 (optional)
            if (category.Image) {
                try {
                    const { deleteFile } = require('../Utill/S3');
                    await deleteFile(category.Image);
                    console.log("Old image deleted from S3");
                } catch (err) {
                    console.error("Error deleting old image:", err);
                }
            }
            category.Image = req.file.location;
        }

        const updatedCategory = await category.save();
        return successResponse(res, "Category updated successfully.", 200, updatedCategory);

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
            const Categorys = await Category.find({ status: false });
            return successResponse(res, "Categorys list successfully.", 201, Categorys);
        } catch (error) {
            return errorResponse(res, error.message || "Internal Server Error", 500);
        }
    }
);
