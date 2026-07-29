import crypto from "crypto";
import Offer from "../models/offerModel.js";
import OfferRedemption from "../models/offerRedemptionModel.js";

// ==========================================
//   USER SIDE CONTROLLERS
// ==========================================

/**
 * POST /api/offers/:offerId/redeem
 * User reserves an offer digitally in the app before visiting the physical store.
 */
export const redeemOffer = async (req, res) => {
  try {
    const { offerId } = req.params;
    const userId = req.user._id;

    // 1. Fetch active, non-deleted offer
    const offer = await Offer.findOne({ _id: offerId, is_active: true, is_deleted: false });
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "The requested offer is unavailable or no longer active."
      });
    }

    // 2. Check if the offer duration has expired
    const now = new Date();
    if (offer.end_date && offer.end_date < now) {
      return res.status(400).json({
        success: false,
        message: "This offer campaign has expired."
      });
    }

    // 3. ENFORCE CLAIM LIMIT AT REDEMPTION
    if (offer.claim_limit !== undefined && offer.claim_limit !== null) {
      if (offer.redeemedCount >= offer.claim_limit) {
        return res.status(400).json({
          success: false,
          message: `All available redemptions (${offer.claim_limit}) for this offer have been claimed.`
        });
      }
    }

    // 4. Enforce per-user limit
    const userRedemptionCount = await OfferRedemption.countDocuments({
      offerId,
      userId,
      status: { $in: ["redeemed", "claimed"] }
    });

    if (offer.per_user_limit && userRedemptionCount >= offer.per_user_limit) {
      return res.status(400).json({
        success: false,
        message: `You have reached your limit of ${offer.per_user_limit} redemption(s) for this offer.`
      });
    }

    // 5. Calculate expiration based on `redeem_time_hours` or `end_date`
    const hoursToMs = (offer.redeem_time_hours || 24) * 60 * 60 * 1000;
    const calculatedExpiry = new Date(Date.now() + hoursToMs);

    // If campaign end_date is earlier than calculated window, cap it at campaign end_date
    const finalExpiresAt = offer.end_date && offer.end_date < calculatedExpiry 
      ? offer.end_date 
      : calculatedExpiry;

    // 6. Generate a unique 6-character redemption code
    const redemptionCode = "BB-" + crypto.randomBytes(3).toString("hex").toUpperCase();

    const redemption = new OfferRedemption({
      offerId,
      userId,
      shopId: offer.merchant_id, // Map target shop/merchant
      merchantId: offer.merchant_id,
      redemptionCode,
      expiresAt: finalExpiresAt,
      status: "redeemed"
    });

    await redemption.save();

    // 7. Atomically increment redeemedCount on the offer
    await Offer.findByIdAndUpdate(offerId, { $inc: { redeemedCount: 1 } });

    return res.status(201).json({
      success: true,
      message: "Offer redeemed successfully! Show this code or QR in-store to claim your discount.",
      data: {
        redemptionId: redemption._id,
        redemptionCode: redemption.redemptionCode,
        expiresAt: redemption.expiresAt,
        status: redemption.status
      }
    });

  } catch (error) {
    console.error("Redeem Offer Processing Error:", error);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while processing your redemption.",
      error: error.message
    });
  }
};


// ==========================================
//   MERCHANT SIDE CONTROLLERS
// ==========================================

/**
 * POST /api/merchant/offers/claim
 * Merchant scans the QR code or types the user's redemption code in-store to finalize the claim.
 */
