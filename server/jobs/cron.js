import cron from 'node-cron';
import { processExpiredCoins } from '../services/coinExpiryService.js';

export function initCronJobs() {
  // Schedule to run every day at midnight (00:00)
  // Schedule syntax: (second [optional], minute, hour, day of month, month, day of week)
  cron.schedule('0 0 * * *', async () => {
    await processExpiredCoins();
  });

  console.log('Cron jobs initialized: Coin expiry task running daily at midnight.');
}