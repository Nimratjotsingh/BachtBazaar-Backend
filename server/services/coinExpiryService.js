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
        // Check if batch is past expiry and hasn't been processed yet
        if (batch.expiresAt <= now && !batch.isExpired && batch.remainingAmount > 0) {
          totalExpiredInWallet += batch.remainingAmount;
          batch.remainingAmount = 0;
          batch.isExpired = true;
        }
      });

      if (totalExpiredInWallet > 0) {
        // Recalculate balance
        wallet.totalBalance = Math.max(0, wallet.totalBalance - totalExpiredInWallet);
        await wallet.save();

        // Log the expiration in transaction history
        await CoinTransaction.create({
          wallet: wallet._id,
          user: wallet.user,
          amount: totalExpiredInWallet,
          type: 'EXPIRED',
          source: 'EXPIRATION',
          description: `${totalExpiredInWallet} Bachat Coins expired.`,
        });

        console.log(`[Cron Job] Expired ${totalExpiredInWallet} coins for user: ${wallet.user}`);
      }
    }
  } catch (error) {
    console.error('[Cron Job Error] Failed to process coin expirations:', error);
  }
}