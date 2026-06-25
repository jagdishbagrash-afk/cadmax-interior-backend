const jwt = require("jsonwebtoken");
const catchAsync = require("../Utill/catchAsync");
const User = require("../Model/User");
const SubCategory = require("../Model/SubProductCategory");
const Category = require("../Model/ProductCategroy")

const Address =  require("../Model/MultipleAddress")
const { v4: uuidv4 } = require("uuid");
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
const sendEmail = require("../Utill/EmailMailler");
const userEmailTemplate = require("../EmailTemplate/bookingUserEmail");
const adminEmailTemplate = require("../EmailTemplate/bookingAdminEmail");
const Welcome = require("../EmailTemplate/Welcome");
const OrderEmail = require("../EmailTemplate/Order");
const ServicesSubCategory = require("../Model/ServicesSubCategory");
const Lead = require("../Model/Lead");

const axios = require("axios");
const Wishlist = require("../Model/Wishlist");
const Review = require("../Model/Review");

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

exports.SendOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        status: false,
        message: "Phone number is required",
        data: {
          otp: {
            code: "",
            request_id: "",
            type: "error",
          },
          isNewUser: false,
        },
      });
    }

    // Check user exists
    const user = await User.findOne({ phone });

    // User not found
    if (!user) {
      return res.status(200).json({
        status: true,
        message: "Phone not registered. Please sign up first.",
        data: {
          otp: {
            code: "",
            request_id: "",
            type: "error",
          },
          isNewUser: true,
        },
      });
    }

    // Blocked account check
    if (user.deleted_at != null) {
      return res.status(403).json({
        status: false,
        message: "This account is blocked",
        data: {
          otp: {
            code: "",
            request_id: "",
            type: "error",
          },
          isNewUser: false,
        },
      });
    }

    // Fixed OTP for testing number
    if (phone == "9521343393") {
      return res.status(200).json({
        status: true,
        message: "OTP sent successfully",
        data: {
          otp: {
            code: "123456",
            request_id: "",
            type: "success",
          },
          isNewUser: false,
        },
      });
    }

    // MSG91 OTP
    const response = await axios.post(
      "https://control.msg91.com/api/v5/otp",
      {
        mobile: `91${phone}`,
        template_id: process.env.MSG91_TEMPLATE_ID,
        otp_length: 6,
        otp_expiry: 5,
      },
      {
        headers: {
          authkey: process.env.MSG91_AUTH_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    return res.status(200).json({
      status: true,
      message: "OTP sent successfully",
      data: {
        otp: {
          code: "",
          request_id: response.data?.request_id || "",
          type: response.data?.type || "success",
        },
        isNewUser: false,
      },
    });

  } catch (error) {
    console.log(error.response?.data || error.message);

    return res.status(500).json({
      status: false,
      message: error.response?.data?.message || error.message || "Internal Server Error",
      data: {
        otp: {
          code: "",
          request_id: "",
          type: "error",
        },
        isNewUser: false,
      },
    });
  }
};


// exports.SendOtp = catchAsync(async (req, res) => {
//   try {
//     const { phone } = req.body;

//     if (!phone) {
//       return validationErrorResponse(res, "Phone number is required", 401);
//     }

//     // Find user by phone
//     const user = await User.findOne({ phone });

//     if (!user) {
//       return successResponse(res, "Phone not registered. Please sign up first.", 200, {
//         isNewUser: true
//       });
//     }

//     if (user?.deleted_at != null) {
//       return errorResponse(res, "This account is blocked", 403);
//     }

//     return successResponse(res, "OTP sent successfully", 200, {
//       otp: 123456,
//       isNewUser: false
//     });

//   } catch (error) {

//   }
// });


// exports.Login = catchAsync(async (req, res) => {
//   try {
//     const { phone, otp } = req.body;
//     if (!phone || !otp) {
//       return validationErrorResponse(
//         res,
//         "Phone number, OTP all are required",
//         401
//       );
//     }
//     if (otp !== "123456") {
//       return validationErrorResponse(res, "Invalid or expired OTP", 400);
//     }
//     const user = await User.findOne({ phone: phone });


//     if (user?.deleted_at != null) {
//       return errorResponse(res, "This account is blocked", 200);
//     }

//     const token = jwt.sign(
//       { id: user._id, role: user.role, email: user.email },
//       process.env.JWT_SECRET,
//       { expiresIn: process.env.JWT_EXPIRES_IN || "8760h" }
//     );

//     return successResponse(res, "OTP verified successfully", 200, {
//       user: user,
//       token: token,
//     });

//     // Verify OTP with Twilio
//     // const verificationCheck = await client.verify.v2
//     //   .services(process.env.TWILIO_VERIFY_SID)
//     //   .verificationChecks.create({ to: phone, code: otp });
//     // if (verificationCheck.status === "approved") {
//     //   return successResponse(res, "OTP verified successfully", 200);
//     // } else {
//     //   return validationErrorResponse(res, "Invalid or expired OTP", 400);
//     // }
//   } catch (error) {
//     console.error("VerifyOtp error:", error);
//     return errorResponse(res, error.message || "Internal Server Error", 500);
//   }
// });

// exports.Login = catchAsync(async (req, res) => {
//   try {
//     const { phone, otp, fcmToken } = req.body;

//     if (!phone || !otp) {
//       return validationErrorResponse(
//         res,
//         "Phone number and OTP are required",
//         401
//       );
//     }

//     if (otp !== "123456") {
//       return validationErrorResponse(res, "Invalid or expired OTP", 400);
//     }

//     const user = await User.findOne({ phone: phone });

//     if (!user) {
//       return errorResponse(res, "User not found", 404);
//     }

//     if (user?.deleted_at != null) {
//       return errorResponse(res, "This account is blocked", 200);
//     }

//     if (fcmToken) {
//       user.fcmToken = fcmToken;   // single token
//       // user.fcmTokens = [...new Set([...(user.fcmTokens || []), fcmToken])];
//       await user.save();
//     }

//     const token = jwt.sign(
//       { id: user._id, role: user.role, email: user.email },
//       process.env.JWT_SECRET,
//       { expiresIn: process.env.JWT_EXPIRES_IN || "8760h" }
//     );

//     return successResponse(res, "OTP verified successfully", 200, {
//       user,
//       token,
//     });

//   } catch (error) {
//     console.error("VerifyOtp error:", error);
//     return errorResponse(res, error.message || "Internal Server Error", 500);
//   }
// });


// exports.Login = catchAsync(async (req, res) => {
//   try {
//     const { phone, otp, fcmToken } = req.body;

//     // ================= VALIDATION =================
//     if (!phone || !otp) {
//       return validationErrorResponse(
//         res,
//         "Phone number and OTP are required",
//         401
//       );
//     }

//     // ================= VERIFY OTP WITH MSG91 =================
//     const verifyResponse = await axios.get(
//       "https://control.msg91.com/api/v5/otp/verify",
//       {
//         params: {
//           mobile: `91${phone}`,
//           otp: otp,
//         },
//         headers: {
//           authkey: process.env.MSG91_AUTH_KEY,
//         },
//       }
//     );

//     console.log("verifyResponse =>", verifyResponse.data);

//     // OTP invalid
//     if (verifyResponse.data.type !== "success") {
//   return validationErrorResponse(
//   res,
//   null,
//   "Invalid or expired OTP",
//   400
// );
//     }

//     // ================= FIND USER =================
//     const user = await User.findOne({ phone });

//     if (!user) {
//       return errorResponse(res, "User not found", 404);
//     }

//     // ================= BLOCKED USER =================
//     if (user?.deleted_at != null) {
//       return errorResponse(res, "This account is blocked", 403);
//     }

//     // ================= SAVE FCM TOKEN =================
//     if (fcmToken) {
//       user.fcmToken = fcmToken;
//       await user.save();
//     }

//     // ================= GENERATE JWT =================
//     const token = jwt.sign(
//       {
//         id: user._id,
//         role: user.role,
//         email: user.email,
//       },
//       process.env.JWT_SECRET,
//       {
//         expiresIn: process.env.JWT_EXPIRES_IN || "24h",
//       }
//     );

//     // ================= SUCCESS RESPONSE =================
//     return successResponse(
//       res,
//       "OTP verified successfully",
//       200,
//       {
//         user,
//         token,
//       }
//     );

//   } catch (error) {
//     console.error("Login error:", error);

//     return errorResponse(
//       res,
//       error?.response?.data?.message ||
//         error.message ||
//         "Internal Server Error",
//       500
//     );
//   }
// });


exports.Login = catchAsync(async (req, res) => {
  try {
    let { phone, otp, fcmToken } = req.body;

    // Convert to string
    phone = String(phone);
    otp = String(otp);

    // ================= VALIDATION =================
    if (!phone || !otp) {
      return validationErrorResponse(
        res,
        "Phone number and OTP are required",
        401
      );
    }

    if (phone === "9521343393") {

      // Fixed OTP for this number
      if (otp !== "123456") {
        return validationErrorResponse(
          res,
          null,
          "Invalid or expired OTP",
          400
        );
      }

    } else {

      // ================= VERIFY OTP WITH MSG91 =================
      const verifyResponse = await axios.get(
        "https://control.msg91.com/api/v5/otp/verify",
        {
          params: {
            mobile: `91${phone}`,
            otp: otp,
          },
          headers: {
            authkey: process.env.MSG91_AUTH_KEY,
          },
        }
      );

      console.log("verifyResponse =>", verifyResponse.data);

      // OTP invalid
      if (verifyResponse.data.type !== "success") {
        return validationErrorResponse(
          res,
          null,
          "Invalid or expired OTP",
          400
        );
      }
    }

    // ================= FIND USER =================
    const user = await User.findOne({ phone });

    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    // ================= BLOCKED USER =================
    if (user?.deleted_at != null) {
      return errorResponse(res, "This account is blocked", 403);
    }

    // ================= SAVE FCM TOKEN =================
    if (fcmToken) {
      user.fcmToken = fcmToken;
      await user.save();
    }

    // ================= GENERATE JWT =================
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        email: user.email,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "365d",
      }
    );

    // ================= SUCCESS RESPONSE =================
    return successResponse(
      res,
      "OTP verified successfully",
      200,
      {
        user,
        token,
      }
    );

  } catch (error) {
    console.error("Login error:", error);

    return errorResponse(
      res,
      error?.response?.data?.message ||
      error.message ||
      "Internal Server Error",
      500
    );
  }
});

