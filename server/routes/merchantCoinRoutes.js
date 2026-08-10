import express from 'express';
import { completeMerchantTask, claimMerchantLeagueReward } from '../controllers/merchantEarningController.js';
import { getMerchantWallet, redeemMerchantCoins } from '../controllers/merchantWalletController.js';
import { protectMerchant as merchantAuthMiddleware } from '../middleware/authMiddleware.js';
import {
  getMerchantTransactionHistory,
  getTransactionById,
  getCoinSummaryStats,
} from '../controllers/merchantHistoryController.js';
import {createQuest,deleteQuest,getAllQuests} from '../controllers/AdminQuestController.js';

const router = express.Router();

// Earning Routes
router.post('/tasks/complete', merchantAuthMiddleware, completeMerchantTask);
router.post('/league/claim', merchantAuthMiddleware, claimMerchantLeagueReward);

router.get('/history', merchantAuthMiddleware, getMerchantTransactionHistory);
router.get('/history/summary', merchantAuthMiddleware, getCoinSummaryStats);
router.get('/history/:transactionId', merchantAuthMiddleware, getTransactionById);

router.post('/quests', merchantAuthMiddleware, createQuest);
router.get('/quests', merchantAuthMiddleware, getAllQuests);
router.delete('/quests/:id', merchantAuthMiddleware, deleteQuest);

// Wallet & FEFO Redemption Routes
router.get('/wallet', merchantAuthMiddleware, getMerchantWallet);
router.post('/wallet/redeem', merchantAuthMiddleware, redeemMerchantCoins);

export default router;