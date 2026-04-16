import Merchant from "../models/merchantModel.js";
import MerchantShop from "../models/merchantShopModel.js";
import {
  updateShopProfileSchema,
  updateOpeningHoursSchema,
  updateSingleDayHoursSchema
} from "../validators/appValidator.js";
import { validate, ValidationError } from "../validators/validate.js";

const VALID_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DEFAULT_DAY_HOURS = { open: null, close: null, isClosed: false };

const buildOpeningHoursResponse = (openingHoursMap) => {
  const result = Object.fromEntries(
    VALID_DAYS.map((day) => [day, { ...DEFAULT_DAY_HOURS }])
  );

  if (!openingHoursMap) return result;

  const fromDb = openingHoursMap instanceof Map
    ? Object.fromEntries(openingHoursMap)
    : openingHoursMap;

  for (const [day, value] of Object.entries(fromDb || {})) {
    if (!VALID_DAYS.includes(day)) continue;
    result[day] = {
      open: value?.open ?? null,
      close: value?.close ?? null,
      isClosed: Boolean(value?.isClosed)
    };
  }

  return result;
};

const normalizeAndValidateHours = (rawHours) => {
  const normalized = {};

  for (const [rawDay, dayData] of Object.entries(rawHours)) {
    const day = rawDay.toLowerCase().trim();
    if (!VALID_DAYS.includes(day)) {
      throw new ValidationError(`Invalid day '${rawDay}'. Must be one of: ${VALID_DAYS.join(", ")}`);
    }

    const isClosed = dayData?.isClosed === true;
    const open = dayData?.open;
    const close = dayData?.close;

    if (!isClosed && ((open && !close) || (!open && close))) {
      throw new ValidationError(`${day}: both open and close are required when isClosed is false`);
    }

    normalized[day] = {
      open: open ?? null,
      close: close ?? null,
      isClosed
    };
  }

  return normalized;
};

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

// GET /api/merchant/shop/hours
export const getOpeningHours = async (req, res) => {
  try {
    const shop = await MerchantShop.findOne({ merchantId: req.merchant._id }).select("openingHours");
    const hours = buildOpeningHoursResponse(shop?.openingHours);
    return res.json({ success: true, openingHours: hours });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Failed to retrieve opening hours" });
  }
};

// PUT /api/merchant/shop/hours  — update one or more days at once
export const updateOpeningHours = async (req, res) => {
  try {
    const data = validate(updateOpeningHoursSchema, req.body);
    const normalizedData = normalizeAndValidateHours(data);

    const updateFields = {};
    for (const [day, dayData] of Object.entries(normalizedData)) {
      updateFields[`openingHours.${day}`] = dayData;
    }

    const shop = await MerchantShop.findOneAndUpdate(
      { merchantId: req.merchant._id },
      { $set: updateFields, $setOnInsert: { merchantId: req.merchant._id } },
      { new: true, upsert: true }
    ).select("openingHours");

    const hours = buildOpeningHoursResponse(shop.openingHours);
    return res.json({ success: true, openingHours: hours });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ message: error.message });
    }
    console.log(error);
    return res.status(500).json({ message: "Failed to update opening hours" });
  }
};

// PATCH /api/merchant/shop/hours/:day  — update a single day
export const updateDayHours = async (req, res) => {
  try {
    const day = req.params.day.toLowerCase();

    if (!VALID_DAYS.includes(day)) {
      return res.status(400).json({ message: `Invalid day. Must be one of: ${VALID_DAYS.join(", ")}` });
    }

    const data = validate(updateSingleDayHoursSchema, req.body);
    const normalized = normalizeAndValidateHours({ [day]: data });

    const shop = await MerchantShop.findOneAndUpdate(
      { merchantId: req.merchant._id },
      {
        $set: { [`openingHours.${day}`]: normalized[day] },
        $setOnInsert: { merchantId: req.merchant._id }
      },
      { new: true, upsert: true }
    ).select("openingHours");

    const dayHours = buildOpeningHoursResponse(shop.openingHours)[day] ?? DEFAULT_DAY_HOURS;
    return res.json({ success: true, day, hours: dayHours });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ message: error.message });
    }
    console.log(error);
    return res.status(500).json({ message: "Failed to update day hours" });
  }
};
