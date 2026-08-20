import User from "../models/userModel.js";
import Referral from "../models/Referal.js";
import { generateUniqueReferralCode } from "../utils/referalHelper.js";

/**
 * GET /api/user/referrals/my-code
 * Get user's referral code and share link (generates one if missing)
 */
export const getMyReferralCode = async (req, res) => {
  try {
    const userId = req.user._id;
    let user = await User.findById(userId).select("referralCode referralCount");

    if (!user.referralCode) {
      user.referralCode = await generateUniqueReferralCode();
      await user.save();
    }

    

    return res.status(200).json({
      success: true,
      data: {
        referralCode: user.referralCode,
        
        totalReferrals: user.referralCount || 0,
      },
    });
  } catch (error) {
    console.error("Get Referral Code Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/user/referrals/list
 * Get list of friends who registered with user's referral code
 */
export const getMyReferralsList = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Number(limit));
    const skip = (pageNum - 1) * limitNum;

    const [referrals, total] = await Promise.all([
      Referral.find({ referrerId: userId })
        .populate("referredUserId", "name phone profileImage createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Referral.countDocuments({ referrerId: userId }),
    ]);

    const formatted = referrals.map((ref) => ({
      _id: ref._id,
      user: ref.referredUserId,
      joinedAt: ref.createdAt,
    }));

    return res.status(200).json({
      success: true,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      data: formatted,
    });
  } catch (error) {
    console.error("Get Referrals List Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};