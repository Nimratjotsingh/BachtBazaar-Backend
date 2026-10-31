import MerchantShop from "../models/merchantShopModel.js";
import MerchantPersonalDoc from "../models/merchantPersonalDocModel.js";
import MerchantBusinessDoc from "../models/merchantBusinessDocModel.js";
import mongoose from 'mongoose'
import MerchantVerificationLog from "../models/MerchantVerificationLogModel.js";

// List all merchants (with pagination, search, filters)
export const listMerchants = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = "", 
      role, 
      isVerified, 
      status, 
      plan, 
      city 
    } = req.query;

    const query = { isDeleted: { $ne: true } }; // Exclude soft-deleted entities if applicable

    // 1. Role Filtering Strategy
    if (role) {
      query.role = role;
    }

    // 2. Legacy Verification Flag Handling
    if (isVerified !== undefined) {
      query.isVerified = isVerified === "true";
    }

    // 3. Status Filters (unverified, verified, pending, rejected)
    if (status) {
      query.status = status.toLowerCase().trim();
    }

    // 4. Membership Plan Tier Selection Filters
    if (plan) {
      query.plan = { $regex: `^${plan.trim()}$`, $options: "i" };
    }

    // 5. City Bounds Selection Filters
    if (city) {
      query.city = { $regex: `^${city.trim()}$`, $options: "i" };
    }

    // 6. Cross-Field Regular Expression Search Block
    if (search && search.trim() !== "") {
      const cleanSearch = search.trim();
      query.$or = [
        { name: { $regex: cleanSearch, $options: "i" } },
        { phone: { $regex: cleanSearch, $options: "i" } },
        { email: { $regex: cleanSearch, $options: "i" } },
        { business_type: { $regex: cleanSearch, $options: "i" } } // Matches on category names dynamically
      ];
    }

    // 7. Execute Database Pagination Tasks
    const parsedLimit = Math.max(1, Number(limit));
    const parsedPage = Math.max(1, Number(page));

    const total = await Merchant.countDocuments(query);
    const merchants = await Merchant.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit);

    return res.json({ 
      success: true, 
      merchants, 
      total, 
      page: parsedPage, 
      pages: Math.ceil(total / parsedLimit) 
    });

  } catch (error) {
    console.error("Master listing compilation breaking exception:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to compile running records stream data lists matching target filter queries." 
    });
  }
};

// Get merchant details
const convertToBase64 = (file) => {
  if (!file || !file.data) return null;
  return `data:${file.contentType};base64,${file.data.toString("base64")}`;
};

