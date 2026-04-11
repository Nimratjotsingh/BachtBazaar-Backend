import Merchant from "../models/merchantModel.js";
import MerchantShop from "../models/merchantShopModel.js";
import { updateShopProfileSchema } from "../validators/appValidator.js";
import { validate, ValidationError } from "../validators/validate.js";

export const upsertShopProfile = async (req, res) => {
  try {
    const merchant = await Merchant.findById(req.merchant._id);
    if (!merchant) return res.status(404).json({ message: "Merchant not found" });

    const data = validate(updateShopProfileSchema, req.body);
    const update = { ...data };

    const logoFile = req.files?.logoImage?.[0];
    const bannerFile = req.files?.shopBannerImage?.[0];

    if (logoFile) {
      update.logo = {
        data: logoFile.buffer,
        contentType: logoFile.mimetype
      };
    }

    if (bannerFile) {
      update.banner = {
        data: bannerFile.buffer,
        contentType: bannerFile.mimetype
      };
    }

    const shop = await MerchantShop.findOneAndUpdate(
      { merchantId: req.merchant._id },
      { $set: update, $setOnInsert: { merchantId: req.merchant._id } },
      { new: true, upsert: true }
    );

    return res.json({ success: true, shopId: shop._id });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ message: error.message });
    }
    console.log(error);
    return res.status(500).json({ message: "Update failed" });
  }
};
