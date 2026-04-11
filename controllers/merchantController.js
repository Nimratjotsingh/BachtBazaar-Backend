import Merchant from "../models/merchantModel.js";
import bcrypt from "bcryptjs";
import admin from "../config/firebase.js";
import { generateToken } from "../utils/generateToken.js";
import {
  phoneSchema,
  passwordSchema,
  updateMerchantProfileSchema,
  loginPasswordSchema,
  updateShopProfileSchema
} from "../validators/appValidator.js";
import { validate, ValidationError } from "../validators/validate.js";
import axios from "axios";

const sanitizeMerchant = (merchant) => {
  const merchantObj = merchant.toObject();
  delete merchantObj.password;
  return merchantObj;
};

const handleValidation = (res, error, defaultMessage) => {
  if (error instanceof ValidationError) {
    return res.status(400).json({ message: error.message });
  }

  console.log(error);
  return res.status(500).json({ message: defaultMessage });
};


//format phone
const formatPhone = (phone) => {
  if (!phone) return phone;

  phone = phone.trim();

  if (!phone.startsWith("+91")) {
    phone = "+91" + phone;
  }

  return phone;
};

// send OTP
export const sendOtp = async (req, res) => {
  try {
    const { phone } = validate(phoneSchema, req.body);
    const formattedPhone = formatPhone(phone);

    const merchant = await Merchant.findOne({ phone: formattedPhone });

    res.json({
      success: true,
      exists: !!merchant
    });
  } catch (error) {
    return handleValidation(res, error, "Error sending OTP");
  }
};


// verify OTP
export const verifyOtp = async (req, res) => {
  try {
    const { token } = req.body;

    const decoded = await admin.auth().verifyIdToken(token);
    const phone = formatPhone(decoded.phone_number);

    let merchant = await Merchant.findOne({ phone });

    if (!merchant) {
      merchant = await Merchant.create({
        phone,
        isVerified: true
      });
    }

    const jwtToken = generateToken(merchant._id);

    res.json({
      success: true,
      token: jwtToken,
      merchant: sanitizeMerchant(merchant)
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

    const merchant = await Merchant.findById(req.merchant._id);
    if (!merchant) {
      return res.status(404).json({ message: "Merchant not found" });
    }

    merchant.password = await bcrypt.hash(password, 10);
    await merchant.save();

    res.json({ success: true });

  } catch (error) {
    return handleValidation(res, error, "Error setting password");
  }
};


// login with password
export const loginWithPassword = async (req, res) => {
  try {
    const { phone, password } = validate(loginPasswordSchema, req.body);

    const formattedPhone = formatPhone(phone);

    const merchant = await Merchant.findOne({ phone: formattedPhone });

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

    const token = generateToken(merchant._id);

    res.json({
      success: true,
      token,
      merchant: sanitizeMerchant(merchant)
    });

  } catch (error) {
    return handleValidation(res, error, "Login error");
  }
};


// login with OTP
export const loginWithOtp = async (req, res) => {
  try {
    const { token } = req.body;

    const decoded = await admin.auth().verifyIdToken(token);
    const phone = formatPhone(decoded.phone_number);

    const merchant = await Merchant.findOne({ phone });

    if (!merchant) {
      return res.status(404).json({ message: "Merchant not found" });
    }

    const jwtToken = generateToken(merchant._id);

    res.json({
      success: true,
      token: jwtToken,
      merchant: sanitizeMerchant(merchant)
    });

  } catch (error) {
    console.log("error login-otp", error.message);
    res.status(401).json({ message: "OTP login failed" });
  }
};


// forgot password (OTP)
export const forgotPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const decoded = await admin.auth().verifyIdToken(token);
    const phone = formatPhone(decoded.phone_number);

    const merchant = await Merchant.findOne({ phone });

    if (!merchant) {
      return res.status(404).json({ message: "Merchant not found" });
    }

    merchant.password = await bcrypt.hash(newPassword, 10);
    await merchant.save();

    res.json({
      success: true,
      message: "Password reset successful"
    });

  } catch (error) {
    console.log("error forgot-password", error.message);
    res.status(500).json({ message: "Reset failed" });
  }
};


