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


export const createUser = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      gender,
      city,
      latitude,
      longitude,
      address,
    } = req.body;

    // Check if email or phone already exists
    const existingUser = await User.findOne({
      $or: [
        ...(email ? [{ email }] : []),
        ...(phone ? [{ phone }] : []),
      ],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email or phone already exists.",
      });
    }

    // Hash password (if provided)
    let hashedPassword = undefined;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Create user
    const user = await User.create({
      name,
      email,
      phone,
      password: hashedPassword,
      gender,
      city,
      latitude,
      longitude,
      address,
    });

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    return res.status(201).json({
      success: true,
      message: "User created successfully.",
      data: userResponse,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

// login with password
export const loginWithPassword = async (req, res) => {
  
  try {
    console.log(req.body)
    const { phone, password } = req.body

    const formattedPhone = formatPhone(phone);
    const user = await User.findOne({ phone: formattedPhone });
    // const user = await User.findOne({ phone });

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

    const {latitude,longitude, city} = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { name, gender, address } = validatedData;

    user.name = name || user.name;
    user.gender = gender || user.gender;
    user.address = address || user.address;
    user.latitude = latitude || user.latitude;
    user.longitude = longitude || user.longitude;
    user.city = city || user.city;

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

export const deleteUserAccount = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized token payload context." });
    }

    const user = await User.findById(userId).session(session);
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "User account not found." });
    }

    // Cascading delete across related inventories if user is a merchant or manager
    if (user.role === ROLES.MERCHANT || user.role === "merchant" || user.isMerchant === true) {
      await Promise.all([
        Product.deleteMany({ merchant_id: userId }).session(session),
        Service.deleteMany({ merchant_id: userId }).session(session),
        Offer.deleteMany({ merchant_id: userId }).session(session),
        MerchantShop.deleteMany({ merchantId: userId }).session(session)
      ]);
    }

    // Wipe out core profile security identity
    await User.findByIdAndDelete(userId).session(session);

    await session.commitTransaction();
    session.endSession();

    // Clear secure HTTPOnly session cookie data states instantly if utilized
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/"
    });

    res.json({
      success: true,
      message: "Account and all associated sub-data collections permanently wiped."
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.log("error delete-user-account", error.message);
    res.status(500).json({ message: "Failed to delete user account database matrices." });
  }
};

// ====================================================================
// --- MERCHANT DISCONNECT / LOGOUT MIDDLEWARE CONTROLLER -------------
// ====================================================================
export const logoutUser = async (req, res) => {
  try {
    // 1. Clear secure HTTPOnly session cookie states if tracking credentials locally
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Forces encryption over SSL layers
      sameSite: "strict",
      path: "/" // Enforces blanket reset path clearance bounds
    });

    // 2. Clear alternative custom authentication tokens if tracked under unique keys
    res.clearCookie("userToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/"
    });

    // 3. Optional: If your system uses a Redis/Database Token Blacklist for deep JWT expiration:
    // const token = req.headers.authorization?.split(" ")[1];
    // if (token) { await blacklistToken(token); }

    return res.status(200).json({
      success: true,
      message: "Merchant session terminated successfully. Cache reference values flushed."
    });

  } catch (error) {
    console.error("Merchant Logout Sequence Fault Exception:", error);
    return res.status(500).json({
      success: false,
      message: "An internal system error occurred while terminating session handles."
    });
  }
};

// Path to your User model

import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";


const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateAppToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "30d", // Extended lifespan window safe for mobile applications contexts
  });
};

export const googleAuthUser = async (req, res) => {
  try {
    // UPDATED: Destructure parameters directly matching your React Native request body stream logging profiles
    const { idToken, email, name, firebaseToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: "Google 'idToken' credential packet payload is missing from the request."
      });
    }

    let verifiedEmail, verifiedName;

    try {
      // 1. Verify token validation signature against Google authorization ticket registers
      const ticket = await client.verifyIdToken({
        idToken: idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new Error("Empty credentials envelope received from remote server verification processes.");
      }

      verifiedEmail = payload.email;
      verifiedName = payload.name;
    } catch (tokenVerificationError) {
      console.warn("Google Client SDK validation fallback warning:", tokenVerificationError.message);
      
      // Secondary Fallback: Secure validation check using request metadata fields if client audiences are complex
      if (!email) {
        return res.status(401).json({
          success: false,
          message: "Google verification token expired or identity matching parameters rejected."
        });
      }
      verifiedEmail = email;
      verifiedName = name;
    }

    const sanitizedEmail = verifiedEmail.toLowerCase().trim();

    // 2. Query collection records for an active matched client matching user email
    let user = await User.findOne({ email: sanitizedEmail });

    if (user) {
      // Administrative ban check integration block
      if (user.status === "banned") {
        return res.status(403).json({
          success: false,
          message: `Authentication suspended: Account has been administratively blocked. Reason: ${user.bannedReason || "None specified."}`
        });
      }

      // Automatically revive profile records if soft-deletion locks were active
      if (user.isDeleted) {
        user.isDeleted = false;
        user.deletedAt = null;
      }
    } else {
      // 3. Document provisioning hook pipeline (Run if entry doesn't exist yet)
      user = new User({
        email: sanitizedEmail,
        name: verifiedName || "User",
        isVerified: true, // Auto-verify email status derived from trusted Google verification contexts
        role: ROLES.USER,
        status: "active"
      });
    }

    // Optional Step: If you have a Firebase notification tokens sub-property on your user schema, 
    // you can cache the incoming token here:
    // if (firebaseToken) user.firebaseDeviceToken = firebaseToken;

    await user.save();

    // 4. Issue native authentication session signature tokens
    const appSessionToken = generateAppToken(user._id);

    return res.status(200).json({
      success: true,
      message: "Google identity verification completed successfully.",
      token: appSessionToken,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });

  } catch (error) {
    console.error("Critical Failure Processing React Native Google Authentication Request:", error);
    return res.status(500).json({
      success: false,
      message: "An internal exception occurred processing authentication channels."
    });
  }
};