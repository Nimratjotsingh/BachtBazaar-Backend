import Wishlist from "../models/wishlistModel.js";
import Offer from "../models/offerModel.js";
import MerchantShop from "../models/merchantShopModel.js";
import Product from "../models/productModel.js"; // Import your Product/Service model here

/**
 * POST /api/wishlist/toggle/:type/:itemId
 * Params:
 *  - type: "offers" | "products" | "shops"
 *  - itemId: The target ID of the item to add or remove
 */
export const toggleWishlistItem = async (req, res) => {
  try {
    const { type, itemId } = req.params;
    const userId = req.user._id;

    // 1. Validate entity type
    const validTypes = ["offers", "products", "shops"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid wishlist target type. Must be 'offers', 'products', or 'shops'.",
      });
    }

    // 2. Target Item Model Verification
    if (type === "offers") {
      const offerExists = await Offer.findOne({ _id: itemId, is_deleted: false });
      if (!offerExists) {
        return res.status(404).json({ success: false, message: "Offer not found." });
      }
    } else if (type === "shops") {
      const shopExists = await MerchantShop.findById(itemId);
      if (!shopExists) {
        return res.status(404).json({ success: false, message: "Shop not found." });
      }
    }
    // Add product/service checks here if applicable

    // 3. Find or initialize user's wishlist
    let wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      wishlist = new Wishlist({
        userId,
        [type]: [itemId],
      });
      await wishlist.save();

      return res.status(201).json({
        success: true,
        isWishlisted: true,
        message: `Item added to your ${type} wishlist!`,
        data: wishlist,
      });
    }

    // 4. Check if item already exists in the target array
    const itemArray = wishlist[type] || [];
    const isSaved = itemArray.some((id) => id.toString() === itemId);

    if (isSaved) {
      // Remove item using $pull
      wishlist = await Wishlist.findOneAndUpdate(
        { userId },
        { $pull: { [type]: itemId } },
        { new: true }
      );

      return res.status(200).json({
        success: true,
        isWishlisted: false,
        message: `Item removed from your ${type} wishlist.`,
        data: wishlist,
      });
    } else {
      // Add item using $addToSet (prevents duplicates)
      wishlist = await Wishlist.findOneAndUpdate(
        { userId },
        { $addToSet: { [type]: itemId } },
        { new: true }
      );

      return res.status(200).json({
        success: true,
        isWishlisted: true,
        message: `Item saved to your ${type} wishlist!`,
        data: wishlist,
      });
    }
  } catch (error) {
    console.error("Toggle Wishlist Error:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while updating your wishlist.",
      error: error.message,
    });
  }
};

/**
 * GET /api/wishlist
 * Query parameter: ?type=offers (Optional filter: "offers", "products", "shops", or "all")
 */
export const getUserWishlist = async (req, res) => {
  try {
    const userId = req.user._id;
    const { type = "all" } = req.query;

    let query = Wishlist.findOne({ userId });

    if (type === "all" || type === "offers") {
      query = query.populate({
        path: "offers",
        match: { is_deleted: false, is_active: true },
        populate: { path: "merchant_id", select: "shopName address city logo phone" },
      });
    }

    if (type === "all" || type === "shops") {
      query = query.populate({
        path: "shops",
        select: "shopName address city phone logo banner ratings",
      });
    }

    if (type === "all" || type === "products") {
      query = query.populate({
        path: "products",
        // match: { is_deleted: false }
      });
    }

    const wishlist = await query.lean();

    if (!wishlist) {
      return res.status(200).json({
        success: true,
        data: { offers: [], products: [], shops: [] },
      });
    }

    // Clean null references (in case items were deleted from main DB)
    const formattedData = {
      offers: (wishlist.offers || []).filter(Boolean),
      products: (wishlist.products || []).filter(Boolean),
      shops: (wishlist.shops || []).filter(Boolean),
    };

    return res.status(200).json({
      success: true,
      data: type !== "all" ? formattedData[type] : formattedData,
    });
  } catch (error) {
    console.error("Get User Wishlist Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve your wishlist.",
      error: error.message,
    });
  }
};

/**
 * DELETE /api/wishlist/clear/:type
 * Clears an entire array or whole wishlist ("offers", "products", "shops", or "all")
 */
export const clearWishlistSection = async (req, res) => {
  try {
    const { type } = req.params;
    const userId = req.user._id;

    let updateQuery = {};

    if (type === "all") {
      updateQuery = { $set: { offers: [], products: [], shops: [] } };
    } else if (["offers", "products", "shops"].includes(type)) {
      updateQuery = { $set: { [type]: [] } };
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid type. Provide 'offers', 'products', 'shops', or 'all'.",
      });
    }

    await Wishlist.findOneAndUpdate({ userId }, updateQuery);

    return res.status(200).json({
      success: true,
      message: `Wishlist section '${type}' cleared successfully.`,
    });
  } catch (error) {
    console.error("Clear Wishlist Section Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to clear wishlist section.",
      error: error.message,
    });
  }
};

export const removeItemFromWishlist = async (req, res) => {
  try {
    const { type, itemId } = req.params;
    const userId = req.user._id;

    // 1. Validate entity type
    const validTypes = ["offers", "products", "shops"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid wishlist target type. Must be 'offers', 'products', or 'shops'.",
      });
    }

    // 2. Remove the single item using $pull
    const updatedWishlist = await Wishlist.findOneAndUpdate(
      { userId },
      { $pull: { [type]: itemId } },
      { new: true }
    );

    if (!updatedWishlist) {
      return res.status(404).json({
        success: false,
        message: "Wishlist not found for this user.",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Item successfully removed from your ${type} wishlist.`,
      data: {
        type,
        remainingCount: (updatedWishlist[type] || []).length,
      },
    });

  } catch (error) {
    console.error("Remove Single Wishlist Item Error:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while removing the item from your wishlist.",
      error: error.message,
    });
  }
};