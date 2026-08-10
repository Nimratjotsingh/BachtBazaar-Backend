import mongoose from 'mongoose';

const CoinSettingsSchema = new mongoose.Schema(
  {
    // Validity in days for coins earned from different sources
    taskValidityDays: { type: Number, default: 30 },
    leagueRewardValidityDays: { type: Number, default: 60 },
    promotionalValidityDays: { type: Number, default: 15 },

    // Conversion rate (e.g., 100 Bachat Coins = 1 Currency Unit)
    coinValueInCurrency: { type: Number, default: 0.1 },
    
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.CoinSettings || mongoose.model('CoinSettings', CoinSettingsSchema);