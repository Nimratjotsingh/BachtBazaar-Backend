import League from "../models/LeagueModel.js";
import Task from "../models/TaskModel.js";
import MerchantProgress from "../models/MerchantProgress.js";
import MerchantWallet from "../models/MerchantWallet.js";
import CoinSettings from "../models/CoinSettings.js";
import Product from "../models/productModel.js";
import Service from "../models/serviceModel.js";
import Offer from "../models/offerModel.js";
import OfferRedemption from "../models/offerRedemptionModel.js";

// Import Coin Crediting Helper
import { creditMerchantBachatCoins } from "../utils/creditMerchantCoins.js";
import { calculateLeagueCycleEndDate } from "../utils/leagueCycleHelper.js";

// Helper function to build Offer filter based on constraint type
const getOfferTypeFilter = (constraint) => {
  if (!constraint || constraint === "ALL") return {};
  return { display_type: constraint.toLowerCase() };
};

// ==========================================
// 1. ADMIN LEAGUE MANAGEMENT CONTROLLERS
// ==========================================

/**
 * POST /api/admin/leagues
 * Create a new league tier (e.g., Silver, Gold, Platinum, Diamond) with Bachat Coin Rewards
 */
export const createLeague = async (req, res) => {
  try {
    const {
      name,
      tierRank,
      minPointsRequired,
      rewardCoins,
      validityDaysOverride,
      themeColor,
      description,
      cycleType,
      startDate,
      endDate,
      perks,
    } = req.body;

    if (!name || tierRank === undefined || minPointsRequired === undefined) {
      return res.status(400).json({
        success: false,
        message: "League name, tier rank, and minimum points required are mandatory fields.",
      });
    }

    const existingLeague = await League.findOne({ $or: [{ name }, { tierRank }] });
    if (existingLeague) {
      return res.status(400).json({
        success: false,
        message: "A league with this name or tier rank already exists.",
      });
    }

    let badgeIcon = req.body.badgeIcon || "";
    if (req.file) {
      badgeIcon = `/uploads/${req.file.filename}`;
    }

    let parsedPerks = [];
    if (typeof perks === "string") {
      parsedPerks = perks.split(",").map((p) => p.trim()).filter(Boolean);
    } else if (Array.isArray(perks)) {
      parsedPerks = perks;
    }

    const newLeague = new League({
      name: name.trim(),
      tierRank: Number(tierRank),
      minPointsRequired: Number(minPointsRequired),
      rewardCoins: Number(rewardCoins || 0),
      validityDaysOverride: validityDaysOverride ? Number(validityDaysOverride) : null,
      badgeIcon,
      themeColor: themeColor || "#3B82F6",
      description: description ? description.trim() : "",
      cycleType: cycleType || "monthly",
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      perks: parsedPerks,
      createdBy: req.admin?._id || req.user?._id,
    });

    await newLeague.save();

    return res.status(201).json({
      success: true,
      message: "League tier created successfully.",
      data: newLeague,
    });
  } catch (error) {
    console.error("Create League Exception:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while creating the league tier.",
      error: error.message,
    });
  }
};

/**
 * GET /api/admin/leagues
 * Fetch all configured leagues
 */
export const getAllLeagues = async (req, res) => {
  try {
    const leagues = await League.find({ is_active: true })
      .sort({ tierRank: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      total: leagues.length,
      data: leagues,
    });
  } catch (error) {
    console.error("Get All Leagues Exception:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve league tiers.",
      error: error.message,
    });
  }
};

/**
 * PUT /api/admin/leagues/:id
 */
export const updateLeague = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    if (req.file) {
      updates.badgeIcon = `/uploads/${req.file.filename}`;
    }

    if (typeof updates.perks === "string") {
      updates.perks = updates.perks.split(",").map((p) => p.trim()).filter(Boolean);
    }

    const league = await League.findByIdAndUpdate(id, updates, { new: true });

    if (!league) {
      return res.status(404).json({ success: false, message: "League record not found." });
    }

    return res.status(200).json({
      success: true,
      message: "League configuration updated successfully.",
      data: league,
    });
  } catch (error) {
    console.error("Update League Exception:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while updating the league tier.",
      error: error.message,
    });
  }
};

/**
 * DELETE /api/admin/leagues/:id
 */
export const deleteLeague = async (req, res) => {
  try {
    const { id } = req.params;
    const league = await League.findByIdAndDelete(id);

    if (!league) {
      return res.status(404).json({ success: false, message: "League record not found." });
    }

    return res.status(200).json({ success: true, message: "League tier deactivated successfully." });
  } catch (error) {
    console.error("Delete League Exception:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while deactivating the league tier.",
      error: error.message,
    });
  }
};

// ==========================================
// 2. ADMIN TASK MANAGEMENT CONTROLLERS
// ==========================================

