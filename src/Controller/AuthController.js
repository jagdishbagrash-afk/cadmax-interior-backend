const jwt = require("jsonwebtoken");
const catchAsync = require("../Utill/catchAsync");
const bcrypt = require("bcrypt");
const { errorResponse, successResponse, validationErrorResponse } = require("../Utill/ErrorHandling");
const User = require("../Model/User");

const signToken = async (id) => {
  const token = jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "14400m",
  });
  return token;
};

exports.isValidEmail = (email) => { const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; return emailRegex.test(email); };

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

exports.AdminLogin = catchAsync(async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(401).json({
        status: false,
        message: "Email and password are required!",
      });
    }

    // fetch user with password
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({
        status: false,
        message: "Invalid Email or password",
      });
    }

    // Generate a token for the user
    const token = await signToken(user._id);
    const Profile = await User.findById(user._id).select("-password");
    res.json({
      status: true,
      message: "Login Successfully!",
      token,
      user: Profile,
    });
  } catch (error) {
    console.log("error", error);
    return res.status(500).json({
      status: false,
      message: "An unknown error occurred. Please try later.",
      error,
    });
  }
});

exports.SendUserOtp = catchAsync(async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return validationErrorResponse(res, "Phone number is required", 401);
    }

    // Find user by phone
    const user = await User.findOne({ phone });

    if (!user) {
      return errorResponse(res, "Phone not registered. Please sign up first.", 401);
    }

    if (user?.deleted_at != null) {
      return errorResponse(res, "This account is blocked", 401);
    }

    return successResponse(res, "OTP sent successfully", 200, {
      otp: 123456,
    });

  } catch (error) {
    console.error("SendOtp error:", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});


exports.UserLogin = catchAsync(async (req, res) => {
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
    res.status(200).json({
      data: userProfile,
      msg: "Profile retrieved successfully",
    });
  } catch (error) {
    res.status(500).json({
      msg: "Failed to fetch profile",
      error: error.message,
    });
  }
});




exports.resetpassword = catchAsync(async (req, res) => {
  try {
    const email = req?.user?.id;
    const { newPassword } = req.body;
    const user = await User.findById({ _id: email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    user.password = hashedPassword;
    await user.save();
    res.json({ message: "Password has been reset successfully!" });
  } catch (error) {
    // logger.error("Error fetching booking:", error);
    res.status(500).json({ message: "Error resetting password", error });
  }
});

exports.UserPhoneVerify = catchAsync(async (req, res) => {
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




// ✅ Profile Update
exports.updateProfile = async (req, res) => {
  try {
    const userId = req?.user?.id; // userId from token (middleware sets req.user)
    const { name, phone, profileImage, email } = req.body;

    // Find and update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { name, phone, profileImage, email },
      { new: true, runValidators: true }
    ).select("-password"); // exclude password

    if (!updatedUser) {
      return errorResponse(res, "User not found", 404);
    }
    return successResponse(res, "Profile updated successfully", 200, updatedUser);
  } catch (error) {
    console.error("Error updating profile:", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
};


exports.GetAllUser = catchAsync(
  async (req, res) => {
    try {
      const Users = await User.find({ role: "customer" }).sort({ createdAt: -1 });
      return successResponse(res, "Users list successfully.", 201, Users);
    } catch (error) {
      return errorResponse(res, error.message || "Internal Server Error", 500);
    }
  }
);



exports.DeleteUser = catchAsync(async (req, res) => {
  try {
    const id = req.params.id;
    const userrecord = await User.findById(id);
    if (!userrecord) {
      return validationErrorResponse(res, "User not found", 404);
    }

    if (userrecord.deleted_at) {
      userrecord.deleted_at = null;
      userrecord.status = "active"

      await userrecord.save();
      return successResponse(res, "User restored successfully", 200);
    }

    userrecord.deleted_at = new Date();
    userrecord.status = "inactive"
    const record = await userrecord.save();
    console.log("record", record)
    return successResponse(res, "User deleted successfully", 200);

  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});


exports.EditProfileData = catchAsync(async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email, phone, gender, address } = req.body;
    const existingUser = await User.findById(userId);

    if (!existingUser) {
      return res.status(404).json({
        status: false,
        message: "User not found"
      });
    }
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