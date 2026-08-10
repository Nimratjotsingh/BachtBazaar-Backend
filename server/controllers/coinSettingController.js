import CoinSettings from '../models/CoinSettings.js';

// Get Current Coin Settings
export const getCoinSettings = async (req, res) => {
  try {
    let settings = await CoinSettings.findOne({ isActive: true });
    if (!settings) {
      settings = await CoinSettings.create({}); // Create defaults if none exist
    }
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update Global Coin Rules (Admin Only)
export const updateCoinSettings = async (req, res) => {
  try {
    const { taskValidityDays, leagueRewardValidityDays, promotionalValidityDays, coinValueInCurrency } = req.body;

    let settings = await CoinSettings.findOne({ isActive: true });

    if (settings) {
      settings.taskValidityDays = taskValidityDays ?? settings.taskValidityDays;
      settings.leagueRewardValidityDays = leagueRewardValidityDays ?? settings.leagueRewardValidityDays;
      settings.promotionalValidityDays = promotionalValidityDays ?? settings.promotionalValidityDays;
      settings.coinValueInCurrency = coinValueInCurrency ?? settings.coinValueInCurrency;
      await settings.save();
    } else {
      settings = await CoinSettings.create(req.body);
    }

    res.status(200).json({ success: true, message: 'Settings updated successfully', data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};