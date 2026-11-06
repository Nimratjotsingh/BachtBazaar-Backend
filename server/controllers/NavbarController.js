import UserNavbarState from "../models/NavbarStateModel.js";

/**
 * GET /api/navbar-state
 * Fetches the current navbar indicator states for the authenticated user or merchant.
 */
export const getUserNavbarState = async (req, res) => {
  try {
    const authId = req.user?._id || req.merchant?._id;
    const entityType = req.user ? "User" : req.merchant ? "Merchant" : null;

    if (!authId || !entityType) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    let navState = await UserNavbarState.findOne({ entityId: authId, entityType })
      .populate("delivery.entityId")
      .populate("bestPriceRequest.entityId")
      .populate("merchantBid.entityId")
      .lean();

    // If no document exists yet, initialize a default empty state
    if (!navState) {
      navState = await UserNavbarState.create({
        entityId: authId,
        entityType,
      });
    }

    return res.status(200).json({
      success: true,
      data: navState,
    });
  } catch (error) {
    console.error("Get Navbar State Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve navbar state.",
      error: error.message,
    });
  }
};

/**
 * POST /api/navbar-state
 * Adds or updates a navbar indicator for a specific feature.
 * Body: { targetId, targetType: "User" | "Merchant", feature: "delivery" | "bestPriceRequest" | "merchantBid", entityId }
 */
export const setNavbarIndicator = async (req, res) => {
  try {
    const authId = req.user?._id || req.merchant?._id;
    const { targetId, targetType, feature, entityId } = req.body;

    if (!authId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const recipientId = targetId || authId;
    const recipientType = targetType || (req.user ? "User" : "Merchant");

    if (!feature || !entityId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (feature, entityId).",
      });
    }

    const validFeatures = ["delivery", "bestPriceRequest", "merchantBid"];
    if (!validFeatures.includes(feature)) {
      return res.status(400).json({
        success: false,
        message: "Invalid feature type specified.",
      });
    }

    const updateQuery = {
      [`${feature}.entityId`]: entityId,
      [`${feature}.isClosed`]: false, // Re-open indicator when a new event occurs
      [`${feature}.updatedAt`]: new Date(),
    };

    const navState = await UserNavbarState.findOneAndUpdate(
      { entityId: recipientId, entityType: recipientType },
      { $set: updateQuery },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.status(201).json({
      success: true,
      message: `Navbar indicator for ${feature} updated successfully.`,
      data: navState,
    });
  } catch (error) {
    console.error("Set Navbar Indicator Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to set navbar indicator.",
      error: error.message,
    });
  }
};

/**
 * PATCH /api/navbar-state/close
 * Dismisses/closes a specific navbar indicator (sets isClosed = true).
 * Body: { feature: "delivery" | "bestPriceRequest" | "merchantBid" }
 */
export const closeNavbarIndicator = async (req, res) => {
  try {
    const authId = req.user?._id || req.merchant?._id;
    const entityType = req.user ? "User" : req.merchant ? "Merchant" : null;
    const { feature } = req.body;

    if (!authId || !entityType) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const validFeatures = ["delivery", "bestPriceRequest", "merchantBid"];
    if (!validFeatures.includes(feature)) {
      return res.status(400).json({
        success: false,
        message: "Invalid feature type specified.",
      });
    }

    const updateQuery = {
      [`${feature}.isClosed`]: true,
      [`${feature}.updatedAt`]: new Date(),
    };

    const navState = await UserNavbarState.findOneAndUpdate(
      { entityId: authId, entityType },
      { $set: updateQuery },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      success: true,
      message: `Navbar indicator for ${feature} closed successfully.`,
      data: navState,
    });
  } catch (error) {
    console.error("Close Navbar Indicator Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update navbar state.",
      error: error.message,
    });
  }
};

/**
 * INTERNAL HELPER FUNCTION
 * Updates or attaches an active entity ID to a target entity's navbar state (User or Merchant) and marks it active.
 * 
 * @param {string|ObjectId} recipientId 
 * @param {string} recipientType - "User" | "Merchant"
 * @param {string} feature - "delivery" | "bestPriceRequest" | "merchantBid"
 * @param {string|ObjectId} entityId 
 */
export const updateUserNavbarIndicator = async (recipientId, recipientType, feature, entityId) => {
  try {
    const validFeatures = ["delivery", "bestPriceRequest", "merchantBid"];
    if (!validFeatures.includes(feature) || !recipientId || !recipientType || !entityId) return;

    const updateQuery = {
      [`${feature}.entityId`]: entityId,
      [`${feature}.isClosed`]: false, // Re-open indicator when a new event occurs
      [`${feature}.updatedAt`]: new Date(),
    };

    await UserNavbarState.findOneAndUpdate(
      { entityId: recipientId, entityType: recipientType },
      { $set: updateQuery },
      { upsert: true, setDefaultsOnInsert: true }
    );
  } catch (error) {
    console.error(`Update Navbar Indicator (${feature}) Error:`, error);
  }
};