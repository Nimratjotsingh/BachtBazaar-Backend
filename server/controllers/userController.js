import User from "../models/userModel.js";
import bcrypt from "bcryptjs";
import admin from "../config/firebase.js";
import { generateToken } from "../utils/generateToken.js";
import { ACCOUNT_TYPES, ROLES } from "../constants/roles.js";

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


// remove password and binary image data from response
const stripBinaryData = (obj) => {
  if (!obj || typeof obj !== "object") return obj;
  if (obj.data && obj.contentType) {
    const { data, ...rest } = obj;
    return rest;
  }
  if (Array.isArray(obj)) {
    return obj.map(stripBinaryData);
  }
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [key, stripBinaryData(value)])
  );
};

const sanitizeUser = (user) => {
  const userObj = JSON.parse(JSON.stringify(user.toObject()));
  delete userObj.password;
  return stripBinaryData(userObj);
};

const isDevOtpBypass = (token) => {
  const env = (process.env.NODE_ENV || "").toLowerCase();
  return env.startsWith("development") && token === "123456";
};

const resolvePhoneFromTokenOrBypass = async (reqBody) => {
  const { token } = reqBody;

  if (isDevOtpBypass(token)) {
    const { phone } = validate(phoneSchema, reqBody);
    return formatPhone(phone);
  }

  const decoded = await admin.auth().verifyIdToken(token);
  return formatPhone(decoded.phone_number);
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

// Get profile image
export const getProfileImage = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || !user.profileImage || !user.profileImage.data) {
      return res.status(404).json({ message: "Profile image not found" });
    }

    res.set("Content-Type", user.profileImage.contentType);
    res.send(user.profileImage.data);
  } catch (error) {
    console.log("error get-profile-image", error.message);
    res.status(500).json({ message: "Failed to fetch profile image" });
  }
};

// verify OTP (firebase)
export const verifyOtp = async (req, res) => {
  try {
    const phone = await resolvePhoneFromTokenOrBypass(req.body);

    let user = await User.findOne({ phone });

    if (!user) {
      user = await User.create({
        phone,
        isVerified: true
      });
    } else if (!user.isVerified) {
      user.isVerified = true;
      await user.save();
    }

    const jwtToken = generateToken(user._id, {
      role: user.role || ROLES.USER,
      accountType: ACCOUNT_TYPES.USER
    });

    res.json({
      success: true,
      message: "OTP verified. Please set your password.",
      nextStep: "Call POST /api/users/set-password with your password",
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
    console.log(req.body)
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

    const token = generateToken(user._id, {
      role: user.role || ROLES.USER,
      accountType: ACCOUNT_TYPES.USER
    });

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
    const phone = await resolvePhoneFromTokenOrBypass(req.body);

    const user = await User.findOne({ phone });

    if (!user) {
      const newUser = await User.create({
        phone,
        isVerified: true
      });

      const jwtToken = generateToken(newUser._id, {
        role: newUser.role || ROLES.USER,
        accountType: ACCOUNT_TYPES.USER
      });

      return res.json({
        success: true,
        token: jwtToken,
        user: sanitizeUser(newUser),
        isNewUser: true
      });
    }

    const jwtToken = generateToken(user._id, {
      role: user.role || ROLES.USER,
      accountType: ACCOUNT_TYPES.USER
    });

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
      user.profileImage = {
        data: req.file.buffer,
        contentType: req.file.mimetype
      };
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
    const phone = await resolvePhoneFromTokenOrBypass({ ...req.body, token });

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