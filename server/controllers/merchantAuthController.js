import bcrypt from "bcryptjs";
import admin from "../config/firebase.js";
import Merchant from "../models/merchantModel.js";
import MerchantRegistration from "../models/merchantRegistrationModel.js";
import MerchantShop from '../models/merchantModel.js';
import Offer from "../models/offerModel.js";
import Product from "../models/productModel.js";
import Service from "../models/serviceModel.js";
import CustomerJournal from "../models/CustomerJournalModel.js";
import Wishlist from "../models/wishlistModel.js";
import MerchantDailyAnalytics from "../models/MerchantDailyAnalytics.js";
import axios from 'axios'


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
import mongoose from 'mongoose';
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
  const merchantObj = JSON.parse(JSON.stringify(merchant.toObject()));
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
  console.log("[isDevOtpBypass] NODE_ENV:", JSON.stringify(process.env.NODE_ENV), "| env:", JSON.stringify(env), "| token:", JSON.stringify(token));
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

    const formattedPhone = formatPhone(phone);
    const merchant = await Merchant.findOne({ phone: formattedPhone });

    // Clean phone number (strip non-digits, e.g. 919478273358)
    const cleanedMobile = formattedPhone.replace(/\D/g, "");

    const authKey = process.env.MSG91_AUTH_KEY;
    const accountId = process.env.MSG91_ACCOUNT_ID;
    const templateId = process.env.MSG91_OTP_TEMPLATE_ID;

    // Dispatch OTP via MSG91 v5 API
    const response = await axios.post(
      "https://control.msg91.com/api/v5/otp",
      null,
      {
        params: {
          template_id: templateId,
          mobile: cleanedMobile,
          otp_expiry: 5
        },
        headers: {
          authkey: authKey,
          "account-id": accountId,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );

    const msg91Data = response.data;

    if (msg91Data?.type !== "success") {
      return res.status(502).json({
        success: false,
        message: msg91Data?.message || "Failed to dispatch OTP from SMS gateway.",
      });
    }

    return res.status(200).json({
      success: true,
      exists: !!merchant,
      requestId: msg91Data.request_id,
      message: "OTP sent successfully.",
    });
  } catch (error) {
    if (error.response?.data) {
      console.error("MSG91 Send OTP Error:", error.response.data);
      return res.status(502).json({
        success: false,
        message: error.response.data.message || "Failed to dispatch OTP.",
      });
    }

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
    console.log("[register/verify-otp] body:", JSON.stringify(req.body));
    const { token } = validate(merchantRegisterVerifySchema, req.body);
    const phone = await resolvePhoneFromTokenOrBypass({ ...req.body, token });

    let merchant = await Merchant.findOne({ phone });
    
    if (!merchant) {
      merchant = await Merchant.create({
        phone,
        isVerified: false
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
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message: "Both phone number and OTP are required.",
      });
    }

    // Format and clean phone number for MSG91 (e.g. 919478273358)
    const formattedPhone = typeof formatPhone === "function" ? formatPhone(phone) : phone;
    const cleanedMobile = String(formattedPhone).replace(/\D/g, "");
    const cleanedOtp = String(otp).trim();

    const authKey = process.env.MSG91_AUTH_KEY;
    const accountId = process.env.MSG91_ACCOUNT_ID;

    // Call MSG91 v5 OTP Verify API
    try {
      const msg91Res = await axios.post(
        "https://control.msg91.com/api/v5/otp/verify",
        null,
        {
          params: {
            mobile: cleanedMobile,
            otp: cleanedOtp,
          },
          headers: {
            authkey: authKey,
            "account-id": accountId,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );

      if (msg91Res.data?.type !== "success") {
        return res.status(401).json({
          success: false,
          message: msg91Res.data?.message || "Invalid or expired OTP.",
        });
      }
    } catch (apiError) {
      const errResponse = apiError.response?.data;
      console.error("MSG91 Merchant Verify Error:", errResponse || apiError.message);
      return res.status(401).json({
        success: false,
        message: errResponse?.message || "Invalid OTP or verification expired.",
      });
    }

    // Lookup or register merchant
    let merchant = await Merchant.findOne({ phone: formattedPhone });
    if (!merchant) {
      merchant = await Merchant.create({
        phone: formattedPhone,
        isVerified: true,
      });
    } else if (!merchant.isVerified) {
      merchant.isVerified = true;
      await merchant.save();
    }

    // Generate JWT Auth Token
    const jwtToken = generateToken(merchant._id, {
      role: merchant.role || (typeof ROLES !== "undefined" ? ROLES.MERCHANT : "merchant"),
      accountType: typeof ACCOUNT_TYPES !== "undefined" ? ACCOUNT_TYPES.MERCHANT : "merchant",
    });

    return res.status(200).json({
      success: true,
      token: jwtToken,
      merchant: typeof sanitizeMerchant === "function" ? sanitizeMerchant(merchant) : merchant,
    });
  } catch (error) {
    console.error("Merchant verify-otp error:", error.message);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while verifying OTP.",
    });
  }
};

