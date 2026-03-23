const VendorCategory = require("../Model/VendorCategory");
const Vendor = require("../Model/Vendor");
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
    console.log(title)
    let baseSlug = makeSlug(title);
    let slug = baseSlug;
    let counter = 1;

    while (await Model.findOne({ slug })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
    }

    return slug;
};




exports.AddVendorCategory = CatchAsync(async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return validationErrorResponse(res, "Category name is required", 400);
        }
        let imageUrl = null;

        if (req.file) {
            imageUrl = req.file.location;   // ✅ S3 image URL
        }
        const slug = await generateUniqueSlug(VendorCategory, name);

        const Categorys = new VendorCategory({
            name, slug: slug,
            Image: imageUrl
        });

        const record = await Categorys.save();
        return successResponse(res, "Category created successfully.", 201, record);

    } catch (error) {
        console.log(error);
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});

exports.getAllVendorCategorys = CatchAsync(
    async (req, res) => {
        try {
            const Categorys = await VendorCategory.find().sort({ createdAt: -1 });
            return successResponse(res, "Vendor Categorys list successfully.", 201, Categorys);
        } catch (error) {
            return errorResponse(res, error.message || "Internal Server Error", 500);
        }
    }
);

exports.updateCategory = CatchAsync(async (req, res) => {

    try {

        const { name } = req.body;

        const data = await VendorCategory.findById(req.params.id);

        if (!data) {
            return validationErrorResponse(res, "Vendor Category not found.", 404);
        }

        /* -------- Update Name + Slug -------- */

        if (name && name !== data.name) {

            data.name = name;

            const slug = await generateUniqueSlug(VendorCategory, name);

            data.slug = slug;

        }

        /* -------- Image Update -------- */

        if (req.file && req.file.location) {

            if (data.Image) {

                try {

                    await deleteFile(data.Image);   // delete old S3 image

                } catch (err) {

                    console.log("Error deleting old image:", err.message);

                }

            }

            data.Image = req.file.location;

        }

        const updatedCategory = await data.save();

        return successResponse(
            res,
            "Category updated successfully.",
            200,
            updatedCategory
        );

    } catch (error) {

        console.log(error);

        return errorResponse(res, error.message || "Internal Server Error", 500);

    }

});

exports.AddVendor = CatchAsync(async (req, res) => {
    try {
        console.log("req.files", req.files)

        const { name, experience, specialization, VendorCategory, phone, VendorSubCategory, content } = req.body;
        if (!name) {
            return validationErrorResponse(res, "Category name is required", 400);
        }


        const slug = await generateUniqueSlug(Vendor, req.body.name);
        const imageUrls = req.files["images[]"]?.map((f) => f.location) || [];
        const Image = req.files?.["Image"]?.[0]?.location;


        const VendorsData = new Vendor({
            Image: Image,
            multiple_images: imageUrls,
            slug: slug,
            specialization: specialization,
            content,
            name, experience, VendorCategory, phone, VendorSubCategory
        });

        const record = await VendorsData.save();
        return successResponse(res, "vendor created successfully.", 201, record);

    } catch (error) {
        console.log(error);
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});

exports.getAllVendors = CatchAsync(
    async (req, res) => {
        try {
            const Categorys = await Vendor.find().sort({ createdAt: -1 }).populate("VendorCategory");
            return successResponse(res, "Vendor Categorys list successfully.", 201, Categorys);
        } catch (error) {
            return errorResponse(res, error.message || "Internal Server Error", 500);
        }
    }
);

exports.updatevendor = CatchAsync(
    async (req, res) => {
        try {
            console.log("req.files", req.files)
            const { name, phone, VendorCategory, specialization, experience, content, } = req.body;

            const data = await Vendor.findById(req.params.id);

            const imageUrls = req.files?.["images[]"]?.map((f) => f.location) || [];
            const Image = req.files?.["Image"]?.[0]?.location;

            if (!data) {
                return validationErrorResponse(res, "Vendor Category not found.", 404);
            }

            if (imageUrls.length > 0) {
                data.multiple_images = [...data.multiple_images, ...imageUrls]; // append new images
            }

            if (name) {
                data.name = name;
                data.slug = await generateUniqueSlug(Vendor, name);
            }
            if (name) data.name = name;
            if (phone) data.phone = phone;
            if (VendorCategory) data.VendorCategory = VendorCategory;
            if (specialization) data.specialization = specialization;
            if (experience) data.experience = experience;
            if (content) data.content = content;
            if (req.file && req.file.location) {

                if (data.Image) {
                    try {
                        await deleteFile(data.Image);
                    } catch (err) {
                        console.log("Error deleting old image:", err.message);
                    }
                }

                data.Image = req.file.location;
            }

            const updatedCategory = await data.save();
            return successResponse(res, "Vendor updated successfully.", 200, updatedCategory);

        } catch (error) {
            console.log(error);
            return errorResponse(res, error.message || "Internal Server Error", 500);
        }
    }
);

exports.DeleteVendor = CatchAsync(async (req, res) => {
    try {
        const id = req.params.id;
        const Vendors = await Vendor.findById(id);

        if (!Vendors) {
            return validationErrorResponse(res, "Vendor not found", 404);
        }

        if (Vendors.deletedAt) {
            Vendors.deletedAt = null;
            await Vendors.save();
            return successResponse(res, "Vendor restored successfully", 200);
        }

        Vendors.deletedAt = new Date();
        await Vendors.save();

        return successResponse(res, "Vendor deleted successfully", 200);

    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});

exports.getVendors = CatchAsync(
    async (req, res) => {
        try {
            const Categorys = await Vendor.find({ deletedAt: null }).sort({ createdAt: -1 }).populate("VendorCategory");
            return successResponse(res, "Vendor Categorys list successfully.", 201, Categorys);
        } catch (error) {
            return errorResponse(res, error.message || "Internal Server Error", 500);
        }
    }
);

exports.getVendorCategoryIds = CatchAsync(async (req, res) => {
    try {
        const slug = req.params.slug;

        if (!slug) {
            return errorResponse(res, "Category slug is required", 400);
        }

        const category = await VendorCategory.findOne({ slug });

        if (!category) {
            return errorResponse(res, "Vendor Category not found", 404);
        }

        // Get Vendors of this Category
        const vendors = await Vendor.find({
            deletedAt: null,
            VendorCategory: category._id,
        }).sort({ createdAt: -1 });

        return successResponse(
            res,
            "Vendor Category details fetched successfully.",
            200,
            { category, vendors }
        );

    } catch (error) {
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});


exports.GetVendorBySlug = CatchAsync(async (req, res) => {
    try {
        const Vendors = await Vendor.findOne({ slug: req.params.slug });

        if (!Vendors) {
            return validationErrorResponse(
                res,
                "Vendor not found.",
                400
            );
        }

        return successResponse(
            res,
            "Project Details successfully.",
            200,
            Vendors
        );
    } catch (error) {
        return errorResponse(
            res,
            error.message || "Internal Server Error",
            500
        );
    }
});