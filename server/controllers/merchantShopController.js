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
    const storeFrontFile = req.files?.storeFrontImage?.[0];

    if (logoFile) {
      update.logo = {
        data: logoFile.buffer,
        contentType: logoFile.mimetype,
      };
    }

    if (bannerFile) {
      update.banner = {
        data: bannerFile.buffer,
        contentType: bannerFile.mimetype,
      };
    }

    if (storeFrontFile) {
      update.storeFront = {
        data: storeFrontFile.buffer,
        contentType: storeFrontFile.mimetype,
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
    console.error("Upsert Shop Profile Error:", error);
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


export const updateShopOperatingStatus = async (req, res) => {
  try {
    const merchantId = req.merchant?._id;
    const { action, reason, reopenAt } = req.body;

    if (!merchantId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Merchant credentials missing.",
      });
    }

    const validActions = ["CLOSE_EARLY", "REOPEN_AUTO", "FORCE_OPEN"];
    if (!action || !validActions.includes(action.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid action. Supported values: ${validActions.join(", ")}`,
      });
    }

    const shop = await MerchantShop.findOne({ merchantId });
    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop profile not found for this merchant.",
      });
    }

    if (!shop.manualOverride) {
      shop.manualOverride = {
        status: "AUTO",
        reason: null,
        closedUntil: null,
        updatedAt: null,
      };
    }

    const normalizedAction = action.toUpperCase();
    const timestamp = new Date();

    switch (normalizedAction) {
      case "CLOSE_EARLY": {
        let parsedClosedUntil = null;
        if (reopenAt) {
          const dateObj = new Date(reopenAt);
          if (isNaN(dateObj.getTime()) || dateObj <= timestamp) {
            return res.status(400).json({
              success: false,
              message: "reopenAt must be a valid ISO date string in the future.",
            });
          }
          parsedClosedUntil = dateObj;
        }

        shop.manualOverride.status = "FORCE_CLOSED";
        shop.manualOverride.reason = reason ? reason.trim() : "Closed early by merchant";
        shop.manualOverride.closedUntil = parsedClosedUntil;
        shop.manualOverride.updatedAt = timestamp;
        break;
      }

      case "REOPEN_AUTO": {
        shop.manualOverride.status = "AUTO";
        shop.manualOverride.reason = null;
        shop.manualOverride.closedUntil = null;
        shop.manualOverride.updatedAt = timestamp;
        break;
      }

      case "FORCE_OPEN": {
        shop.manualOverride.status = "FORCE_OPEN";
        shop.manualOverride.reason = reason ? reason.trim() : "Opened manually by merchant";
        shop.manualOverride.closedUntil = null;
        shop.manualOverride.updatedAt = timestamp;
        break;
      }
    }

    await shop.save();

    // Compute live status using the schema helper method
    const liveStatus = typeof shop.calculateIsOpen === "function" 
      ? shop.calculateIsOpen() 
      : { isOpen: shop.manualOverride.status === "FORCE_OPEN" };

    return res.status(200).json({
      success: true,
      message: `Shop operating status successfully updated to ${shop.manualOverride.status}.`,
      data: {
        shopId: shop._id,
        shopName: shop.shopName,
        manualOverride: shop.manualOverride,
        liveStatus,
      },
    });
  } catch (error) {
    console.error("Update Shop Operating Status Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update shop operating status.",
      error: error.message,
    });
  }
};

/**
 * GET /api/merchant/shop/operating-status
 * Returns current schedule, manual override flags, and calculated open/closed state.
 */
export const getShopOperatingStatus = async (req, res) => {
  try {
    const merchantId = req.merchant?._id;

    const shop = await MerchantShop.findOne({ merchantId })
      .select("shopName openingHours manualOverride")
      .lean();

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop profile not found.",
      });
    }

    const hydratedShop = MerchantShop.hydrate(shop);
    const liveStatus = hydratedShop.calculateIsOpen();

    return res.status(200).json({
      success: true,
      data: {
        shopId: shop._id,
        shopName: shop.shopName,
        openingHours: shop.openingHours,
        manualOverride: shop.manualOverride || {
          status: "AUTO",
          reason: null,
          closedUntil: null,
        },
        liveStatus,
      },
    });
  } catch (error) {
    console.error("Get Shop Operating Status Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch shop status.",
      error: error.message,
    });
  }
};

export const updateShopVisibilityRadius = async (req, res) => {
  try {
    const merchantId = req.merchant?._id;
    const { radiusKm } = req.body;

    if (!merchantId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Merchant credentials missing.",
      });
    }

    const numericRadius = Number(radiusKm);
    if (isNaN(numericRadius) || numericRadius < 1 || numericRadius > 100) {
      return res.status(400).json({
        success: false,
        message: "Visibility radius must be a number between 1 km and 100 km.",
      });
    }

    const shop = await MerchantShop.findOne({ merchantId });
    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop profile not found for this merchant.",
      });
    }

    shop.visibilityRadiusKm = numericRadius;
    await shop.save();

    return res.status(200).json({
      success: true,
      message: `Shop visibility radius successfully updated to ${numericRadius} km.`,
      data: {
        shopId: shop._id,
        shopName: shop.shopName,
        visibilityRadiusKm: shop.visibilityRadiusKm,
      },
    });
  } catch (error) {
    console.error("Update Visibility Radius Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update shop visibility radius.",
      error: error.message,
    });
  }
};

/**
 * GET /api/merchant/shop/visibility-radius
 * Retrieves current configured discovery radius.
 */
export const getShopVisibilityRadius = async (req, res) => {
  try {
    const merchantId = req.merchant?._id;

    const shop = await MerchantShop.findOne({ merchantId })
      .select("shopName visibilityRadiusKm latitude longitude city")
      .lean();

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop profile not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        shopId: shop._id,
        shopName: shop.shopName,
        visibilityRadiusKm: shop.visibilityRadiusKm || 15,
        location: {
          latitude: shop.latitude,
          longitude: shop.longitude,
          city: shop.city,
        },
      },
    });
  } catch (error) {
    console.error("Get Visibility Radius Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve shop visibility radius.",
      error: error.message,
    });
  }
};