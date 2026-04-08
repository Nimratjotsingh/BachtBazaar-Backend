import User from "../models/userModel.js";
import bcrypt from "bcryptjs";
import admin from "../config/firebase.js";
import { generateToken } from "../utils/generateToken.js";

import {
  phoneSchema,
  passwordSchema,
  loginPasswordSchema,
  updateUserProfileSchema,
  forgotPasswordSchema,
  updatePasswordSchema
} from "../validators/appValidator.js";

import { validate } from "../validators/validate.js";


// format phone consistently
const formatPhone = (phone) => {
  if (!phone) return phone;

  phone = phone.trim();

  if (!phone.startsWith("+91")) {
    phone = "+91" + phone;
  }

  return phone;
};


// remove password from response
const sanitizeUser = (user) => {
  const userObj = user.toObject();
  delete userObj.password;
  return userObj;
};


// check user exists (before otp)
export const sendOtp = async (req, res) => {
  try {
    const { phone } = validate(phoneSchema, req.body);

    const formattedPhone = formatPhone(phone);
    const user = await User.findOne({ phone: formattedPhone });

    res.json({
      success: true,
      exists: !!user
    });

  } catch (error) {
    console.log("error send-otp", error.message);
    res.status(500).json({ message: "Error sending OTP" });
  }
};

// verify OTP (firebase)
export const verifyOtp = async (req, res) => {
  try {
    const { token } = req.body;

    const decoded = await admin.auth().verifyIdToken(token);
    const phone = formatPhone(decoded.phone_number);

    let user = await User.findOne({ phone });

    if (!user) {
      user = await User.create({
        phone,
        isVerified: true
      });
    }

    const jwtToken = generateToken(user._id);

    res.json({
      success: true,
      token: jwtToken,
      user: sanitizeUser(user)
    });

  } catch (error) {
    console.log("error verify-otp", error.message);
    res.status(401).json({ message: "Invalid OTP" });
  }
};

// set password  
export const setPassword = async (req, res) => {
  try {
    const { password } = validate(passwordSchema, req.body);

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.password = await bcrypt.hash(password, 10);
    await user.save();

    res.json({ success: true });

  } catch (error) {
    console.log("error set-password", error.message);
    res.status(500).json({ message: "Error setting password" });
  }
};

// login with password
export const loginWithPassword = async (req, res) => {
  try {
    const { phone, password } = validate(loginPasswordSchema, req.body);

    const formattedPhone = formatPhone(phone);
    const user = await User.findOne({ phone: formattedPhone });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.password) {
      return res.status(400).json({ message: "Use OTP login instead" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: sanitizeUser(user)
    });

  } catch (error) {
    console.log("error login-password", error.message);
    res.status(500).json({ message: "Login error" });
  }
};

// login with otp
export const loginWithOtp = async (req, res) => {
  try {
    const { token } = req.body;

    const decoded = await admin.auth().verifyIdToken(token);
    const phone = formatPhone(decoded.phone_number);

    const user = await User.findOne({ phone });

    if (!user) {
      const newUser = await User.create({
        phone,
        isVerified: true
      });

      const jwtToken = generateToken(newUser._id);

      return res.json({
        success: true,
        token: jwtToken,
        user: sanitizeUser(newUser),
        isNewUser: true
      });
    }

    const jwtToken = generateToken(user._id);

    res.json({
      success: true,
      token: jwtToken,
      user: sanitizeUser(user),
      isNewUser: false
    });

  } catch (error) {
    console.log("error login-otp", error.message);
    res.status(401).json({ message: "OTP login failed" });
  }
};

// update profile
export const updateProfile = async (req, res) => {
  try {
    console.log("REQ FILE:", req.file);
    console.log("REQ BODY:", req.body);

    const validatedData = validate(updateUserProfileSchema, req.body);

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { name, gender, address } = validatedData;

    user.name = name || user.name;
    user.gender = gender || user.gender;
    user.address = address || user.address;

    if (req.file) {
      user.profileImage = `/uploads/${req.file.filename}`;
    }

    const updatedUser = await user.save();

    res.json({
      success: true,
      user: sanitizeUser(updatedUser)
    });

  } catch (error) {
    console.log("error update-profile", error.message);
    res.status(500).json({ message: "Profile update failed" });
  }
};

// forgot password (OTP based)
export const forgotPassword = async (req, res) => {
  try {
    const { token, newPassword } = validate(forgotPasswordSchema, req.body);

    const decoded = await admin.auth().verifyIdToken(token);
    const phone = formatPhone(decoded.phone_number);

    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.password) {
      const isSame = await bcrypt.compare(newPassword, user.password);
      if (isSame) {
        return res.status(400).json({ message: "New password must be different" });
      }
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({
      success: true,
      message: "Password reset successful"
    });

  } catch (error) {
    console.log("error forgot-password", error.message);
    res.status(500).json({ message: "Forgot password failed" });
  }
};

// update password (logged-in user)
export const updatePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = validate(updatePasswordSchema, req.body);

    const user = await User.findById(req.user._id);

    if (!user || !user.password) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Old password is incorrect" });
    }

    const isSame = await bcrypt.compare(newPassword, user.password);
    if (isSame) {
      return res.status(400).json({ message: "New password must be different" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({
      success: true,
      message: "Password updated successfully"
    });

  } catch (error) {
    console.log("error update-password", error.message);
    res.status(500).json({ message: "Update password failed" });
  }
};