// Helper to convert Mongoose buffer image schema to base64 data URI string
const formatBufferImage = (imageObj) => {
  if (!imageObj || !imageObj.data) return "";
  try {
    const buffer = Buffer.isBuffer(imageObj.data) 
      ? imageObj.data 
      : Buffer.from(imageObj.data.buffer || imageObj.data);
    const contentType = imageObj.contentType || "image/jpeg";
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch (e) {
    console.error("Buffer image conversion error:", e);
    return "";
  }
};

export const getAdminShopDetailById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Shop ID parameter is required.",
      });
    }

    // 1. Fetch shop and populate associated master references
    const shop = await MerchantShop.findById(id)
      .populate({
        path: "merchantId",
        select: "-password -tokens -otp -__v",
      })
      .populate("categoryId", "label description icon")
      .populate("subCategoryId", "label description")
      .lean();

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Merchant shop record not found.",
      });
    }

    // 2. Fetch merchant verification logs if merchantId exists
    let verificationLogs = [];
    const merchantId = shop.merchantId?._id || shop.merchantId;
    if (merchantId) {
      verificationLogs = await MerchantVerificationLog.find({ merchantId })
        .sort({ createdAt: -1 })
        .lean();
    }

    // 3. Robustly format opening hours for all 7 days of the week
    const standardDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    const formattedOpeningHours = {};

    standardDays.forEach((day) => {
      let dayData = null;

      if (shop.openingHours) {
        if (shop.openingHours instanceof Map || typeof shop.openingHours.get === "function") {
          dayData = shop.openingHours.get(day);
        } else if (typeof shop.openingHours === "object") {
          dayData = shop.openingHours[day];
        }
      }

      formattedOpeningHours[day] = {
        open: dayData?.open || "09:00",
        close: dayData?.close || "21:00",
        isClosed: dayData?.isClosed ?? (dayData ? false : true),
      };
    });

    // 4. Compute live open status
    const shopDoc = new MerchantShop(shop);
    const liveStatus = shopDoc.calculateIsOpen(new Date());

    // 5. Construct unified response payload with base64 images and verification logs
    return res.status(200).json({
      success: true,
      message: "Merchant shop dossier and verification logs retrieved successfully.",
      data: {
        shopInfo: {
          _id: shop._id,
          shopName: shop.shopName || "Unnamed Store",
          address: shop.address || "",
          address1: shop.address1 || "",
          city: shop.city || "",
          coordinates: {
            latitude: shop.latitude || null,
            longitude: shop.longitude || null,
          },
          visibilityRadiusKm: shop.visibilityRadiusKm || 15,
          description: shop.description || "",
          phone: shop.phone || "",
          // --- CONVERTED BUFFER IMAGES TO BASE64 STRINGS ---
          logoUrl: formatBufferImage(shop.logo),
          bannerUrl: formatBufferImage(shop.banner),
          storeFrontUrl: formatBufferImage(shop.storeFront),
        },
        taxonomy: {
          category: shop.categoryId || null,
          subCategory: shop.subCategoryId || null,
        },
        operationalStatus: {
          isOpenNow: liveStatus.isOpen,
          reason: liveStatus.reason,
          isManualOverride: liveStatus.isManualOverride,
          manualOverrideConfig: shop.manualOverride || { status: "AUTO" },
          weeklySchedule: formattedOpeningHours,
        },
        merchantProfile: shop.merchantId || null,
        verificationLogs: verificationLogs, // Attached merchant verification records
        timestamps: {
          createdAt: shop.createdAt,
          updatedAt: shop.updatedAt,
        },
      },
    });

  } catch (error) {
    console.error("Admin Get Shop Detail Error:", error);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while retrieving shop details.",
      error: error.message,
    });
  }
};

export const getMerchant = async (req, res) => {
  try {
    const { id } = req.params;

    const [merchant, shop, personalDocs, businessDocs] = await Promise.all([
      Merchant.findById(id).select("-password"),

      MerchantShop.findOne({ merchantId: id })
        .populate("categoryId", "label")
        .populate("subCategoryId", "label"),

      MerchantPersonalDoc.findOne({ merchantId: id }),

      MerchantBusinessDoc.findOne({ merchantId: id })
    ]);

    if (!merchant) {
      return res.status(404).json({ success: false, message: "Merchant not found" });
    }

    // 🔥 Convert images to base64
    

    return res.json({
      success: true,
      data: {
        profile: merchant,
        shop: shop || null,
        documents: {
          personal: personalDocs || null,
          business: businessDocs || null
        },
        kycStatus: {
          personal: !!personalDocs,
          business: !!businessDocs,
          shop: !!shop
        }
      }
    });

  } catch (error) {
    console.error("Get Merchant Full Data Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load complete merchant data"
    });
  }
};



// Update merchant info
import { updateMerchantProfileSchema } from "../validators/appValidator.js";
export const updateMerchant = async (req, res) => {
  try {
    const updates = validate(updateMerchantProfileSchema, req.body);
    const { id } = req.params;
    const merchant = await Merchant.findByIdAndUpdate(id, updates, { new: true }).select("-password");
    if (!merchant) return res.status(404).json({ message: "Merchant not found" });
    return res.json({ success: true, message: "Merchant updated", merchant });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: "Failed to update merchant" });
  }
};

