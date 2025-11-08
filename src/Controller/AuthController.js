const jwt = require("jsonwebtoken");
const catchAsync = require("../Utill/catchAsync");
const User = require("../Model/User");
const bcrypt = require("bcrypt");
const { errorResponse, successResponse } = require("../Utill/ErrorHandling");
// const logger = require("../Utill/Logger");



const signToken = async (id) => {
  const token = jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "14400m",
  });
  return token;
};


exports.isValidEmail = (email) => { const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; return emailRegex.test(email); };


exports.verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(400).json({
        status: false,
        message: "User is not authorized or Token is missing",
      });
    }

    const token = authHeader.split(" ")[1];

    // Verify token
    const decode = jwt.verify(token, process.env.JWT_SECRET);
    if (!decode) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized",
      });
    }

    // Find user
    const user = await User.findById(decode.id);
    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    req.User = user;
    next();
  } catch (err) {
    console.log("Token verification error:", err);
    return res.status(401).json({
      status: false,
      message: "Invalid or expired token",
      error: err.message, // log error message
    });
  }
};




exports.signup = catchAsync(async (req, res) => {
  try {
    const { email, password, name, phone, profileImage } = req.body;
    // const hashedPassword = await bcrypt.hash(password, 12);
    // Create new user with referral data
    const newUser = new User({
      email,
      password: password,
      name,
      phone,
      profileImage
    });

    const result = await newUser.save();
    return successResponse(res, "Account created successfully. Let’s get started!", 201, {
      userId: result._id,
    });
  } catch (error) {
    // logger.error("Error during signup:", error);
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
    const userId = req?.User?._id;
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
    const email = req?.User?._id;
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
    const userId = req.User._id; // userId from token (middleware sets req.user)
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