export const retryOtp = async (req, res) => {
  try {
    const { phone, retryType } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required.",
      });
    }

    const formattedPhone = typeof formatPhone === "function" ? formatPhone(phone) : phone;
    const cleanedMobile = String(formattedPhone).replace(/\D/g, "");
    
    // retrytype can be 'text' (SMS) or 'voice' (Call)
    const validRetryType = retryType && retryType.toLowerCase() === "voice" ? "voice" : "text";

    const authKey = process.env.MSG91_AUTH_KEY;
    const accountId = process.env.MSG91_ACCOUNT_ID || "5d8e43cab19f/00986b9f-d7cb-4973-a18a-9b6ebc3ba6ec";

    const response = await axios.post(
      "https://control.msg91.com/api/v5/otp/retry",
      null,
      {
        params: {
          mobile: cleanedMobile,
          retrytype: validRetryType,
        },
        headers: {
          authkey: authKey,
          "account-id": accountId,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );

    const msg91Data = response.data;

    if (msg91Data?.type !== "success") {
      return res.status(400).json({
        success: false,
        message: msg91Data?.message || "Failed to retry OTP.",
      });
    }

    return res.status(200).json({
      success: true,
      message: msg91Data.message || "OTP resent successfully.",
      retryType: validRetryType,
    });
  } catch (error) {
    const errorData = error.response?.data;
    console.error("User retry-otp error:", errorData || error.message);

    return res.status(error.response?.status || 500).json({
      success: false,
      message: errorData?.message || "Failed to resend OTP.",
    });
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
    const { email, phone, password } = req.body;

    let merchant;

    if (email) {
      merchant = await Merchant.findOne({ email });
    } else {
      // Add +91 if not already present
      let formattedPhone = phone?.trim();

      if (formattedPhone && !formattedPhone.startsWith("+91")) {
        formattedPhone = `+91${formattedPhone}`;
      }

      merchant = await Merchant.findOne({ phone: formattedPhone });
    }

    if (!merchant) {
      return res.status(404).json({ message: "Merchant not found" });
    }

    if (!merchant.password) {
      return res.status(400).json({ message: "Use OTP login instead" });
    }

    const isMatch = await bcrypt.compare(password, merchant.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    return res.json({
      success: true,
      token: generateToken(merchant._id, {
        role: merchant.role || ROLES.MERCHANT,
        accountType: ACCOUNT_TYPES.MERCHANT,
      }),
      merchant: sanitizeMerchant(merchant),
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

export const tempUpdatePass = async(req,res)=>{
  try {
    const {email,newPassword} = req.body
    const merchant = await Merchant.findOne({email:email});
    if(!merchant){
      return res.status(404).json({message:"Merchant not found"})
    }
    merchant.password = await bcrypt.hash(newPassword,10);
    await merchant.save();
    return res.json({success:true,message:"Password updated"})
  } catch (error) {
    console.log(error)
    return res.status(500).json({message:"Error updating password"})

  }
}

export const createTestMerchant = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,city
    } = req.body;

    // Basic validation
    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, phone and password are required"
      });
    }

    const formattedPhone = formatPhone(phone);

    // Check existing merchant
    const existingMerchant = await Merchant.findOne({
      $or: [
        { email },
        { phone: formattedPhone }
      ]
    });

    if (existingMerchant) {
      return res.status(409).json({
        success: false,
        message: "Merchant already exists"
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create merchant
    const merchant = await Merchant.create({
      name,
      email,
      phone: formattedPhone,
      password: hashedPassword,
      isVerified: true,
      role: ROLES.MERCHANT,
      city
    });

    // Generate JWT
    const token = generateToken(merchant._id, {
      role: merchant.role || ROLES.MERCHANT,
      accountType: ACCOUNT_TYPES.MERCHANT
    });

    return res.status(201).json({
      success: true,
      message: "Test merchant created successfully",
      token,
      merchant: sanitizeMerchant(merchant)
    });

  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Failed to create test merchant"
    });
  }
};

