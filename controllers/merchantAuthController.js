import bcrypt from "bcryptjs";
import admin from "../config/firebase.js";
import Merchant from "../models/merchantModel.js";
import MerchantRegistration from "../models/merchantRegistrationModel.js";
import { generateToken } from "../utils/generateToken.js";
import {
  phoneSchema,
  passwordSchema,
  merchantRegisterSchema,
  merchantRegisterVerifySchema,
  loginPasswordSchema,
  forgotPasswordSchema,
  updatePasswordSchema
} from "../validators/appValidator.js";
import { validate, ValidationError } from "../validators/validate.js";
import { ACCOUNT_TYPES, ROLES } from "../constants/roles.js";

const stripBinaryData = (obj) => {
  if (!obj || typeof obj !== "object") return obj;
  if (obj.data && obj.contentType) {
    const { data, ...rest } = obj;
    return rest;
  }
  if (Array.isArray(obj)) return obj.map(stripBinaryData);
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, stripBinaryData(v)]));
};

const sanitizeMerchant = (merchant) => {
  const merchantObj = merchant.toObject();
  delete merchantObj.password;
  return stripBinaryData(merchantObj);
};

const formatPhone = (phone) => {
  if (!phone) return phone;
  const trimmed = phone.trim();
  return trimmed.startsWith("+91") ? trimmed : `+91${trimmed}`;
};

const handleValidation = (res, error, defaultMessage) => {
  if (error instanceof ValidationError) {
    return res.status(400).json({ message: error.message });
  }
  console.log(error);
  return res.status(500).json({ message: defaultMessage });
};

