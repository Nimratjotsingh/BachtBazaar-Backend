import MerchantQuest from "../models/merchantQuestModel.js";
import MerchantWallet from "../models/MerchantWallet.js";
import MerchantProgress from "../models/MerchantProgress.js";
import CoinSettings from "../models/CoinSettings.js";
import Product from "../models/productModel.js";
import Service from "../models/serviceModel.js";
import Offer from "../models/offerModel.js";
import OfferRedemption from "../models/offerRedemptionModel.js";

import { getQuestTimeframeBounds } from "../utils/timeframeHelper.js";
import { creditMerchantBachatCoins } from "../utils/creditMerchantCoins.js";

const getDisplayTypeFilter = (constraint) => {
  if (!constraint || constraint === "ALL") return {};
  return { display_type: constraint.toLowerCase() };
};

export const getMerchantQuestsDashboard = async (req, res) => {
  try {
    const merchantId = req.merchant._id;

    const [activeQuests, coinSettings, progressDoc] = await Promise.all([
      MerchantQuest.find({ is_active: true }).lean(),
      CoinSettings.findOne({ isActive: true }).lean(),
      MerchantProgress.findOne({ merchantId }).lean(),
    ]);

    let walletDoc = await MerchantWallet.findOne({ merchant: merchantId });
    if (!walletDoc) {
      walletDoc = await MerchantWallet.create({ merchant: merchantId });
    }

    // Retrieve active login streak & cumulative logins
    const currentStreak = progressDoc?.currentLoginStreak || 0;
    const totalLoginsCount = progressDoc?.totalLogins || 0;

    const evaluatedQuests = [];

    for (const quest of activeQuests) {
      const { startDate, endDate } = getQuestTimeframeBounds(quest);

      let count = 0;
      if (quest.metricType === "LOGIN_STREAK") {
        count = currentStreak;
      } else if (quest.metricType === "TOTAL_LOGINS") {
        count = totalLoginsCount;
      } else if (quest.metricType === "PRODUCTS_CREATED") {
        count = await Product.countDocuments({
          merchant_id: merchantId,
          is_deleted: false,
          createdAt: { $gte: startDate, $lte: endDate },
        });
      } else if (quest.metricType === "SERVICES_CREATED") {
        count = await Service.countDocuments({
          merchant_id: merchantId,
          is_deleted: false,
          createdAt: { $gte: startDate, $lte: endDate },
        });
      } else if (quest.metricType === "OFFERS_CREATED") {
        count = await Offer.countDocuments({
          merchant_id: merchantId,
          is_deleted: false,
          is_draft: false,
          ...getDisplayTypeFilter(quest.offerTypeConstraint),
          createdAt: { $gte: startDate, $lte: endDate },
        });
      } else if (quest.metricType === "REDEMPTIONS_COMPLETED") {
        count = await OfferRedemption.countDocuments({
          merchantId,
          status: "redeemed",
          ...getDisplayTypeFilter(quest.offerTypeConstraint),
          updatedAt: { $gte: startDate, $lte: endDate },
        });
      } else if (quest.metricType === "CLAIMS_HANDLED") {
        count = await OfferRedemption.countDocuments({
          merchantId,
          createdAt: { $gte: startDate, $lte: endDate },
        });
      }

      const isCompleted = count >= quest.targetValue;
      const uniqueBatchTag = `${quest._id}_${startDate.getTime()}`;

      // Check if rewarded in current window using batchTag
      const isAlreadyRewarded = walletDoc.coinBatches.some(
        (b) => b.source === "PROMOTIONAL_BONUS" && b.batchTag === uniqueBatchTag
      );

      if (isCompleted && !isAlreadyRewarded && quest.rewardCoins > 0) {
        await creditMerchantBachatCoins({
          merchantId,
          amount: quest.rewardCoins,
          source: "PROMOTIONAL_BONUS",
          sourceId: quest._id,
          batchTag: uniqueBatchTag,
          customValidityDays: quest.validityDaysOverride || coinSettings?.promotionalValidityDays || 15,
        });

        // Refresh wallet doc reference for subsequent iterations
        walletDoc = await MerchantWallet.findOne({ merchant: merchantId });
      }

      evaluatedQuests.push({
        questId: quest._id,
        title: quest.title,
        description: quest.description,
        timeframeType: quest.timeframeType,
        metricType: quest.metricType,
        offerTypeConstraint: quest.offerTypeConstraint || "ALL",
        targetValue: quest.targetValue,
        rewardCoins: quest.rewardCoins,
        validityDays: quest.validityDaysOverride || coinSettings?.promotionalValidityDays || 15,
        currentProgress: Math.min(count, quest.targetValue),
        isCompleted,
        timeframeBounds: { startDate, endDate },
      });
    }

    return res.status(200).json({
      success: true,
      data: evaluatedQuests,
    });
  } catch (error) {
    console.error("Merchant Quest Dashboard Exception:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};