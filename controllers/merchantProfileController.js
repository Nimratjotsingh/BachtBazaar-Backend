import Merchant from "../models/merchantModel.js";
import { updateMerchantProfileSchema } from "../validators/appValidator.js";
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

export const updateMerchantProfile = async (req, res) => {
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
    merchant.email = email || merchant.email;
    if (phone) merchant.phone = formatPhone(phone);

    if (req.file) {
      merchant.profileImage = {
        data: req.file.buffer,
        contentType: req.file.mimetype
      };
    }

    await merchant.save();

    return res.json({
      success: true,
      merchant: sanitizeMerchant(merchant)
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ message: error.message });
    }
    console.log(error);
    return res.status(500).json({ message: "Profile update failed" });
  }
};
