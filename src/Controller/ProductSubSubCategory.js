const ProductSubSubCategory = require("../Model/ProductSubSubCategory");
const Product = require("../Model/Product");
const SubCategory = require("../Model/SubProductCategory");
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

exports.addProductSubSubCategory = CatchAsync(async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return validationErrorResponse(res, "ProductSubSubCategory name is required", 400);
        }

        const slug = await generateUniqueSlug(ProductSubSubCategory, req.body.name);

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

        const productSubSubCategoryData = new ProductSubSubCategory({
            name,
            Image: imageUrl,
            slug,
            category: req.body.category,
            subcategory: req.body.subcategory

        });

        const record = await productSubSubCategoryData.save();
        return successResponse(res, "ProductSubSubCategory created successfully.", 201, record);

    } catch (error) {
        console.log(error);
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});

exports.UpdateProductSubSubCategory = CatchAsync(async (req, res) => {
    try {
        const { id } = req.params;
        const { name, category, subcategory } = req.body;

        const productSubSubCategory = await ProductSubSubCategory.findById(id);

        if (!productSubSubCategory) {
            return validationErrorResponse(
                res,
                "ProductSubSubCategory not found",
                404
            );
        }

        // Update Name
        if (name) {
            productSubSubCategory.name = name;
            productSubSubCategory.slug = await generateUniqueSlug(
                ProductSubSubCategory,
                name,
                id
            );
        }

        // Update Category
        if (category) {
            productSubSubCategory.category = category;
        }

        // Update SubCategory
        if (subcategory) {
            productSubSubCategory.subcategory = subcategory;
        }

        // Update Image
        if (req.file?.location) {
            if (productSubSubCategory.Image) {
                try {
                    const { deleteFile } = require("../Utill/S3");
                    await deleteFile(productSubSubCategory.Image);
                } catch (err) {
                    console.error("Error deleting old image:", err);
                }
            }

            productSubSubCategory.Image = req.file.location;
        }

        const updatedProductSubSubCategory =
            await productSubSubCategory.save();

        return successResponse(
            res,
            "ProductSubSubCategory updated successfully.",
            200,
            updatedProductSubSubCategory
        );
    } catch (error) {
        console.log(error);
        return errorResponse(
            res,
            error.message || "Internal Server Error",
            500
        );
    }
});


exports.getAllProductSubSubCategorys = CatchAsync(
    async (req, res) => {
        try {
            const ProductSubSubCategorys = await ProductSubSubCategory
                .find({})
                .populate("category", "name slug")
                .populate("subcategory", "name slug")
                .sort({ createdAt: -1 });

            return successResponse(
                res,
                "ProductSubSubCategorys list successfully.",
                200,
                ProductSubSubCategorys
            );
        } catch (error) {
            return errorResponse(
                res,
                error.message || "Internal Server Error",
                500
            );
        }
    }
);
exports.getProductSubSubCategoryById = CatchAsync(
    async (req, res) => {
        try {
            const ProductSubSubCategory = await ProductSubSubCategory.findById(req.params.id);
            if (!ProductSubSubCategory) {
                return validationErrorResponse(res, "ProductSubSubCategory not found.", 400, ProductSubSubCategory);
            }
            return successResponse(res, "ProductSubSubCategory Details successfully.", 201, ProductSubSubCategory);
        } catch (error) {
            return errorResponse(res, error.message || "Internal Server Error", 500);

        }
    }
);


exports.toggleProductSubSubCategoryStatus = CatchAsync(
    async (req, res) => {
        try {
            const { id } = req.params;
            const superCategory = await ProductSubSubCategory.findById(id);
            if (!superCategory) {
                return validationErrorResponse(res, "ProductSubSubCategory not found.", 400);
            }
            // Toggle logic
            const newStatus = superCategory.status === true ? false : true;
            superCategory.status = newStatus;
            await superCategory.save();
            return successResponse(
                res,
                `ProductSubSubCategory ${newStatus === true ? "Blocked" : "Activated"} successfully.`,
                200,
                superCategory
            );
        } catch (error) {
            return errorResponse(res, error.message || "Internal Server Error", 500);
        }
    }
);

exports.getAllProductSubSubCategoryStatus = CatchAsync(
    async (req, res) => {
        try {
              const ProductSubSubCategorys = await ProductSubSubCategory.find({status : true}).sort({ createdAt: -1 });
            return successResponse(res, "ProductSubSubCategorys list successfully.", 201, ProductSubSubCategorys);
        } catch (error) {
            return errorResponse(res, error.message || "Internal Server Error", 500);
        }
    }
);


exports.deleteProductSubSubCategory = CatchAsync(
    async (req, res) => {
        try {
            const { id } = req.params;
            
            const subCategory = await ProductSubSubCategory.findById(id);
            
            if (!subCategory) {
                return validationErrorResponse(res, "ProductSubSubCategory not found.", 400);
            }

                 const productsSubCategory = await ProductSubSubCategory.find({ category: id });
            
            if (productsSubCategory.length > 0) {
                return validationErrorResponse(
                    res, 
                    400,
                    `Cannot delete ProductSubSubCategory "${subCategory.name}" because it is currently being used in ${productsSubCategory.length} Subcategory(s). Please remove or reassign these Subcategory first.`,
                );
            }
            
            
            // Check if this subcategory is being used in any product
            
            const productsUsingSubCategory = await Product.find({ subsubcategory: id });
            
            if (productsUsingSubCategory.length > 0) {
                return validationErrorResponse(
                    res, 
                    400,
                    `Cannot delete ProductSubSubCategory "${subCategory.name}" because it is currently being used in ${productsUsingSubCategory.length} product(s). Please remove or reassign these products first.`,
                );
            }
            
            // Delete the subcategory
            await ProductSubSubCategory.findByIdAndDelete(id);
            
            return successResponse(
                res,
                `ProductSubSubCategory "${subCategory.name}" deleted successfully.`,
                200,
                null
            );
        } catch (error) {
            return errorResponse(res, error.message || "Internal Server Error", 500);
        }
    }
);


exports.getProductSubDataSubCategoryById = CatchAsync(
    async (req, res) => {
        try {
            const ProductSubSubCategorydata = await ProductSubSubCategory.find({
                subcategory: req.params.id,
            });
            if (!ProductSubSubCategorydata) {
                return validationErrorResponse(res, "ProductSubSubCategory not found.", 400, ProductSubSubCategorydata);
            }
            return successResponse(res, "ProductSubSubCategory Details successfully.", 201, ProductSubSubCategorydata);
        } catch (error) {
            return errorResponse(res, error.message || "Internal Server Error", 500);

        }
    }
);