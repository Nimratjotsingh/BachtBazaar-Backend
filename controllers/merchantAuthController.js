import bcrypt from "bcryptjs";
import admin from "../config/firebase.js";
import Merchant from "../models/merchantModel.js";
import { generateToken } from "../utils/generateToken.js";
import {
  phoneSchema,
  passwordSchema,
  loginPasswordSchema,
  forgotPasswordSchema,
  updatePasswordSchema
} from "../validators/appValidator.js";
import { validate, ValidationError } from "../validators/validate.js";

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

export const sendOtp = async (req, res) => {
  try {
    const { phone } = validate(phoneSchema, req.body);
    const merchant = await Merchant.findOne({ phone: formatPhone(phone) });
    return res.json({ success: true, exists: !!merchant });
  } catch (error) {
    return handleValidation(res, error, "Error sending OTP");
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { token } = req.body;
    const decoded = await admin.auth().verifyIdToken(token);
    const phone = formatPhone(decoded.phone_number);

    let merchant = await Merchant.findOne({ phone });
    if (!merchant) {
      merchant = await Merchant.create({ phone, isVerified: true });
    }

    const jwtToken = generateToken(merchant._id);
    return res.json({ success: true, token: jwtToken, merchant: sanitizeMerchant(merchant) });
  } catch (error) {
    return res.status(401).json({ message: "Invalid OTP" });
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
      token: generateToken(merchant._id),
      merchant: sanitizeMerchant(merchant)
    });
  } catch (error) {
    return handleValidation(res, error, "Login error");
  }
};

export const loginWithOtp = async (req, res) => {
  try {
    const { token } = req.body;
    const decoded = await admin.auth().verifyIdToken(token);
    const phone = formatPhone(decoded.phone_number);

    const merchant = await Merchant.findOne({ phone });
    if (!merchant) return res.status(404).json({ message: "Merchant not found" });

    return res.json({
      success: true,
      token: generateToken(merchant._id),
      merchant: sanitizeMerchant(merchant)
    });
  } catch (error) {
    return res.status(401).json({ message: "OTP login failed" });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { token, newPassword } = validate(forgotPasswordSchema, req.body);
    const decoded = await admin.auth().verifyIdToken(token);

    const merchant = await Merchant.findOne({ phone: formatPhone(decoded.phone_number) });
    if (!merchant) return res.status(404).json({ message: "Merchant not found" });

    merchant.password = await bcrypt.hash(newPassword, 10);
    await merchant.save();

    return res.json({ success: true, message: "Password reset successful" });
  } catch (error) {
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
