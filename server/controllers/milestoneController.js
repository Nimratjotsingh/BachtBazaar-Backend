import mongoose from "mongoose";
import UserMilestoneGoal from "../models/userMilestone.js";
import OfferRedemption from "../models/offerRedemptionModel.js";
import MerchantShop from "../models/merchantShopModel.js";
import User from "../models/userModel.js";

/**
 * GET /api/merchant/milestones/eligible-users
 * Returns users who have interacted with this merchant (Redemptions, Claims, Footfalls)
 */
export const getInteractedUsersForMerchant = async (req, res) => {
  try {
    const merchantId = req.merchant._id;

    // Aggregate user interactions from OfferRedemptions / Daily Metrics
    const userStats = await OfferRedemption.aggregate([
      {
        $match: {
          merchantId: new mongoose.Types.ObjectId(merchantId),
        },
      },
      {
        $group: {
          _id: "$userId",
          totalRedemptions: {
            $sum: { $cond: [{ $eq: ["$status", "redeemed"] }, 1, 0] },
          },
          totalClaims: {
            $sum: { $cond: [{ $eq: ["$status", "claimed"] }, 1, 0] },
          },
          lastInteractionAt: { $max: "$createdAt" },
        },
      },
      { $sort: { lastInteractionAt: -1 } },
      { $limit: 100 },
    ]);

    // Populate user profile info
    const userIds = userStats.map((item) => item._id).filter(Boolean);
    const users = await User.find({ _id: { $in: userIds } })
      .select("name phone profileImage")
      .lean();

    const userMap = {};
    users.forEach((u) => {
      userMap[u._id.toString()] = u;
    });

    const formattedList = userStats
      .map((item) => {
        const u = userMap[item._id?.toString()];
        if (!u) return null;
        return {
          userId: u._id,
          name: u.name,
          phone: u.phone,
          profileImage: u.profileImage,
          totalRedemptions: item.totalRedemptions,
          totalClaims: item.totalClaims,
          lastInteractionAt: item.lastInteractionAt,
        };
      })
      .filter(Boolean);

    return res.status(200).json({
      success: true,
      count: formattedList.length,
      data: formattedList,
    });
  } catch (error) {
    console.error("Get Interacted Users Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/merchant/milestones/create
 * Creates custom progress bars / goals for one or multiple specific users.
 */
export const createMilestoneGoal = async (req, res) => {
  try {
    const merchantId = req.merchant._id;
    const {
      userIds, // Array of User IDs or a single userId
      title,
      actionType, // "REDEEM", "CLAIM", "OFFER_CLICK", "FOOTFALL_VISIT"
      targetCount,
      rewardDescription,
      expiryDays = 90,
    } = req.body;

    if (!userIds || !title || !actionType || !targetCount || !rewardDescription) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters.",
      });
    }

    const shop = await MerchantShop.findOne({ merchantId }).select("_id");
    // if (!shop) {
    //   return res.status(404).json({
    //     success: false,
    //     message: "Merchant shop not configured.",
    //   });
    // }

    const targetUserIdsArray = Array.isArray(userIds) ? userIds : [userIds];
    const expiresAt = new Date(Date.now() + Number(expiryDays) * 24 * 60 * 60 * 1000);

    const goalDocuments = targetUserIdsArray.map((uId) => ({
      merchantId,
      shopId: shop? shop._id :null,
      userId: uId,
      title: title.trim(),
      actionType,
      targetCount: Number(targetCount),
      currentCount: 0,
      rewardDescription: rewardDescription.trim(),
      status: "IN_PROGRESS",
      expiresAt,
    }));

    const result = await UserMilestoneGoal.insertMany(goalDocuments);

    return res.status(201).json({
      success: true,
      message: `Progress milestone assigned to ${result.length} user(s).`,
      data: result,
    });
  } catch (error) {
    console.error("Create Milestone Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};