export const claimOfferInStore = async (req, res) => {
  try {
    const { redemptionCode } = req.body;

    if (!req.merchant) {
      return res.status(401).json({
        success: false,
        message: "Access Denied: Missing merchant authentication profile."
      });
    }

    if (!redemptionCode) {
      return res.status(400).json({
        success: false,
        message: "Redemption code is required."
      });
    }

    // 1. Locate redemption matching merchant and code
    const redemption = await OfferRedemption.findOne({
      redemptionCode: redemptionCode.trim().toUpperCase(),
      merchantId: req.merchant._id
    }).populate("offerId");

    if (!redemption) {
      return res.status(404).json({
        success: false,
        message: "Invalid or unrecognized redemption code for your store."
      });
    }

    if (redemption.status === "claimed") {
      return res.status(400).json({
        success: false,
        message: `This offer was already claimed on ${redemption.claimedAt?.toLocaleString()}.`
      });
    }

    if (redemption.status === "expired" || redemption.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: "This redemption window has expired."
      });
    }

    const offer = redemption.offerId;

    // 2. ENFORCE CLAIM LIMIT AT CLAIMING STAGE AS SAFEGUARD
    if (offer.claim_limit !== undefined && offer.claim_limit !== null) {
      if (offer.claimedCount >= offer.claim_limit) {
        return res.status(400).json({
          success: false,
          message: `Claim limit reached: All ${offer.claim_limit} claims for this offer have already been processed.`
        });
      }
    }

    // 3. Mark redemption as claimed
    redemption.status = "claimed";
    redemption.claimedAt = new Date();
    await redemption.save();

    // 4. Atomically increment claimedCount on the primary offer document
    await Offer.findByIdAndUpdate(offer._id, { $inc: { claimedCount: 1 } });

    return res.status(200).json({
      success: true,
      message: "Offer successfully verified and claimed!",
      data: {
        offerTitle: offer.title,
        redemptionCode: redemption.redemptionCode,
        claimedAt: redemption.claimedAt
      }
    });

  } catch (error) {
    console.error("In-Store Claim Verification Error:", error);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while verifying the claim.",
      error: error.message
    });
  }
};

/**
 * GET /api/merchant/offers/analytics
 * Provides metrics on total offers, redeemed counts, claimed counts, and remaining claim limits.
 */
export const getMerchantOfferAnalytics = async (req, res) => {
  try {
    if (!req.merchant) {
      return res.status(401).json({
        success: false,
        message: "Access Denied: Missing merchant authentication profile."
      });
    }

    const offers = await Offer.find({ merchant_id: req.merchant._id, is_deleted: false })
      .select("title claim_limit redeemedCount claimedCount start_date end_date is_active")
      .sort({ createdAt: -1 })
      .lean();

    const formattedAnalytics = offers.map((offer) => {
      const limit = offer.claim_limit !== undefined && offer.claim_limit !== null ? offer.claim_limit : null;
      const remainingRedemptions = limit !== null ? Math.max(0, limit - (offer.redeemedCount || 0)) : "Unlimited";
      const remainingClaims = limit !== null ? Math.max(0, limit - (offer.claimedCount || 0)) : "Unlimited";

      return {
        _id: offer._id,
        title: offer.title,
        claimLimit: limit || "Unlimited",
        totalRedeemed: offer.redeemedCount || 0,
        totalClaimed: offer.claimedCount || 0,
        remainingRedemptions,
        remainingClaims,
        pendingInStoreClaims: (offer.redeemedCount || 0) - (offer.claimedCount || 0),
        isActive: offer.is_active,
        startDate: offer.start_date,
        endDate: offer.end_date
      };
    });

    return res.status(200).json({
      success: true,
      totalOffersCount: offers.length,
      data: formattedAnalytics
    });

  } catch (error) {
    console.error("Merchant Offer Analytics Error:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while loading offer analytics.",
      error: error.message
    });
  }
};

