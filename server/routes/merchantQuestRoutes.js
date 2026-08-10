import express from 'express';


import { getMerchantQuestsDashboard } from '../controllers/merchantQuestController.js';


import { protectMerchant as merchantAuthMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// Protect all routes with Merchant Auth Middleware
router.use(merchantAuthMiddleware);


router.get('/dashboard', getMerchantQuestsDashboard);


export default router;