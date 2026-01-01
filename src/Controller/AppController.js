const jwt = require("jsonwebtoken");
const catchAsync = require("../Utill/catchAsync");
const User = require("../Model/User");
const SubCategory = require("../Model/SubCategory");
const Category =  require("../Model/Categroy")
// const nodemailer = require("nodemailer");
const { validationErrorResponse, errorResponse, successResponse } = require("../Utill/ErrorHandling");
const Product = require("../Model/Product");
const Cart = require("../Model/Cart");
// const logger = require("../utils/Logger");
// const twilio = require("twilio");

// const client = twilio(
//   process.env.TWILIO_ACCOUNT_SID,
//   process.env.TWILIO_AUTH_TOKEN
// );

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
      { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
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
    const { email, name, profileImage, role, phone ,gender } = req.body;
    console.log(" req.body" , req.body)
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
      role,gender
    });

    const result = await record.save();
    console.log("result", result)
    const token = jwt.sign(
      { id: result._id, role: result.role, email: result.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
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
    const userId = req.user?.id || "692dcfbd4816433146e11abd";
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
        console.log("categoryId0" , categoryId)
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
      return errorResponse(res, "Product not found", 404);
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
      return successResponse(res, "Item added to cart", cart);
    }
    // Check if product+variant already exists in cart
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
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.getCart = catchAsync(async (req, res) => {
  try {
    const userId = req.user.id;

    const cart = await Cart.findOne({ user: userId })
      .populate({
        path: "product.productId",
        select: "title amount variants"
      });

    if (!cart || cart.product.length === 0) {
      return successResponse(res, "Cart is empty", {
        items: [],
        summary: {
          subtotal: 0,
          discountPercent: cart?.discount || 0,
          discountAmount: 0,
          taxPercent: cart?.tax || 0,
          taxAmount: 0,
          finalAmount: 0
        }
      }, 200);
    }

    let subtotal = 0;

    const items = cart.product.map(item => {
      const product = item.productId;

      if (!product) return null; // safety guard

      const itemTotal = item.quantity * product.amount;
      subtotal += itemTotal;

      return {
        productId: product._id,
        title: product.title,
        variant: item.variant,
        quantity: item.quantity,
        unitPrice: product.amount,
        itemTotal
      };
    }).filter(Boolean);

    // Discount calculation
    const discountPercent = cart.discount || 0;
    const discountAmount = +(subtotal * (discountPercent / 100)).toFixed(2);

    const afterDiscount = subtotal - discountAmount;

    // Tax calculation
    const taxPercent = cart.tax || 0;
    const taxAmount = +(afterDiscount * (taxPercent / 100)).toFixed(2);

    // Final amount
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
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});