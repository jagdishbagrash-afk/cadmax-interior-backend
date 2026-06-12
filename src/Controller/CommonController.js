const Cart = require("../Model/Cart");
const Lead = require("../Model/Lead");
const Order = require("../Model/Order");
const Product = require("../Model/Product");
const Project = require("../Model/Project");
const Services = require("../Model/Services");
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

  // ✅ Only active products
  {
    $match: {
      "product.deletedAt": null,
    },
  },

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
    deletedAt : null
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

exports.LeadWebsite = catchAsync(async (req, res) => {
  try {
    const assignedTo = req.user.id; 
    const { title, message, services, type , category   } = req.body;
    
    const record = await Lead.create({
      assignedTo,
      title,
      message,
      services,
      category ,
      type,
      source: "Website"
    })


    res.json({
      status: true,
      message: " Request submitted & emails sent successfully.",
      record: record
    });

  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
});


exports.CommonAddToCart = catchAsync(async (req, res) => {
  try {
    const userId = req.user.id;
console.log("Add to cart payload:", req.body);
    const { productId ,  quantity , variant  } = req.body;


    if (!productId || !variant) {
      return errorResponse(res, "ProductId or variant missing", 400);
    }

    // Quantity validation
    if (quantity <= 0) {
      return errorResponse(res, "Quantity must be at least 1", 400);
    }

    const dbProduct = await Product.findById(productId);
    if (!dbProduct) {
      return errorResponse(res, "Product not found", 400);
    }

    const normalizedVariant = variant.toLowerCase().trim();

    const matchedVariant = dbProduct.variants.find(
  v => v.title.toLowerCase().trim() === normalizedVariant
);

    if (!matchedVariant) {
      return errorResponse(res, `Variant '${variant}' not available`, 400);
    }

    if (matchedVariant.stock < quantity) {
      return errorResponse(
        res,
        `Only ${matchedVariant.stock} items left for ${variant}`,
        400
      );
    }

    // Find or create cart
    let cart = await Cart.findOne({ user: userId, status: "pending" });

    if (!cart) {
      cart = await Cart.create({
        user: userId,
        status: "pending",
        product: [
          {
            productId,
            variant: normalizedVariant,
            quantity
          }
        ]
      });

      return successResponse(res, "Item added to cart", 200, cart);
    }

    const existingItem = cart.product.find(
      p =>
        p.productId.toString() === productId &&
        p.variant === normalizedVariant
    );

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;

      if (newQuantity > matchedVariant.stock) {
        return errorResponse(
          res,
          `Cannot add more than available stock (${matchedVariant.stock})`,
          400
        );
      }

      existingItem.quantity = newQuantity;
    } else {
      cart.product.push({
        productId,
        variant: normalizedVariant,
        quantity
      });
    }

    await cart.save();

    return successResponse(res, "Item added to cart", 200, cart);

  } catch (error) {
    console.log("error", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});


exports.updateCommonCart = catchAsync(async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, quantity, variant } = req.body;

    if (!productId || !variant || quantity === undefined) {
      return errorResponse(res, "Invalid payload", 400);
    }

    if (quantity < 0) {
      return errorResponse(res, "Quantity cannot be negative", 400);
    }

    // ✅ correct cart
    const cart = await Cart.findOne({ user: userId, status: "pending" });

    if (!cart || cart.product.length === 0) {
      return errorResponse(res, "Cart is empty", 400);
    }

    const dbProduct = await Product.findById(productId);
    if (!dbProduct) {
      return errorResponse(res, "Product not found", 400);
    }

    const normalizedVariant = variant.toLowerCase().trim();

    const matchedVariant = dbProduct.variants.find(
      (v) => v.title.toLowerCase().trim() === normalizedVariant
    );

    if (!matchedVariant) {
      return errorResponse(res, `Variant '${variant}' not available`, 400);
    }

    const cartItemIndex = cart.product.findIndex(
      (p) =>
        p.productId.toString() === productId &&
        p.variant === normalizedVariant
    );

    if (cartItemIndex === -1) {
      return errorResponse(res, "Item not found in cart", 400);
    }

    // 🔥 REMOVE
    if (quantity === 0) {
      cart.product.splice(cartItemIndex, 1);
    } else {
      // 🔥 STOCK CHECK
      if (quantity > matchedVariant.stock) {
        return errorResponse(
          res,
          `Only ${matchedVariant.stock} items left`,
          400
        );
      }

      cart.product[cartItemIndex].quantity = quantity;
    }

    await cart.save();

    // 🔥 clean response for frontend
    const populatedCart = await Cart.findById(cart._id).populate({
      path: "product.productId",
      select: "title amount variants",
    });

    const formattedItems = populatedCart.product.map((item) => {
      const product = item.productId;

      const variantData = product.variants.find(
        (v) => v.title.toLowerCase().trim() === item.variant
      );

      return {
        productId: product._id,
        name: product.title,
        price: product.amount,
        quantity: item.quantity,
        variant: item.variant,
        images: variantData?.images || [],
      };
    });

    return successResponse(res, "Cart updated successfully", 200, {
      items: formattedItems,
    });

  } catch (error) {
    console.log("error", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});


exports.removeProductVariantFromCart = catchAsync(async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, variant } = req.params;

    const normalizedVariant = variant.toLowerCase().trim();

const cart = await Cart.findOne({
  user: userId,
  status: "pending"
});

    if (!cart) {
      return errorResponse(res, "Cart not found", 404);
    }

    const initialLength = cart.product.length;

    cart.product = cart.product.filter(
      (item) =>
        !(
          item.productId.toString() === productId &&
          item.variant.toLowerCase().trim() === normalizedVariant
        )
    );

    if (cart.product.length === initialLength) {
      return errorResponse(res, "Product variant not found in cart", 404);
    }

    await cart.save();

    return successResponse(
      res,
      "Product variant removed from cart",
      200,
      cart
    );
  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});