/**
 * POST /api/admin/tasks
 * Create a new task with offerTypeConstraint support
 */
export const createTask = async (req, res) => {
  try {
    const {
      title,
      description,
      leagueId,
      metricType,
      offerTypeConstraint,
      targetValue,
      pointsReward,
      rewardCoins,
      validityDaysOverride,
      startDate,
      endDate,
    } = req.body;

    if (!title || !leagueId || !metricType || !targetValue || !pointsReward) {
      return res.status(400).json({
        success: false,
        message: "Title, leagueId, metricType, targetValue, and pointsReward are required fields.",
      });
    }

    const newTask = new Task({
      title: title.trim(),
      description: description ? description.trim() : "",
      leagueId,
      metricType,
      offerTypeConstraint: offerTypeConstraint || "ALL",
      targetValue: Number(targetValue),
      pointsReward: Number(pointsReward),
      rewardCoins: Number(rewardCoins || 0),
      validityDaysOverride: validityDaysOverride ? Number(validityDaysOverride) : null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      createdBy: req.admin?._id || req.user?._id,
    });

    await newTask.save();

    return res.status(201).json({
      success: true,
      message: "Gamification task created successfully.",
      data: newTask,
    });
  } catch (error) {
    console.error("Create Task Exception:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while creating the task.",
      error: error.message,
    });
  }
};

/**
 * GET /api/admin/tasks
 */
export const getAllTasks = async (req, res) => {
  try {
    const { leagueId } = req.query;
    const query = { is_active: true };

    if (leagueId) query.leagueId = leagueId;

    const tasks = await Task.find(query)
      .populate("leagueId", "name tierRank badgeIcon themeColor")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ success: true, total: tasks.length, data: tasks });
  } catch (error) {
    console.error("Get All Tasks Exception:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve gamification tasks.",
      error: error.message,
    });
  }
};

/**
 * PUT /api/admin/tasks/:id
 */
export const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    const task = await Task.findByIdAndUpdate(id, updates, { new: true });
    if (!task) return res.status(404).json({ success: false, message: "Task record not found." });

    return res.status(200).json({ success: true, message: "Task updated successfully.", data: task });
  } catch (error) {
    console.error("Update Task Exception:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while updating the task.",
      error: error.message,
    });
  }
};

/**
 * DELETE /api/admin/tasks/:id
 */
export const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findByIdAndUpdate(id, { is_active: false }, { new: true });

    if (!task) return res.status(404).json({ success: false, message: "Task record not found." });

    return res.status(200).json({ success: true, message: "Task deactivated successfully." });
  } catch (error) {
    console.error("Delete Task Exception:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while deactivating the task.",
      error: error.message,
    });
  }
};

// ==========================================
// 3. DYNAMIC MERCHANT GAMIFICATION & WALLET ENGINE
// ==========================================

/**
 * GET /api/merchant/gamification/dashboard
 * Dynamic Gamification Dashboard with Offer Constraint Filtering & Auto Coin Crediting
 */
