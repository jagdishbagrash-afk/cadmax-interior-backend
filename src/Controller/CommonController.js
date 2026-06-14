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

    const { productId, quantity, variant, priceSection } = req.body;

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
      v => v.color.toLowerCase() === normalizedVariant
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

    // Calculate price based on product amount or price section
    let finalPrice = 0;
    let originalPrice = 0;
    let discountPercent = 0;
    let selectedPriceSection = null;

    // Check if main product amount is 0 and price sections exist
    if ((!dbProduct.amount || dbProduct.amount === 0) && dbProduct.product_price_section && dbProduct.product_price_section.length > 0) {
      // Use price section
      if (priceSection && priceSection.title) {
        // Find the selected price section
        const foundSection = dbProduct.product_price_section.find(
          section => section.title === priceSection.title
        );
        
        if (foundSection) {
          selectedPriceSection = {
            title: foundSection.title,
            amount: foundSection.amount,
            discount_amount: foundSection.discount_amount,
            final_amount: foundSection.final_amount
          };
          finalPrice = foundSection.final_amount;
          originalPrice = foundSection.amount;
          discountPercent = foundSection.discount_amount;
        } else {
          // If price section not found, use first one
          const firstSection = dbProduct.product_price_section[0];
          selectedPriceSection = {
            title: firstSection.title,
            amount: firstSection.amount,
            discount_amount: firstSection.discount_amount,
            final_amount: firstSection.final_amount
          };
          finalPrice = firstSection.final_amount;
          originalPrice = firstSection.amount;
          discountPercent = firstSection.discount_amount;
        }
      } else {
        // Use first price section by default
        const firstSection = dbProduct.product_price_section[0];
        selectedPriceSection = {
          title: firstSection.title,
          amount: firstSection.amount,
          discount_amount: firstSection.discount_amount,
          final_amount: firstSection.final_amount
        };
        finalPrice = firstSection.final_amount;
        originalPrice = firstSection.amount;
        discountPercent = firstSection.discount_amount;
      }
    } else {
      // Use main product price
      finalPrice = dbProduct.final_amount || dbProduct.amount;
      originalPrice = dbProduct.amount;
      discountPercent = dbProduct.discount_amount || 0;
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
            quantity,
            price: finalPrice,
            originalPrice: originalPrice,
            discount: discountPercent,
            priceSection: selectedPriceSection
          }
        ],
        subtotal: finalPrice * quantity,
        totalAmount: finalPrice * quantity
      });

      return successResponse(res, "Item added to cart", 200, cart);
    }

    // Check if product already exists in cart (with same variant and price section)
    const existingItem = cart.product.find(
      p =>
        p.productId.toString() === productId &&
        p.variant === normalizedVariant &&
        JSON.stringify(p.priceSection?.title) === JSON.stringify(selectedPriceSection?.title)
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
      existingItem.price = finalPrice;
      existingItem.originalPrice = originalPrice;
      existingItem.discount = discountPercent;
      existingItem.priceSection = selectedPriceSection;
    } else {
      cart.product.push({
        productId,
        variant: normalizedVariant,
        quantity,
        price: finalPrice,
        originalPrice: originalPrice,
        discount: discountPercent,
        priceSection: selectedPriceSection
      });
    }

    // Recalculate cart totals
    cart.subtotal = cart.product.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
    
    const discountAmount = (cart.subtotal * (cart.discount || 0)) / 100;
    const taxAmount = (cart.subtotal * (cart.tax || 0)) / 100;
    cart.totalAmount = cart.subtotal - discountAmount + taxAmount;

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
    const { productId, quantity, variant, priceSectionTitle } = req.body;

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
      (v) => v.color === normalizedVariant
    );

    if (!matchedVariant) {
      return errorResponse(res, `Variant '${variant}' not available`, 400);
    }

    // Find cart item with matching product, variant, and price section
    const cartItemIndex = cart.product.findIndex(
      (p) =>
        p.productId.toString() === productId &&
        p.variant === normalizedVariant &&
        (priceSectionTitle ? p.priceSection?.title === priceSectionTitle : !p.priceSection)
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

    // Recalculate cart totals
    cart.subtotal = cart.product.reduce((total, item) => {
      return total + ((item.price || 0) * (item.quantity || 0));
    }, 0);
    
    const discountAmount = (cart.subtotal * (cart.discount || 0)) / 100;
    const taxAmount = (cart.subtotal * (cart.tax || 0)) / 100;
    cart.totalAmount = cart.subtotal - discountAmount + taxAmount;

    await cart.save();

    // 🔥 clean response for frontend
    const populatedCart = await Cart.findById(cart._id).populate({
      path: "product.productId",
      select: "title amount discount_amount final_amount variants product_price_section",
    });

    const formattedItems = populatedCart.product.map((item) => {
      const product = item.productId;

      const variantData = product.variants.find(
        (v) => v.color === item.variant
      );

      // Get price based on price section or main product
      let displayPrice = item.price;
      let originalPrice = item.originalPrice;
      let discountPercent = item.discount;
      let priceSectionData = item.priceSection;

      if (priceSectionData) {
        displayPrice = priceSectionData.final_amount;
        originalPrice = priceSectionData.amount;
        discountPercent = priceSectionData.discount_amount;
      }

      return {
        productId: product._id,
        name: product.title,
        price: displayPrice,
        originalPrice: originalPrice,
        discount: discountPercent,
        quantity: item.quantity,
        variant: item.variant,
        variantTitle: variantData?.title || `${item.variant} Variant`,
        images: variantData?.images || [],
        priceSection: priceSectionData,
        subtotal: displayPrice * item.quantity
      };
    });

    const cartSummary = {
      items: formattedItems,
      subtotal: cart.subtotal,
      discount: cart.discount,
      tax: cart.tax,
      totalAmount: cart.totalAmount,
      itemCount: cart.product.reduce((sum, item) => sum + item.quantity, 0),
      status: cart.status
    };

    return successResponse(res, "Cart updated successfully", 200, cartSummary);

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

exports.getCart = catchAsync(async (req, res) => {
  try {
    const cart = await Cart.findOne({
      user: req.user.id,
      status: "pending",
    }).populate({
      path: "product.productId",
      select: "title description slug amount discount_amount final_amount variants product_price_section stock_status"
    });

    if (!cart || !cart.product || cart.product.length === 0) {
      return successResponse(
        res,
        "Cart is empty",
        200,
        {
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
            lastUpdated: new Date()
          },
        }
      );
    }

    let subtotal = 0;
    let totalDiscount = 0;
    const items = [];
    let hasOutOfStockItems = false;

    for (const item of cart.product) {
      const product = item.productId;

      if (!product) {
        console.warn(`Product not found for cart item: ${item._id}`);
        continue;
      }

      const variantData = product.variants?.find(
        (v) =>
          v.color?.toLowerCase().trim() ===
          item.variant?.toLowerCase().trim()
      );

      if (!variantData) {
        console.warn(`Variant ${item.variant} not found for product ${product._id}`);
        continue;
      }

      // Use stored price from cart (saved at time of adding to cart)
      let itemPrice = item.price;
      let itemOriginalPrice = item.originalPrice;
      let itemDiscount = item.discount;
      let priceSectionData = item.priceSection;

      // Fallback for backward compatibility (if price not stored in cart)
      if (!itemPrice || itemPrice === 0) {
        // Check if product has price sections and main amount is 0
        if (product.product_price_section?.length > 0 && (!product.amount || product.amount === 0)) {
          // Try to find matching price section by title
          const matchingSection = product.product_price_section.find(
            section => section.title === priceSectionData?.title
          );
          
          if (matchingSection) {
            itemPrice = matchingSection.final_amount;
            itemOriginalPrice = matchingSection.amount;
            itemDiscount = matchingSection.discount_amount;
            priceSectionData = matchingSection;
          } else if (product.product_price_section[0]) {
            // Use first price section as fallback
            itemPrice = product.product_price_section[0].final_amount;
            itemOriginalPrice = product.product_price_section[0].amount;
            itemDiscount = product.product_price_section[0].discount_amount;
            priceSectionData = product.product_price_section[0];
          }
        } else {
          // Use variant price from product
          itemPrice = variantData.final_amount || variantData.amount || product.final_amount || product.amount;
          itemOriginalPrice = variantData.amount || product.amount;
          itemDiscount = variantData.discount_amount || product.discount_amount || 0;
        }
      }

      const itemQuantity = item.quantity;
      const itemSubtotal = itemPrice * itemQuantity;
      const itemOriginalSubtotal = itemOriginalPrice * itemQuantity;
      const itemDiscountAmount = itemOriginalSubtotal - itemSubtotal;

      subtotal += itemOriginalSubtotal;
      totalDiscount += itemDiscountAmount;

      const isOutOfStock = variantData.stock < itemQuantity;
      if (isOutOfStock) hasOutOfStockItems = true;

      items.push({
        cartItemId: item._id,
        productId: product._id,
        title: product.title,
        description: product.description,
        slug: product.slug,
        variant: variantData.color,
        variantTitle: variantData.title || `${variantData.color} Variant`,
        quantity: itemQuantity,
        maxStock: variantData.stock,
        // Price details
        originalPrice: itemOriginalPrice,
        discountAmount: itemDiscount,
        finalPrice: itemPrice,
        // Price section details
        priceSection: priceSectionData ? {
          title: priceSectionData.title,
          amount: priceSectionData.amount,
          discount_amount: priceSectionData.discount_amount,
          final_amount: priceSectionData.final_amount
        } : null,
        // Images
        images: variantData.images || [],
        // Item totals
        itemSubtotal: itemSubtotal,
        itemOriginalSubtotal: itemOriginalSubtotal,
        itemDiscountAmount: itemDiscountAmount,
        // Status flags
        isOutOfStock: isOutOfStock,
        stock_status: product.stock_status
      });
    }

    // Calculate cart totals
    const taxPercentage = cart.tax || 2;
    const cartDiscountPercentage = cart.discount || 2;
    
    const cartDiscountAmount = (subtotal * cartDiscountPercentage) / 100;
    const taxAmount = (subtotal * taxPercentage) / 100;
    const totalAmount = subtotal - totalDiscount - cartDiscountAmount + taxAmount;

    const summary = {
      subtotal: Math.round(subtotal * 100) / 100,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      cartDiscount: cartDiscountPercentage,
      cartDiscountAmount: Math.round(cartDiscountAmount * 100) / 100,
      tax: taxPercentage,
      taxAmount: Math.round(taxAmount * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      uniqueItems: items.length,
      status: cart.status,
      hasOutOfStockItems: hasOutOfStockItems,
      lastUpdated: cart.updatedAt,
      createdAt: cart.createdAt
    };

    return successResponse(
      res,
      "Cart fetched successfully",
      200,
      {
        items,
        summary
      }
    );
  } catch (error) {
    console.error("Error in getCart:", error);
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