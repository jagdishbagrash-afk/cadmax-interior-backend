const Order = require("../Model/Order");
const Product = require("../Model/Product");
const Project = require("../Model/Project");
const { errorResponse, successResponse, validationErrorResponse } = require("../Utill/ErrorHandling");
const { deleteFile } = require("../Utill/S3");
const catchAsync = require("../Utill/catchAsync");

exports.bestSellerProducts = catchAsync(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;

  const bestSellers = await Order.aggregate([
    { $unwind: "$product" },
    {
      $group: {
        _id: "$product.id",
        totalQuantity: { $sum: "$product.quantity" },
        totalOrders: { $sum: 1 },
      },
    },

    {
      $match: {
        totalOrders: { $gt: 1 },
      },
    },

    { $sort: { totalQuantity: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },
    {
      $project: {
        product: "$product",  
      },
    },
  ]);

  

  res.status(200).json({
    success: true,
    message: "Best seller products fetched successfully",
    data: bestSellers,
  });
});





exports.latestProducts = catchAsync(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;

  const products = await Product.find({
    deletedAt: null,
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("category")
    .populate("subcategory");

  res.status(200).json({
    success: true,
    message: "Latest products fetched successfully",
    data: products,
  });
});


exports.GetAllCommonProject = catchAsync(async (req, res) => {
  try {
    const projects = await Project
      .find({}, { Image: 1, _id: 0 }) // only image
      .sort({ createdAt: -1 });

    return successResponse(res, "Project list successfully.", 200, projects);
  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});



exports.deleteImage = async (req, res) => {
    try {
        const { imageUrl } = req.body;

        if (!imageUrl) {
            return res.status(400).json({
                success: false,
                message: "Image URL is required"
            });
        }

   const record=      await deleteFile(imageUrl);
console.log("record" ,record)
        return res.status(200).json({
            success: true,
            message: "Image deleted successfully"
        });

    } catch (error) {
        console.error("Delete Image Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to delete image",
            error: error.message
        });
    }
};