export const getMerchantGamificationDashboard = async (req, res) => {
  try {
    const merchantId = req.merchant._id;
    const now = new Date();

    // 1. Fetch active Leagues & Coin Settings
    const [allLeagues, coinSettings] = await Promise.all([
      League.find({ is_active: true }).sort({ tierRank: 1 }).lean(),
      CoinSettings.findOne({ isActive: true }).lean(),
    ]);

    if (allLeagues.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No active leagues configured by system administrator.",
      });
    }

    const lowestLeague = allLeagues[0];

    // 2. Fetch or Create Merchant Progress & Wallet
    let [progressDoc, walletDoc] = await Promise.all([
      MerchantProgress.findOne({ merchantId }),
      MerchantWallet.findOne({ merchant: merchantId }),
    ]);

    if (!walletDoc) {
      walletDoc = await MerchantWallet.create({ merchant: merchantId });
    }

    // 3. Cycle Expiry Check & Reset Logic
    let isCycleResetPerformed = false;

    if (progressDoc && progressDoc.currentCycleEndDate) {
      if (now > new Date(progressDoc.currentCycleEndDate)) {
        progressDoc.totalPoints = 0;
        progressDoc.currentLeagueId = lowestLeague._id;
        progressDoc.currentCycleEndDate = calculateLeagueCycleEndDate(
          lowestLeague.cycleType,
          lowestLeague.endDate
        );
        await progressDoc.save();
        isCycleResetPerformed = true;
      }
    } else {
      const initialCycleEnd = calculateLeagueCycleEndDate(
        lowestLeague.cycleType,
        lowestLeague.endDate
      );

      progressDoc = await MerchantProgress.findOneAndUpdate(
        { merchantId },
        {
          merchantId,
          currentLeagueId: lowestLeague._id,
          totalPoints: 0,
          currentCycleEndDate: initialCycleEnd,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    // Calculate cycle start as beginning of current month/cycle
    const cycleStartDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    // Extract login metrics from MerchantProgress
    const currentStreak = progressDoc?.currentLoginStreak || 0;
    const totalLoginsCount = progressDoc?.totalLogins || 0;

    // 4. Count live merchant activity
    const [
      productsCount,
      servicesCount,
      allOffersCount,
      bannerOffersCount,
      calendarOffersCount,
      allRedemptionsCount,
      claimsCount,
    ] = await Promise.all([
      Product.countDocuments({ merchant_id: merchantId, is_deleted: false, createdAt: { $gte: cycleStartDate } }),
      Service.countDocuments({ merchant_id: merchantId, is_deleted: false, createdAt: { $gte: cycleStartDate } }),
      
      Offer.countDocuments({ merchant_id: merchantId, is_deleted: false, is_draft: false, createdAt: { $gte: cycleStartDate } }),
      Offer.countDocuments({ merchant_id: merchantId, is_deleted: false, is_draft: false, ...getOfferTypeFilter("BANNER"), createdAt: { $gte: cycleStartDate } }),
      Offer.countDocuments({ merchant_id: merchantId, is_deleted: false, is_draft: false, ...getOfferTypeFilter("CALENDAR"), createdAt: { $gte: cycleStartDate } }),
      
      OfferRedemption.countDocuments({ merchantId, status: "redeemed", updatedAt: { $gte: cycleStartDate } }),
      OfferRedemption.countDocuments({ merchantId, createdAt: { $gte: cycleStartDate } }),
    ]);

    console.log("--- GAMIFICATION DEBUG COUNTS ---");
    console.log({
      merchantId: merchantId.toString(),
      allOffersCount,
      bannerOffersCount,
      calendarOffersCount,
      currentStreak,
      totalLoginsCount,
      cycleStartDate,
    });

    // 5. Evaluate Task Completions
    const allTasks = await Task.find({ is_active: true }).lean();
    let totalPoints = 0;
    const taskCompletionMap = new Map();

    for (const task of allTasks) {
      let currentStat = 0;

      if (task.metricType === "PRODUCTS_CREATED") {
        currentStat = productsCount;
      } else if (task.metricType === "SERVICES_CREATED") {
        currentStat = servicesCount;
      } else if (task.metricType === "OFFERS_CREATED") {
        if (task.offerTypeConstraint === "BANNER") currentStat = bannerOffersCount;
        else if (task.offerTypeConstraint === "CALENDAR") currentStat = calendarOffersCount;
        else currentStat = allOffersCount;
      } else if (task.metricType === "REDEMPTIONS_COMPLETED") {
        currentStat = allRedemptionsCount;
      } else if (task.metricType === "CLAIMS_HANDLED") {
        currentStat = claimsCount;
      } else if (task.metricType === "LOGIN_STREAK") {
        currentStat = currentStreak;
      } else if (task.metricType === "TOTAL_LOGINS") {
        currentStat = totalLoginsCount;
      }

      const isCompleted = currentStat >= task.targetValue;

      if (isCompleted) {
        totalPoints += task.pointsReward;

        const uniqueTaskBatchTag = `TASK_${task._id}_${cycleStartDate.getTime()}`;

        const isCoinRewarded = walletDoc.coinBatches.some(
          (batch) => batch.source === "MERCHANT_TASK" && batch.batchTag === uniqueTaskBatchTag
        );

        if (!isCoinRewarded && task.rewardCoins > 0) {
          await creditMerchantBachatCoins({
            merchantId,
            amount: task.rewardCoins,
            source: "MERCHANT_TASK",
            sourceId: task._id,
            batchTag: uniqueTaskBatchTag,
            customValidityDays: task.validityDaysOverride || coinSettings?.taskValidityDays,
          });

          walletDoc = await MerchantWallet.findOne({ merchant: merchantId });
        }
      }

      taskCompletionMap.set(task._id.toString(), {
        currentCount: Math.min(currentStat, task.targetValue),
        isCompleted,
      });
    }

    // 6. Calculate Current League Tier
    let currentLeague = allLeagues[0];
    let nextLeague = null;

    for (let i = 0; i < allLeagues.length; i++) {
      if (totalPoints >= allLeagues[i].minPointsRequired) {
        currentLeague = allLeagues[i];
        nextLeague = allLeagues[i + 1] || null;
      } else {
        break;
      }
    }

    // 7. Credit League Tier Coins
    const uniqueLeagueBatchTag = `LEAGUE_${currentLeague._id}_${cycleStartDate.getTime()}`;

    const isLeagueCoinsRewarded = walletDoc.coinBatches.some(
      (batch) =>
        batch.source === "MERCHANT_LEAGUE_REWARD" &&
        batch.batchTag === uniqueLeagueBatchTag
    );

    if (!isLeagueCoinsRewarded && currentLeague.rewardCoins > 0) {
      await creditMerchantBachatCoins({
        merchantId,
        amount: currentLeague.rewardCoins,
        source: "MERCHANT_LEAGUE_REWARD",
        sourceId: currentLeague._id,
        batchTag: uniqueLeagueBatchTag,
        customValidityDays:
          currentLeague.validityDaysOverride || coinSettings?.leagueRewardValidityDays,
      });

      walletDoc = await MerchantWallet.findOne({ merchant: merchantId });
    }

    // Update Progress Document
    const nextCycleEnd =
      progressDoc.currentCycleEndDate ||
      calculateLeagueCycleEndDate(currentLeague.cycleType, currentLeague.endDate);

    await MerchantProgress.findOneAndUpdate(
      { merchantId },
      {
        merchantId,
        currentLeagueId: currentLeague._id,
        totalPoints,
        currentCycleEndDate: nextCycleEnd,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // 8. Prepare Response
    const currentLeagueMinPoints = currentLeague.minPointsRequired;
    const currentLeagueMaxPoints = nextLeague ? nextLeague.minPointsRequired : null;
    const totalPointsInCurrentLeague = nextLeague
      ? nextLeague.minPointsRequired - currentLeagueMinPoints
      : 0;
    const pointsEarnedInCurrentLevel = totalPoints - currentLeagueMinPoints;

    const currentLeagueTasks = allTasks
      .filter((t) => t.leagueId.toString() === currentLeague._id.toString())
      .map((task) => {
        const progress = taskCompletionMap.get(task._id.toString());
        return {
          taskId: task._id,
          title: task.title,
          description: task.description,
          metricType: task.metricType,
          offerTypeConstraint: task.offerTypeConstraint || "ALL",
          targetValue: task.targetValue,
          pointsReward: task.pointsReward,
          rewardCoins: task.rewardCoins,
          validityDays: task.validityDaysOverride || coinSettings?.taskValidityDays || 30,
          currentCount: progress ? progress.currentCount : 0,
          isCompleted: progress ? progress.isCompleted : false,
        };
      });

    const updatedWallet = await MerchantWallet.findOne({ merchant: merchantId });
    const activeBatches = updatedWallet.coinBatches.filter(
      (b) => !b.isExpired && new Date(b.expiresAt) > now && b.remainingAmount > 0
    );
    const calculatedCoinBalance = activeBatches.reduce((acc, b) => acc + b.remainingAmount, 0);

    return res.status(200).json({
      success: true,
      data: {
        totalPoints,
        pointsEarnedInCurrentLevel,
        totalPointsInCurrentLeague,
        currentLeagueMinPoints,
        currentLeagueMaxPoints,
        currentLeague,
        nextLeague,
        currentCycleEndDate: nextCycleEnd,
        isCycleResetPerformed,
        pointsToNextLeague: nextLeague
          ? Math.max(0, nextLeague.minPointsRequired - totalPoints)
          : 0,
        merchantStats: {
          PRODUCTS_CREATED: productsCount,
          SERVICES_CREATED: servicesCount,
          OFFERS_CREATED: allOffersCount,
          BANNER_OFFERS_CREATED: bannerOffersCount,
          CALENDAR_OFFERS_CREATED: calendarOffersCount,
          REDEMPTIONS_COMPLETED: allRedemptionsCount,
          CLAIMS_HANDLED: claimsCount,
          LOGIN_STREAK: currentStreak,
          TOTAL_LOGINS: totalLoginsCount,
          STORE_VIEWS: 0,
        },
        walletSummary: {
          totalBalance: calculatedCoinBalance,
          lifetimeEarned: updatedWallet.lifetimeEarned,
          lifetimeSpent: updatedWallet.lifetimeSpent,
          activeBatches,
        },
        tasks: currentLeagueTasks,
      },
    });
  } catch (error) {
    console.error("Merchant Gamification Dashboard Exception:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while evaluating merchant gamification status.",
      error: error.message,
    });
  }
};

/**
 * GET /api/merchant/gamification/leaderboard
 */
export const getLeagueLeaderboard = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const leaderboard = await MerchantProgress.find()
      .populate("merchantId", "name email profileImage storeName")
      .populate("currentLeagueId", "name badgeIcon themeColor")
      .sort({ totalPoints: -1 })
      .limit(Number(limit))
      .lean();

    return res.status(200).json({
      success: true,
      total: leaderboard.length,
      data: leaderboard,
    });
  } catch (error) {
    console.error("Get Leaderboard Exception:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve league leaderboard.",
      error: error.message,
    });
  }
};