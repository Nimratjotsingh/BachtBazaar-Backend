import MerchantGoal from "../models/merchantGoalModel.js";
import Product from "../models/productModel.js";
import Service from "../models/serviceModel.js";
import Offer from "../models/offerModel.js";
import OfferRedemption from "../models/offerRedemptionModel.js";

// Helper function mapped to offerSchema's `display_type` enum ["banner", "calendar", "all"]
const getDisplayTypeFilter = (constraint) => {
  if (!constraint || constraint === "ALL") return {};
  return { display_type: constraint.toLowerCase() };
};

/**
 * POST /api/merchant/goals
 * Create a new self-assigned progress goal
 */
export const createMerchantGoal = async (req, res) => {
  try {
    const merchantId = req.merchant._id;
    const {
      title,
      metricType,
      offerTypeConstraint,
      targetValue,
      timeframeType,
      startDate,
      endDate,
    } = req.body;

    if (!title || !metricType || !targetValue) {
      return res.status(400).json({
        success: false,
        message: "Title, metricType, and targetValue are mandatory fields.",
      });
    }

    const now = new Date();
    let start = new Date();
    let end = new Date();

    if (timeframeType === "WEEKLY") {
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 7);
      end.setHours(23, 59, 59, 999);
    } else if (timeframeType === "MONTHLY") {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (timeframeType === "CUSTOM") {
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: "Custom timeframe requires valid startDate and endDate.",
        });
      }
      start = new Date(startDate);
      end = new Date(endDate);
    }

    const newGoal = new MerchantGoal({
      merchantId,
      title: title.trim(),
      metricType,
      offerTypeConstraint: offerTypeConstraint || "ALL",
      targetValue: Number(targetValue),
      timeframeType: timeframeType || "MONTHLY",
      startDate: start,
      endDate: end,
    });

    await newGoal.save();

    return res.status(201).json({
      success: true,
      message: "Personal growth goal created successfully.",
      data: newGoal,
    });
  } catch (error) {
    console.error("Create Merchant Goal Exception:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while creating the goal.",
      error: error.message,
    });
  }
};

/**
 * GET /api/merchant/goals
 * Retrieve all self-set goals and calculate real-time progress
 */
export const getMerchantGoals = async (req, res) => {
  try {
    const merchantId = req.merchant._id;

    const goals = await MerchantGoal.find({
      merchantId,
      is_active: true,
    })
      .sort({ createdAt: -1 })
      .lean();

    const evaluatedGoals = [];

    for (const goal of goals) {
      const { startDate, endDate } = goal;
      let count = 0;

      if (goal.metricType === "PRODUCTS_CREATED") {
        count = await Product.countDocuments({
          merchant_id: merchantId,
          is_deleted: false,
          createdAt: { $gte: startDate, $lte: endDate },
        });
      } else if (goal.metricType === "SERVICES_CREATED") {
        count = await Service.countDocuments({
          merchant_id: merchantId,
          is_deleted: false,
          createdAt: { $gte: startDate, $lte: endDate },
        });
      } else if (goal.metricType === "OFFERS_CREATED") {
        count = await Offer.countDocuments({
          merchant_id: merchantId,
          is_deleted: false,
          is_draft: false,
          ...getDisplayTypeFilter(goal.offerTypeConstraint),
          createdAt: { $gte: startDate, $lte: endDate },
        });
      } else if (goal.metricType === "REDEMPTIONS_COMPLETED") {
        count = await OfferRedemption.countDocuments({
          merchantId,
          status: "redeemed",
          updatedAt: { $gte: startDate, $lte: endDate },
        });
      } else if (goal.metricType === "CLAIMS_HANDLED") {
        count = await OfferRedemption.countDocuments({
          merchantId,
          createdAt: { $gte: startDate, $lte: endDate },
        });
      }

      const isCompleted = count >= goal.targetValue;

      // Automatically update completion flag in DB when goal is reached
      if (isCompleted && !goal.isCompleted) {
        await MerchantGoal.findByIdAndUpdate(goal._id, {
          isCompleted: true,
          completedAt: new Date(),
        });
      }

      const currentProgress = Math.min(count, goal.targetValue);
      const progressPercentage = Math.min(
        100,
        Math.round((count / goal.targetValue) * 100)
      );

      evaluatedGoals.push({
        ...goal,
        currentProgress,
        progressPercentage,
        isCompleted,
      });
    }

    return res.status(200).json({
      success: true,
      total: evaluatedGoals.length,
      data: evaluatedGoals,
    });
  } catch (error) {
    console.error("Get Merchant Goals Exception:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while evaluating goals.",
      error: error.message,
    });
  }
};

/**
 * DELETE /api/merchant/goals/:id
 * Deactivate / Remove a self-set goal
 */
export const deleteMerchantGoal = async (req, res) => {
  try {
    const { id } = req.params;
    const merchantId = req.merchant._id;

    const goal = await MerchantGoal.findOneAndUpdate(
      { _id: id, merchantId },
      { is_active: false },
      { new: true }
    );

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: "Goal not found or unauthorized.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Personal goal deleted successfully.",
    });
  } catch (error) {
    console.error("Delete Merchant Goal Exception:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while deleting the goal.",
      error: error.message,
    });
  }
};