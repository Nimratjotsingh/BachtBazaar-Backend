import HelpArticle from "../models/HelpArticles.js";

// ==========================================
// 1. PUBLIC / APP READ & FEEDBACK CONTROLLERS
// ==========================================

/**
 * GET /api/help-articles/user
 * Public endpoint for regular app users to browse published help articles.
 */
export const getUserHelpArticles = async (req, res) => {
  try {
    const { category, search, isFeatured, page = 1, limit = 10 } = req.query;

    const query = {
      isPublished: true,
      targetAudience: { $in: ["all", "users"] },
    };

    if (category) query.category = category;
    if (isFeatured !== undefined) query.isFeatured = isFeatured === "true";

    if (search) {
      query.$text = { $search: search };
    }

    const currentLimit = Number(limit);
    const skip = (Math.max(1, Number(page)) - 1) * currentLimit;

    const total = await HelpArticle.countDocuments(query);

    const articles = await HelpArticle.find(query)
      .select("title slug summary category targetAudience tags videoUrl videoDuration views helpfulVotes isFeatured createdAt")
      .sort({ isFeatured: -1, createdAt: -1 })
      .skip(skip)
      .limit(currentLimit)
      .lean();

    return res.status(200).json({
      success: true,
      total,
      pages: Math.ceil(total / currentLimit) || 1,
      currentPage: Number(page),
      data: articles,
    });
  } catch (error) {
    console.error("Get User Help Articles Exception:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while loading help articles.",
      error: error.message,
    });
  }
};

/**
 * GET /api/help-articles/merchant
 * Public endpoint for merchants to browse published help guides.
 */
export const getMerchantHelpArticles = async (req, res) => {
  try {
    const { category, search, isFeatured, page = 1, limit = 10 } = req.query;

    const query = {
      isPublished: true,
      targetAudience: { $in: ["all", "merchants"] },
    };

    if (category) query.category = category;
    if (isFeatured !== undefined) query.isFeatured = isFeatured === "true";

    if (search) {
      query.$text = { $search: search };
    }

    const currentLimit = Number(limit);
    const skip = (Math.max(1, Number(page)) - 1) * currentLimit;

    const total = await HelpArticle.countDocuments(query);

    const articles = await HelpArticle.find(query)
      .select("title slug summary category targetAudience tags videoUrl videoDuration views helpfulVotes isFeatured createdAt")
      .sort({ isFeatured: -1, createdAt: -1 })
      .skip(skip)
      .limit(currentLimit)
      .lean();

    return res.status(200).json({
      success: true,
      total,
      pages: Math.ceil(total / currentLimit) || 1,
      currentPage: Number(page),
      data: articles,
    });
  } catch (error) {
    console.error("Get Merchant Help Articles Exception:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while loading merchant help articles.",
      error: error.message,
    });
  }
};

/**
 * GET /api/help-articles/by-slug/:slug
 * Fetches single article by slug and increments its view count.
 */
export const getHelpArticleBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const article = await HelpArticle.findOneAndUpdate(
      { slug, isPublished: true },
      { $inc: { views: 1 } },
      { new: true }
    ).lean();

    if (!article) {
      return res.status(404).json({
        success: false,
        message: "Help article not found or unavailable.",
      });
    }

    return res.status(200).json({
      success: true,
      data: article,
    });
  } catch (error) {
    console.error("Get Single Help Article Exception:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while retrieving help article content.",
      error: error.message,
    });
  }
};

/**
 * POST /api/help-articles/:id/vote
 * Submits user feedback (helpful or unhelpful) for an article.
 */
export const voteHelpArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const { vote } = req.body; // "helpful" or "unhelpful"

    if (!["helpful", "unhelpful"].includes(vote)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vote parameter. Expected 'helpful' or 'unhelpful'.",
      });
    }

    const fieldToIncrement = vote === "helpful" ? "helpfulVotes" : "unhelpfulVotes";

    const article = await HelpArticle.findByIdAndUpdate(
      id,
      { $inc: { [fieldToIncrement]: 1 } },
      { new: true }
    );

    if (!article) {
      return res.status(404).json({
        success: false,
        message: "Help article record not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Thank you for your feedback!",
      data: {
        helpfulVotes: article.helpfulVotes,
        unhelpfulVotes: article.unhelpfulVotes,
      },
    });
  } catch (error) {
    console.error("Vote Help Article Exception:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while processing your vote.",
      error: error.message,
    });
  }
};

// ==========================================
// 2. ADMIN CRUD CONTROLLERS
// ==========================================

/**
 * POST /api/help-articles/admin
 * Admin endpoint to create a new Help Article.
 */
