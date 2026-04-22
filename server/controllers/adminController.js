import MerchantShop from "../models/merchantShopModel.js";
import MerchantPersonalDoc from "../models/merchantPersonalDocModel.js";
import MerchantBusinessDoc from "../models/merchantBusinessDocModel.js";

// List all merchants (with pagination, search, filters)
export const listMerchants = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", role, isVerified } = req.query;
    const query = {};
    if (role) query.role = role;
    if (isVerified !== undefined) query.isVerified = isVerified === "true";
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } }
      ];
    }
    const total = await Merchant.countDocuments(query);
    const merchants = await Merchant.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    return res.json({ success: true, merchants, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    return res.status(500).json({ message: "Failed to list merchants" });
  }
};

// Get merchant details
export const getMerchant = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Execute all queries in parallel for performance
    const [merchant, shop, personalDocs, businessDocs] = await Promise.all([
      // Main profile (excluding password)
      Merchant.findById(id).select("-password"),
      
      // Shop details (populated with Category/Subcategory info)
      MerchantShop.findOne({ merchantId: id })
        .populate("categoryId", "label")
        .populate("subCategoryId", "label")
        .select("-logo.data -banner.data"), // Exclude raw image buffers
      
      // Personal KYC Documents
      MerchantPersonalDoc.findOne({ merchantId: id })
        .select("-aadharImage.data -panImage.data"), 
      
      // Business/GST Documents
      MerchantBusinessDoc.findOne({ merchantId: id })
        .select("-gstImage.data -tradeLicenseImage.data -shopRegistrationImage.data -fssaiImage.data -panImage.data")
    ]);

    // 2. Validation
    if (!merchant) {
      return res.status(404).json({ success: false, message: "Merchant not found" });
    }

    // 3. Construct the full response
    return res.json({
      success: true,
      data: {
        profile: merchant,
        shop: shop || null,
        documents: {
          personal: personalDocs || null,
          business: businessDocs || null
        },
        // Helper to check if KYC is completed
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

// Verify/Reject merchant
export const verifyMerchant = async (req, res) => {
  try {
    const { id } = req.params;
    const { isVerified } = req.body;
    if (typeof isVerified !== "boolean") {
      return res.status(400).json({ message: "isVerified must be boolean" });
    }
    const merchant = await Merchant.findByIdAndUpdate(id, { isVerified }, { new: true }).select("-password");
    if (!merchant) return res.status(404).json({ message: "Merchant not found" });
    return res.json({ success: true, message: isVerified ? "Merchant verified" : "Merchant unverified", merchant });
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
    const { status } = req.body;
    if (!status || !["active", "banned"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    const user = await User.findByIdAndUpdate(id, { status }, { new: true }).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json({ success: true, message: `User ${status === "banned" ? "banned" : "unbanned"}`, user });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update user status" });
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json({ success: true, message: "User deleted" });
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
