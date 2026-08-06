import Offer from "../models/offerModel.js";

/**
 * GET /api/merchant/offers/expired
 * Fetch all expired or inactive past offers for the authenticated merchant
 */
export const getExpiredOffers = async (req, res) => {
  try {
    const merchantId = req.merchant._id;
    const now = new Date();

    // 1. Auto-deactivate offers whose end_date has passed
    const re1 = await Offer.updateMany(
      {
        merchant_id: merchantId,
        is_active: true,
        is_deleted: false,
        end_date: { $lt: now },
      },
      {
        $set: { is_active: false },
      }
    );
    

    // 2. Query expired or manually deactivated offers
    const expiredOffers = await Offer.find({
      merchant_id: merchantId,
     
      end_date: { $lt: now } ,
    })
      .populate("offer_type_id", "title name")
      .populate("sub_offer_type_id", "title name")
      .populate("category_id", "name")
      .sort({ end_date: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      total: expiredOffers.length,
      data: expiredOffers,
    });
  } catch (error) {
    console.error("Get Expired Offers Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve expired offers.",
      error: error.message,
    });
  }
};

/**
 * GET /api/merchant/offers/expired/:offerId
 * View full details of a specific expired offer
 */
export const getExpiredOfferById = async (req, res) => {
  try {
    const merchantId = req.merchant._id;
    const { offerId } = req.params;

    const offer = await Offer.findOne({
      _id: offerId,
      merchant_id: merchantId,
      is_deleted: false,
    })
      .populate("offer_type_id")
      .populate("sub_offer_type_id")
      .populate("category_id")
      .populate("product_id", "title name price thumbnail");

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "Expired offer not found or access denied.",
      });
    }

    return res.status(200).json({
      success: true,
      data: offer,
    });
  } catch (error) {
    console.error("Get Expired Offer By ID Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve offer details.",
      error: error.message,
    });
  }
};

/**
 * PATCH /api/merchant/offers/expired/:offerId/republish
 * Extend time and reactivate an expired offer
 */
export const republishOffer = async (req, res) => {
  try {
    const merchantId = req.merchant._id;
    const { offerId } = req.params;
    const {
      start_date,
      end_date,
      title,
      description,
      discount_percentage,
      discount_value,
      claim_limit,
    } = req.body;

    if (!end_date) {
      return res.status(400).json({
        success: false,
        message: "New expiration date (end_date) is required to republish.",
      });
    }

    const newStart = start_date ? new Date(start_date) : new Date();
    const newEnd = new Date(end_date);

    if (newEnd <= newStart) {
      return res.status(400).json({
        success: false,
        message: "Expiration date (end_date) must be in the future relative to the start date.",
      });
    }

    const offer = await Offer.findOne({
      _id: offerId,
      merchant_id: merchantId,
      is_deleted: false,
    });

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "Offer not found or access denied.",
      });
    }

    // Reactivate and update schedule
    offer.start_date = newStart;
    offer.end_date = newEnd;
    offer.is_active = true;
    offer.is_draft = false;

    // Reset counters for the new offer run
    offer.redeemedCount = 0;
    offer.claimedCount = 0;

    // Update optional modified parameters
    if (title) offer.title = title;
    if (description !== undefined) offer.description = description;
    if (discount_percentage !== undefined) offer.discount_percentage = discount_percentage;
    if (discount_value !== undefined) offer.discount_value = discount_value;
    if (claim_limit !== undefined) offer.claim_limit = claim_limit;

    await offer.save();

    return res.status(200).json({
      success: true,
      message: "Offer republished successfully!",
      data: offer,
    });
  } catch (error) {
    console.error("Republish Offer Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to republish offer.",
      error: error.message,
    });
  }
};