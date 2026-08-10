import MerchantCoinTransaction from '../models/MerchantCoinTransaction.js';
import MerchantWallet from '../models/MerchantWallet.js';

// Get Paginated & Filtered Transaction History
export const getMerchantTransactionHistory = async (req, res) => {
  try {
    const merchantId = req.merchant.id; // From merchantAuthMiddleware
    
    // Query params for pagination and filtering
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { type, source, startDate, endDate } = req.query;

    // Build dynamic query object
    let filter = { merchant: merchantId };

    if (type) {
      filter.type = type; // 'EARNED', 'SPENT', 'EXPIRED', 'ADMIN_ADJUSTMENT'
    }

    if (source) {
      filter.source = source; // 'MERCHANT_TASK', 'MERCHANT_LEAGUE_REWARD', etc.
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Fetch transactions
    const transactions = await MerchantCoinTransaction.find(filter)
      .sort({ createdAt: -1 }) // Newest first
      .skip(skip)
      .limit(limit);

    // Get total count for pagination metadata
    const totalRecords = await MerchantCoinTransaction.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: transactions,
      pagination: {
        totalRecords,
        currentPage: page,
        totalPages: Math.ceil(totalRecords / limit),
        pageSize: limit,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Single Transaction Detail
export const getTransactionById = async (req, res) => {
  try {
    const merchantId = req.merchant.id;
    const { transactionId } = req.params;

    const transaction = await MerchantCoinTransaction.findOne({
      _id: transactionId,
      merchant: merchantId,
    });

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction record not found' });
    }

    res.status(200).json({ success: true, data: transaction });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Summary Breakdown for Analytics Dashboard
export const getCoinSummaryStats = async (req, res) => {
  try {
    const merchantId = req.merchant.id;

    const wallet = await MerchantWallet.findOne({ merchant: merchantId });
    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Merchant wallet not found' });
    }

    // Aggregate total coins expired overall for this merchant
    const expiredAggregation = await MerchantCoinTransaction.aggregate([
      { $match: { merchant: wallet.merchant, type: 'EXPIRED' } },
      { $group: { _id: null, totalExpired: { $sum: '$amount' } } },
    ]);

    const totalExpired = expiredAggregation.length > 0 ? expiredAggregation[0].totalExpired : 0;

    res.status(200).json({
      success: true,
      data: {
        currentBalance: wallet.totalBalance,
        lifetimeEarned: wallet.lifetimeEarned,
        lifetimeSpent: wallet.lifetimeSpent,
        totalExpired,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};