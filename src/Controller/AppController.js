const jwt = require("jsonwebtoken");
const catchAsync = require("../Utill/catchAsync");
const User = require("../Model/User");
const SubCategory = require("../Model/SubCategory");
const Category = require("../Model/Categroy")
// const nodemailer = require("nodemailer");
const { validationErrorResponse, errorResponse, successResponse } = require("../Utill/ErrorHandling");
const Product = require("../Model/Product");
const Cart = require("../Model/Cart");
const Project = require("../Model/Project");
const ServicesType = require("../Model/ServicesType");
const Services = require("../Model/Services");
const { mongoose } = require("mongoose");
const ServicesUser = require("../Model/ServicesUser");
const BookingModel = require("../Model/Booking");
const VendorCategory = require("../Model/VendorCategory");
const Vendor = require("../Model/Vendor");
const Order = require("../Model/Order");
// const logger = require("../utils/Logger");
// const twilio = require("twilio");

// const client = twilio(
//   process.env.TWILIO_ACCOUNT_SID,
//   process.env.TWILIO_AUTH_TOKEN
// );
const buildCartResponse = async (cart) => {
  await cart.populate({
    path: "product.productId",
    select: "title amount images variants"
  });

  if (!cart || cart.product.length === 0) {
    return {
      items: [],
      summary: {
        subtotal: 0,
        discountPercent: cart?.discount || 0,
        discountAmount: 0,
        taxPercent: cart?.tax || 0,
        taxAmount: 0,
        finalAmount: 0
      }
    };
  }

  let subtotal = 0;

  const items = cart.product
    .map(item => {
      const product = item.productId;
      if (!product) return null;

      const selectedVariant = product.variants.find(
        v => v.color === item.variant
      );

      const variantImages = selectedVariant?.images || [];
      const itemTotal = item.quantity * product.amount;
      subtotal += itemTotal;

      return {
        productId: product._id,
        title: product.title,
        images: variantImages,
        variant: item.variant,
        quantity: item.quantity,
        unitPrice: product.amount,
        itemTotal
      };
    })
    .filter(Boolean);

  // Discount
  const discountPercent = cart.discount || 0;
  const discountAmount = +(subtotal * (discountPercent / 100)).toFixed(2);
  const afterDiscount = subtotal - discountAmount;

  // Tax
  const taxPercent = cart.tax || 0;
  const taxAmount = +(subtotal * (taxPercent / 100)).toFixed(2);

  // Final
  const finalAmount = +(afterDiscount + taxAmount).toFixed(2);

  return {
    items,
    summary: {
      subtotal,
      discountPercent,
      discountAmount,
      taxPercent,
      taxAmount,
      finalAmount
    }
  };
};


exports.SendOtp = catchAsync(async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return validationErrorResponse(res, "Phone number is required", 401);
    }

    // Find user by phone
    const user = await User.findOne({ phone });

    if (!user) {
      return successResponse(res, "Phone not registered. Please sign up first.", 200, {
        isNewUser: true
      });
    }

    if (user?.deleted_at != null) {
      return errorResponse(res, "This account is blocked", 403);
    }

    return successResponse(res, "OTP sent successfully", 200, {
      otp: 123456,
      isNewUser: false
    });

  } catch (error) {
    console.error("SendOtp error:", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});