export const updateMerchantBlueTick = async (req, res) => {
  try {
    const { merchantId } = req.params;
    const { isBlueTickEnabled, blueTickStatus, blueTickReason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(merchantId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Merchant ID parameter format.",
      });
    }

    const merchant = await Merchant.findOne({ _id: merchantId, isDeleted: false });
    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: "Merchant profile not found or account has been deleted.",
      });
    }

    // --- 1. HANDLE BLUE TICK STATUS & REASON UPDATE (IF PROVIDED) ---
    if (blueTickStatus !== undefined && blueTickStatus !== null) {
      const allowedStatuses = ["not applied", "pending", "completed", "rejected"];
      const cleanStatus = String(blueTickStatus).toLowerCase().trim();

      if (!allowedStatuses.includes(cleanStatus)) {
        return res.status(400).json({
          success: false,
          message: `Invalid blue tick status value. Allowed: ${allowedStatuses.join(", ")}.`,
        });
      }

      merchant.blueTickStatus = cleanStatus;

      // Automatically sync boolean flag & reason based on status
      if (cleanStatus === "completed") {
        merchant.isBlueTickEnabled = true;
        merchant.blueTickReason = null; // Clear rejection reason upon approval
      } else if (cleanStatus === "rejected") {
        merchant.isBlueTickEnabled = false;
        merchant.blueTickReason = blueTickReason ? String(blueTickReason).trim() : "Blue tick verification request rejected by admin.";
      } else {
        merchant.isBlueTickEnabled = false;
        if (blueTickReason !== undefined) {
          merchant.blueTickReason = blueTickReason ? String(blueTickReason).trim() : null;
        }
      }
    } 
    // --- 2. FALLBACK TO LEGACY BOOLEAN TOGGLE (IF STATUS NOT PROVIDED) ---
    else if (isBlueTickEnabled !== undefined && isBlueTickEnabled !== null) {
      let targetStatus;
      if (typeof isBlueTickEnabled === "string") {
        targetStatus = isBlueTickEnabled.toLowerCase() === "true";
      } else {
        targetStatus = Boolean(isBlueTickEnabled);
      }

      merchant.isBlueTickEnabled = targetStatus;
      merchant.blueTickStatus = targetStatus ? "completed" : "not applied";
      if (!targetStatus) {
        merchant.blueTickReason = null;
      }
    } 
    // --- 3. DEFAULT TOGGLE BEHAVIOR ---
    else {
      const targetStatus = !merchant.isBlueTickEnabled;
      merchant.isBlueTickEnabled = targetStatus;
      merchant.blueTickStatus = targetStatus ? "completed" : "not applied";
      if (!targetStatus) {
        merchant.blueTickReason = null;
      }
    }

    await merchant.save();

    return res.status(200).json({
      success: true,
      message: merchant.isBlueTickEnabled
        ? `Verified blue tick badge granted to ${merchant.name || "merchant"}.`
        : `Verified blue tick status updated to '${merchant.blueTickStatus}' for ${merchant.name || "merchant"}.`,
      data: {
        _id: merchant._id,
        name: merchant.name,
        phone: merchant.phone,
        email: merchant.email,
        isVerified: merchant.isVerified,
        isBlueTickEnabled: merchant.isBlueTickEnabled,
        blueTickStatus: merchant.blueTickStatus,
        blueTickReason: merchant.blueTickReason,
        status: merchant.status,
      },
    });
  } catch (error) {
    console.error("Update Merchant Blue Tick Error:", error);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while updating the verification badge.",
      error: error.message,
    });
  }
};

// Verify/Reject merchant
export const verifyMerchant = async (req, res) => {
  try {
    const { id } = req.params;
    const { isVerified } = req.body;

    if (typeof isVerified !== "boolean") {
      return res.status(400).json({ message: "isVerified must be boolean" });
    }

    // Dynamically set the status string based on the boolean value
    const status = isVerified ? "verified" : "unverified";

    // Update both isVerified and status fields
    const merchant = await Merchant.findByIdAndUpdate(
      id, 
      { isVerified, status }, 
      { new: true }
    ).select("-password");

    if (!merchant) {
      return res.status(404).json({ message: "Merchant not found" });
    }

    return res.json({ 
      success: true, 
      message: isVerified ? "Merchant verified" : "Merchant unverified", 
      merchant 
    });

  } catch (error) {
    return res.status(500).json({ message: "Failed to verify merchant" });
  }
};

// Ban/Unban merchant (status field required in model)
export const updateMerchantStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status || !["active", "banned"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    const merchant = await Merchant.findByIdAndUpdate(id, { status }, { new: true }).select("-password");
    if (!merchant) return res.status(404).json({ message: "Merchant not found" });
    return res.json({ success: true, message: `Merchant ${status === "banned" ? "banned" : "unbanned"}`, merchant });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update merchant status" });
  }
};

