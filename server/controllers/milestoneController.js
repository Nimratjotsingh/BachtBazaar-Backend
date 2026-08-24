import mongoose from "mongoose";
import UserMilestoneGoal from "../models/userMilestone.js";
import OfferRedemption from "../models/offerRedemptionModel.js";
import MerchantShop from "../models/merchantShopModel.js";
import User from "../models/userModel.js";

/**
 * GET /api/merchant/milestones/eligible-users
 * Returns users who have interacted with this merchant (Redemptions, Claims, Footfalls)
 */

export const getCreatedMilestonesForMerchant = async (req, res) => {
  try {
    const merchantId = req.merchant._id;
    const { page = 1, limit = 20, status, actionType, userId } = req.query;

    const query = {
      merchantId,
    };

    if (status && status !== "ALL") {
      query.status = status;
    }

    if (actionType && actionType !== "ALL") {
      query.actionType = actionType;
    }

    if (userId) {
      query.userId = userId;
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Number(limit));
    const skip = (pageNum - 1) * limitNum;

    const [milestones, total, stats] = await Promise.all([
      UserMilestoneGoal.find(query)
        .populate("userId", "name phone profileImage avatar image email")
        .populate("shopId", "shopName address city")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      UserMilestoneGoal.countDocuments(query),
      UserMilestoneGoal.aggregate([
        { $match: { merchantId } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    // Format metrics summary for merchant dashboard
    const metrics = {
      total: 0,
      inProgress: 0,
      completed: 0,
      claimed: 0,
      cancelled: 0,
      expired: 0,
    };

    stats.forEach((item) => {
      metrics.total += item.count;
      if (item._id === "IN_PROGRESS") metrics.inProgress = item.count;
      if (item._id === "COMPLETED") metrics.completed = item.count;
      if (item._id === "CLAIMED") metrics.claimed = item.count;
      if (item._id === "CANCELLED") metrics.cancelled = item.count;
      if (item._id === "EXPIRED") metrics.expired = item.count;
    });

    const formattedList = milestones.map((goal) => {
      const user = goal.userId;
      const resolvedProfileImage =
        user?.profileImage?.url ||
        user?.profileImage ||
        user?.avatar?.url ||
        user?.avatar ||
        user?.image ||
        null;

      const progressPercentage = Math.min(
        100,
        Math.round(((goal.currentCount || 0) / (goal.targetCount || 1)) * 100)
      );

      return {
        _id: goal._id,
        title: goal.title,
        actionType: goal.actionType,
        targetCount: goal.targetCount,
        currentCount: goal.currentCount,
        progressPercentage,
        rewardDescription: goal.rewardDescription,
        rewardClaimCode: goal.rewardClaimCode,
        status: goal.status,
        expiresAt: goal.expiresAt,
        completedAt: goal.completedAt,
        claimedAt: goal.claimedAt,
        createdAt: goal.createdAt,
        user: user
          ? {
              _id: user._id,
              name: user.name,
              phone: user.phone,
              email: user.email,
              profileImage: resolvedProfileImage,
            }
          : null,
        shop: goal.shopId || null,
      };
    });

    return res.status(200).json({
      success: true,
      metrics,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      data: formattedList,
    });
  } catch (error) {
    console.error("Get Created Milestones Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch created milestones.",
      error: error.message,
    });
  }
};

/**
 * PATCH /api/merchant/milestones/:id/cancel
 * Cancel an active milestone created by this merchant
 */
export const cancelMilestoneGoal = async (req, res) => {
  try {
    const merchantId = req.merchant._id;
    const { id } = req.params;

    const goal = await UserMilestoneGoal.findOneAndUpdate(
      { _id: id, merchantId, status: "IN_PROGRESS" },
      { $set: { status: "CANCELLED" } },
      { new: true }
    );

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: "Active milestone not found or already completed/cancelled.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Milestone goal cancelled successfully.",
      data: goal,
    });
  } catch (error) {
    console.error("Cancel Milestone Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to cancel milestone.",
      error: error.message,
    });
  }
};
export const getInteractedUsersForMerchant = async (req, res) => {
  try {
    const merchantId = req.merchant._id;

    // 1. Aggregate OfferRedemptions by userId for the authenticated merchant
    const userStats = await OfferRedemption.aggregate([
      {
        $match: {
          merchantId: new mongoose.Types.ObjectId(merchantId),
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: "$userId",
          totalInteractions: { $sum: 1 },
          totalRedemptions: {
            $sum: { $cond: [{ $eq: ["$status", "redeemed"] }, 1, 0] },
          },
          totalClaims: {
            $sum: { $cond: [{ $eq: ["$status", "claimed"] }, 1, 0] },
          },
          lastInteractionAt: { $max: "$createdAt" },
          interactions: {
            $push: {
              _id: "$_id",
              offerId: "$offerId",
              shopId: "$shopId",
              redemptionCode: "$redemptionCode",
              status: "$status",
              claimedAt: "$claimedAt",
              redeemedAt: "$redeemedAt",
              expiresAt: "$expiresAt",
              createdAt: "$createdAt",
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          totalInteractions: 1,
          totalRedemptions: 1,
          totalClaims: 1,
          lastInteractionAt: 1,
          interactions: 1,
          claimsHistory: {
            $filter: {
              input: "$interactions",
              as: "item",
              cond: { $eq: ["$$item.status", "claimed"] },
            },
          },
          redemptionsHistory: {
            $filter: {
              input: "$interactions",
              as: "item",
              cond: { $eq: ["$$item.status", "redeemed"] },
            },
          },
        },
      },
      { $sort: { lastInteractionAt: -1 } },
      { $limit: 100 },
    ]);

    // 2. Fetch User profiles with full profile image fallbacks
    const userIds = userStats.map((item) => item._id).filter(Boolean);
    const users = await User.find({ _id: { $in: userIds } })
      .select("name phone profileImage avatar image email createdAt")
      .lean();

    const userMap = {};
    users.forEach((u) => {
      const resolvedProfileImage =
        u.profileImage?.url ||
        u.profileImage ||
        u.avatar?.url ||
        u.avatar ||
        u.image ||
        null;

      userMap[u._id.toString()] = {
        ...u,
        profileImage: resolvedProfileImage,
      };
    });

    // 3. Populate Offer & Shop documents across all nested arrays
    const populatedList = await OfferRedemption.populate(userStats, [
      {
        path: "claimsHistory.offerId redemptionsHistory.offerId interactions.offerId",
        select: "title description discount_percentage discount_value thumbnail code",
      },
      {
        path: "claimsHistory.shopId redemptionsHistory.shopId interactions.shopId",
        select: "shopName address city",
      },
    ]);

    // 4. Construct response payload
    const formattedList = populatedList
      .map((item) => {
        const u = userMap[item._id?.toString()];
        if (!u) return null;
        return {
          userId: u._id,
          name: u.name,
          phone: u.phone,
          email: u.email,
          profileImage: u.profileImage,
          totalInteractions: item.totalInteractions,
          totalRedemptions: item.totalRedemptions,
          totalClaims: item.totalClaims,
          lastInteractionAt: item.lastInteractionAt,
          claimsHistory: item.claimsHistory,
          redemptionsHistory: item.redemptionsHistory,
          allInteractions: item.interactions,
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
    return res.status(500).json({
      success: false,
      message: "Failed to load customer interactions history.",
      error: error.message,
    });
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