// ====================================================================
// --- MERCHANT DISCONNECT / LOGOUT MIDDLEWARE CONTROLLER -------------
// ====================================================================
export const logoutMerchant = async (req, res) => {
  try {
    // 1. Clear secure HTTPOnly session cookie states if tracking credentials locally
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Forces encryption over SSL layers
      sameSite: "strict",
      path: "/" // Enforces blanket reset path clearance bounds
    });

    // 2. Clear alternative custom authentication tokens if tracked under unique keys
    res.clearCookie("merchantToken", {
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

export const updateMerchantDeliveryStatus = async (req, res) => {
  try {
    const merchantId = req.merchant?._id || req.user?._id;
    const { isDeliveryEnabled } = req.body;

    if (typeof isDeliveryEnabled !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "Field 'isDeliveryEnabled' must be a valid boolean (true or false).",
      });
    }

    const merchant = await Merchant.findByIdAndUpdate(
      merchantId,
      { isDeliveryEnabled },
      { new: true }
    ).select("-password");

    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: "Merchant account not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Delivery services have been ${
        merchant.isDeliveryEnabled ? "enabled" : "disabled"
      } successfully.`,
      data: {
        _id: merchant._id,
        name: merchant.name,
        isDeliveryEnabled: merchant.isDeliveryEnabled,
      },
    });
  } catch (error) {
    console.error("Update Merchant Delivery Status Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update delivery status.",
      error: error.message,
    });
  }
};

/**
 * PATCH /api/admin/merchants/:merchantId/toggle-delivery
 * Admin endpoint to forcibly enable or disable delivery for a specific merchant
 */
export const toggleAdminMerchantDelivery = async (req, res) => {
  try {
    const { merchantId } = req.params;

    const merchant = await Merchant.findById(merchantId);

    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: "Merchant record not found.",
      });
    }

    merchant.isDeliveryEnabled = !merchant.isDeliveryEnabled;
    await merchant.save();

    return res.status(200).json({
      success: true,
      message: `Delivery feature for merchant '${merchant.name || merchant.phone}' has been ${
        merchant.isDeliveryEnabled ? "enabled" : "disabled"
      }.`,
      data: {
        _id: merchant._id,
        isDeliveryEnabled: merchant.isDeliveryEnabled,
      },
    });
  } catch (error) {
    console.error("Toggle Admin Merchant Delivery Exception:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while toggling merchant delivery capabilities.",
      error: error.message,
    });
  }
};

export const checkMerchantDeliveryStatus = async (req, res) => {
  try {
    const { id  } = req.params;
    const merchantId = id;
    console.log(merchantId)

    const merchant = await Merchant.findById(merchantId).select(
      "name isDeliveryEnabled status isBlocked"
    );

    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: "Merchant record not found.",
      });
    }

    if (merchant.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Merchant account is blocked or inactive.",
        isDeliveryAvailable: false,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        merchantId: merchant._id,
        merchantName: merchant.name,
        isDeliveryEnabled: merchant.isDeliveryEnabled ?? false,
      },
    });
  } catch (error) {
    console.error("Check Merchant Delivery Status Exception:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while checking merchant delivery status.",
      error: error.message,
    });
  }
};

/**
 * GET /api/merchant/my-delivery-status
 * Authenticated Merchant endpoint: Allows logged-in merchant to inspect their own delivery state
 */
export const getOwnDeliveryStatus = async (req, res) => {
  try {
    const merchantId = req.merchant?._id || req.user?._id;

    const merchant = await Merchant.findById(merchantId).select("name isDeliveryEnabled");

    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: "Merchant account not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        merchantId: merchant._id,
        isDeliveryEnabled: merchant.isDeliveryEnabled ?? false,
      },
    });
  } catch (error) {
    console.error("Get Own Delivery Status Exception:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve your delivery settings.",
      error: error.message,
    });
  }
};

export const updateMerchantFcmToken = async (req, res) => {
  try {
    const merchantId = req.merchant._id;
    const { fcmToken, deviceType = "android" } = req.body;

    if (!fcmToken) {
      return res.status(400).json({
        success: false,
        message: "FCM token is required.",
      });
    }

    const merchant = await Merchant.findById(merchantId);
    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: "Merchant account not found.",
      });
    }

    merchant.fcmToken = fcmToken;

    // Maintain device token array
    const existingIndex = merchant.fcmTokens.findIndex(
      (t) => t.token === fcmToken
    );
    if (existingIndex > -1) {
      merchant.fcmTokens[existingIndex].updatedAt = new Date();
    } else {
      merchant.fcmTokens.push({ token: fcmToken, deviceType });
    }

    await merchant.save();

    return res.status(200).json({
      success: true,
      message: "Merchant FCM token saved successfully.",
    });
  } catch (error) {
    console.error("Update Merchant FCM Token Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update FCM token.",
      error: error.message,
    });
  }
};

export const deleteMerchantAccount = async (req, res) => {
  try {
    const merchantId = req.merchant?._id;

    if (!merchantId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Merchant ID missing from request session.",
      });
    }

    const merchant = await Merchant.findById(merchantId);

    if (!merchant || merchant.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Merchant account not found or has already been deleted.",
      });
    }

    const deletionTimestamp = new Date();

    // 1. Deactivate merchant profile
    merchant.isDeleted = true;
    merchant.deletedAt = deletionTimestamp;
    merchant.status = "deleted";
    merchant.isBlocked = true;
    merchant.fcmToken = null;
    merchant.fcmTokens = [];
    await merchant.save();

    // 2. Cascade soft-delete shops
    await MerchantShop.updateMany(
      { merchantId },
      { $set: { isDeleted: true, isActive: false, deletedAt: deletionTimestamp } }
    );

    // 3. Cascade deactivate offers
    await Offer.updateMany(
      { merchant_id: merchantId },
      { $set: { is_deleted: true, is_active: false, deletedAt: deletionTimestamp } }
    );

    // 4. Cascade deactivate inventory (Products & Services)
    await Product.updateMany(
      { $or: [{ merchant_id: merchantId }, { merchantId }] },
      { $set: { isDeleted: true, isActive: false, deletedAt: deletionTimestamp } }
    );

    await Service.updateMany(
      { $or: [{ merchant_id: merchantId }, { merchantId }] },
      { $set: { isDeleted: true, isActive: false, deletedAt: deletionTimestamp } }
    );

    // 5. Soft-delete merchant's customer journals
    await CustomerJournal.updateMany(
      { merchantId },
      { $set: { isDeleted: true, deletedAt: deletionTimestamp } }
    );

    // 6. Clean references in wishlists
    const shopIds = await MerchantShop.find({ merchantId }).distinct("_id");
    const offerIds = await Offer.find({ merchant_id: merchantId }).distinct("_id");

    await Wishlist.updateMany(
      {},
      {
        $pull: {
          shops: { $in: shopIds },
          offers: { $in: offerIds },
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: "Your merchant account and all associated data have been deactivated successfully.",
      data: {
        merchantId,
        isDeleted: true,
        deletedAt: deletionTimestamp,
      },
    });
  } catch (error) {
    console.error("Delete Merchant Account Error:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while deleting your merchant account.",
      error: error.message,
    });
  }
};

const isValidTimeFormat = (timeStr) => {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(timeStr);
};

/**
 * PATCH /api/merchant/delivery-pricing
 * Updates delivery configuration: Base rate per KM, base fixed fee, minimum fee, night rates, and peak hours.
 */
export const updateDeliveryPricing = async (req, res) => {
  try {
    const merchantId = req.merchant._id;
    const {
      isDeliveryEnabled,
      baseFee,
      ratePerKm,
      minimumDeliveryFee,
      nightConfig,
      peakConfig,
    } = req.body;

    const merchant = await Merchant.findById(merchantId);
    if (!merchant) {
      return res.status(404).json({ success: false, message: "Merchant account not found." });
    }

    if (isDeliveryEnabled !== undefined) {
      merchant.isDeliveryEnabled = Boolean(isDeliveryEnabled);
    }

    if (!merchant.deliveryPricing) {
      merchant.deliveryPricing = {};
    }

    // 1. Numeric rate validations
    if (baseFee !== undefined) {
      const val = Number(baseFee);
      if (isNaN(val) || val < 0) {
        return res.status(400).json({ success: false, message: "Base fee cannot be negative." });
      }
      merchant.deliveryPricing.baseFee = val;
    }

    if (ratePerKm !== undefined) {
      const val = Number(ratePerKm);
      if (isNaN(val) || val < 0) {
        return res.status(400).json({ success: false, message: "Rate per KM cannot be negative." });
      }
      merchant.deliveryPricing.ratePerKm = val;
    }

    if (minimumDeliveryFee !== undefined) {
      const val = Number(minimumDeliveryFee);
      if (isNaN(val) || val < 0) {
        return res.status(400).json({ success: false, message: "Minimum delivery fee cannot be negative." });
      }
      merchant.deliveryPricing.minimumDeliveryFee = val;
    }

    // 2. Night window configuration validation
    if (nightConfig) {
      if (nightConfig.startTime && !isValidTimeFormat(nightConfig.startTime)) {
        return res.status(400).json({
          success: false,
          message: "Invalid nightConfig.startTime. Format must be 24-hour HH:mm (e.g., '22:00').",
        });
      }
      if (nightConfig.endTime && !isValidTimeFormat(nightConfig.endTime)) {
        return res.status(400).json({
          success: false,
          message: "Invalid nightConfig.endTime. Format must be 24-hour HH:mm (e.g., '06:00').",
        });
      }

      merchant.deliveryPricing.nightConfig = {
        ...merchant.deliveryPricing.nightConfig,
        ...(nightConfig.isEnabled !== undefined && { isEnabled: Boolean(nightConfig.isEnabled) }),
        ...(nightConfig.ratePerKm !== undefined && { ratePerKm: Math.max(0, Number(nightConfig.ratePerKm)) }),
        ...(nightConfig.flatSurcharge !== undefined && { flatSurcharge: Math.max(0, Number(nightConfig.flatSurcharge)) }),
        ...(nightConfig.startTime && { startTime: nightConfig.startTime }),
        ...(nightConfig.endTime && { endTime: nightConfig.endTime }),
      };
    }

    // 3. Peak rush window configuration validation
    if (peakConfig) {
      if (peakConfig.startTime && !isValidTimeFormat(peakConfig.startTime)) {
        return res.status(400).json({
          success: false,
          message: "Invalid peakConfig.startTime. Format must be 24-hour HH:mm (e.g., '19:00').",
        });
      }
      if (peakConfig.endTime && !isValidTimeFormat(peakConfig.endTime)) {
        return res.status(400).json({
          success: false,
          message: "Invalid peakConfig.endTime. Format must be 24-hour HH:mm (e.g., '21:30').",
        });
      }

      merchant.deliveryPricing.peakConfig = {
        ...merchant.deliveryPricing.peakConfig,
        ...(peakConfig.isEnabled !== undefined && { isEnabled: Boolean(peakConfig.isEnabled) }),
        ...(peakConfig.ratePerKm !== undefined && { ratePerKm: Math.max(0, Number(peakConfig.ratePerKm)) }),
        ...(peakConfig.flatSurcharge !== undefined && { flatSurcharge: Math.max(0, Number(peakConfig.flatSurcharge)) }),
        ...(peakConfig.startTime && { startTime: peakConfig.startTime }),
        ...(peakConfig.endTime && { endTime: peakConfig.endTime }),
      };
    }

    await merchant.save();

    return res.status(200).json({
      success: true,
      message: "Delivery pricing parameters successfully updated.",
      data: {
        isDeliveryEnabled: merchant.isDeliveryEnabled,
        deliveryPricing: merchant.deliveryPricing,
      },
    });
  } catch (error) {
    console.error("Update Delivery Pricing Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update delivery pricing structure.",
      error: error.message,
    });
  }
};

/**
 * GET /api/merchant/delivery-pricing
 * Retrieves the merchant's active delivery pricing model.
 */
export const getDeliveryPricing = async (req, res) => {
  try {
    const merchantId = req.merchant._id;

    const merchant = await Merchant.findById(merchantId)
      .select("isDeliveryEnabled deliveryPricing name phone")
      .lean();

    if (!merchant) {
      return res.status(404).json({ success: false, message: "Merchant not found." });
    }

    return res.status(200).json({
      success: true,
      data: {
        merchantId: merchant._id,
        isDeliveryEnabled: merchant.isDeliveryEnabled ?? false,
        deliveryPricing: merchant.deliveryPricing || {
          baseFee: 20,
          ratePerKm: 10,
          minimumDeliveryFee: 20,
          nightConfig: {
            isEnabled: false,
            ratePerKm: 15,
            flatSurcharge: 0,
            startTime: "22:00",
            endTime: "06:00",
          },
          peakConfig: {
            isEnabled: false,
            ratePerKm: 14,
            flatSurcharge: 0,
            startTime: "19:00",
            endTime: "21:30",
          },
        },
      },
    });
  } catch (error) {
    console.error("Get Delivery Pricing Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve delivery pricing parameters.",
      error: error.message,
    });
  }
};

/**
 * POST /api/merchant/delivery-pricing/estimate
 * Preview delivery fee calculation for a custom distance and time without placing an order.
 * Body: { "distanceKm": 5.2, "targetTime": "2026-09-15T22:30:00.000Z" }
 */
export const estimateDeliveryFee = async (req, res) => {
  try {
    const merchantId = req.merchant._id;
    const { distanceKm, targetTime } = req.body;

    const merchant = await Merchant.findById(merchantId).select("deliveryPricing isDeliveryEnabled").lean();
    if (!merchant) {
      return res.status(404).json({ success: false, message: "Merchant not found." });
    }

    const dist = Math.max(0.5, Number(distanceKm) || 1);
    const evalDate = targetTime ? new Date(targetTime) : new Date();

    const pricing = merchant.deliveryPricing || {};
    const baseFee = pricing.baseFee ?? 20;
    const standardRate = pricing.ratePerKm ?? 10;
    const minimumFee = pricing.minimumDeliveryFee ?? 20;

    const night = pricing.nightConfig || {};
    const peak = pricing.peakConfig || {};

    const isWindowActive = (start, end, d) => {
      if (!start || !end) return false;
      const [sh, sm] = start.split(":").map(Number);
      const [eh, em] = end.split(":").map(Number);
      const cur = d.getHours() * 60 + d.getMinutes();
      const s = sh * 60 + sm;
      const e = eh * 60 + em;
      return s <= e ? cur >= s && cur <= e : cur >= s || cur <= e;
    };

    let appliedRate = standardRate;
    let flatSurcharge = 0;
    let tierApplied = "STANDARD";

    if (night.isEnabled && isWindowActive(night.startTime, night.endTime, evalDate)) {
      appliedRate = night.ratePerKm ?? standardRate;
      flatSurcharge = night.flatSurcharge ?? 0;
      tierApplied = "NIGHT";
    } else if (peak.isEnabled && isWindowActive(peak.startTime, peak.endTime, evalDate)) {
      appliedRate = peak.ratePerKm ?? standardRate;
      flatSurcharge = peak.flatSurcharge ?? 0;
      tierApplied = "PEAK";
    }

    const raw = (dist * appliedRate) + baseFee + flatSurcharge;
    const estimatedFee = Math.max(minimumFee, Math.round(raw));

    return res.status(200).json({
      success: true,
      data: {
        distanceKm: dist,
        evaluationTime: evalDate.toISOString(),
        tierApplied,
        estimatedDeliveryFee: estimatedFee,
        breakdown: {
          baseFee,
          appliedRatePerKm: appliedRate,
          flatSurcharge,
          minimumFee,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/merchant/account/permanent
 * Hard delete: Completely wipes all merchant records from the database.
 */
export const hardDeleteMerchantAccount = async (req, res) => {
  try {
    const merchantId = req.merchant?._id;

    if (!merchantId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Merchant ID missing from request.",
      });
    }

    const merchant = await Merchant.findById(merchantId);
    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: "Merchant account not found.",
      });
    }

    // Collect IDs to remove references from wishlists
    const [shopIds, offerIds, productIds, serviceIds] = await Promise.all([
      MerchantShop.find({ merchantId }).distinct("_id"),
      Offer.find({ merchant_id: merchantId }).distinct("_id"),
      Product.find({
        $or: [{ merchant_id: merchantId }, { merchantId }],
      }).distinct("_id"),
      Service.find({
        $or: [{ merchant_id: merchantId }, { merchantId }],
      }).distinct("_id"),
    ]);

    // 1. Pull references from all customer wishlists
    await Wishlist.updateMany(
      {},
      {
        $pull: {
          shops: { $in: shopIds },
          offers: { $in: offerIds },
          products: { $in: productIds },
          services: { $in: serviceIds },
        },
      }
    );

    // 2. Wipe journals, analytics, catalog items, offers, and shops in parallel
    await Promise.all([
      CustomerJournal.deleteMany({ merchantId }),
      MerchantDailyAnalytics.deleteMany({ merchantId }),
      Offer.deleteMany({ merchant_id: merchantId }),
      Product.deleteMany({ $or: [{ merchant_id: merchantId }, { merchantId }] }),
      Service.deleteMany({ $or: [{ merchant_id: merchantId }, { merchantId }] }),
      MerchantShop.deleteMany({ merchantId }),
    ]);

    // 3. Delete merchant document
    await Merchant.findByIdAndDelete(merchantId);

    return res.status(200).json({
      success: true,
      message: "Merchant account and all associated data permanently removed.",
    });
  } catch (error) {
    console.error("Hard Delete Merchant Account Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to permanently remove merchant account.",
      error: error.message,
    });
  }
};

export const recoverMerchantAccount = async (req, res) => {
  try {
    const { phone, password } = req.body;
    const merchantIdFromToken = req.merchant?._id;

    let query = {};
    if (merchantIdFromToken) {
      query = { _id: merchantIdFromToken };
    } else if (phone) {
      // Standardize/trim phone number
      const cleanPhone = phone.toString().trim();
      query = {
        $or: [
          { phone: cleanPhone },
          { phone: `+91${cleanPhone.replace(/^\+?91/, "")}` },
        ],
      };
    } else {
      return res.status(400).json({
        success: false,
        message: "Phone number or merchant authorization token is required to recover account.",
      });
    }

    // 1. Locate the merchant
    const merchant = await Merchant.findOne(query);

    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: "Merchant account not found.",
      });
    }

    if (!merchant.isDeleted) {
      return res.status(400).json({
        success: false,
        message: "Account is already active. No restoration needed.",
      });
    }

    // 2. If recovered via unauthenticated public route, verify password (or bypass if using auth token)
    if (!merchantIdFromToken && password && merchant.password) {
      // If you're using bcrypt, swap with: await bcrypt.compare(password, merchant.password)
      const isMatch = merchant.password === password;
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials.",
        });
      }
    }

    const merchantId = merchant._id;
    const previousDeletedAt = merchant.deletedAt;

    // 3. Reactivate merchant account
    merchant.isDeleted = false;
    merchant.deletedAt = null;
    merchant.isBlocked = false;
    merchant.status = merchant.isVerified ? "verified" : "unverified";
    await merchant.save();

    // 4. Cascade restore shops linked to this merchant
    // Only restores shops that were deleted alongside the account (matching deletedAt)
    const shopFilter = { merchantId };
    if (previousDeletedAt) {
      shopFilter.deletedAt = previousDeletedAt;
    }
    await MerchantShop.updateMany(
      shopFilter,
      {
        $set: {
          isDeleted: false,
          isActive: true,
          deletedAt: null,
        },
      }
    );

    // 5. Cascade restore offers
    const offerFilter = { merchant_id: merchantId };
    if (previousDeletedAt) {
      offerFilter.deletedAt = previousDeletedAt;
    }
    await Offer.updateMany(
      offerFilter,
      {
        $set: {
          is_deleted: false,
          is_active: true,
          deletedAt: null,
        },
      }
    );

    // 6. Cascade restore products & services
    const itemFilter = {
      $or: [{ merchant_id: merchantId }, { merchantId }],
    };
    if (previousDeletedAt) {
      itemFilter.deletedAt = previousDeletedAt;
    }

    await Product.updateMany(
      itemFilter,
      {
        $set: {
          isDeleted: false,
          isActive: true,
          deletedAt: null,
        },
      }
    );

    await Service.updateMany(
      itemFilter,
      {
        $set: {
          isDeleted: false,
          isActive: true,
          deletedAt: null,
        },
      }
    );

    // 7. Cascade restore customer journals
    const journalFilter = { merchantId };
    if (previousDeletedAt) {
      journalFilter.deletedAt = previousDeletedAt;
    }
    await CustomerJournal.updateMany(
      journalFilter,
      {
        $set: {
          isDeleted: false,
          deletedAt: null,
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: "Merchant account and associated assets restored successfully.",
      data: {
        merchantId: merchant._id,
        name: merchant.name,
        phone: merchant.phone,
        status: merchant.status,
        isDeleted: merchant.isDeleted,
      },
    });
  } catch (error) {
    console.error("Recover Merchant Account Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to recover merchant account.",
      error: error.message,
    });
  }
};