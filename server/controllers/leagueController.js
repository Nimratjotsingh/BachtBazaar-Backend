import League from "../models/LeagueModel.js";
import Task from "../models/TaskModel.js";
import MerchantProgress from "../models/MerchantProgress.js";

// Import core activity models for real-time aggregation
import Product from "../models/productModel.js";
import Service from "../models/serviceModel.js";
import Offer from "../models/offerModel.js";
import OfferRedemption from "../models/offerRedemptionModel.js";

// ==========================================
// 1. ADMIN LEAGUE MANAGEMENT CONTROLLERS
// ==========================================

/**
 * POST /api/admin/leagues
 * Create a new league tier (e.g., Silver, Gold, Platinum, Diamond)
 */
export const createLeague = async (req, res) => {
  try {
    const {
      name,
      tierRank,
      minPointsRequired,
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

    // Process uploaded badge image file
    let badgeIcon = req.body.badgeIcon || "";
    if (req.file) {
      badgeIcon = `/uploads/${req.file.filename}`;
    }

    // Parse perks if sent as comma-separated string or array
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
      message: "League tier created successfully with badge image.",
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
 * Fetch all configured leagues sorted by tier hierarchy rank
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
 * Update an existing league tier configuration
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
      return res.status(404).json({
        success: false,
        message: "League record not found.",
      });
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
 * Deactivate or remove a league tier
 */
export const deleteLeague = async (req, res) => {
  try {
    const { id } = req.params;

    const league = await League.findByIdAndDelete(
      id,
      
    );

    if (!league) {
      return res.status(404).json({
        success: false,
        message: "League record not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "League tier deactivated successfully.",
    });
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
 * Create a new task/milestone tied to a specific league
 */
export const createTask = async (req, res) => {
  try {
    const {
      title,
      description,
      leagueId,
      metricType,
      targetValue,
      pointsReward,
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
      targetValue: Number(targetValue),
      pointsReward: Number(pointsReward),
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
 * Fetch all tasks with optional league filtering
 */
export const getAllTasks = async (req, res) => {
  try {
    const { leagueId } = req.query;
    const query = { is_active: true };

    if (leagueId) {
      query.leagueId = leagueId;
    }

    const tasks = await Task.find(query)
      .populate("leagueId", "name tierRank badgeIcon themeColor")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      total: tasks.length,
      data: tasks,
    });
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
 * Update an existing task
 */
export const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    const task = await Task.findByIdAndUpdate(id, updates, { new: true });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task record not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Task updated successfully.",
      data: task,
    });
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
 * Deactivate a task
 */
export const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findByIdAndUpdate(
      id,
      { is_active: false },
      { new: true }
    );

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task record not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Task deactivated successfully.",
    });
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
// 3. DYNAMIC MERCHANT GAMIFICATION ENGINE
// ==========================================

/**
 * GET /api/merchant/gamification/dashboard
 * On-Demand Gamification Dashboard:
 * Executed when a merchant views their progress. Counts live records from DB,
 * computes earned points across tasks, updates their league tier automatically,
 * and returns active progress metrics.
 */
export const getMerchantGamificationDashboard = async (req, res) => {
  try {
    const merchantId = req.merchant._id;

    // 1. Fetch all active Leagues ordered by tier rank
    const allLeagues = await League.find({ is_active: true })
      .sort({ tierRank: 1 })
      .lean();

    if (allLeagues.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No active leagues configured by system administrator.",
      });
    }

    // 2. DYNAMICALLY COUNT REAL MERCHANT STATS IN PARALLEL
    const [
      productsCount,
      servicesCount,
      offersCount,
      redemptionsCount,
      claimsCount,
    ] = await Promise.all([
      Product.countDocuments({ merchant_id: merchantId, is_deleted: false }),
      Service.countDocuments({ merchant_id: merchantId, is_deleted: false }),
      Offer.countDocuments({ merchant_id: merchantId, is_deleted: false, is_draft: false }),
      OfferRedemption.countDocuments({ merchantId: merchantId, status: "redeemed" }),
      OfferRedemption.countDocuments({ merchantId: merchantId }),
    ]);

    // Map counts to metric types
    const statsMap = {
      PRODUCTS_CREATED: productsCount,
      SERVICES_CREATED: servicesCount,
      OFFERS_CREATED: offersCount,
      REDEMPTIONS_COMPLETED: redemptionsCount,
      CLAIMS_HANDLED: claimsCount,
      STORE_VIEWS: 0,
    };

    // 3. Evaluate completion and points earned for all active tasks
    const allTasks = await Task.find({ is_active: true }).lean();

    let totalPoints = 0;
    const taskCompletionMap = new Map();

    allTasks.forEach((task) => {
      const currentStat = statsMap[task.metricType] || 0;
      const isCompleted = currentStat >= task.targetValue;

      if (isCompleted) {
        totalPoints += task.pointsReward;
      }

      taskCompletionMap.set(task._id.toString(), {
        currentCount: Math.min(currentStat, task.targetValue),
        isCompleted,
      });
    });

    // 4. Determine Current League based on totalPoints threshold
    let currentLeague = allLeagues[0]; // Default lowest tier (e.g., Silver)
    let nextLeague = null;

    for (let i = 0; i < allLeagues.length; i++) {
      if (totalPoints >= allLeagues[i].minPointsRequired) {
        currentLeague = allLeagues[i];
        nextLeague = allLeagues[i + 1] || null;
      } else {
        break;
      }
    }

    // --- LEVEL POINT CALCULATIONS ---
    const currentLeagueMinPoints = currentLeague.minPointsRequired;
    const currentLeagueMaxPoints = nextLeague ? nextLeague.minPointsRequired : null;

    // Total points needed in this specific level to progress to the next
    const totalPointsInCurrentLeague = nextLeague
      ? nextLeague.minPointsRequired - currentLeagueMinPoints
      : 0;

    // Points accumulated within the scope of the current level
    const pointsEarnedInCurrentLevel = totalPoints - currentLeagueMinPoints;

    // 5. Filter tasks relevant to the merchant's current league tier
    const currentLeagueTasks = allTasks
      .filter((t) => t.leagueId.toString() === currentLeague._id.toString())
      .map((task) => {
        const progress = taskCompletionMap.get(task._id.toString());
        return {
          taskId: task._id,
          title: task.title,
          description: task.description,
          metricType: task.metricType,
          targetValue: task.targetValue,
          pointsReward: task.pointsReward,
          currentCount: progress ? progress.currentCount : 0,
          isCompleted: progress ? progress.isCompleted : false,
        };
      });

    // 6. Sync computed standings into MerchantProgress document
    await MerchantProgress.findOneAndUpdate(
      { merchantId },
      {
        merchantId,
        currentLeagueId: currentLeague._id,
        totalPoints,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // 7. Return complete state including level points metrics
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
        pointsToNextLeague: nextLeague
          ? Math.max(0, nextLeague.minPointsRequired - totalPoints)
          : 0,
        merchantStats: statsMap,
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
 * Fetches top merchants ranked by total points earned
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