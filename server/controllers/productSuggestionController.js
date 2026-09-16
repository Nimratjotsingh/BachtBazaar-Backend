import ProductSuggestion from "../models/productSuggestionModel.js";

/**
 * POST /api/admin/product-suggestions
 * Admin creates a master catalog suggestion
 */
export const createProductSuggestion = async (req, res) => {
  try {
    const data = { ...req.body };

    if (req.files?.thumbnail) {
      data.thumbnail = `/uploads/${req.files.thumbnail[0].filename}`;
    }
    if (req.files?.images) {
      data.images = req.files.images.map((f) => `/uploads/${f.filename}`);
    }

    if (typeof data.category_id === "string") {
      try { data.category_id = JSON.parse(data.category_id); } catch { data.category_id = [data.category_id]; }
    }
    if (typeof data.subcategory_id === "string") {
      try { data.subcategory_id = JSON.parse(data.subcategory_id); } catch { data.subcategory_id = [data.subcategory_id]; }
    }
    if (typeof data.tags === "string") {
      try { data.tags = JSON.parse(data.tags); } catch { data.tags = data.tags.split(",").map((t) => t.trim()).filter(Boolean); }
    }
    if (typeof data.weight === "string") {
      try { data.weight = JSON.parse(data.weight); } catch { data.weight = null; }
    }
    if (typeof data.volume === "string") {
      try { data.volume = JSON.parse(data.volume); } catch { data.volume = null; }
    }

    const suggestion = await ProductSuggestion.create({
      ...data,
      created_by: req.admin?._id || null,
    });

    return res.status(201).json({
      success: true,
      message: "Product suggestion template created successfully.",
      data: suggestion,
    });
  } catch (error) {
    console.error("Create Product Suggestion Error:", error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/products/suggestions
 * Merchant searches and browses available suggestions
 */
export const getProductSuggestionsForMerchant = async (req, res) => {
  try {
    const { search, category, page = 1, limit = 20 } = req.query;
    const query = { is_active: true };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    }
    if (category) {
      query.category_id = category;
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [suggestions, total] = await Promise.all([
      ProductSuggestion.find(query)
        .populate("category_id", "label name")
        .populate("subcategory_id", "label name")
        .sort({ usage_count: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      ProductSuggestion.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      pagination: {
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
      data: suggestions,
    });
  } catch (error) {
    console.error("Get Suggestions Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};