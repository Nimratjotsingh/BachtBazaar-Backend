import User from "../models/userModel.js";

const DEFAULT_RADIUS_KM = 5;
const MIN_RADIUS_KM = 1;
const MAX_RADIUS_KM = 100;

/**
 * 1. Get Current User Discovery Radius
 * GET /api/users/radius
 */
export const getUserRadius = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select("defaultRadius latitude longitude city");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User account not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        radius: user.defaultRadius ?? DEFAULT_RADIUS_KM,
        unit: "km",
        location: {
          latitude: user.latitude,
          longitude: user.longitude,
          city: user.city,
        },
      },
    });
  } catch (error) {
    console.error("Get user radius error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve discovery radius.",
      error: error.message,
    });
  }
};

/**
 * 2. Update Discovery Radius
 * PATCH /api/users/radius
 */
export const updateUserRadius = async (req, res) => {
  try {
    const userId = req.user._id;
    const { radius } = req.body;

    // Check if radius is supplied and is a valid number
    const parsedRadius = Number(radius);

    if (radius === undefined || isNaN(parsedRadius)) {
      return res.status(400).json({
        success: false,
        message: "A valid numeric radius is required.",
      });
    }

    if (parsedRadius < MIN_RADIUS_KM || parsedRadius > MAX_RADIUS_KM) {
      return res.status(400).json({
        success: false,
        message: `Radius must be between ${MIN_RADIUS_KM} km and ${MAX_RADIUS_KM} km.`,
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { defaultRadius: parsedRadius } },
      { new: true, runValidators: true }
    ).select("defaultRadius latitude longitude city");

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User account not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Discovery radius updated successfully.",
      data: {
        radius: updatedUser.defaultRadius,
        unit: "km",
      },
    });
  } catch (error) {
    console.error("Update user radius error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to update discovery radius.",
      error: error.message,
    });
  }
};

/**
 * 3. Reset Discovery Radius to Default (5 km)
 * POST /api/users/radius/reset
 */
export const resetUserRadius = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { defaultRadius: DEFAULT_RADIUS_KM } },
      { new: true }
    ).select("defaultRadius");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User account not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Radius reset to default ${DEFAULT_RADIUS_KM} km.`,
      data: {
        radius: user.defaultRadius,
        unit: "km",
      },
    });
  } catch (error) {
    console.error("Reset user radius error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to reset discovery radius.",
      error: error.message,
    });
  }
};