export const createHelpArticle = async (req, res) => {
  try {
    const {
      title,
      slug,
      summary,
      content,
      category,
      targetAudience,
      tags,
      videoUrl,
      videoDuration,
      isFeatured,
      isPublished,
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: "Title and content fields are required.",
      });
    }

    const newArticle = new HelpArticle({
      title: title.trim(),
      slug: slug ? slug.trim().toLowerCase() : undefined, // Triggers pre-validate middleware if omitted
      summary: summary ? summary.trim() : "",
      content: content.trim(),
      category: category || "getting-started",
      targetAudience: targetAudience || "all",
      tags: Array.isArray(tags) ? tags : tags ? tags.split(",").map((t) => t.trim()) : [],
      videoUrl: videoUrl ? videoUrl.trim() : "",
      videoDuration: videoDuration ? videoDuration.trim() : "",
      isFeatured: isFeatured !== undefined ? isFeatured : false,
      isPublished: isPublished !== undefined ? isPublished : true,
      createdBy: req.admin?._id || req.user?._id,
    });

    await newArticle.save();

    return res.status(201).json({
      success: true,
      message: "Help article created successfully.",
      data: newArticle,
    });
  } catch (error) {
    console.error("Create Help Article Exception:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while creating the help article.",
      error: error.message,
    });
  }
};

/**
 * GET /api/help-articles/admin/all
 * Admin endpoint to fetch all articles with filters and metrics.
 */
export const getAllAdminHelpArticles = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, targetAudience, isPublished, isFeatured, search } = req.query;

    const query = {};

    if (category) query.category = category;
    if (targetAudience) query.targetAudience = targetAudience;
    if (isPublished !== undefined) query.isPublished = isPublished === "true";
    if (isFeatured !== undefined) query.isFeatured = isFeatured === "true";

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { summary: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    }

    const currentLimit = Number(limit);
    const skip = (Math.max(1, Number(page)) - 1) * currentLimit;

    const total = await HelpArticle.countDocuments(query);

    const articles = await HelpArticle.find(query)
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(currentLimit)
      .lean();

    return res.status(200).json({
      success: true,
      total,
      pages: Math.ceil(total / currentLimit) || 1,
      currentPage: Number(page),
      data: articles,
    });
  } catch (error) {
    console.error("Get Admin Help Articles Exception:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve help articles.",
      error: error.message,
    });
  }
};

/**
 * PUT /api/help-articles/admin/:id
 * Admin endpoint to update an existing Help Article.
 */
export const updateHelpArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      slug,
      summary,
      content,
      category,
      targetAudience,
      tags,
      videoUrl,
      videoDuration,
      isFeatured,
      isPublished,
    } = req.body;

    const article = await HelpArticle.findById(id);

    if (!article) {
      return res.status(404).json({
        success: false,
        message: "Help article record not found.",
      });
    }

    if (title !== undefined) article.title = title.trim();
    if (slug !== undefined) article.slug = slug.trim().toLowerCase();
    if (summary !== undefined) article.summary = summary.trim();
    if (content !== undefined) article.content = content.trim();
    if (category !== undefined) article.category = category;
    if (targetAudience !== undefined) article.targetAudience = targetAudience;
    if (tags !== undefined) {
      article.tags = Array.isArray(tags) ? tags : tags.split(",").map((t) => t.trim());
    }
    if (videoUrl !== undefined) article.videoUrl = videoUrl.trim();
    if (videoDuration !== undefined) article.videoDuration = videoDuration.trim();
    if (isFeatured !== undefined) article.isFeatured = isFeatured;
    if (isPublished !== undefined) article.isPublished = isPublished;

    await article.save();

    return res.status(200).json({
      success: true,
      message: "Help article updated successfully.",
      data: article,
    });
  } catch (error) {
    console.error("Update Help Article Exception:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while updating the help article.",
      error: error.message,
    });
  }
};

/**
 * PATCH /api/help-articles/admin/:id/toggle-publish
 * Quick toggle for publishing or drafting an article.
 */
export const togglePublishHelpArticle = async (req, res) => {
  try {
    const { id } = req.params;

    const article = await HelpArticle.findById(id);

    if (!article) {
      return res.status(404).json({
        success: false,
        message: "Help article record not found.",
      });
    }

    article.isPublished = !article.isPublished;
    await article.save();

    return res.status(200).json({
      success: true,
      message: `Help article has been ${article.isPublished ? "published" : "drafted"} successfully.`,
      data: article,
    });
  } catch (error) {
    console.error("Toggle Publish Help Article Exception:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to toggle article publish state.",
      error: error.message,
    });
  }
};

/**
 * DELETE /api/help-articles/admin/:id
 * Admin endpoint to delete a Help Article.
 */
export const deleteHelpArticle = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedArticle = await HelpArticle.findByIdAndDelete(id);

    if (!deletedArticle) {
      return res.status(404).json({
        success: false,
        message: "Help article record not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Help article deleted successfully.",
    });
  } catch (error) {
    console.error("Delete Help Article Exception:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while deleting the help article.",
      error: error.message,
    });
  }
};