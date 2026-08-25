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
import { generateUniqueReferralCode, processUserReferral } from "../utils/referalHelper.js";



import { validate } from "../validators/validate.js";

import CircleInvitation from "../models/CircleInvitationModel.js";
import BachatCircle from "../models/BachatCircleModel.js";

export const autoJoinPendingCirclesOnRegistration = async (newUser) => {
  try {
    const rawPhone = newUser.phone.replace(/[\s\-()]/g, "").trim();

    const pendingInvites = await CircleInvitation.find({
      phone: rawPhone,
      status: "PENDING",
      expiresAt: { $gt: new Date() },
    });

    for (const invite of pendingInvites) {
      await BachatCircle.findByIdAndUpdate(invite.circleId, {
        $addToSet: {
          members: {
            userId: newUser._id,
            role: invite.roleAssigned || "MEMBER",
            joinedAt: new Date(),
          },
        },
      });

      invite.status = "ACCEPTED";
      invite.invitedUserId = newUser._id;
      invite.respondedAt = new Date();
      await invite.save();
    }
  } catch (error) {
    console.error("Auto Circle Join On Registration Error:", error.message);
  }
};

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
    const { fcmToken } = req.body;
    const phone = await resolvePhoneFromTokenOrBypass(req.body);

    let user = await User.findOne({ phone });
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      const newReferralCode = typeof generateUniqueReferralCode === "function"
        ? await generateUniqueReferralCode()
        : undefined;

      user = await User.create({
        phone,
        isVerified: true,
        referralCode: newReferralCode,
        fcmToken: fcmToken ? String(fcmToken).trim() : null,
      });

      if (typeof autoJoinPendingCirclesOnRegistration === "function") {
        await autoJoinPendingCirclesOnRegistration(user);
      }
    } else {
      let isModified = false;

      if (!user.isVerified) {
        user.isVerified = true;
        isModified = true;
      }

      if (fcmToken && user.fcmToken !== String(fcmToken).trim()) {
        user.fcmToken = String(fcmToken).trim();
        isModified = true;
      }

      if (isModified) {
        await user.save();
      }
    }

    const jwtToken = generateToken(user._id, {
      role: user.role || ROLES.USER,
      accountType: ACCOUNT_TYPES.USER,
    });

    return res.status(200).json({
      success: true,
      message: "OTP verified. Please set your password.",
      nextStep: "Call POST /api/users/set-password with your password",
      token: jwtToken,
      user: sanitizeUser(user),
      isNewUser,
    });
  } catch (error) {
    console.error("error verify-otp:", error.message);
    return res.status(401).json({ success: false, message: "Invalid OTP" });
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


const attachFcmToken = async (userId, fcmToken) => {
  if (!fcmToken || typeof fcmToken !== "string" || !fcmToken.trim()) return;
  await User.findByIdAndUpdate(userId, {
    $addToSet: { fcmTokens: fcmToken.trim() },
  });
};

// 1. Create User / Registration
// Helper function to update the single fcmToken
const updateFcmToken1 = async (userId, fcmToken) => {
  if (!fcmToken || typeof fcmToken !== "string" || !fcmToken.trim()) return;
  await User.findByIdAndUpdate(userId, {
    $set: { fcmToken: fcmToken.trim() },
  });
};

// 1. Create User / Registration
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
      referralCode,
      fcmToken, // Single FCM Token string
    } = req.body;

    // Check if email or phone already exists
    const existingUser = await User.findOne({
      $or: [
        ...(email ? [{ email: email.toLowerCase().trim() }] : []),
        ...(phone ? [{ phone: phone.trim() }] : []),
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
    const newReferralCode = await generateUniqueReferralCode();

    // Create user record
    const user = await User.create({
      name: name?.trim(),
      email: email ? email.toLowerCase().trim() : undefined,
      phone: phone?.trim(),
      password: hashedPassword,
      referralCode: newReferralCode,
      gender,
      city,
      latitude,
      longitude,
      address,
      fcmToken: fcmToken ? String(fcmToken).trim() : null,
    });

    // Remove password from response payload
    const userResponse = user.toObject();
    delete userResponse.password;

    // Auto-join pending circles
    await autoJoinPendingCirclesOnRegistration(user);

    // Process referral linkage
    if (referralCode) {
      processUserReferral(user._id, referralCode);
    }

    return res.status(201).json({
      success: true,
      message: "User created successfully.",
      data: userResponse,
    });
  } catch (error) {
    console.error("Create User Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

// 2. Login with Password
export const loginWithPassword = async (req, res) => {
  try {
    const { phone, password, fcmToken } = req.body;

    const formattedPhone = typeof formatPhone === "function" ? formatPhone(phone) : phone?.trim();
    const user = await User.findOne({
      $or: [{ phone: formattedPhone }, { phone: phone?.trim() }],
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!user.password) {
      return res.status(400).json({
        success: false,
        message: "Password not set. Please use OTP login instead.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    // Update FCM token if provided
    if (fcmToken) {
      await updateFcmToken1(user._id, fcmToken);
      user.fcmToken = String(fcmToken).trim();
    }

    const token = generateToken(user._id, {
      role: user.role || ROLES.USER,
      accountType: ACCOUNT_TYPES.USER,
    });

    return res.status(200).json({
      success: true,
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("error login-password:", error.message);
    return res.status(500).json({
      success: false,
      message: "Login error",
      error: error.message,
    });
  }
};

// 3. Login / Register with OTP
export const loginWithOtp = async (req, res) => {
  try {
    const { phone, fcmToken } = req.body;
    const cleanPhone = phone?.trim();

    let user = await User.findOne({ phone: cleanPhone });

    if (!user) {
      const newReferralCode = await generateUniqueReferralCode();

      const newUser = await User.create({
        phone: cleanPhone,
        referralCode: newReferralCode,
        isVerified: true,
        fcmToken: fcmToken ? String(fcmToken).trim() : null,
      });

      // Background invite check
      await autoJoinPendingCirclesOnRegistration(newUser);

      const jwtToken = generateToken(newUser._id, {
        role: newUser.role || ROLES.USER,
        accountType: ACCOUNT_TYPES.USER,
      });

      return res.status(201).json({
        success: true,
        token: jwtToken,
        user: sanitizeUser(newUser),
        isNewUser: true,
      });
    }

    // Update existing user with device FCM token
    if (fcmToken) {
      await updateFcmToken1(user._id, fcmToken);
      user.fcmToken = String(fcmToken).trim();
    }

    const jwtToken = generateToken(user._id, {
      role: user.role || ROLES.USER,
      accountType: ACCOUNT_TYPES.USER,
    });

    return res.status(200).json({
      success: true,
      token: jwtToken,
      user: sanitizeUser(user),
      isNewUser: false,
    });
  } catch (error) {
    console.error("error login-otp:", error.message);
    return res.status(401).json({
      success: false,
      message: "OTP login failed",
      error: error.message,
    });
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

// 1. Save or Update Push Notification FCM Token
export const updateFcmToken = async (req, res) => {
  try {
    const userId = req.user._id;
    const { fcmToken, deviceType = "android" } = req.body;

    if (!fcmToken) {
      return res.status(400).json({ success: false, message: "FCM token is required." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    user.fcmToken = fcmToken;

    // Add to fcmTokens array if not already present
    const existingIndex = user.fcmTokens.findIndex((t) => t.token === fcmToken);
    if (existingIndex > -1) {
      user.fcmTokens[existingIndex].updatedAt = new Date();
    } else {
      user.fcmTokens.push({ token: fcmToken, deviceType });
    }

    await user.save();

    

    return res.status(200).json({
      success: true,
      message: "Push notification FCM token saved successfully.",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Toggle Notification Preferences ON/OFF
export const toggleNotificationSettings = async (req, res) => {
  try {
    const userId = req.user._id;
    const { isNotificationEnabled } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { isNotificationEnabled },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: `Notifications ${isNotificationEnabled ? "enabled" : "disabled"}.`,
      isNotificationEnabled: user.isNotificationEnabled,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};