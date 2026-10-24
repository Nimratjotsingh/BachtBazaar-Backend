import User from "../models/userModel.js";
import Merchant from "../models/merchantModel.js";
import MerchantShop from "../models/merchantShopModel.js";
import MerchantPersonalDoc from "../models/merchantPersonalDocModel.js";
import MerchantBusinessDoc from "../models/merchantBusinessDocModel.js";
import { ACCOUNT_TYPES } from "../constants/roles.js";

const imageMeta = (image) => ({
  uploaded: Boolean(image?.data),
  contentType: image?.contentType || null,
  img: image,
  
});

const sanitizeUser = (user) => {
  const userObj = user.toObject();
  delete userObj.password;

  userObj.profileImage = imageMeta(userObj.profileImage);
  return userObj;
};

const sanitizeMerchant = (merchant) => {
  const merchantObj = merchant.toObject();
  delete merchantObj.password;

  merchantObj.profileImage = imageMeta(merchantObj.profileImage);
  return merchantObj;
};

const buildPersonalDocPayload = (doc) => {
  if (!doc) return null;

  return {
    aadharNumber: doc.aadharNumber || null,
    panNumber: doc.panNumber || null,
    aadharImage: imageMeta(doc.aadharImage),
    panImage: imageMeta(doc.panImage),
  };
};

const buildBusinessDocPayload = (doc) => {
  if (!doc) return null;

  return {
    gstNumber: doc.gstNumber || null,
    gstImage: imageMeta(doc.gstImage),
    tradeLicenseNumber: doc.tradeLicenseNumber || null,
    tradeLicenseImage: imageMeta(doc.tradeLicenseImage),
    shopRegistrationNumber: doc.shopRegistrationNumber || null,
    shopRegistrationImage: imageMeta(doc.shopRegistrationImage),
    fssaiNumber: doc.fssaiNumber || null,
    fssaiImage: imageMeta(doc.fssaiImage),
    panNumber: doc.panNumber || null,
    panImage: imageMeta(doc.panImage),
  };
};

export const getProfileUser = async (req, res) => {
 
  try {
    
      const user = await User.findById(req.user._id).select("-password");
      if (!user) return res.status(404).json({ message: "User not found" });

      return res.json({
        success: true,
        accountType: ACCOUNT_TYPES.USER,
        profile: sanitizeUser(user),
      });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Failed to fetch profile" });
  }
};

import MerchantEditRequest from "../models/MerchantEditRequestModel.js"; // Make sure to import this model

export const getProfileMerchant = async (req, res) => {
  try {
    // Determine the correct merchant ID from authentication middleware (req.auth?.id or req.merchant?._id)
    const merchantId = req.auth?.id || req.merchant?._id;

    if (!merchantId) {
      return res.status(401).json({ success: false, message: "Unauthorized merchant request." });
    }

    // Fetch merchant, shop, docs, and latest edit request in parallel
    const [merchant, shop, personalDoc, businessDoc, latestEditRequest] = await Promise.all([
      Merchant.findById(merchantId).select("-password"),
      MerchantShop.findOne({ merchantId }),
      MerchantPersonalDoc.findOne({ merchantId }),
      MerchantBusinessDoc.findOne({ merchantId }),
      MerchantEditRequest.findOne({ merchantId }).sort({ createdAt: -1 }).lean(), // Gets the most recent edit request
    ]);

    if (!merchant) {
      return res.status(404).json({ success: false, message: "Merchant not found" });
    }

    const documentStatus = {
      aadhar: personalDoc?.aadharImage?.data ? "uploaded" : "missing",
      pan:
        personalDoc?.panImage?.data || businessDoc?.panImage?.data
          ? "uploaded"
          : "missing",
      gst: businessDoc?.gstImage?.data ? "uploaded" : "missing",
      tradeLicense: businessDoc?.tradeLicenseImage?.data
        ? "uploaded"
        : "missing",
      shopRegistration: businessDoc?.shopRegistrationImage?.data
        ? "uploaded"
        : "missing",
      fssai: businessDoc?.fssaiImage?.data ? "uploaded" : "missing",
      udyam: personalDoc?.udhyamImage?.data || businessDoc?.udhyamImage?.data ? "uploaded" : "missing",
    };

    return res.json({
      success: true,
      accountType: ACCOUNT_TYPES.MERCHANT,
      profile: {
        merchant: sanitizeMerchant(merchant),
        shop,
        personalDocuments: buildPersonalDocPayload(personalDoc),
        businessDocuments: buildBusinessDocPayload(businessDoc),
        documentStatus,
        adminVerification: {
          isVerified: Boolean(merchant.isVerified),
          blueTickStatus: merchant.blueTickStatus,
          blueTickReason: merchant.blueTickReason,
        },
        // --- Added Merchant Edit Request Status Tracking ---
        editRequestStatus: latestEditRequest ? {
          requestId: latestEditRequest._id,
          status: latestEditRequest.status, // "pending", "allowed", "rejected", "consumed"
          targetModel: latestEditRequest.targetModel,
          adminNotes: latestEditRequest.adminNotes,
          createdAt: latestEditRequest.createdAt,
          reviewedAt: latestEditRequest.reviewedAt,
        } : {
          status: "not_applied", // Fallback if no edit request has ever been made
        },
      },
    });
  } catch (error) {
    console.error("Get Profile Merchant Error:", error);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while loading profile data.",
      error: error.message,
    });
  }
};