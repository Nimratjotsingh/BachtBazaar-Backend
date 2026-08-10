import MerchantWallet from '../models/MerchantWallet.js';
import MerchantCoinTransaction from '../models/MerchantCoinTransaction.js';

// Get Merchant Wallet Details
export const getMerchantWallet = async (req, res) => {
  try {
    const merchantId = req.merchant._id;
    let wallet = await MerchantWallet.findOne({ merchant: merchantId });

    if (!wallet) {
      wallet = await MerchantWallet.create({ merchant: merchantId });
    }

   

    const now = new Date();

    // Filter active batches in real-time
    const activeBatches = wallet.coinBatches.filter(
      (batch) => !batch.isExpired && new Date(batch.expiresAt) > now && batch.remainingAmount > 0
    );

    const calculatedBalance = activeBatches.reduce((sum, batch) => sum + batch.remainingAmount, 0);

    res.status(200).json({
      success: true,
      data: {
        totalBalance: calculatedBalance,
        lifetimeEarned: wallet.lifetimeEarned,
        lifetimeSpent: wallet.lifetimeSpent,
        activeBatches,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Redeem Coins for Platform Fee / Ad Spend (FEFO Logic)
export const redeemMerchantCoins = async (req, res) => {
  try {
    const merchantId = req.merchant._id;
    const { amountToRedeem, redemptionReason } = req.body; // e.g., 'PLATFORM_FEE_DISCOUNT'

    if (!amountToRedeem || amountToRedeem <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid redemption amount' });
    }

    const wallet = await MerchantWallet.findOne({ merchant: merchantId });
    if (!wallet) return res.status(404).json({ success: false, message: 'Merchant wallet not found' });

    const now = new Date();

    // Sort valid batches by earliest expiry date
    const validBatches = wallet.coinBatches
      .filter((batch) => !batch.isExpired && new Date(batch.expiresAt) > now && batch.remainingAmount > 0)
      .sort((a, b) => new Date(a.expiresAt) - new Date(b.expiresAt));

    const availableBalance = validBatches.reduce((sum, b) => sum + b.remainingAmount, 0);

    if (availableBalance < amountToRedeem) {
      return res.status(400).json({ success: false, message: 'Insufficient non-expired coin balance' });
    }

    // FEFO Deduction
    let remainingToDeduct = amountToRedeem;

    for (const batch of validBatches) {
      if (remainingToDeduct <= 0) break;

      if (batch.remainingAmount <= remainingToDeduct) {
        remainingToDeduct -= batch.remainingAmount;
        batch.remainingAmount = 0;
      } else {
        batch.remainingAmount -= remainingToDeduct;
        remainingToDeduct = 0;
      }
    }

    wallet.totalBalance = Math.max(0, wallet.totalBalance - amountToRedeem);
    wallet.lifetimeSpent += amountToRedeem;
    await wallet.save();

    await MerchantCoinTransaction.create({
      wallet: wallet._id,
      merchant: merchantId,
      amount: amountToRedeem,
      type: 'SPENT',
      source: redemptionReason || 'PLATFORM_FEE_DISCOUNT',
      description: `Redeemed ${amountToRedeem} Bachat Coins`,
    });

    res.status(200).json({
      success: true,
      message: 'Coins redeemed successfully',
      remainingBalance: wallet.totalBalance,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};