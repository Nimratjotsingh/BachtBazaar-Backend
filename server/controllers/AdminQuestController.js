import MerchantQuest from "../models/merchantQuestModel.js";

// Create Quest
export const createQuest = async (req, res) => {
  try {
    const {
      title,
      description,
      metricType,
      offerTypeConstraint,
      targetValue,
      rewardCoins,
      validityDaysOverride,
      timeframeType,
      startDate,
      endDate,
    } = req.body;

    if (!title || !metricType || !targetValue || !rewardCoins) {
      return res.status(400).json({
        success: false,
        message: "Title, metricType, targetValue, and rewardCoins are mandatory.",
      });
    }

    const quest = new MerchantQuest({
      title: title.trim(),
      description: description ? description.trim() : "",
      metricType,
      offerTypeConstraint: offerTypeConstraint || "ALL",
      targetValue: Number(targetValue),
      rewardCoins: Number(rewardCoins),
      validityDaysOverride: validityDaysOverride ? Number(validityDaysOverride) : null,
      timeframeType: timeframeType || "MONTHLY",
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      createdBy: req.admin?._id || req.user?._id,
    });

    await quest.save();

    return res.status(201).json({
      success: true,
      message: "Time-bound merchant coin quest created successfully.",
      data: quest,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get All Quests
export const getAllQuests = async (req, res) => {
  try {
    const quests = await MerchantQuest.find({ is_active: true })
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json({ success: true, total: quests.length, data: quests });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update Quest
export const updateQuest = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    if (updates.title) updates.title = updates.title.trim();
    if (updates.description) updates.description = updates.description.trim();
    if (updates.targetValue) updates.targetValue = Number(updates.targetValue);
    if (updates.rewardCoins) updates.rewardCoins = Number(updates.rewardCoins);
    if (updates.validityDaysOverride !== undefined) {
      updates.validityDaysOverride = updates.validityDaysOverride
        ? Number(updates.validityDaysOverride)
        : null;
    }

    const quest = await MerchantQuest.findByIdAndUpdate(id, updates, { new: true });

    if (!quest) {
      return res.status(404).json({ success: false, message: "Quest record not found." });
    }

    return res.status(200).json({
      success: true,
      message: "Quest updated successfully.",
      data: quest,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Deactivate Quest
export const deleteQuest = async (req, res) => {
  try {
    const { id } = req.params;
    const quest = await MerchantQuest.findByIdAndUpdate(id, { is_active: false }, { new: true });

    if (!quest) {
      return res.status(404).json({ success: false, message: "Quest record not found." });
    }

    return res.status(200).json({ success: true, message: "Quest deactivated." });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};