export const userSelfClaimOffer = async (req, res) => {
  try {
    const { offerId } = req.params;
    // const { shopPin } = req.body; // Optional shop PIN verification
    const userId = req.user._id;

    // 1. Fetch active offer
    const offer = await Offer.findOne({ _id: offerId, is_active: true, is_deleted: false });
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "The requested offer is no longer available."
      });
    }

    // 2. Validate offer expiration date
    const now = new Date();
    if (offer.end_date && offer.end_date < now) {
      return res.status(400).json({
        success: false,
        message: "This offer campaign has expired."
      });
    }

    // 3. Optional: Verify Shop PIN if walk-in validation is required
    if (offer.only_for_walk_in_customers ) {
      const shop = await MerchantShop.findOne({ merchantId: offer.merchant_id });
      if (shop) {
        return res.status(400).json({
          success: false,
          message: "Invalid Store PIN. Please ask the shop owner for the verification PIN."
        });
      }
    }

    // 4. ENFORCE CLAIM LIMIT (Total limit across all users)
    if (offer.claim_limit !== undefined && offer.claim_limit !== null) {
      if (offer.claimedCount >= offer.claim_limit) {
        return res.status(400).json({
          success: false,
          message: `Claim limit reached! All ${offer.claim_limit} claims for this offer have already been taken.`
        });
      }
    }

    // 5. Enforce Per-User Claim Limit
    const userClaimCount = await OfferRedemption.countDocuments({
      offerId,
      userId,
      status: "claimed"
    });

    if (offer.per_user_limit && userClaimCount >= offer.per_user_limit) {
      return res.status(400).json({
        success: false,
        message: `You have already claimed this offer ${offer.per_user_limit} time(s).`
      });
    }

    // 6. Check if user already redeemed it previously and upgrade it, or create a direct claimed record
    let redemption = await OfferRedemption.findOne({
      offerId,
      userId,
      status: "redeemed"
    });

    if (redemption) {
      // Upgrade existing redemption to claimed
      redemption.status = "claimed";
      redemption.claimedAt = new Date();
      await redemption.save();
    } else {
      // Create new direct claim record
      redemption = new OfferRedemption({
        offerId,
        userId,
        shopId: offer.merchant_id,
        merchantId: offer.merchant_id,
        redemptionCode: "CLAIMED-DIRECT",
        expiresAt: offer.end_date || new Date(Date.now() + 24 * 60 * 60 * 1000),
        status: "claimed",
        redeemedAt: new Date(),
        claimedAt: new Date()
      });
      await redemption.save();
    }

    // 7. Atomically increment claimedCount (and redeemedCount if new)
    await Offer.findByIdAndUpdate(offerId, {
      $inc: { 
        claimedCount: 1,
        ...(redemption.redemptionCode === "CLAIMED-DIRECT" ? { redeemedCount: 1 } : {})
      }
    });

    return res.status(200).json({
      success: true,
      message: "Offer successfully claimed! Show this confirmation screen to the shopkeeper.",
      data: {
        offerTitle: offer.title,
        claimedAt: redemption.claimedAt,
        status: redemption.status
      }
    });

  } catch (error) {
    console.error("Direct User Claim Exception:", error);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while processing your claim.",
      error: error.message
    });
  }
};

export const getUserOfferHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status = "all", page = 1, limit = 10 } = req.query;

    // 1. Build Query Filter
    const query = { userId };

    if (status === "redeemed") {
      query.status = "redeemed";
    } else if (status === "claimed") {
      query.status = "claimed";
    } else {
      // "all" tab loads both redeemed & claimed records
      query.status = { $in: ["redeemed", "claimed"] };
    }

    // 2. Setup Pagination
    const currentLimit = Number(limit);
    const skip = (Math.max(1, Number(page)) - 1) * currentLimit;

    // 3. Count total matching redemptions/claims
    const totalRecords = await OfferRedemption.countDocuments(query);

    // 4. Fetch list with populated Offer and Shop/Merchant details
    const history = await OfferRedemption.find(query)
      .populate({
        path: "offerId",
        select: "title description thumbnail discount_percentage discount_value start_date end_date redeem_time_hours only_for_walk_in_customers"
      })
      .populate({
        path: "merchantId",
        select: "shopName address city phone logo banner"
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(currentLimit)
      .lean();

    // 5. Format payload and add dynamic status flags (e.g. check if a 'redeemed' code has passed its expiry)
    const now = new Date();
    const formattedData = history.map((record) => {
      const isExpired = record.status === "redeemed" && record.expiresAt < now;

      return {
        redemptionId: record._id,
        redemptionCode: record.redemptionCode,
        status: isExpired ? "expired" : record.status, // Gracefully surface expired status
        redeemedAt: record.redeemedAt,
        claimedAt: record.claimedAt,
        expiresAt: record.expiresAt,
        offerDetails: record.offerId ? {
          offerId: record.offerId._id,
          title: record.offerId.title,
          description: record.offerId.description,
          thumbnail: record.offerId.thumbnail,
          discountPercentage: record.offerId.discount_percentage,
          discountValue: record.offerId.discount_value,
        } : null,
        shopDetails: record.merchantId ? {
          shopId: record.merchantId._id,
          shopName: record.merchantId.shopName,
          address: record.merchantId.address,
          city: record.merchantId.city,
          phone: record.merchantId.phone,
          logo: record.merchantId.logo
        } : null
      };
    });

    return res.status(200).json({
      success: true,
      total: totalRecords,
      pages: Math.ceil(totalRecords / currentLimit) || 1,
      currentPage: Number(page),
      data: formattedData
    });

  } catch (error) {
    console.error("User Offer History Fetch Error:", error);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while retrieving your offer history.",
      error: error.message
    });
  }
};

