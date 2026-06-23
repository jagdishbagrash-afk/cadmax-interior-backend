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

    const {
      productId,
      quantity = 1,
      variant,
      size,
      priceSection,
      price,
    } = req.body;

    if (!productId || !variant) {
      return errorResponse(
        res,
        "ProductId and Variant are required",
        400
      );
    }

    if (quantity <= 0) {
      return errorResponse(
        res,
        "Quantity must be greater than 0",
        400
      );
    }

    const product = await Product.findById(productId);

    if (!product) {
      return errorResponse(
        res,
        "Product not found",
        404
      );
    }

    const normalizedVariant =
      variant.toLowerCase().trim();

    const matchedVariant =
      product.variants.find(
        (v) =>
          v.color.toLowerCase().trim() ===
          normalizedVariant
      );

    if (!matchedVariant) {
      return errorResponse(
        res,
        `Variant '${variant}' not available`,
        400
      );
    }

    if (matchedVariant.stock < quantity) {
      return errorResponse(
        res,
        `Only ${matchedVariant.stock} items available`,
        400
      );
    }

    let cart = await Cart.findOne({
      user: userId,
      status: "pending",
    });

    if (!cart) {
      cart = await Cart.create({
        user: userId,
        status: "pending",
        product: [
          {
            productId,
            variant: normalizedVariant,
            size,
            quantity,
            price,
            originalPrice: price,
            discount: 0,
            priceSection,
          },
        ],
      });

      return successResponse(
        res,
        "Item added to cart",
        200,
        cart
      );
    }

    const existingItem =
      cart.product.find(
        (item) =>
          item.productId.toString() ===
            productId &&
          item.variant ===
            normalizedVariant &&
          item.size === size &&
          item.priceSection ===
            priceSection
      );

    if (existingItem) {
      const updatedQty =
        existingItem.quantity + quantity;

      if (
        updatedQty >
        matchedVariant.stock
      ) {
        return errorResponse(
          res,
          `Only ${matchedVariant.stock} items available`,
          400
        );
      }

      existingItem.quantity =
        updatedQty;

      existingItem.price = price;
      existingItem.originalPrice =
        price;
    } else {
      cart.product.push({
        productId,
        variant: normalizedVariant,
        size,
        quantity,
        price,
        originalPrice: price,
        discount: 0,
        priceSection,
      });
    }

    await cart.save();

    return successResponse(
      res,
      "Item added to cart",
      200,
      cart
    );
  } catch (error) {
    console.log(
      "Add To Cart Error:",
      error
    );

    return errorResponse(
      res,
      error.message ||
        "Internal Server Error",
      500
    );
  }
});