// update password
export const updatePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    const merchant = await Merchant.findById(req.merchant._id);

    if (!merchant || !merchant.password) {
      return res.status(404).json({ message: "Merchant not found" });
    }

    const isMatch = await bcrypt.compare(oldPassword, merchant.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Old password incorrect" });
    }

    merchant.password = await bcrypt.hash(newPassword, 10);
    await merchant.save();

    res.json({
      success: true,
      message: "Password updated"
    });

  } catch (error) {
    console.log("error update-password", error.message);
    res.status(500).json({ message: "Update failed" });
  }
};


// ================= PROFILE =================

// update profile
export const updateProfile = async (req, res) => {
  try {
    const validatedData = validate(updateMerchantProfileSchema, req.body);
    const merchant = await Merchant.findById(req.merchant._id);

    if (!merchant) {
      return res.status(404).json({ message: "Merchant not found" });
    }

    const { name, gender, city, phone, email } = validatedData;

    merchant.name = name || merchant.name;
    merchant.gender = gender || merchant.gender;
    merchant.city = city || merchant.city;

    if (phone) {
      merchant.phone = formatPhone(phone);
    }

    merchant.email = email || merchant.email;

    if (req.file) {
      merchant.profileImage = `/uploads/${req.file.filename}`;
    }

    const updatedMerchant = await merchant.save();

    res.json({
      success: true,
      merchant: updatedMerchant
    });

  } catch (error) {
    console.log("error update-profile", error.message);
    res.status(500).json({ message: "Profile update failed" });
  }
};


// upload personal docs
export const uploadDocuments = async (req, res) => {
  try {
    const merchant = await Merchant.findById(req.merchant._id);
    if (!merchant) return res.status(404).json({ message: "Merchant not found" });

    const { aadharNumber, panNumber, name, dob } = req.body;

    const aadharImage = req.files?.aadharImage?.[0]?.filename;
    const panImage = req.files?.panImage?.[0]?.filename;

    const hasAadhar = aadharNumber && aadharImage;
    const hasPan = panNumber && panImage && name && dob;

    if (!hasAadhar && !hasPan) {
      return res.status(400).json({
        message: "Provide Aadhaar OR PAN"
      });
    }

    const docs = merchant.personalDocs || {};

    if (hasAadhar) {
      docs.aadharNumber = aadharNumber;
      docs.aadharImage = `/uploads/${aadharImage}`;
    }

    if (hasPan) {
      const pan = panNumber.toUpperCase();

      const panRes = await verifyPanWithCashfree(pan, name, dob);

      if (panRes.status !== "VALID") {
        return res.status(400).json({ message: "Invalid PAN" });
      }

      docs.panNumber = pan;
      docs.panImage = `/uploads/${panImage}`;
    }

    merchant.personalDocs = docs;
    await merchant.save();

    res.json({ success: true });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Upload failed" });
  }
};


// ================= BUSINESS =================

//business docs
export const uploadBusinessDocuments = async (req, res) => {
  try {
    const merchant = await Merchant.findById(req.merchant._id);
    if (!merchant) return res.status(404).json({ message: "Merchant not found" });

    const shop = merchant.shop || {};
    const docs = shop.businessDocs || {};

    const gstImage = req.files?.gstImage?.[0]?.filename;

    if (gstImage) {
      docs.gstImage = `/uploads/${gstImage}`;
    }

    shop.businessDocs = docs;
    merchant.shop = shop;

    await merchant.save();

    res.json({ success: true });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Upload failed" });
  }
};


// update shop profile
export const updateShopProfile = async (req, res) => {
  try {
    const merchant = await Merchant.findById(req.merchant._id);
    if (!merchant) return res.status(404).json({ message: "Merchant not found" });

    const data = validate(updateShopProfileSchema, req.body);
    const shop = merchant.shop || {};

    Object.assign(shop, data);

    merchant.shop = shop;
    await merchant.save();

    res.json({ success: true, shop });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Update failed" });
  }
};


export const verifyPanWithCashfree = async (pan, name, dob) => {
  const response = await axios.post(
    "https://sandbox.cashfree.com/verification/pan-lite",
    {
      verification_id: "ver_" + Date.now(),
      pan,
      name,
      dob
    },
    {
      headers: {
        "x-client-id": process.env.CASHFREE_CLIENT_ID,
        "x-client-secret": process.env.CASHFREE_SECRET_KEY
      }
    }
  );

  return response.data;
};