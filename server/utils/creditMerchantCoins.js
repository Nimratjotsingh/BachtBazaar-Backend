import MerchantWallet from '../models/MerchantWallet.js';
import CoinSettings from '../models/CoinSettings.js';
import MerchantCoinTransaction from '../models/MerchantCoinTransaction.js';
import mongoose from 'mongoose';

export const creditMerchantBachatCoins = async ({ merchantId, amount, source, sourceId, batchTag,customValidityDays }) => {
  const settings = await CoinSettings.findOne({ isActive: true });
  
  let validityDays = customValidityDays;
  if (!validityDays) {
    if (source === 'MERCHANT_TASK') validityDays = settings?.taskValidityDays || 30;
    else if (source === 'MERCHANT_LEAGUE_REWARD') validityDays = settings?.leagueRewardValidityDays || 60;
    else validityDays = settings?.promotionalValidityDays || 15;
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + validityDays);

  let wallet = await MerchantWallet.findOne({ merchant: merchantId });
  if (!wallet) {
    wallet = await MerchantWallet.create({ merchant: merchantId, totalBalance: 0, coinBatches: [] });
  }

  // Push new coin batch
  wallet.coinBatches.push({
    amount,
    remainingAmount: amount,
    source,
    sourceId: mongoose.Types.ObjectId.isValid(sourceId) ? sourceId : null,
    batchTag: batchTag || null,
    expiresAt,
    isExpired: false,
  });

  wallet.totalBalance += amount;
  wallet.lifetimeEarned += amount;
  await wallet.save();

  // Audit transaction
  await MerchantCoinTransaction.create({
    wallet: wallet._id,
    merchant: merchantId,
    amount,
    type: 'EARNED',
    source,
    description: `Earned ${amount} Bachat Coins from ${source}`,
  });

  return wallet;
};