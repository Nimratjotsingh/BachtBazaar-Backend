import Merchant from "../models/merchantModel.js"
import bcrypt from "bcryptjs";
import admin from "../config/firebase.js";
import { generateToken } from "../utils/generateToken.js";
import { phoneSchema } from "../validators/appValidator.js";
import { merchantPasswordSchema } from "../validators/appValidator.js";
import { updateMerchantProfileSchema } from "../validators/appValidator.js";
import { loginPasswordSchema } from "../validators/appValidator.js";
import { updateShopProfileSchema } from "../validators/appValidator.js";
import { validate } from "../validators/validate.js";
import axios from "axios";


// check merchant exists (before otp)
export const sendOtp = async (req, res) => {

  try {
    const { phone } = validate(phoneSchema, req.body);
    const merchant = await Merchant.findOne({ phone });

    res.json({
      success: true,
      exists: !!merchant
    });
  } catch (error) {
    console.log("error send-otp", error.message)
    res.status(500).json({ message: "Error sending OTP" })
  }


};

// verify otp (firebase)
export const verifyOtp = async (req, res) => {
  try {
    const { token } = req.body;

    const decoded = await admin.auth().verifyIdToken(token);
    const phone = decoded.phone_number;

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
      merchant
    });
  } catch (error) {
    console.log("error verify-otp", error.message)
    res.status(401).json({ message: "Invalid OTP" });
  }
};

// set password (signup complete)
export const setPassword = async (req, res) => {
  try {
    const { merchantId, password } = validate(merchantPasswordSchema, req.body);

    const hashed = await bcrypt.hash(password, 10);

    await Merchant.findByIdAndUpdate(merchantId, {
      password: hashed
    });

    res.json({ success: true });

  } catch (error) {
    console.log("error set-password", error.message)
    res.status(500).json({ message: "Error setting password" });
  }
};

// login with password
export const loginWithPassword = async (req, res) => {
  try {

    const { phone, password } = validate(loginPasswordSchema, req.body)

    const merchant = await Merchant.findOne({ phone });

    if (!merchant) {
      return res.status(404).json({ message: "Merchant not found" });
    }

    const isMatch = await bcrypt.compare(password, merchant.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = generateToken(merchant._id);

    res.json({
      success: true,
      token,
      merchant
    });

  } catch (error) {
    console.log("error login-password", error.message)

    res.status(500).json({ message: "Login error" });
  }
};

// login with otp
export const loginWithOtp = async (req, res) => {
  try {
    const { token } = req.body;

    const decoded = await admin.auth().verifyIdToken(token);
    const phone = decoded.phone_number;

    const merchant = await Merchant.findOne({ phone });

    if (!merchant) {
      return res.status(404).json({ message: "Merchant not found" });
    }

    const jwtToken = generateToken(merchant._id);

    res.json({
      success: true,
      token: jwtToken,
      merchant
    });

  } catch (error) {
    console.log("error login-otp", error.message)

    res.status(401).json({ message: "OTP login failed" });
  }
};

// upload user documents
export const uploadDocuments = async (req, res) => {
  try {
    const merchantId = req.merchant._id;

    const merchant = await Merchant.findById(merchantId);
    if (!merchant) {
      return res.status(404).json({ message: "Merchant not found" });
    }

    const { aadharNumber, panNumber, name, dob } = req.body;

    const aadharImage = req.files?.aadharImage?.[0]?.filename;
    const panImage = req.files?.panImage?.[0]?.filename;

    // check one 
    const hasAadhar = aadharNumber && aadharImage;
    const hasPan = panNumber && panImage && name && dob;

    if (!hasAadhar && !hasPan) {
      return res.status(400).json({
        message: "Provide either Aadhaar OR PAN with required details"
      });
    }

    const docs = merchant.personalDocs || {};

    // aadhar
    if (hasAadhar) {
      if (!/^[0-9]{12}$/.test(aadharNumber)) {
        return res.status(400).json({ message: "Invalid Aadhaar number" });
      }

      docs.aadharNumber = aadharNumber;
      docs.aadharImage = `/uploads/${aadharImage}`;
      docs.aadharVerified = false;
    }

    // pan cashfree 
    if (hasPan) {
      const pan = panNumber.toUpperCase();

      if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan)) {
        return res.status(400).json({ message: "Invalid PAN format" });
      }

      const panRes = await verifyPanWithCashfree(pan, name, dob);

      if (panRes.status !== "VALID") {
        return res.status(400).json({ message: "Invalid PAN" });
      }

      if (panRes.name_match !== "Y") {
        return res.status(400).json({
          message: "Name does not match PAN"
        });
      }

      docs.panNumber = pan;
      docs.panImage = `/uploads/${panImage}`;
      docs.panVerified = true;
      docs.panName = panRes.name || name;
    }

    merchant.personalDocs = docs;

    // Optional kyc status
    merchant.kycStatus = hasPan ? "verified" : "pending";

    await merchant.save();

    res.json({
      success: true,
      message: "Documents processed successfully",
      personalDocs: merchant.personalDocs,
      kycStatus: merchant.kycStatus
    });

  } catch (error) {
    console.log("error upload-documents", error.message);
    res.status(500).json({ message: "Upload documents failed" });
  }
};

const verifyPanWithCashfree = async (pan, name, dob) => {
  try {
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
          "x-client-secret": process.env.CASHFREE_SECRET_KEY,
          "Content-Type": "application/json"
        }
      }
    );

    return response.data;

  } catch (error) {
    console.log("cashfree pan error", error.response?.data || error.message);
    throw new Error("PAN verification failed");
  }
};