export const deleteUserAccount = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Access Denied: Missing authenticated user context."
      });
    }

    const { mode = "soft" } = req.query; // Expects mode = "soft" (default) or "hard"

    if (mode === "hard") {
      // --- OPTION A: HARD DELETE (Permanent removal) ---
      
      // 1. Wipe or cleanup dependent records (Optional cleanup pipeline)
      await OfferRedemption.deleteMany({ userId });
      await BestPriceRequest.deleteMany({ userId });

      // 2. Permanently delete the user document
      const deletedUser = await User.findByIdAndDelete(userId);

      if (!deletedUser) {
        return res.status(404).json({
          success: false,
          message: "User profile record not found."
        });
      }

      return res.status(200).json({
        success: true,
        message: "Your account and associated personal data have been permanently deleted."
      });

    } else {
      // --- OPTION B: SOFT DELETE (Recommended for Data Integrity) ---
      
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User profile record not found."
        });
      }

      if (user.is_deleted) {
        return res.status(400).json({
          success: false,
          message: "This account has already been deleted."
        });
      }

      // Anonymize personal details to comply with privacy rules while keeping system references intact
      user.is_deleted = true;
      user.is_active = false;
      user.deletedAt = new Date();
      user.name = "Deleted User";
      user.email = `deleted_${userId}_${Date.now()}@deleted.com`;
      user.phoneNumber = null;
      user.profileImage = null;

      await user.save();

      return res.status(200).json({
        success: true,
        message: "Your account has been successfully deactivated and marked for deletion."
      });
    }

  } catch (error) {
    console.error("User Deletion Controller Exception:", error);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while processing account deletion.",
      error: error.message
    });
  }
};

export const cancelUserOfferRedemption = async (req, res) => {
  try {
    const { redemptionId } = req.params;
    const userId = req.user._id;

    // 1. Locate the redemption document belonging to the authenticated user
    const redemption = await OfferRedemption.findOne({
      _id: redemptionId,
      userId
    });

    if (!redemption) {
      return res.status(404).json({
        success: false,
        message: "Redemption record not found or access denied."
      });
    }

    // 2. Prevent deletion if the offer has already been claimed in-store
    if (redemption.status === "claimed") {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel a redemption that has already been claimed in-store."
      });
    }

    const offerId = redemption.offerId;

    // 3. Delete the redemption document
    await OfferRedemption.findByIdAndDelete(redemptionId);

    // 4. Atomically decrement redeemedCount on the parent Offer (ensuring it doesn't drop below 0)
    await Offer.findByIdAndUpdate(offerId, {
      $inc: { redeemedCount: -1 }
    });

    return res.status(200).json({
      success: true,
      message: "Offer redemption successfully cancelled and removed."
    });

  } catch (error) {
    console.error("Cancel User Offer Redemption Exception:", error);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while cancelling your redemption.",
      error: error.message
    });
  }
};