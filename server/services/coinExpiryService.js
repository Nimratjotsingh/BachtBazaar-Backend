import Wallet from '../models/MerchantWallet.js';
import CoinTransaction from '../models/MerchantCoinTransaction.js';

export async function processExpiredCoins() {
  const now = new Date();
  console.log(`[Cron Job] Running coin expiry check at ${now.toISOString()}`);

  try {
    // Find all wallets containing unexpired batches where the expiration date has passed
    const wallets = await Wallet.find({
      'coinBatches.expiresAt': { $lte: now },
      'coinBatches.isExpired': false,
      'coinBatches.remainingAmount': { $gt: 0 },
    });

    if (wallets.length === 0) {
      console.log('[Cron Job] No expired coins found.');
      return;
    }

    for (const wallet of wallets) {
      let totalExpiredInWallet = 0;

      wallet.coinBatches.forEach((batch) => {
        // Check if batch is past expiry and hasn't been marked expired yet
        if (batch.expiresAt <= now && !batch.isExpired && batch.remainingAmount > 0) {
          totalExpiredInWallet += batch.remainingAmount;
          batch.remainingAmount = 0;
          batch.isExpired = true;
        }
      });

      if (totalExpiredInWallet > 0) {
        // Recalculate total balance from active remaining amounts
        wallet.totalBalance = wallet.coinBatches.reduce((acc, b) => {
          if (!b.isExpired && new Date(b.expiresAt) > now && b.remainingAmount > 0) {
            return acc + b.remainingAmount;
          }
          return acc;
        }, 0);

        await wallet.save();

        // FIXED: Using wallet.merchant instead of wallet.user
        await CoinTransaction.create({
          wallet: wallet._id,
          merchant: wallet.merchant, // <--- Mapped to correct field name
          amount: totalExpiredInWallet,
          type: 'EXPIRED',
          source: 'EXPIRATION',
          description: `${totalExpiredInWallet} Bachat Coins expired.`,
        });

        console.log(
          `[Cron Job] Successfully expired ${totalExpiredInWallet} coins for merchant: ${wallet.merchant}`
        );
      }
    }
  } catch (error) {
    console.error('[Cron Job Error] Failed to process coin expirations:', error);
  }
}