// Block/Unblock merchant (using isBlocked boolean)
export const blockMerchant = async (req, res) => {
  try {
    const { id } = req.params;
    const { isBlocked } = req.body;

    if (typeof isBlocked !== "boolean") {
      return res.status(400).json({ message: "isBlocked must be a boolean" });
    }

    const merchant = await Merchant.findByIdAndUpdate(
      id, 
      { isBlocked }, 
      { new: true }
    ).select("-password");

    if (!merchant) return res.status(404).json({ message: "Merchant not found" });

    return res.json({ 
      success: true, 
      message: isBlocked ? "Merchant blocked" : "Merchant unblocked", 
      merchant 
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update block status" });
  }
};

// Reject merchant (using status enum)
export const rejectMerchant = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validating against your specific model enum
    if (!["unverified", "verified", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status. Must be unverified, verified, or rejected." });
    }

    const merchant = await Merchant.findByIdAndUpdate(
      id, 
      { status }, 
      { new: true }
    ).select("-password");

    if (!merchant) return res.status(404).json({ message: "Merchant not found" });

    return res.json({ 
      success: true, 
      message: `Merchant status updated to ${status}`, 
      merchant 
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update merchant status" });
  }
};

// Delete merchant
export const deleteMerchant = async (req, res) => {
  try {
    const { id } = req.params;
    const merchant = await Merchant.findByIdAndDelete(id);
    if (!merchant) return res.status(404).json({ message: "Merchant not found" });
    return res.json({ success: true, message: "Merchant deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete merchant" });
  }
};


import User from "../models/userModel.js";
import Merchant from "../models/merchantModel.js";
import { z } from "zod";
import { validate, ValidationError } from "../validators/validate.js";
import { ROLES } from "../constants/roles.js";
import { updateUserProfileSchema } from "../validators/appValidator.js";

// List all users (with pagination, search, filters)
export const listUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", role, isVerified } = req.query;
    const query = {};
    if (role) query.role = role;
    if (isVerified !== undefined) query.isVerified = isVerified === "true";
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } }
      ];
    }
    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    return res.json({ success: true, users, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    return res.status(500).json({ message: "Failed to list users" });
  }
};

// Get user details
export const getUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json({ success: true, user });
  } catch (error) {
    return res.status(500).json({ message: "Failed to get user" });
  }
};

// Update user info
export const updateUser = async (req, res) => {
  try {
    const updates = validate(updateUserProfileSchema, req.body);
    const { id } = req.params;
    const user = await User.findByIdAndUpdate(id, updates, { new: true }).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json({ success: true, message: "User updated", user });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: "Failed to update user" });
  }
};

// Ban/Unban user (status field required in model)
export const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, bannedReason } = req.body; // Extracted bannedReason from request body

    if (!status || !["active", "banned"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    // Build the dynamic update payload
    let updateFields = { status };

    if (status === "banned") {
      updateFields.isVerified = false; // Demote verification status on ban
      updateFields.bannedReason = bannedReason?.trim() || "Violated platform community guidelines.";
    } else {
      // If switching back to active, strip out the historic restriction reason
      updateFields.bannedReason = null; 
    }

    // Update everything cleanly in a single execution block
    const user = await User.findByIdAndUpdate(
      id, 
      updateFields, 
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ 
      success: true, 
      message: `User successfully ${status === "banned" ? "banned" : "unbanned"}.`, 
      user 
    });

  } catch (error) {
    console.error("User Status Update Error:", error);
    return res.status(500).json({ message: "Failed to update user status" });
  }
};
// Delete user
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndUpdate(
      id,
      {
        isDeleted: true,
        deletedAt: new Date()
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      success: true,
      message: "User soft deleted"
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete user" });
  }
};

const updateUserRoleSchema = z.object({
  role: z.enum([ROLES.USER, ROLES.SUPER_ADMIN])
});

const updateMerchantRoleSchema = z.object({
  role: z.enum([ROLES.MERCHANT, ROLES.SUPER_ADMIN])
});

