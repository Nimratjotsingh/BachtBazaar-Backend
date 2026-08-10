import MerchantTask from '../models/TaskModel.js';
import { creditMerchantBachatCoins } from '../utils/creditMerchantCoins.js';

// Complete Merchant Task
export const completeMerchantTask = async (req, res) => {
  try {
    const { taskId } = req.body;
    const merchantId = req.merchant._id; // From merchantAuthMiddleware

    const task = await MerchantTask.findById(taskId);
    if (!task) return res.status(404).json({ success: false, message: 'Merchant task not found' });

    const updatedWallet = await creditMerchantBachatCoins({
      merchantId,
      amount: task.rewardCoins,
      source: 'MERCHANT_TASK',
      sourceId: task._id,
      customValidityDays: task.validityDaysOverride,
    });

    res.status(200).json({
      success: true,
      message: `Task completed! Earned ${task.rewardCoins} Bachat Coins.`,
      balance: updatedWallet.totalBalance,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Claim Merchant League Reward
export const claimMerchantLeagueReward = async (req, res) => {
  try {
    const { leagueId, rewardCoins, customValidityDays } = req.body;
    const merchantId = req.merchant.id;

    const updatedWallet = await creditMerchantBachatCoins({
      merchantId,
      amount: rewardCoins,
      source: 'MERCHANT_LEAGUE_REWARD',
      sourceId: leagueId,
      customValidityDays,
    });

    res.status(200).json({
      success: true,
      message: `League tier reward claimed! Added ${rewardCoins} Bachat Coins.`,
      balance: updatedWallet.totalBalance,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};