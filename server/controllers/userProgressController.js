import UserMilestoneGoal from "../models/userMilestone.js";

/**
 * GET /api/user/milestones
 * Returns all active progress bars and earned rewards for the customer.
 */
export const getMyMilestoneGoals = async (req, res) => {
  try {
    const userId = req.user._id;

    const milestones = await UserMilestoneGoal.find({
      userId,
      status: { $in: ["IN_PROGRESS", "COMPLETED", "CLAIMED"] },
    })
      .populate("shopId", "shopName logo banner city address")
      .sort({ status: 1, createdAt: -1 })
      .lean();

    const formatted = milestones.map((item) => {
      const percentage = Math.min(
        100,
        Math.round((item.currentCount / item.targetCount) * 100)
      );

      return {
        _id: item._id,
        title: item.title,
        actionType: item.actionType,
        rewardDescription: item.rewardDescription,
        rewardClaimCode: item.status === "COMPLETED" ? item.rewardClaimCode : null,
        currentCount: item.currentCount,
        targetCount: item.targetCount,
        progressPercentage: percentage,
        isCompleted: item.status === "COMPLETED" || item.status === "CLAIMED",
        status: item.status,
        expiresAt: item.expiresAt,
        shop: item.shopId,
      };
    });

    return res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (error) {
    console.error("Get User Milestones Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};