exports.signup = catchAsync(async (req, res) => {
  try {
    const { email, name, profileImage, role, phone, gender } = req.body;
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
    console.log("rs",result)
    const token = jwt.sign(
      { id: result._id, role: result.role, email: result.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "365d" }
    );

   try {
  const subject = "Welcome to Cadmax! 🎉";
  const emailHtml = Welcome(result.name);

  await sendEmail({
    email: result.email,
    subject,
    emailHtml,
  });
} catch (err) {
  console.error("Email Error:", err.message);
}

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
      return res.status(401).json({
        success: false,
        msg: "User not authenticated",
      });
    }

    // Get User Profile
    const userProfile = await User.findById(userId).select("-password -OTP");

    if (!userProfile) {
      return res.status(404).json({
        success: false,
        msg: "User profile not found",
      });
    }

    // Get User Addresses
    const addresses = await Address.find({
      userId,
      deletedAt: null,
    }).sort({ isDefault: -1, createdAt: -1 });

    return successResponse(
      res,
      "Profile retrieved successfully!!",
      200,
      {
        user: userProfile,
        addresses,
      }
    );
  } catch (error) {
    return res.status(500).json({
      success: false,
      msg: "Failed to fetch profile",
      error: error.message,
    });
  }
});

// exports.PhoneVerify = catchAsync(async (req, res) => {
//   try {
//     // console.log("req.body" ,req.body)
//     const { phone } = req.body;
//     if (!phone) {
//       return validationErrorResponse(
//         res,
//         "Phone number all are required",
//         401
//       );
//     }
//     return successResponse(res, "OTP Send successfully", 200,
//       123456,
//     );