// Update profile 
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
    merchant.phone = phone || merchant.phone;
    merchant.email = email || merchant.email

    // image
    if (req.file) {
      merchant.profileImage = `/uploads/${req.file.filename}`;
    }

    const updatedMerchant = await merchant.save();

    res.json({
      success: true,
      merchant: updatedMerchant
    });

  } catch (error) {
    console.log("error update-profile", error.message)
    res.status(500).json({ message: "Profile update failed" });
  }
};


// Upload business documents
export const uploadBusinessDocuments = async (req, res) => {
  try {
    const merchantId = req.merchant._id;

    const merchant = await Merchant.findById(merchantId);
    if (!merchant) {
      return res.status(404).json({ message: "Merchant not found" });
    }

    const {
      gstNumber,
      tradeLicenseNumber,
      shopRegistrationNumber,
      fssaiNumber
    } = req.body;


    const gstImage = req.files?.gstImage?.[0]?.filename;
    const tradeLicenseImage = req.files?.tradeLicenseImage?.[0]?.filename;
    const shopRegistrationImage = req.files?.shopRegistrationImage?.[0]?.filename;
    const fssaiImage = req.files?.fssaiImage?.[0]?.filename;


    if (
      !gstNumber &&
      !tradeLicenseNumber &&
      !shopRegistrationNumber &&
      !fssaiNumber &&
      !gstImage &&
      !tradeLicenseImage &&
      !shopRegistrationImage &&
      !fssaiImage
    ) {
      return res.status(400).json({
        message: "Provide at least one business document"
      });
    }


    if (gstNumber && !gstImage) {
      return res.status(400).json({ message: "GST image required" });
    }

    if (tradeLicenseNumber && !tradeLicenseImage) {
      return res.status(400).json({ message: "Trade license image required" });
    }

    if (shopRegistrationNumber && !shopRegistrationImage) {
      return res.status(400).json({ message: "Shop registration image required" });
    }

    if (fssaiNumber && !fssaiImage) {
      return res.status(400).json({ message: "FSSAI image required" });
    }


    if (gstNumber && gstNumber.length < 10) {
      return res.status(400).json({ message: "Invalid GST number" });
    }

    if (fssaiNumber && !/^[0-9]{14}$/.test(fssaiNumber)) {
      return res.status(400).json({ message: "Invalid FSSAI number" });
    }


    const shop = merchant.shop || {};
    const docs = shop.businessDocs || {};


    if (gstNumber) {
      docs.gstNumber = gstNumber;
      docs.gstImage = `/uploads/${gstImage}`;
    }

    if (tradeLicenseNumber) {
      docs.tradeLicenseNumber = tradeLicenseNumber;
      docs.tradeLicenseImage = `/uploads/${tradeLicenseImage}`;
    }

    if (shopRegistrationNumber) {
      docs.shopRegistrationNumber = shopRegistrationNumber;
      docs.shopRegistrationImage = `/uploads/${shopRegistrationImage}`;
    }

    if (fssaiNumber) {
      docs.fssaiNumber = fssaiNumber;
      docs.fssaiImage = `/uploads/${fssaiImage}`;
    }

    shop.businessDocs = docs;
    merchant.shop = shop;

    await merchant.save();

    res.json({
      success: true,
      message: "Business documents uploaded successfully",
      businessDocs: merchant.shop.businessDocs
    });

  } catch (error) {
    console.log("error upload-business-documents", error.message);
    res.status(500).json({ message: "Upload business documents failed" });
  }
};


//9 Update business profile


//Frontend should send this format

// shopName: Honey Cafe
// category: restaurant
// subCategory: cafe
// address: Model Town
// city: Ludhiana
// description: Best coffee in town
// phone: 9237048242
// logoImage: (file)
// shopBannerImage: (file)

// openingHours: {
//   "monday": { "open": "09:00", "close": "22:00" },
//   "tuesday": { "open": "09:00", "close": "22:00" }
// }

export const updateShopProfile = async (req, res) => {
  try {
    const merchantId = req.merchant._id;

    const merchant = await Merchant.findById(merchantId);

    if (!merchant) {
      return res.status(404).json({ message: "Merchant not found" });
    }

    const validatedData = validate(updateShopProfileSchema, req.body);

    const {
      shopName,
      category,
      subCategory,
      address,
      city,
      phone,
      description,
      openingHours
    } = validatedData;

    const logo = req.files?.logoImage?.[0]?.filename;
    const banner = req.files?.shopBannerImage?.[0]?.filename;

    const shop = merchant.shop || {};

    if (shopName) shop.shopName = shopName;
    if (category) shop.category = category;
    if (subCategory) shop.subCategory = subCategory;
    if (address) shop.address = address;
    if (city) shop.city = city;
    if (description) shop.description = description;
    if (phone) shop.phone = phone;


    //images
    if (logo) {
      shop.logo = `/uploads/${logo}`;
    }

    if (banner) {
      shop.banner = `/uploads/${banner}`;
    }

    if (openingHours) {
      try {

        const parsed = typeof openingHours === "string"
          ? JSON.parse(openingHours)
          : openingHours;

        shop.openingHours = parsed;
      } catch (err) {
        return res.status(400).json({
          message: "Invalid opening hours format"
        });
      }
    }

    merchant.shop = shop;

    await merchant.save();

    res.json({
      success: true,
      shop: merchant.shop
    });

  } catch (error) {
    console.log("error update-shop-profile", error.message);

    res.status(500).json({
      message: "Update shop profile failed"
    });
  }
};