import { trackUniqueShopClick } from "../utils/shopClickTracker.js";
import MerchantShop from "../models/merchantShopModel.js";

export const recordShopClick = async (req, res) => {
  try {
    const { shopId } = req.params;
    console.log(req.params)
    const userId = req.user?._id;

    console.log(shopId)

    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required to log click." });
    }

    const shop = await MerchantShop.findById(shopId).select("merchantId").lean();
    if (!shop) {
      return res.status(404).json({ success: false, message: "Shop not found." });
    }

    // Trigger unique daily tracking
    await trackUniqueShopClick(shop._id, shop.merchantId, userId);

    return res.status(200).json({
      success: true,
      message: "Shop click recorded successfully."
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

import { trackUniqueOfferClick } from "../utils/offerClickTracker.js";
import Offer from "../models/offerModel.js";

export const recordOfferClick = async (req, res) => {
  try {
    const { offerId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required to log click." });
    }

    const offer = await Offer.findById(offerId).select("merchant_id").lean();
    if (!offer) {
      return res.status(404).json({ success: false, message: "Offer not found." });
    }

    // Trigger unique daily offer click tracking
    await trackUniqueOfferClick(offer._id, offer.merchant_id, userId);

    return res.status(200).json({
      success: true,
      message: "Offer click recorded successfully."
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

import OfferRedeem from "../models/offerRedeemModel.js";

import { trackOfferRedemption } from "../utils/offerRedeemTracker.js";

/**
 * Records a successful offer redemption by a user at a merchant/shop.
 */
export const recordOfferRedemptionUser = async (req, res) => {
  try {
    const { offerId,  shopId,redemptionCode } = req.body;
    const userId = req.user?._id; // Authenticated merchant or staff

    if (!offerId ) {
      return res.status(400).json({
        success: false,
        message: "Missing required redemption parameters (offerId, userId).",
      });
    }

    const offer = await Offer.findById(offerId).select("merchant_id title").lean();
    if (!offer) {
      return res.status(404).json({ success: false, message: "Offer not found." });
    }

    // Trigger daily redemption tracking
    await trackOfferRedemption(
      offerId, 
      offer.merchant_id, 
      userId,
      redemptionCode,  
      shopId || null
    );

    return res.status(200).json({
      success: true,
      message: "Offer redemption successfully recorded.",
    });
  } catch (error) {
    console.error("Record Offer Redemption Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const recordOfferRedemption = async (req, res) => {
  try {
    const { offerId, userId,  shopId,redemptionCode } = req.body;
    const merchantId = req.merchant?._id; // Authenticated merchant or staff

    if (!offerId || !userId || !redemptionCode) {
      return res.status(400).json({
        success: false,
        message: "Missing required redemption parameters (offerId, userId, redemptionCode).",
      });
    }

    const offer = await Offer.findById(offerId).select("merchant_id title").lean();
    if (!offer) {
      return res.status(404).json({ success: false, message: "Offer not found." });
    }

    // Trigger daily redemption tracking
    await trackOfferRedemption(
      offerId, 
      merchantId || offer.merchant_id, 
      userId, 
      redemptionCode,
       
      shopId || null
    );

    return res.status(200).json({
      success: true,
      message: "Offer redemption successfully recorded.",
    });
  } catch (error) {
    console.error("Record Offer Redemption Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};