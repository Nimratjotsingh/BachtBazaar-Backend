// utils/creditCoinsHelper.js
import Wallet from '../models/MerchantWallet.js';
import CoinSettings from '../models/CoinSettings.js';
import CoinTransaction from '../models/MerchantCoinTransaction.js';

export const creditBachatCoins = async ({ userId, amount, source, sourceId, customValidityDays }) => {
  const settings = await CoinSettings.findOne({ isActive: true });
  
  let validityDays = customValidityDays;
  if (!validityDays) {
    if (source === 'TASK') validityDays = settings?.taskValidityDays || 30;
    else if (source === 'LEAGUE_REWARD') validityDays = settings?.leagueRewardValidityDays || 60;
    else validityDays = settings?.promotionalValidityDays || 15;
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + validityDays);

  let wallet = await Wallet.findOne({ user: userId });
  if (!wallet) {
    wallet = await Wallet.create({ user: userId, totalBalance: 0, coinBatches: [] });
  }

  // Push new coin batch
  wallet.coinBatches.push({
    amount,
    remainingAmount: amount,
    source,
    sourceId,
    expiresAt,
    isExpired: false,
  });

  wallet.totalBalance += amount;
  wallet.lifetimeEarned += amount;
  await wallet.save();

  // Audit transaction log
  await CoinTransaction.create({
    wallet: wallet._id,
    user: userId,
    amount,
    type: 'EARNED',
    source,
    description: `Earned ${amount} Bachat Coins from ${source}`,
  });

  return wallet;
};