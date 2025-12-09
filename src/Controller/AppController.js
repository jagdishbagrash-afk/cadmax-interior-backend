const jwt = require("jsonwebtoken");
const catchAsync = require("../Utill/catchAsync");
const User = require("../Model/User");
const { promisify } = require("util");
const bcrypt = require("bcrypt");
// const nodemailer = require("nodemailer");
const { validationErrorResponse, errorResponse, successResponse } = require("../Utill/ErrorHandling");
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
    const user = await User.findOne({ phone: phone });
    if (!user) {
      return successResponse(res, "OTP verified, please sign up now", 200, {
        role: role,
      });
    }

    if (user?.deleted_at != null) {
      return errorResponse(res, "This account is blocked", 200);
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET_KEY,
      { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
    );
    // console.log("token" ,token)
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


