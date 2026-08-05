import FAQ from "../models/FaqModel.js";

// ==========================================
// 1. PUBLIC / APP READ CONTROLLERS
// ==========================================

/**
 * GET /api/faqs/user
 * Fetches published FAQs targeted for regular app users.
 */
export const getUserFAQs = async (req, res) => {
  try {
    const { category, search } = req.query;

    const query = {
      is_published: true,
      targetAudience: { $in: ["all", "users"] },
    };

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { question: { $regex: search, $options: "i" } },
        { answer: { $regex: search, $options: "i" } },
      ];
    }

    const faqs = await FAQ.find(query)
      .sort({ order: 1, createdAt: -1 })
      .select("-createdBy")
      .lean();

    return res.status(200).json({
      success: true,
      total: faqs.length,
      data: faqs,
    });
  } catch (error) {
    console.error("Get User FAQs Exception:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while loading user FAQs.",
      error: error.message,
    });
  }
};

/**
 * GET /api/faqs/merchant
 * Fetches published FAQs targeted specifically for merchants.
 */
export const getMerchantFAQs = async (req, res) => {
  try {
    const { category, search } = req.query;

    const query = {
      is_published: true,
      targetAudience: { $in: ["all", "merchants"] },
    };

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { question: { $regex: search, $options: "i" } },
        { answer: { $regex: search, $options: "i" } },
      ];
    }

    const faqs = await FAQ.find(query)
      .sort({ order: 1, createdAt: -1 })
      .select("-createdBy")
      .lean();

    return res.status(200).json({
      success: true,
      total: faqs.length,
      data: faqs,
    });
  } catch (error) {
    console.error("Get Merchant FAQs Exception:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while loading merchant FAQs.",
      error: error.message,
    });
  }
};

/**
 * GET /api/faqs/:id
 * Fetches single FAQ detail.
 */
export const getFAQById = async (req, res) => {
  try {
    const { id } = req.params;

    const faq = await FAQ.findById(id).lean();

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: "FAQ record not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: faq,
    });
  } catch (error) {
    console.error("Get Single FAQ Exception:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching FAQ details.",
      error: error.message,
    });
  }
};


// ==========================================
// 2. ADMIN CRUD CONTROLLERS
// ==========================================

/**
 * POST /api/admin/faqs
 * Admin endpoint to create a new FAQ document.
 */
export const createFAQ = async (req, res) => {
  try {
    const { question, answer, category, targetAudience, order, is_published } = req.body;

    if (!question || !answer) {
      return res.status(400).json({
        success: false,
        message: "Question and answer fields are required.",
      });
    }

    const newFaq = new FAQ({
  question: question.trim(),
  answer: answer.trim(),
  videoUrl: req.body.videoUrl ? req.body.videoUrl.trim() : "",
  videoDuration: req.body.videoDuration ? req.body.videoDuration.trim() : "",
  category: category || "general",
  targetAudience: targetAudience || "all",
  order: order !== undefined ? Number(order) : 0,
  is_published: is_published !== undefined ? is_published : true,
  createdBy: req.admin?._id || req.user?._id,
});

    await newFaq.save();

    return res.status(201).json({
      success: true,
      message: "FAQ document created successfully.",
      data: newFaq,
    });
  } catch (error) {
    console.error("Create FAQ Exception:", error);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while creating FAQ.",
      error: error.message,
    });
  }
};

/**
 * GET /api/admin/faqs
 * Admin endpoint to list all FAQs (including unpublished ones) with pagination & filters.
 */
export const getAllAdminFAQs = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, targetAudience, is_published, search } = req.query;

    const query = {};

    if (category) query.category = category;
    if (targetAudience) query.targetAudience = targetAudience;
    if (is_published !== undefined) query.is_published = is_published === "true";

    if (search) {
      query.$or = [
        { question: { $regex: search, $options: "i" } },
        { answer: { $regex: search, $options: "i" } },
      ];
    }

    const currentLimit = Number(limit);
    const skip = (Math.max(1, Number(page)) - 1) * currentLimit;

    const total = await FAQ.countDocuments(query);

    const faqs = await FAQ.find(query)
      .populate("createdBy", "name email")
      .sort({ order: 1, createdAt: -1 })
      .skip(skip)
      .limit(currentLimit)
      .lean();

    return res.status(200).json({
      success: true,
      total,
      pages: Math.ceil(total / currentLimit) || 1,
      currentPage: Number(page),
      data: faqs,
    });
  } catch (error) {
    console.error("Get Admin FAQs Exception:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve admin FAQ records.",
      error: error.message,
    });
  }
};

/**
 * PUT /api/admin/faqs/:id
 * Admin endpoint to update an existing FAQ document.
 */
export const updateFAQ = async (req, res) => {
  try {
    const { id } = req.params;
    const { question, answer, category, targetAudience, order, is_published } = req.body;

    const faq = await FAQ.findById(id);

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: "FAQ record not found.",
      });
    }

    // Apply updates dynamically
    if (question !== undefined) faq.question = question.trim();
    if (answer !== undefined) faq.answer = answer.trim();
    if (category !== undefined) faq.category = category;
    if (targetAudience !== undefined) faq.targetAudience = targetAudience;
    if (order !== undefined) faq.order = Number(order);
    if (is_published !== undefined) faq.is_published = is_published;
    if (req.body.videoUrl !== undefined) faq.videoUrl = req.body.videoUrl.trim();
    if (req.body.videoDuration !== undefined) faq.videoDuration = req.body.videoDuration.trim();
    await faq.save();

    return res.status(200).json({
      success: true,
      message: "FAQ updated successfully.",
      data: faq,
    });
  } catch (error) {
    console.error("Update FAQ Exception:", error);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while updating the FAQ.",
      error: error.message,
    });
  }
};

/**
 * PATCH /api/admin/faqs/:id/toggle-publish
 * Quick toggle endpoint for publishing / unpublishing an FAQ.
 */
export const togglePublishFAQ = async (req, res) => {
  try {
    const { id } = req.params;

    const faq = await FAQ.findById(id);

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: "FAQ record not found.",
      });
    }

    faq.is_published = !faq.is_published;
    await faq.save();

    return res.status(200).json({
      success: true,
      message: `FAQ has been ${faq.is_published ? "published" : "unpublished"} successfully.`,
      data: faq,
    });
  } catch (error) {
    console.error("Toggle Publish FAQ Exception:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to toggle publish state for FAQ.",
      error: error.message,
    });
  }
};

/**
 * DELETE /api/admin/faqs/:id
 * Admin endpoint to delete an FAQ document.
 */
export const deleteFAQ = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedFaq = await FAQ.findByIdAndDelete(id);

    if (!deletedFaq) {
      return res.status(404).json({
        success: false,
        message: "FAQ record not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "FAQ document deleted successfully.",
    });
  } catch (error) {
    console.error("Delete FAQ Exception:", error);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while deleting the FAQ.",
      error: error.message,
    });
  }
};