const bootstrapSchema = z.object({
  phone: z.string().regex(/^[0-9]{10}$/, "Invalid phone number"),
  accountType: z.enum(["user", "merchant"])
});

const formatPhone = (phone) => {
  const trimmed = phone.trim();
  return trimmed.startsWith("+91") ? trimmed : `+91${trimmed}`;
};

export const bootstrapSuperAdmin = async (req, res) => {
  try {
    const bootstrapSecret = process.env.BOOTSTRAP_ADMIN_SECRET;
    const providedSecret = req.headers["x-bootstrap-secret"];

    if (!bootstrapSecret) {
      return res.status(403).json({ message: "Bootstrap is disabled" });
    }

    if (!providedSecret || providedSecret !== bootstrapSecret) {
      return res.status(403).json({ message: "Invalid bootstrap secret" });
    }

    const { phone, accountType } = validate(bootstrapSchema, req.body);
    const formattedPhone = formatPhone(phone);

    if (accountType === "user") {
      const user = await User.findOneAndUpdate(
        { phone: formattedPhone },
        { role: ROLES.SUPER_ADMIN, isVerified: true },
        { returnDocument: 'after' }
      ).select("-password");

      if (!user) {
        return res.status(404).json({ message: "User not found for this phone" });
      }

      return res.json({ success: true, message: "User promoted to super_admin", user });
    }

    const merchant = await Merchant.findOneAndUpdate(
      { phone: formattedPhone },
      { role: ROLES.SUPER_ADMIN, isVerified: true },
      { new: true }
    ).select("-password");

    if (!merchant) {
      return res.status(404).json({ message: "Merchant not found for this phone" });
    }

    return res.json({ success: true, message: "Merchant promoted to super_admin", merchant });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ message: error.message });
    }
    console.log(error);
    return res.status(500).json({ message: "Failed to bootstrap super admin" });
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = validate(updateUserRoleSchema, req.body);

    const user = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      success: true,
      message: "User role updated",
      user
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ message: error.message });
    }
    console.log(error);
    return res.status(500).json({ message: "Failed to update user role" });
  }
};

export const updateMerchantRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = validate(updateMerchantRoleSchema, req.body);

    const merchant = await Merchant.findByIdAndUpdate(
      id,
      { role },
      { new: true, runValidators: true }
    ).select("-password");

    if (!merchant) {
      return res.status(404).json({ message: "Merchant not found" });
    }

    return res.json({
      success: true,
      message: "Merchant role updated",
      merchant
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ message: error.message });
    }
    console.log(error);
    return res.status(500).json({ message: "Failed to update merchant role" });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    // We use Promise.all to run both counts in parallel for better performance
    const [userCount, merchantCount] = await Promise.all([
      User.countDocuments({}), // Assuming you have isActive field
      Merchant.countDocuments({}) 
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalUsers: userCount.toLocaleString(), // Formats as 12,840
        totalMerchants: merchantCount.toLocaleString(),
        // You can add more metrics here later (e.g. totalSales, totalOrders)
      }
    });
  } catch (error) {
    console.error("Dashboard Stats Error:", error.message);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch dashboard statistics" 
    });
  }
};

import SuperAdmin from "../models/adminModel.js"; // Match your actual model name

export const savePushSubscription = async (req, res) => {
  try {
    const subscription = req.body;
    // Handle all variations of req user/admin object structures
    const adminId = req.admin?._id || req.user?._id || req.user?.id || req.admin?.id;

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ success: false, message: "Invalid subscription payload." });
    }

    if (!adminId) {
      return res.status(401).json({ success: false, message: "Unauthorized: Admin ID not found in request." });
    }

    const admin = await SuperAdmin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ success: false, message: "Super Admin not found." });
    }

    // Initialize array if undefined
    if (!admin.pushSubscriptions) {
      admin.pushSubscriptions = [];
    }

    // Check if subscription already exists to avoid duplicates
    const exists = admin.pushSubscriptions.some(sub => sub.endpoint === subscription.endpoint);
    if (!exists) {
      admin.pushSubscriptions.push(subscription);
      await admin.save();
    }

    return res.status(200).json({ success: true, message: "Push subscription saved successfully." });
  } catch (error) {
    console.error("Save Push Subscription Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};