exports.updateCommonCart = catchAsync(async (req, res) => {
  try {
    const userId = req.user.id;

    const { productId, variant, quantity } = req.body;

    if (!productId || !variant || quantity === undefined) {
      return errorResponse(res, "Invalid payload", 400);
    }

    if (quantity < 0) {
      return errorResponse(
        res,
        "Quantity cannot be negative",
        400
      );
    }

    const cart = await Cart.findOne({
      user: userId,
      status: "pending",
    });

    if (!cart) {
      return errorResponse(res, "Cart not found", 404);
    }

    const product = await Product.findById(productId);

    if (!product) {
      return errorResponse(
        res,
        "Product not found",
        404
      );
    }

    const normalizedVariant = variant
      .toLowerCase()
      .trim();

    const variantData = product.variants.find(
      (v) =>
        v.color.toLowerCase().trim() ===
        normalizedVariant
    );

    if (!variantData) {
      return errorResponse(
        res,
        `Variant '${variant}' not found`,
        400
      );
    }

    const itemIndex = cart.product.findIndex(
      (item) =>
        item.productId.toString() === productId &&
        item.variant === normalizedVariant
    );

    if (itemIndex === -1) {
      return errorResponse(
        res,
        "Item not found in cart",
        404
      );
    }

    // Remove item
    if (quantity === 0) {
      cart.product.splice(itemIndex, 1);
    } else {
      // Stock validation
      if (quantity > variantData.stock) {
        return errorResponse(
          res,
          `Only ${variantData.stock} items available`,
          400
        );
      }

      cart.product[itemIndex].quantity = quantity;
    }

    // Recalculate totals
    cart.subtotal = cart.product.reduce(
      (total, item) =>
        total + item.price * item.quantity,
      0
    );

    const discountAmount =
      (cart.subtotal * cart.discount) / 100;

    const taxAmount =
      (cart.subtotal * cart.tax) / 100;

    cart.totalAmount =
      cart.subtotal -
      discountAmount +
      taxAmount;

    await cart.save();

    return successResponse(
      res,
      "Cart updated successfully",
      200,
      cart
    );
  } catch (error) {
    console.log("Update Cart Error:", error);

    return errorResponse(
      res,
      error.message || "Internal Server Error",
      500
    );
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

exports.getCart = catchAsync(async (req, res) => {
  try {
    const cart = await Cart.findOne({
      user: req.user.id,
      status: "pending",
    })
      .populate({
        path: "product.productId",
      })
      .lean();

    if (!cart || !cart.product?.length) {
      return successResponse(res, "Cart is empty", 200, {
        items: [],
        summary: {
          subtotal: 0,
          totalDiscount: 0,
          cartDiscount: 0,
          cartDiscountAmount: 0,
          tax: 2,
          taxAmount: 0,
          totalAmount: 0,
          itemCount: 0,
          uniqueItems: 0,
          status: "pending",
          hasOutOfStockItems: false,
          lastUpdated: new Date(),
        },
      });
    }

    let subtotal = 0;
    let totalDiscount = 0;
    let hasOutOfStockItems = false;

    const items = [];

    for (const item of cart.product) {
      const product = item.productId;

      if (!product) continue;

      // ==========================
      // Selected Variant
      // ==========================
      const selectedVariant =
        product?.variants?.find(
          (variant) =>
            variant?.color?.toLowerCase()?.trim() ===
            item?.variant?.toLowerCase()?.trim()
        ) || null;

      // ==========================
      // Selected Price Section
      // ==========================
      let selectedPriceSection = null;
      let selectedSize = null;

      if (
        product?.product_price_section?.length &&
        item?.priceSection
      ) {
        selectedPriceSection =
          product.product_price_section.find(
            (section) =>
              section?.title?.toLowerCase()?.trim() ===
              item?.priceSection?.toLowerCase()?.trim()
          ) || null;

        if (selectedPriceSection?.sizes?.length) {
          selectedSize =
            selectedPriceSection.sizes.find(
              (size) =>
                size?.title?.toLowerCase()?.trim() ===
                item?.size?.toLowerCase()?.trim()
            ) || null;
        }

        if (selectedPriceSection) {
          selectedPriceSection = {
            ...selectedPriceSection,
            sizes: selectedSize ? [selectedSize] : [],
          };
        }
      }

      // ==========================
      // Price Calculation
      // ==========================
      let itemPrice = item.price || 0;
      let itemOriginalPrice = item.originalPrice || 0;
      let itemDiscount = item.discount || 0;

      if (selectedSize) {
        itemPrice =
          item.price || selectedSize.final_amount || 0;

        itemOriginalPrice =
          item.originalPrice || selectedSize.amount || 0;

        itemDiscount =
          item.discount ||
          selectedSize.discount_amount ||
          0;
      } else if (selectedPriceSection) {
        itemPrice =
          item.price ||
          selectedPriceSection.final_amount ||
          selectedPriceSection.amount ||
          0;

        itemOriginalPrice =
          item.originalPrice ||
          selectedPriceSection.amount ||
          0;

        itemDiscount =
          item.discount ||
          selectedPriceSection.discount_amount ||
          0;
      } else {
        itemPrice =
          item.price ||
          selectedVariant?.final_amount ||
          selectedVariant?.amount ||
          product.final_amount ||
          product.amount ||
          0;

        itemOriginalPrice =
          item.originalPrice ||
          selectedVariant?.amount ||
          product.amount ||
          itemPrice;

        itemDiscount =
          item.discount ||
          selectedVariant?.discount_amount ||
          product.discount_amount ||
          0;
      }

      const quantity = item.quantity || 1;

      const itemSubtotal = itemPrice * quantity;
      const itemOriginalSubtotal =
        itemOriginalPrice * quantity;

      const itemDiscountAmount =
        itemOriginalSubtotal - itemSubtotal;

      subtotal += itemOriginalSubtotal;
      totalDiscount += itemDiscountAmount;

      const availableStock =
        selectedVariant?.stock ??
        product?.stock ??
        0;

      const isOutOfStock =
        availableStock < quantity;

      if (isOutOfStock) {
        hasOutOfStockItems = true;
      }

      // ==========================
      // Filter Product Data
      // ==========================
      const filteredProduct = {
        ...product,
        variants: selectedVariant
          ? [selectedVariant]
          : [],
        product_price_section:
          selectedPriceSection
            ? [selectedPriceSection]
            : [],
      };

      items.push({
        cartItemId: item._id,

        product: filteredProduct,

        quantity,

      
        itemSubtotal,
        itemOriginalSubtotal,
        itemDiscountAmount,

        availableStock,
        isOutOfStock,

        stock_status:
          product.stock_status || "in_stock",
      });
    }

    const cartDiscountPercentage =
      cart.discount || 2;

    const taxPercentage =
      cart.tax || 2;

    const cartDiscountAmount =
      (subtotal * cartDiscountPercentage) / 100;

    const taxableAmount =
      subtotal -
      totalDiscount -
      cartDiscountAmount;

    const taxAmount =
      (taxableAmount * taxPercentage) / 100;

    const totalAmount =
      taxableAmount + taxAmount;

    const summary = {
      subtotal: Number(subtotal.toFixed(2)),
      totalDiscount: Number(totalDiscount.toFixed(2)),

      savings: Number(
        (
          totalDiscount +
          cartDiscountAmount
        ).toFixed(2)
      ),

      cartDiscount: cartDiscountPercentage,

      cartDiscountAmount: Number(
        cartDiscountAmount.toFixed(2)
      ),

      tax: taxPercentage,

      taxAmount: Number(
        taxAmount.toFixed(2)
      ),

      totalAmount: Number(
        totalAmount.toFixed(2)
      ),

      itemCount: items.reduce(
        (sum, item) => sum + item.quantity,
        0
      ),

      uniqueItems: items.length,

      status: cart.status,

      hasOutOfStockItems,

      createdAt: cart.createdAt,

      lastUpdated: cart.updatedAt,
    };

    return successResponse(
      res,
      "Cart fetched successfully",
      200,
      {
        items,
        summary,
      }
    );
  } catch (error) {
    console.error("Get Cart Error:", error);

    return errorResponse(
      res,
      error.message || "Internal Server Error",
      500
    );
  }
});

exports.clearCart = catchAsync(async (req, res) => {
  try {
    const userId = req.user.id;
    const cart = await Cart.findOneAndDelete({ user: userId });
    if (!cart) {
      return successResponse(res, "Cart already empty", 200);
    }
    return successResponse(res, "Cart cleared successfully", 200);
  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});