const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required."],
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    email: {
      type: String,
      required: [true, "Email is required."],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\S+@\S+\.\S+$/,
        "Please enter a valid email address."
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required."],
      minlength: 6,
      select: false, // don't send password in queries by default
    },
    phone: {
      type: String,
      trim: true,
      match: [
        /^[6-9]\d{9}$/,
        "Please enter a valid phone number."
      ],
    },
    profileImage: {
      type: String,
      default: "https://via.placeholder.com/150",
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// 🔑 Hash password before saving
// userSchema.pre("save", async function (next) {
//   if (!this.isModified("password")) return next(); // only hash if password is new/changed
//   this.password = await bcrypt.hash(this.password, 10);
//   next();
// });

const User = mongoose.model("User", userSchema);
module.exports = User;
