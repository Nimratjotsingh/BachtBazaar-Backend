import User from "../models/userModel.js";
import Merchant from "../models/merchantModel.js";
import { z } from "zod";
import { validate, ValidationError } from "../validators/validate.js";
import { ROLES } from "../constants/roles.js";

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
        { new: true }
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
