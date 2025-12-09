const jwt = require("jsonwebtoken");
const catchAsync = require("../Utill/catchAsync");
const bcrypt = require("bcrypt");
const { errorResponse, successResponse } = require("../Utill/ErrorHandling");
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
    const { email, password, name, profileImage, role, phone ,gender } = req.body;
    const hashedPassword = await bcrypt.hash(password, 12);
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
      password: hashedPassword,
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

exports.login = catchAsync(async (req, res, next) => {
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

    // Validate password
    // const isPasswordValid = await bcrypt.compare(password, user.password);
    // if (!isPasswordValid) {
    //   return res.status(400).json({
    //     status: false,
    //     message: "Incorrect password. Please try again.",
    //   });
    // }

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
            const Users = await User.find({role :"customer"}).sort({ createdAt: -1 });
            return successResponse(res, "Users list successfully.", 201, Users);
        } catch (error) {
            return errorResponse(res, error.message || "Internal Server Error", 500);
        }
    }
);