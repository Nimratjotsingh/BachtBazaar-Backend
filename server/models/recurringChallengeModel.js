import mongoose from 'mongoose';

const RecurringChallengeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    
    // Frequency cycle defined by admin
    frequency: {
      type: String,
      enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM'],
      default: 'DAILY',
      required: true,
    },
    
    // Core action metric target
    metricType: {
      type: String,
      enum: [
        'PRODUCTS_CREATED',
        'SERVICES_CREATED',
        'OFFERS_CREATED',
        'CLAIMS_HANDLED',
        'REDEMPTIONS_COMPLETED',
        'STORE_VIEWS',
      ],
      required: true,
    },
    targetValue: { type: Number, required: true, min: 1 },

    // Coin Rewards & Expiry
    rewardCoins: { type: Number, required: true, min: 1 },
    validityDaysOverride: { type: Number, default: null }, // Null uses global admin setting

    // Cycle timeframe for custom challenges
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },

    is_active: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.models.RecurringChallenge ||
  mongoose.model('RecurringChallenge', RecurringChallengeSchema);