exports.Login = catchAsync(async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return validationErrorResponse(
        res,
        "Phone number, OTP all are required",
        401
      );
    }
    if (otp !== "123456") {
      return validationErrorResponse(res, "Invalid or expired OTP", 400);
    }
    const user = await User.findOne({ phone: phone });

    if (user?.deleted_at != null) {
      return errorResponse(res, "This account is blocked", 200);
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "8760h" }
    );

    return successResponse(res, "OTP verified successfully", 200, {
      user: user,
      token: token,
    });

    // Verify OTP with Twilio
    // const verificationCheck = await client.verify.v2
    //   .services(process.env.TWILIO_VERIFY_SID)
    //   .verificationChecks.create({ to: phone, code: otp });
    // if (verificationCheck.status === "approved") {
    //   return successResponse(res, "OTP verified successfully", 200);
    // } else {
    //   return validationErrorResponse(res, "Invalid or expired OTP", 400);
    // }
  } catch (error) {
    console.error("VerifyOtp error:", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.signup = catchAsync(async (req, res) => {
  try {
    const { email, name, profileImage, role, phone, gender } = req.body;
    console.log(" req.body", req.body)
    // Check if user already exists
    const existingUser = await User.find({
      $or: [{ email }, { phone }],
    });

    if (existingUser.length > 0) {
      const errors = {};
      existingUser.forEach((user) => {
        if (user.email === email) {
          errors.email = "Email is already in use!";
        }
        if (user.phone === phone) {
          errors.phone = "Phone number is already in use!";
        }
      });

      return res.status(400).json({
        status: false,
        message: "Email or phone number already exists",
        errors,
      });
    }

    const record = new User({
      name,
      email,
      phone,
      profileImage,
      role, gender
    });

    const result = await record.save();
    console.log("result", result)
    const token = jwt.sign(
      { id: result._id, role: result.role, email: result.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "365d" }
    );
    return successResponse(
      res,
      "You have been registered successfully !!",
      201,
      {
        user: result,
        token: token,
        role: result?.role,
      }
    );
  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.profilegettoken = catchAsync(async (req, res, next) => {
  try {
    const userId = req?.user?.id;
    if (!userId) {
      return res.status(400).json({ msg: "User not authenticated" });
    }
    const userProfile = await User.findById(userId).select('-password');
    if (!userProfile) {
      return res.status(404).json({ msg: "User profile not found" });
    }
    return successResponse(
      res,
      "Profile retrieved successfully!!",
      201,
      {
        user: userProfile,
      }
    );
  } catch (error) {
    res.status(500).json({
      msg: "Failed to fetch profile",
      error: error.message,
    });
  }
});

exports.PhoneVerify = catchAsync(async (req, res) => {
  try {
    // console.log("req.body" ,req.body)
    const { phone } = req.body;
    if (!phone) {
      return validationErrorResponse(
        res,
        "Phone number all are required",
        401
      );
    }
    return successResponse(res, "OTP Send successfully", 200,
      123456,
    );

    // Verify OTP with Twilio
    // const verificationCheck = await client.verify.v2
    //   .services(process.env.TWILIO_VERIFY_SID)
    //   .verificationChecks.create({ to: phone, code: otp });
    // if (verificationCheck.status === "approved") {
    //   return successResponse(res, "OTP verified successfully", 200);
    // } else {
    //   return validationErrorResponse(res, "Invalid or expired OTP", 400);
    // }
  } catch (error) {
    console.error("VerifyOtp error:", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.OTPVerify = catchAsync(async (req, res) => {
  try {
    // console.log("req.body" ,req.body)
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return validationErrorResponse(
        res,
        "Phone number, OTP all are required",
        401
      );
    }
    if (otp !== "123456") {
      return validationErrorResponse(res, "Invalid or expired OTP", 400);
    }
    return successResponse(res, "OTP verified successfully", 200, 123456);


  } catch (error) {
    console.error("VerifyOtp error:", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});


exports.AppOrder = catchAsync(async (req, res) => {
  try {
    const { name, mobile, address, product, amount } = req.body;
    const userId = req.user?.id || "692f0eeebc9b6fd6cc3a5709";
    console.log("userId", userId)
    if (!name || !mobile || !address || !product || !amount) {
      return validationErrorResponse(
        res,
        "All fields (name, mobile, address, product, amount) are required"
      );
    }
    const newOrder = await Order({
      name,
      mobile,
      address,
      product,
      amount,
      userId,
    });
    await newOrder.save();
    return successResponse(res, "Order added successfully", 201, newOrder);
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.OrderList = catchAsync(async (req, res) => {
  const orders = await Order.find()
    .populate({
      path: "product.id",
      populate: [
        { path: "category", model: "Category" },
        { path: "subcategory", model: "SubCategory" }
      ]
    })
    .sort({ createdAt: -1 });

  const formattedOrders = orders.map(order => ({
    _id: order._id,
    name: order.name,
    mobile: order.mobile,
    address: order.address,
    status: order.status,
    amount: order.amount,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,

    product: order.product.map(p => {
      const product = p.id;

      return {
        // product fields
        _id: product._id,
        title: product.title,
        description: product.description,
        amount: product.amount,
        variants: product.variants,

        // 👇 FULL DATA FROM OTHER TABLES
        category: product.category,
        subcategory: product.subcategory,

        dimensions: product.dimensions,
        material: product.material,
        type: product.type,
        terms: product.terms,
        deletedAt: product.deletedAt,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        slug: product.slug,

        // order-product fields
        price: p.price,
        quantity: p.quantity,
        total: p.total,
        variant: p.variant
      };
    })
  }));

  return successResponse(
    res,
    "Orders fetched successfully",
    200,
    formattedOrders
  );
});




exports.getAllCategorys = catchAsync(
  async (req, res) => {
    try {
      const Categorys = await Category.find().sort({ createdAt: -1 });
      return successResponse(res, "Categorys list successfully.", 201, Categorys);
    } catch (error) {
      return errorResponse(res, error.message || "Internal Server Error", 500);
    }
  }
);

exports.getSubCategoryByCategory = catchAsync(async (req, res) => {
  try {
    const categoryId = req.params.id;
    console.log("categoryId0", categoryId)
    const subCategories = await SubCategory.find({
      category: categoryId,
      deletedAt: null
    }).populate("category");

    if (!subCategories || subCategories?.length === 0) {
      return validationErrorResponse(res, "No Subcategories found for this category.", 404);
    }
    return successResponse(res, "Subcategories fetched successfully.", 200, subCategories);
  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
}
);


exports.getProductByCategory = catchAsync(async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return validationErrorResponse(res, "Id is required", 400);
    }

    const products = await Product.find({
      category: id,
      deletedAt: null
    })
      .populate("subcategory")
      .populate("category")
      .sort({ createdAt: -1 });

    const subCategoryMap = new Map();
    products.forEach(product => {
      if (product.subcategory?._id) {
        subCategoryMap.set(
          product.subcategory._id.toString(),
          {
            _id: product.subcategory._id,
            name: product.subcategory.name
          }
        );
      }
    });

    const uniqueSubcategories = Array.from(subCategoryMap.values());

    return successResponse(res, "Products and subcategories fetched", 200, {
      products,
      subcategories: uniqueSubcategories
    });
  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.getProductBySubCategory = catchAsync(async (req, res) => {
  try {
    const { id } = req.params;
    // const page = parseInt(req.query.page, 10) || 1;
    // const limit = parseInt(req.query.limit, 10) || 10;
    // const skip = (page - 1) * limit;
    const filter = {
      subcategory: id,
      deletedAt: null,
    };
    const products = await Product.find(filter)
      .populate("subcategory")
      .populate("category")
      .sort({ createdAt: -1 })
    // const totalRecords = await Product.countDocuments(filter);
    // const totalPages = Math.ceil(totalRecords / limit);
    // return successResponse(res, "Products fetched by category", 200, {
    //   data: products,
    //   pagination: {
    //     page,
    //     limit,
    //     totalRecords,
    //     totalPages,
    //   },
    // });

    return successResponse(res, "Products fetched by category", 200,
      products);
  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.getProductById = catchAsync(async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("subcategory")
      .populate("category");

    if (!product) {
      return errorResponse(res, "Product not found", 404);
    }

    return successResponse(res, "Product fetched successfully", 200, product);

  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.AddToCart = catchAsync(async (req, res) => {
  try {
    const userId = req.user.id;
    const { product } = req.body;
    console.log(product)
    if (!product || !product.id || !product.quantity || !product.variant) {
      return errorResponse(res, "Invalid product payload", 400);
    }
    const { id: productId, quantity, variant } = product;
    // Quantity validation
    if (quantity < 1) {
      return errorResponse(res, "Quantity must be at least 1", 400);
    }
    const dbProduct = await Product.findById(productId);
    if (!dbProduct) {
      return errorResponse(res, "Product not found", 400);
    }
    const normalizedVariant = variant.toLowerCase().trim();
    const matchedVariant = dbProduct.variants.find(
      v => v.color === normalizedVariant
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
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = await Cart.create({
        user: userId,
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
    // Check if product+variant already exists in cart
    const existingItem = cart.product.find(
      p =>
        p.productId.toString() === productId &&
        p.variant === normalizedVariant
    );
    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      console.log("newQuantity", newQuantity)
      console.log("ss", matchedVariant.stock)
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
    console.log("error", error)
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

// exports.updateCart = catchAsync(async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { product } = req.body;

//     if (!product || !product.id || !product.variant || product.quantity === undefined) {
//       return errorResponse(res, "Invalid product payload", 400);
//     }

//     const { id: productId, quantity, variant } = product;

//     if (quantity < 0) {
//       return errorResponse(res, "Quantity cannot be negative", 400);
//     }

//     const cart = await Cart.findOne({ user: userId });
//     if (!cart || cart.product.length === 0) {
//       return errorResponse(res, "Cart is empty", 400);
//     }

//     const dbProduct = await Product.findById(productId);
//     if (!dbProduct) {
//       return errorResponse(res, "Product not found", 400);
//     }

//     const normalizedVariant = variant.toLowerCase().trim();

//     const matchedVariant = dbProduct.variants.find(
//       v => v.color === normalizedVariant
//     );

//     if (!matchedVariant) {
//       return errorResponse(res, `Variant '${variant}' not available`, 400);
//     }

//     const cartItemIndex = cart.product.findIndex(
//       p =>
//         p.productId.toString() === productId &&
//         p.variant === normalizedVariant
//     );

//     if (cartItemIndex === -1) {
//       return errorResponse(res, "Item not found in cart", 400);
//     }

//     // Remove item if quantity = 0
//     if (quantity === 0) {
//       cart.product.splice(cartItemIndex, 1);
//     } else {
//       if (quantity > matchedVariant.stock) {
//         return errorResponse(res, `Only ${matchedVariant.stock} items left for ${variant}`,400);
//       }
//       cart.product[cartItemIndex].quantity = quantity;
//     }
//     await cart.save();
//     return successResponse(res, "Cart updated successfully", 200, cart);
//   } catch (error) {
//     return errorResponse(res, error.message || "Internal Server Error", 500);
//   }
// });



exports.updateCart = catchAsync(async (req, res) => {
  try {
    const userId = req.user.id;
    const { product } = req.body;

    if (!product || !product.id || !product.variant || product.quantity === undefined) {
      return errorResponse(res, "Invalid product payload", 400);
    }

    const { id: productId, quantity, variant } = product;

    if (quantity < 0) {
      return errorResponse(res, "Quantity cannot be negative", 400);
    }

    const cart = await Cart.findOne({ user: userId });
    if (!cart || cart.product.length === 0) {
      return errorResponse(res, "Cart is empty", 400);
    }

    const dbProduct = await Product.findById(productId);
    if (!dbProduct) {
      return errorResponse(res, "Product not found", 400);
    }

    const normalizedVariant = variant.toLowerCase().trim();

    const matchedVariant = dbProduct.variants.find(
      v => v.color === normalizedVariant
    );

    if (!matchedVariant) {
      return errorResponse(res, `Variant '${variant}' not available`, 400);
    }

    const cartItemIndex = cart.product.findIndex(
      p =>
        p.productId.toString() === productId &&
        p.variant === normalizedVariant
    );

    if (cartItemIndex === -1) {
      return errorResponse(res, "Item not found in cart", 400);
    }

    // Remove item
    if (quantity === 0) {
      cart.product.splice(cartItemIndex, 1);
    } else {
      if (quantity > matchedVariant.stock) {
        return errorResponse(
          res,
          `Only ${matchedVariant.stock} items left for ${variant}`,
          400
        );
      }
      cart.product[cartItemIndex].quantity = quantity;
    }

    await cart.save();

    // 🔥 SAME RESPONSE AS GET CART
    const response = await buildCartResponse(cart);

    return successResponse(res, "Cart updated successfully", 200, response);
  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.getCart = catchAsync(async (req, res) => {
  try {
    const userId = req.user.id;

    const cart = await Cart.findOne({ user: userId }).populate({
      path: "product.productId",
      select: "title amount images variants"
    });

    // console.log("cart", cart);

    if (!cart || cart.product.length === 0) {
      return successResponse(res, "Cart is empty", 200,
        {
          items: [],
          summary: {
            subtotal: 0,
            discountPercent: cart?.discount || 0,
            discountAmount: 0,
            taxPercent: cart?.tax || 0,
            taxAmount: 0,
            finalAmount: 0
          }
        });
    }

    let subtotal = 0;

    const items = cart.product
      .map(item => {
        const product = item.productId;
        if (!product) return null;

        const selectedVariant = product.variants.find(
          v => v.color === item.variant
        );

        const variantImages = selectedVariant?.images || [];

        const itemTotal = item.quantity * product.amount;
        subtotal += itemTotal;

        return {
          productId: product._id,
          title: product.title,
          images: variantImages,
          variant: item.variant,
          quantity: item.quantity,
          unitPrice: product.amount,
          itemTotal
        };
      })
      .filter(Boolean);


    // Discount
    const discountPercent = cart.discount || 0;
    const discountAmount = +(subtotal * (discountPercent / 100));
    const afterDiscount = subtotal - discountAmount;

    // Tax
    const taxPercent = cart.tax || 0;
    const taxAmount = +(subtotal * (taxPercent / 100)).toFixed(2);

    // Final
    const finalAmount = +(afterDiscount + taxAmount).toFixed(2);

    return successResponse(res, "Cart fetched successfully", 200, {
      items,
      summary: {
        subtotal,
        discountPercent,
        discountAmount,
        taxPercent,
        taxAmount,
        finalAmount
      }
    });

  } catch (error) {
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

exports.removeProductVariantFromCart = catchAsync(async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, variant } = req.params;

    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
      return errorResponse(res, "Cart not found", 404);
    }

    const initialLength = cart.product.length;

    cart.product = cart.product.filter(
      (item) =>
        !(
          item.productId.toString() === productId &&
          item.variant === variant
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

exports.GetAllProject = catchAsync(
  async (req, res) => {
    try {
      const projects = await Project.find().sort({ createdAt: -1 });
      return successResponse(res, "Project list successfully.", 201, projects);
    } catch (error) {
      return errorResponse(res, error.message || "Internal Server Error", 500);
    }
  }
);

exports.GetServicesType = catchAsync(
  async (req, res) => {
    try {
      const Residentialservices = await ServicesType.find({ TypeServices: "Residential" }).sort({ createdAt: -1 });
      const Commercialservices = await ServicesType.find({ TypeServices: "Commercial" }).sort({ createdAt: -1 });
      return successResponse(res, "Services Type list successfully.", 201, {
        Residentialservices, Commercialservices
      });
    } catch (error) {
      return errorResponse(res, error.message || "Internal Server Error", 500);
    }
  }
);

exports.GetServiceTypeId = catchAsync(async (req, res) => {
  try {
    const { id } = req.params;

    const services = await Services.aggregate([
      {
        $match: {
          ServicesType: new mongoose.Types.ObjectId(id),
          status: true
        }
      },
      {
        $group: {
          _id: "$concept",
          services: { $push: "$$ROOT" }
        }
      },
      {
        $project: {
          _id: 0,
          k: "$_id",
          v: "$services"
        }
      },
      {
        $group: {
          _id: null,
          data: { $push: { k: "$k", v: "$v" } }
        }
      },
      {
        $replaceRoot: {
          newRoot: { $arrayToObject: "$data" }
        }
      }
    ]);

    return successResponse(
      res,
      "Services grouped by concept.",
      200,
      services[0] || {}
    );
  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.GetServicesDetails = catchAsync(async (req, res) => {
  try {
    const { id } = req.params;
    console.log("at", id)

    if (!id) {
      return validationErrorResponse(res, "id is required", 400);
    }

    const service = await Services
      .findById({ _id: id })
      .populate("ServicesType");

    if (!service) {
      return validationErrorResponse(res, "Service not found", 404);
    }

    return successResponse(res, "Service details fetched successfully.", 200, service);

  } catch (error) {
    console.error("Get Service Error:", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.ConceptUserPost = catchAsync(async (req, res) => {
  try {
    console.log("req.body", req.body);
    // const userId = req?.user?.id;
    const { User, ServicesType, Services, concept } = req.body;

    if (!User || !ServicesType || !Services) {
      return validationErrorResponse(res, "All fields (services, user, typeservices) are required.", 401);
    }

    const record = new ServicesUser({
      User,
      ServicesType: ServicesType,
      Services,
      concept,
    });

    const result = await record.save();

    if (!result) {
      return validationErrorResponse(res, "Failed to save contact details.", 401);
    }

    return successResponse(res, "Request submitted & emails sent successfully.", 200, result);

  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.EditProfile = catchAsync(async (req, res) => {
  try {
    const userId = req.user.id;

    const { name, email, phone, } = req.body;

    const existingUser = await User.findOne({
      _id: { $ne: userId },
      $or: [{ email }, { phone }],
    });


    if (!existingUser) {
      return validationErrorResponse(res, "User not found.", 404);
    }

    if (email) existingUser.email = email;
    if (gender) existingUser.gender = gender;
    if (address) existingUser.address = address;
    if (
      phone
    ) existingUser.
      phone
      =
      phone
        ;
    if (
      name
    ) existingUser.
      name
      =
      name
        ;

    if (req.file && req.file.location) {

      if (existingUser.
        profileImage
      ) {
        try {
          await deleteFile(existingUser.
            profileImage
          );
        } catch (err) {
          console.log("Error deleting old image:", err.message);
        }
      }
      existingUser.
        profileImage
        = req.file.location;
    }

    const updatedUser = await existingUser.save();
    if (!updatedUser) {
      return errorResponse(res, "User not found", 404);
    }
    return successResponse(res, "Profile updated successfully.", 200, updatedUser);
  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.BookingAppAdd = catchAsync(async (req, res) => {
  try {
    const {
      project_type, servcies_model, area, budget_range, finish_level,
      name, email, phone_number, city, phone_mode, timeLine,
      rate, subtotal, taxes, total_amount, scope
    } = req.body;

    const booking = await BookingModel.create({
      project_type,
      servcies_model,
      area,
      budget_range,
      finish_level,
      name,
      email,
      phone_number,
      city,
      phone_mode,
      timeLine,
      rate,
      subtotal,
      taxes,
      total_amount,
      scope
    });

    return successResponse(res, "Booking Success", 201, booking)

  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);


  }
})


exports.GetVendorCatApp = catchAsync(
  async (req, res) => {
    try {
      const Categorys = await VendorCategory.find().sort({ createdAt: -1 });
      return successResponse(res, "Vendor Categorys list successfully.", 201, Categorys);
    } catch (error) {
      return errorResponse(res, error.message || "Internal Server Error", 500);
    }
  }
);

exports.GetVendorCategory = catchAsync(async (req, res) => {
  try {
    const slug = req.params.slug;
    console.log("slug:", slug);
    if (!slug) {
      return errorResponse(res, "Category slug is required", 400);
    }
    // Get Vendors of this Category
    const vendors = await Vendor.find({
      deletedAt: null,
      VendorCategory: slug,
    }).sort({ createdAt: -1 }).populate("VendorCategory");
    return successResponse(
      res,
      "Vendor Category details fetched successfully.",
      200,
      { vendors }
    );

  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});