const admin = require("../Utill/firebase");

exports.testNotification = async (req, res) => {
  try {
    const { token, title, body } = req.body;

    if (!token) {
      return res.status(400).json({
        status: false,
        message: "FCM token is required",
      });
    }

    const message = {
      token: token,
      notification: {
        title: title || "Test Notification",
        body: body || "This is a test push notification 🚀",
      },
    };

    const response = await admin.messaging().send(message);

    return res.status(200).json({
      status: true,
      message: "Notification sent successfully",
      data: response,
    });

  } catch (error) {
    console.error("FCM Error:", error);

    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

exports.globalSearch = catchAsync(async (req, res) => {
  try {
    const { search } = req.query;


    const regexFilter = search
      ? { $regex: search, $options: "i" }
      : null;

  const productFilter = {
  deletedAt: null,
};

    if (regexFilter) {
      productFilter.title = regexFilter;
    }

    const productsPromise = Product.find(productFilter)
      .populate("subcategory")
      .populate("category")
      .sort({ createdAt: -1 });

    const serviceMatch = {
      status: true,
    };

    if (regexFilter) {
      serviceMatch.title = regexFilter;
    }

    const servicesPromise = Services.aggregate([
      {
        $match: serviceMatch,
      },
      {
        $group: {
          _id: "$concept",
          services: { $push: "$$ROOT" },
        },
      },
      {
        $project: {
          _id: 0,
          k: "$_id",
          v: "$services",
        },
      },
      {
        $group: {
          _id: null,
          data: { $push: { k: "$k", v: "$v" } },
        },
      },
      {
        $replaceRoot: {
          newRoot: { $arrayToObject: "$data" },
        },
      },
    ]);

    const [products, services] = await Promise.all([
      productsPromise,
      servicesPromise,
    ]);

    const defaultConcepts = {
      contemporary: [],
      modern: [],
      classic: [],
    };

    const finalServices = {
      ...defaultConcepts,
      ...(services[0] || {}),
    };

    return successResponse(res, "Global search result", 200, {
      products,
      design: finalServices,
    });

  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});