const handleFirebaseAuthError = (res, error, fallbackMessage) => {
  const code = error?.code || "";
  const message = error?.message || fallbackMessage;

  if (
    code.includes("id-token-expired") ||
    code.includes("invalid-id-token") ||
    code.includes("argument-error")
  ) {
    return res.status(401).json({ message });
  }

  if (code.includes("insufficient-permission") || code.includes("permission-denied")) {
    return res.status(403).json({ message });
  }

  return res.status(400).json({ message });
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

export const sendOtp = async (req, res) => {
  try {
    const { phone } = validate(phoneSchema, req.body);
    const merchant = await Merchant.findOne({ phone: formatPhone(phone) });
    return res.json({ success: true, exists: !!merchant });
  } catch (error) {
    return handleValidation(res, error, "Error sending OTP");
  }
};

export const registerMerchantSendOtp = async (req, res) => {
  try {
    const { phone } = validate(phoneSchema, req.body);
    const formattedPhone = formatPhone(phone);

    const existingMerchant = await Merchant.findOne({ phone: formattedPhone });
    if (existingMerchant) {
      return res.status(409).json({ message: "Phone number already registered" });
    }

    return res.status(200).json({
      success: true,
      message: "OTP sent to your phone. Verify to continue.",
      nextStep: "Call /api/merchants/register/verify-otp with Firebase token"
    });
  } catch (error) {
    return handleValidation(res, error, "Failed to send OTP");
  }
};

export const registerMerchantVerifyOtp = async (req, res) => {
  try {
    const { token } = validate(merchantRegisterVerifySchema, req.body);
    const phone = await resolvePhoneFromTokenOrBypass({ ...req.body, token });

    let merchant = await Merchant.findOne({ phone });
    
    if (!merchant) {
      merchant = await Merchant.create({
        phone,
        isVerified: true
      });
    } else if (!merchant.isVerified) {
      merchant.isVerified = true;
      await merchant.save();
    }

    const jwtToken = generateToken(merchant._id, {
      role: merchant.role || ROLES.MERCHANT,
      accountType: ACCOUNT_TYPES.MERCHANT
    });

    return res.status(201).json({
      success: true,
      message: "OTP verified. Please set your password.",
      nextStep: "Call POST /api/merchants/set-password with your password",
      token: jwtToken,
      merchant: sanitizeMerchant(merchant)
    });
  } catch (error) {
    if (error?.code?.startsWith("auth/")) {
      return handleFirebaseAuthError(res, error, "OTP verification failed");
    }
    return handleValidation(res, error, "OTP verification failed");
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const phone = await resolvePhoneFromTokenOrBypass(req.body);

    let merchant = await Merchant.findOne({ phone });
    if (!merchant) {
      merchant = await Merchant.create({ phone, isVerified: true });
    }

    const jwtToken = generateToken(merchant._id, {
      role: merchant.role || ROLES.MERCHANT,
      accountType: ACCOUNT_TYPES.MERCHANT
    });
    return res.json({ success: true, token: jwtToken, merchant: sanitizeMerchant(merchant) });
  } catch (error) {
    return handleFirebaseAuthError(res, error, "Invalid OTP");
  }
};

export const setPassword = async (req, res) => {
  try {
    const { password } = validate(passwordSchema, req.body);
    const merchant = await Merchant.findById(req.merchant._id);
    if (!merchant) return res.status(404).json({ message: "Merchant not found" });

    merchant.password = await bcrypt.hash(password, 10);
    await merchant.save();

    return res.json({ success: true });
  } catch (error) {
    return handleValidation(res, error, "Error setting password");
  }
};

export const loginWithPassword = async (req, res) => {
  try {
    const { phone, password } = validate(loginPasswordSchema, req.body);
    const merchant = await Merchant.findOne({ phone: formatPhone(phone) });

    if (!merchant) return res.status(404).json({ message: "Merchant not found" });
    if (!merchant.password) return res.status(400).json({ message: "Use OTP login instead" });

    const isMatch = await bcrypt.compare(password, merchant.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    return res.json({
      success: true,
      token: generateToken(merchant._id, {
        role: merchant.role || ROLES.MERCHANT,
        accountType: ACCOUNT_TYPES.MERCHANT
      }),
      merchant: sanitizeMerchant(merchant)
    });
  } catch (error) {
    return handleValidation(res, error, "Login error");
  }
};

export const loginWithOtp = async (req, res) => {
  try {
    const phone = await resolvePhoneFromTokenOrBypass(req.body);

    const merchant = await Merchant.findOne({ phone });
    if (!merchant) return res.status(404).json({ message: "Merchant not found" });

    return res.json({
      success: true,
      token: generateToken(merchant._id, {
        role: merchant.role || ROLES.MERCHANT,
        accountType: ACCOUNT_TYPES.MERCHANT
      }),
      merchant: sanitizeMerchant(merchant)
    });
  } catch (error) {
    return handleFirebaseAuthError(res, error, "OTP login failed");
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { token, newPassword } = validate(forgotPasswordSchema, req.body);
    const phone = await resolvePhoneFromTokenOrBypass({ ...req.body, token });

    const merchant = await Merchant.findOne({ phone });
    if (!merchant) return res.status(404).json({ message: "Merchant not found" });

    merchant.password = await bcrypt.hash(newPassword, 10);
    await merchant.save();

    return res.json({ success: true, message: "Password reset successful" });
  } catch (error) {
    if (error?.code?.startsWith("auth/")) {
      return handleFirebaseAuthError(res, error, "Reset failed");
    }
    return handleValidation(res, error, "Reset failed");
  }
};

export const updatePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = validate(updatePasswordSchema, req.body);
    const merchant = await Merchant.findById(req.merchant._id);

    if (!merchant || !merchant.password) {
      return res.status(404).json({ message: "Merchant not found" });
    }

    const isMatch = await bcrypt.compare(oldPassword, merchant.password);
    if (!isMatch) return res.status(400).json({ message: "Old password incorrect" });

    merchant.password = await bcrypt.hash(newPassword, 10);
    await merchant.save();

    return res.json({ success: true, message: "Password updated" });
  } catch (error) {
    return handleValidation(res, error, "Update failed");
  }
};