//     // Verify OTP with Twilio
//     // const verificationCheck = await client.verify.v2
//     //   .services(process.env.TWILIO_VERIFY_SID)
//     //   .verificationChecks.create({ to: phone, code: otp });
//     // if (verificationCheck.status === "approved") {
//     //   return successResponse(res, "OTP verified successfully", 200);
//     // } else {
//     //   return validationErrorResponse(res, "Invalid or expired OTP", 400);
//     // }
//   } catch (error) {
//     console.error("VerifyOtp error:", error);
//     return errorResponse(res, error.message || "Internal Server Error", 500);
//   }
// });



exports.PhoneVerify = catchAsync(async (req, res) => {
  try {
    const { phone } = req.body;

    // Validation
    if (!phone) {
      return validationErrorResponse(
        res,
        "Phone number is required",
        400
      );
    }

    // Mobile validation
    if (phone.length !== 10) {
      return validationErrorResponse(
        res,
        "Enter valid 10 digit phone number",
        400
      );
    }

    // ================= SEND OTP =================
    const response = await axios.post(
      "https://control.msg91.com/api/v5/otp",
      {
        mobile: `91${phone}`,
        template_id: process.env.MSG91_TEMPLATE_ID,
        otp_length: 6,
        otp_expiry: 5,
      },
      {
        headers: {
          authkey: process.env.MSG91_AUTH_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("MSG91 RESPONSE:", response.data);

    // ================= SUCCESS =================
    return successResponse(
      res,
      "OTP sent successfully",
      200,
      response.data
    );

  } catch (error) {
    console.error(
      "PhoneVerify Error:",
      error.response?.data || error.message
    );

    return errorResponse(
      res,
      error.response?.data?.message ||
      error.message ||
      "Internal Server Error",
      500
    );
  }
});

// exports.OTPVerify = catchAsync(async (req, res) => {
//   try {
//     // console.log("req.body" ,req.body)
//     const { phone, otp } = req.body;
//     if (!phone || !otp) {
//       return validationErrorResponse(
//         res,
//         "Phone number, OTP all are required",
//         401
//       );
//     }
//     if (otp !== "123456") {
//       return validationErrorResponse(res, "Invalid or expired OTP", 400);
//     }
//     return successResponse(res, "OTP verified successfully", 200, 123456);


//   } catch (error) {
//     console.error("VerifyOtp error:", error);
//     return errorResponse(res, error.message || "Internal Server Error", 500);
//   }
// });


exports.OTPVerify = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    const response = await axios.get(
      "https://control.msg91.com/api/v5/otp/verify",
      {
        params: {
          mobile: `91${phone}`,
          otp,
        },
        headers: {
          authkey: process.env.MSG91_AUTH_KEY,
        },
      }
    );

    return res.status(200).json({
      status: true,
      message: "OTP verified successfully",
      data: response.data,
    });

  } catch (error) {
    console.log(error.response?.data || error.message);

    return res.status(500).json({
      status: false,
      message: error.response?.data || error.message,
    });
  }
};



exports.AppOrder = catchAsync(async (req, res) => {
  try {
    const { name, mobile, address, product, amount, addressId, PaymentId } = req.body;
    const userId = req.user?.id || "692dcfbd4816433146e11abd";

    const orderId = `ORD-${uuidv4().slice(0, 8).toUpperCase()}`;

    if (!name || !mobile || !product || !amount) {
      return validationErrorResponse(
        res,
        "All fields (name, mobile, product, amount) are required"
      );
    }

    // ✅ Save Order
    const newOrder = new Order({
      name,
      mobile,
      address,
      product,
      addressId,
      amount,
      userId,
      orderId,
      PaymentId
    });

    const record = await newOrder.save();


    const productIds = product.map(p => p.id); // req.body.product se ids nikalo

    const cart = await Cart.findOne({
      user: userId,
      status: { $ne: "done" },
      "product.productId": { $in: productIds }
    });



    if (cart && cart.status !== "done") {
      cart.status = "done"; // 🔥 main fix
      const record = await cart.save();
    }

    return successResponse(res, "Order added successfully", 201, record);

  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});


exports.OrderList = catchAsync(async (req, res) => {
    const userId = req.user?.id;

  const orders = await Order.find({ userId })
    .populate({
      path: "product.id",
      populate: [
        { path: "category" },
        { path: "subcategory" }
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
        _id: product._id,
        title: product.title,
        description: product.description,
        amount: product.amount,
        variants: product.variants,

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
      const Categorys = await Category.find({ status: true }).sort({ createdAt: -1 });
      return successResponse(res, "Categorys list successfully.", 201, Categorys);
    } catch (error) {
      return errorResponse(res, error.message || "Internal Server Error", 500);
    }
  }
);

exports.getSubCategoryByCategory = catchAsync(async (req, res) => {
  try {
    const categoryId = req.params.id;
    const subCategories = await SubCategory.find({
      category: categoryId,
      status : true
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
    const {userid} = req.query 
    const filter = {
      subcategory: id,
      deletedAt: null,
    };
    const products = await Product.find(filter)
      .populate("subcategory")
      .populate("category")
      .sort({ createdAt: -1 })
    

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

exports.updateCart = catchAsync(async (req, res) => {
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

exports.GetAllProject = catchAsync(async (req, res) => {
  try {
    const projects = await Project.find(
      { status: true }
    ).sort({ createdAt: -1 });

    return successResponse(
      res,
      "Project list successfully.",
      200,
      projects
    );
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Internal Server Error",
      500
    );
  }
});

exports.GetServicesType = catchAsync(
  async (req, res) => {
    try {
       const residentialRaw = await ServicesType.find({
            TypeServices: "Residential",
          });
      
          const orderMap = {
            facades: 1,
            "landscaping & gazebo": 2,
            "living room": 3,
            "drwaing room": 4,
            bedroom: 5,
            kitchen: 6,
            staircase: 7,
            "pooja room": 8,
            washroom: 9,
          };
      
          const residentialServices = residentialRaw.sort((a, b) => {
            const titleA = (a.title || "").trim().toLowerCase();
            const titleB = (b.title || "").trim().toLowerCase();
      
            const orderA = orderMap[titleA] ?? 999;
            const orderB = orderMap[titleB] ?? 999;
      
            if (orderA !== orderB) return orderA - orderB;
      
            return titleA.localeCompare(titleB);
          });
      const Commercialservices = await ServicesType.find({ TypeServices: "Commercial" }).sort({ createdAt: -1 });
      return successResponse(res, "Services Type list successfully.", 201, {
        Residentialservices :  residentialServices, Commercialservices
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
          $or: [
            { ServicesType: new mongoose.Types.ObjectId(id) },
            { ServicesSubCategory: new mongoose.Types.ObjectId(id) }
          ],
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

    const defaultConcepts = {
      contemporary: [],
      modern: [],
      classic: [],
      common: [] // 👈 ye already sahi hai
    };

    const finalData = {
      ...defaultConcepts,
      ...(services[0] || {})
    };

    return successResponse(
      res,
      "Services grouped by concept.",
      200,
      finalData
    );

  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});


exports.GetServicesDetails = catchAsync(async (req, res) => {
  try {
    const { id } = req.params;

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
    const userId = req?.user?.id;
    const {  ServicesType, Services, concept } = req.body;

    if (!User || !ServicesType || !Services) {
      return validationErrorResponse(res, "All fields (services, user, typeservices) are required.", 401);
    }

    const record = new ServicesUser({
      User: userId,
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

    const { name, email, phone, gender, dob } = req.body;

    // 1. Find user
    const existingUser = await User.findById(userId);

    if (!existingUser) {
      return validationErrorResponse(res, "User not found.", 404);
    }

    // 2. Update fields (only if provided)
    if (name) existingUser.name = name;
    if (email) existingUser.email = email;
    if (phone) existingUser.phone = phone;
    if (gender) existingUser.gender = gender;
    if (dob) existingUser.dob = dob;

    // 3. PROFILE IMAGE LOGIC (IMPORTANT)
    if (req.file?.location) {
      // delete old image (optional but recommended)
      if (existingUser.profileImage) {
        try {
          await deleteFile(existingUser.profileImage);
        } catch (err) {
          console.log("Old image delete error:", err.message);
        }
      }

      // set new image
      existingUser.profileImage = req.file.location;
    }

    // ❗ if no file → DO NOTHING (old image remains same)

    // 4. Save
    const updatedUser = await existingUser.save();

    return successResponse(
      res,
      "Profile updated successfully.",
      200,
      updatedUser
    );

  } catch (error) {
    return errorResponse(
      res,
      error.message || "Internal Server Error",
      500
    );
  }
});

exports.BookingAppAdd = catchAsync(async (req, res) => {
  try {
    const userId = req.user.id;
    const userData = await User.findById(userId);
    if (!userData) {
      return errorResponse(res, "User not found", 404);
    }
    const { project_type, servcies_model, area, budget_range, finish_level, city, phone_mode, timeLine, rate, subtotal, taxes, total_amount, scope } = req.body;
    const booking = await BookingModel.create({
      project_type,
      servcies_model,
      area,
      budget_range,
      finish_level,
      name: userData.name,
      email: userData.email,
      phone_number: userData.phone,
      userId: userId,
      city,
      phone_mode,
      timeLine,
      rate,
      subtotal,
      taxes,
      total_amount,
      scope
    });

    // User Email
    await sendEmail({
      email: booking.email, // ✅ REAL EMAIL
      subject: "Booking Confirmed - Cadmax",
      emailHtml: userEmailTemplate(emailData),
    });


    // Admin Email
    await sendEmail({
      email: "ankitkumarjain0748@gmail.com",
      subject: "New Booking Received - Cadmax",
      emailHtml: adminEmailTemplate(emailData),
    });
    return successResponse(res, "Booking Success", 201, booking)

  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);


  }
})

exports.getAllBookings = catchAsync(async (req, res) => {
  const bookings = await BookingModel.find().sort({ createdAt: -1 });

  return successResponse(res, "All bookings fetched successfully", 200, bookings);
});




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
    const id = req.params.id;
    if (!id) {
      return errorResponse(res, "Category id is required", 400);
    }
    // Get Vendors of this Category
    const vendors = await Vendor.find({
      deletedAt: null,
      VendorCategory: id,
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

exports.GetAllServicesSubCategorys = catchAsync(
  async (req, res) => {
  try {
    const orderMap = {
      facades: 1,
      "landscaping & gazebo": 2,
      "living room": 3,
      "drwaing room": 4,
      bedroom: 5,
      kitchen: 6,
      staircase: 7,
      "pooja room": 8,
      washroom: 9,
    };

    const subCategories = await ServicesType.find({
      status: true,
    });

    subCategories.sort((a, b) => {
      const titleA = (a.title || "").trim().toLowerCase();
      const titleB = (b.title || "").trim().toLowerCase();

      const orderA = orderMap[titleA] || 999;
      const orderB = orderMap[titleB] || 999;

      if (orderA !== orderB) {
        return orderA - orderB;
      }

      return titleA.localeCompare(titleB);
    });

    return successResponse(
      res,
      "SubCategorys list successfully.",
      200,
      subCategories
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


exports.getMyBookings = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return errorResponse(res, "Unauthorized user", 401);
    }

    const bookings = await BookingModel.find({ userId })
      .populate("userId", "name email phone")
      .sort({ createdAt: -1 });

    return successResponse(
      res,
      "User bookings fetched successfully",
      200,
      bookings
    );

  } catch (error) {
    console.error("GET MY BOOKINGS ERROR:", error);

    return errorResponse(
      res,
      error.message || "Internal Server Error",
      500
    );
  }
};


exports.AppDeleteUser = catchAsync(async (req, res) => {
  try {
    const userId = req.user.id;
    const { otp, deleted_reason } = req.body;

    // ✅ Validate input
    if (!otp) {
      return validationErrorResponse(res, "OTP is required", 400);
    }

    if (!deleted_reason) {
      return validationErrorResponse(res, "Delete reason is required", 400);
    }

    // ✅ Find user
    const user = await User.findById(userId);

    if (!user) {
      return validationErrorResponse(res, "User not found", 404);
    }

    // ✅ OTP check (TEMP hardcoded - improve later)
    if (otp !== "123456") {
      return validationErrorResponse(res, "Invalid OTP", 400);
    }

    // ✅ Already deleted check
    if (user.deleted_at) {
      return validationErrorResponse(res, "User already deleted", 400);
    }

    // ✅ SOFT DELETE
    user.deleted_at = new Date();
    user.status = "inactive";
    user.deleted_reason = deleted_reason;

    await user.save();

    return successResponse(res, "User deleted successfully", 200);

  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.globalSearch = catchAsync(async (req, res) => {
  try {
    const { search } = req.query;


    // common condition
    const regexFilter = search
      ? { $regex: search, $options: "i" }
      : null;

    // 🔍 PRODUCTS SEARCH
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

    // 🔍 SERVICES SEARCH (AGGREGATION)
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

    // ⚡ parallel execution (fast 🔥)
    const [products, services] = await Promise.all([
      productsPromise,
      servicesPromise,
    ]);

    // default concepts
    const defaultConcepts = {
      contemporary: [],
      modern: [],
      classic: [],
    };

    const finalServices = {
      ...defaultConcepts,
      ...(services[0] || {}),
    };

    // ✅ FINAL RESPONSE
    return successResponse(res, "Global search result", 200, {
      products,
      design: finalServices,
    });

  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.LeadApp = catchAsync(async (req, res) => {
  try {
    const assignedTo = req.user.id;
    const { title, message, services, type, category } = req.body;
    const record = await Lead.create({
      assignedTo,
      title,
      message,
      services,
      category,
      type,
      source: "App"
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

exports.GetAllRecordServicesSubCategorys = catchAsync(async (req, res) => {
  try {
    const orderMap = {
      facades: 1,
      "landscaping & gazebo": 2,
      "living room": 3,
      "drwaing room": 4,
      bedroom: 5,
      kitchen: 6,
      staircase: 7,
      "pooja room": 8,
      washroom: 9,
    };

    const subCategories = await ServicesType.find({
      status: true,
    });

    subCategories.sort((a, b) => {
      const titleA = (a.title || "").trim().toLowerCase();
      const titleB = (b.title || "").trim().toLowerCase();

      const orderA = orderMap[titleA] || 999;
      const orderB = orderMap[titleB] || 999;

      if (orderA !== orderB) {
        return orderA - orderB;
      }

      return titleA.localeCompare(titleB);
    });

    return successResponse(
      res,
      "SubCategorys list successfully.",
      200,
      subCategories
    );
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Internal Server Error",
      500
    );
  }
});


exports.AppAllVendors = catchAsync(
  async (req, res) => {
    try {
      const Categorys = await Vendor.find({deletedAt : null}).sort({ createdAt: -1 }).populate("VendorCategory");
      return successResponse(res, "Vendor Categorys list successfully.", 201, Categorys);
    } catch (error) {
      return errorResponse(res, error.message || "Internal Server Error", 500);
    }
  }
);


exports.getWishlist = catchAsync(async (req, res) => {
  const userId = req.user.id;

  const wishlist = await Wishlist.findOne({ userId }).populate({
    path: "productIds",
    select:
      "title slug amount final_amount discount_amount variants thumbnail",
  });

  return successResponse(
    res,
    "Wishlist fetched successfully 100",
    200,
    {
      userId,
      productIds: wishlist?.productIds || [],
      count: wishlist?.productIds?.length || 0,
    }
  );
});


exports.addReview = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { productId, rating, title, message } = req.body;

  if (!productId || !rating || !message) {
    return errorResponse(
      res,
      "Product ID, rating, and message are required",
      400
    );
  }

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return errorResponse(res, "Invalid product ID", 400);
  }

  if (rating < 1 || rating > 5) {
    return errorResponse(res, "Rating must be between 1 and 5", 400);
  }

  const product = await Product.findById(productId);
  if (!product) {
    return errorResponse(res, "Product not found", 404);
  }

  const existingReview = await Review.findOne({
    product: productId,
    user: userId,
    isDeleted: false,
  });

  if (existingReview) {
    return errorResponse(
      res,
      "You have already reviewed this product. You can edit or delete your existing review.",
      400
    );
  }

  // Collect uploaded images
  let images = [];

  if (req.files && req.files.length > 0) {
    images = req.files.map((file) => file.path || file.location || file.url);

    if (images.length > 5) {
      return errorResponse(
        res,
        "Maximum 5 images allowed per review",
        400
      );
    }
  }

  const review = await Review.create({
    product: productId,
    user: userId,
    rating,
    title: title || "",
    message,
    images,
  });

  const populatedReview = await Review.findById(review._id)
    .populate("user", "name profileImage")
    .lean();

  return successResponse(
    res,
    "Review added successfully",
    201,
    populatedReview
  );
});


exports.updateReview = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { reviewId } = req.params;
  const { rating, title, message, removeImages = [] } = req.body;

  if (!mongoose.Types.ObjectId.isValid(reviewId)) {
    return errorResponse(res, "Invalid review ID", 400);
  }

  const review = await Review.findOne({
    _id: reviewId,
    user: userId,
    isDeleted: false,
  });

  if (!review) {
    return errorResponse(
      res,
      "Review not found or you are not authorized",
      404
    );
  }

  if (rating !== undefined) {
    if (rating < 1 || rating > 5) {
      return errorResponse(res, "Rating must be between 1 and 5", 400);
    }
    review.rating = rating;
  }

  if (title !== undefined) review.title = title;
  if (message !== undefined) review.message = message;

  // Remove selected images
  if (Array.isArray(removeImages) && removeImages.length > 0) {
    review.images = review.images.filter(
      (img) => !removeImages.includes(img)
    );
  }

  // Add new uploaded images
  if (req.files && req.files.length > 0) {
    const newImages = req.files.map(
      (file) => file.path || file.location || file.url
    );

    review.images = [...review.images, ...newImages];
  }

  // Maximum 5 images validation
  if (review.images.length > 5) {
    return errorResponse(
      res,
      "Maximum 5 images allowed per review",
      400
    );
  }

  // Reset status to pending for re-approval
  review.status = "pending";

  await review.save();

  // Recalculate rating
  await recalculateProductRating(review.product);

  const updatedReview = await Review.findById(review._id)
    .populate("user", "name profileImage")
    .lean();

  return successResponse(
    res,
    "Review updated successfully",
    200,
    updatedReview
  );
});


exports.getProductReviews = catchAsync(async (req, res) => {
  const { productId } = req.params;
  let { page = 1, limit = 10, sort = "latest", rating } = req.query;

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return errorResponse(res, "Invalid product ID", 400);
  }

  page = parseInt(page);
  limit = parseInt(limit);
  const skip = (page - 1) * limit;

  const currentUserId = req.query.userId || null;

  const product = await Product.findById(productId)
    .select("averageRating totalRating totalReviews ratingBreakdown")
    .lean();

  if (!product) {
    return errorResponse(res, "Product not found", 404);
  }

  const filter = {
    product: productId,
    isDeleted: false,
  };

  if (currentUserId) {
    filter.$or = [
      { status: "approved" },
      { user: new mongoose.Types.ObjectId(currentUserId) },
    ];
  } else {
    filter.status = "approved";
  }

  if (rating) {
    const ratingNum = parseInt(rating);
    if (ratingNum >= 1 && ratingNum <= 5) {
      filter.rating = ratingNum;
    }
  }

  let sortOption = {};

  switch (sort) {
    case "latest":
      sortOption = { createdAt: -1 };
      break;

    case "highest":
      sortOption = { rating: -1, createdAt: -1 };
      break;

    case "lowest":
      sortOption = { rating: 1, createdAt: -1 };
      break;

    case "most_helpful":
      filter.helpfulCount = { $gte: 1 };
      sortOption = { helpfulCount: -1, createdAt: -1 };
      break;

    case "positive":
      filter.rating = { $gte: 3 };
      sortOption = { rating: -1, createdAt: -1 };
      break;

    case "negative":
      filter.rating = { $lt: 3 };
      sortOption = { rating: 1, createdAt: -1 };
      break;

    default:
      sortOption = { createdAt: -1 };
  }

  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .populate("user", "name profileImage")
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .lean(),

    Review.countDocuments(filter),
  ]);

  // Rating Summary
  const breakdown = product.ratingBreakdown || {
    star1: 0,
    star2: 0,
    star3: 0,
    star4: 0,
    star5: 0,
  };

  const totalReviews = product.totalReviews || 0;

  const ratingBreakdown = {};

  for (let i = 1; i <= 5; i++) {
    const count = breakdown[`star${i}`] || 0;

    ratingBreakdown[`star${i}`] = {
      count,
      percentage:
        totalReviews > 0
          ? Math.round((count / totalReviews) * 100)
          : 0,
    };
  }

  return successResponse(res, "Reviews fetched successfully", 200, {
    summary: {
      averageRating: product.averageRating || 0,
      totalRating: product.totalRating || 0,
      totalReviews: product.totalReviews || 0,
      ratingBreakdown,
    },

    reviews,

    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
  });
});

exports.deleteReviewImage = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { reviewId, imageIndex } = req.params;

  if (!mongoose.Types.ObjectId.isValid(reviewId)) {
    return errorResponse(res, "Invalid review ID", 400);
  }

  const review = await Review.findOne({ _id: reviewId, user: userId, isDeleted: false });
  if (!review) {
    return errorResponse(res, "Review not found or unauthorized", 404);
  }

  const idx = parseInt(imageIndex);
  if (isNaN(idx) || idx < 0 || idx >= review.images.length) {
    return errorResponse(res, "Invalid image index", 400);
  }

  const removedImage = review.images[idx];

  // Remove from array
  review.images.splice(idx, 1);
  await review.save();

  // Attempt to delete from S3 (non-blocking)
  if (removedImage && removedImage.includes("amazonaws.com")) {
    deleteFile(removedImage).catch((err) => console.error("S3 delete error:", err));
  }

  return successResponse(res, "Image removed successfully", 200, {
    images: review.images,
  });
});


exports.deleteReview = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { reviewId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(reviewId)) {
    return errorResponse(res, "Invalid review ID", 400);
  }

  const review = await Review.findOne({ _id: reviewId, user: userId, isDeleted: false });
  if (!review) {
    return errorResponse(res, "Review not found or you are not authorized", 404);
  }

  review.isDeleted = true;
  review.deletedAt = new Date();
  await review.save();

  // Recalculate product rating
  await recalculateProductRating(review.product);

  return successResponse(res, "Review deleted successfully", 200);
});


exports.addToWishlist = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { productId } = req.body;

  if (!productId) {
    return errorResponse(res, "Product ID is required", 400);
  }

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return errorResponse(res, "Invalid product ID", 400);
  }

  const product = await Product.findById(productId);
  if (!product) {
    return errorResponse(res, "Product not found", 404);
  }

  let wishlist = await Wishlist.findOne({ userId });

  if (!wishlist) {
    wishlist = new Wishlist({ userId, productIds: [] });
  }

  if (wishlist.productIds.includes(productId)) {
    return errorResponse(res, "Product already in wishlist", 400);
  }

  wishlist.productIds.push(productId);
  await wishlist.save();

  return successResponse(res, "Added to Wishlist", 200, wishlist);
});


exports.getMaintenanceStatus = catchAsync(async (req, res) => {
try {
const response = await axios.get(
"https://api.cadmaxatelier.com/",
{
timeout: 5000,
}
);

return res.status(200).json({
  success: true,
  maintenance: false,
  message: "Server is running",
  data: response.data,
});

} catch (error) {
const status = error?.response?.status;

if ([500, 502, 503, 504].includes(status) || !error.response) {
  return res.status(200).json({
    success: false,
    maintenance: true,
    message: "Server under maintenance",
    data: {
      title: "Maintenance Break",
      description:
        "We are currently upgrading our services. Please try again later.",
      retryAfter: 300,
    },
  });
}

throw error;
}
});
