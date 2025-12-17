const Banner = require("../Model/Banner");
const CatchAsync = require("../Utill/catchAsync");
const { errorResponse, successResponse, validationErrorResponse } = require("../Utill/ErrorHandling");
const { deleteFile } = require("../Utill/S3");

exports.AddBanner = CatchAsync(async (req, res) => {
    try {
        const { name, link } = req.body;
        if (!name) {
            return validationErrorResponse(res, "Banner name is required", 400);
        }
        let imageUrl = null;
        if (req.file) {
            imageUrl = req.file.location;
        }
        const Banners = new Banner({
            name,
            Image: imageUrl,
            link
        });

        const record = await Banners.save();
        return successResponse(res, "Banner created successfully.", 201, record);

    } catch (error) {
        console.log(error);
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});

exports.GetAllBanner = CatchAsync(
    async (req, res) => {
        try {
            const Banners = await Banner.find().sort({ createdAt: -1 });
            return successResponse(res, "Banners list successfully.", 201, Banners);
        } catch (error) {
            return errorResponse(res, error.message || "Internal Server Error", 500);
        }
    }
);

exports.UpdateBanner = CatchAsync(
    async (req, res) => {
        try {
            const { name, link } = req.body;
            const data = await Banner.findById(req.params.id);
            if (!data) {
                return validationErrorResponse(res, "Banner not found.", 404);
            }
            // ✅ Update name if provided
            if (name) data.name = name;
            if (link) data.link = link;

            // ✅ If new image uploaded → delete old image first
            if (req.file && req.file.location) {

                if (data.Image) {
                    try {
                        await deleteFile(data.Image);   // ✅ S3 old image delete
                    } catch (err) {
                        console.log("Error deleting old image:", err.message);
                    }
                }
                data.Image = req.file.location;
            }

            const updatedBanner = await data.save();
            console.log("updatedCategory", updatedBanner)
            return successResponse(res, "Banner updated successfully.", 200, updatedBanner);

        } catch (error) {
            console.log(error);
            return errorResponse(res, error.message || "Internal Server Error", 500);
        }
    }
);  

exports.BannerDelete  = CatchAsync(async (req, res) => {
  try {
    const id = req.params.id;
    const userrecord = await Banner.findById(id);
console.log("userrecord" ,userrecord)
    if (!userrecord) {
      return validationErrorResponse(res, "Banner not found", 404);
    }

    if (userrecord.deleted_at) {
      userrecord.deleted_at = null;
      await userrecord.save();
      return successResponse(res, "Banner restored successfully", 200);
    }

    userrecord.deleted_at = new Date();
  const record =   await userrecord.save();
console.log("record"  ,record)
    return successResponse(res, "Banner deleted successfully", 200);

  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});