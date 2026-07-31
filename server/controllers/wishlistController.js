import OfferWishlist from "../models/OfferWishlistModel.js";
import Offer from "../models/offerModel.js";

/**
 * POST /api/wishlist/toggle/:offerId
 * Toggles an offer in the user's wishlist array (adds if not present, pulls if already exists).
 */
export const toggleOfferWishlist = async (req, res) => {
  try {
    const { offerId } = req.params;
    const userId = req.user._id;

    // 1. Verify offer existence
    const offer = await Offer.findOne({ _id: offerId, is_deleted: false });
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "The offer you are trying to wishlist does not exist or was deleted.",
      });
    }

    // 2. Fetch or initialize the user's wishlist document
    let wishlist = await OfferWishlist.findOne({ userId });

    if (!wishlist) {
      wishlist = new OfferWishlist({ userId, offers: [offerId] });
      await wishlist.save();
      return res.status(201).json({
        success: true,
        isWishlisted: true,
        message: "Offer saved to your wishlist!",
        totalWishlisted: wishlist.offers.length,
      });
    }

    // 3. Check if the offer is already saved in the array
    const isSaved = wishlist.offers.some((id) => id.toString() === offerId);

    if (isSaved) {
      // Pull offer out of array
      wishlist = await OfferWishlist.findOneAndUpdate(
        { userId },
        { $pull: { offers: offerId } },
        { new: true }
      );

      return res.status(200).json({
        success: true,
        isWishlisted: false,
        message: "Offer removed from your wishlist.",
        totalWishlisted: wishlist.offers.length,
      });
    } else {
      // Add offer to array without duplicates ($addToSet)
      wishlist = await OfferWishlist.findOneAndUpdate(
        { userId },
        { $addToSet: { offers: offerId } },
        { new: true }
      );

      return res.status(200).json({
        success: true,
        isWishlisted: true,
        message: "Offer added to your wishlist!",
        totalWishlisted: wishlist.offers.length,
      });
    }
  } catch (error) {
    console.error("Toggle Offer Wishlist Error:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while updating your wishlist.",
      error: error.message,
    });
  }
};

/**
 * GET /api/wishlist
 * Fetches the user's wishlist document with populated offer details.
 */
export const getUserWishlist = async (req, res) => {
  try {
    const userId = req.user._id;

    const wishlist = await OfferWishlist.findOne({ userId }).populate({
      path: "offers",
      match: { is_deleted: false, is_active: true }, // Populate only active, non-deleted offers
      populate: [
        { path: "merchant_id", select: "shopName address city logo phone" },
        { path: "category_id", select: "label value image" },
      ],
    });

    if (!wishlist) {
      return res.status(200).json({
        success: true,
        total: 0,
        data: [],
      });
    }

    // Clean out null instances (for offers that were deleted after saving)
    const validOffers = wishlist.offers.filter((offer) => offer !== null);

    return res.status(200).json({
      success: true,
      total: validOffers.length,
      data: validOffers,
    });
  } catch (error) {
    console.error("Get User Wishlist Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch your wishlist offers.",
      error: error.message,
    });
  }
};

/**
 * DELETE /api/wishlist/remove/:offerId
 * Removes a specific offer ID from the array.
 */
export const removeFromWishlist = async (req, res) => {
  try {
    const { offerId } = req.params;
    const userId = req.user._id;

    const wishlist = await OfferWishlist.findOneAndUpdate(
      { userId },
      { $pull: { offers: offerId } },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Offer successfully removed from wishlist.",
      totalWishlisted: wishlist ? wishlist.offers.length : 0,
    });
  } catch (error) {
    console.error("Remove From Wishlist Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to remove offer from wishlist.",
      error: error.message,
    });
  }
};

/**
 * DELETE /api/wishlist/clear
 * Clears the array of wishlisted offers for the user.
 */
export const clearWishlist = async (req, res) => {
  try {
    const userId = req.user._id;

    await OfferWishlist.findOneAndUpdate(
      { userId },
      { $set: { offers: [] } },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Your wishlist has been cleared.",
    });
  } catch (error) {
    console.error("Clear Wishlist Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to clear wishlist.",
      error: error.message,
    });
  }
};