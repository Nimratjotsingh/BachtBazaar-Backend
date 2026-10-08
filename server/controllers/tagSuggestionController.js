import TagSuggestion from "../models/tagSuggestionSchemaModel.js";
import mongoose from "mongoose";

// Helper to normalize and sanitize tag inputs
const sanitizeTags = (tags) => {
  if (!Array.isArray(tags)) return [];
  return [...new Set(tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean))];
};

/**
 * @desc    Create a new tag suggestion rule
 * @route   POST /api/admin/tag-suggestions
 */
export const createTagSuggestion = async (req, res) => {
  try {
    const { category_id, subcategory_id, tags, is_active } = req.body;

    if (!category_id && !subcategory_id) {
      return res.status(400).json({
        success: false,
        message: "At least one category_id or subcategory_id must be provided.",
      });
    }

    const cleanedTags = sanitizeTags(tags);
    if (cleanedTags.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one valid tag is required.",
      });
    }

    // Check for existing combination rule
    const existingRule = await TagSuggestion.findOne({
      category_id: category_id || null,
      subcategory_id: subcategory_id || null,
    });

    if (existingRule) {
      return res.status(409).json({
        success: false,
        message: "A suggestion rule for this category/subcategory mapping already exists.",
        data: existingRule,
      });
    }

    const suggestion = await TagSuggestion.create({
      category_id: category_id || null,
      subcategory_id: subcategory_id || null,
      tags: cleanedTags,
      is_active: is_active ?? true,
    });

    return res.status(201).json({
      success: true,
      message: "Tag suggestion created successfully.",
      data: suggestion,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get all tag suggestions with pagination and filtering
 * @route   GET /api/admin/tag-suggestions
 */
export const getAllTagSuggestions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category_id,
      subcategory_id,
      search,
      is_active,
    } = req.query;

    const filter = {};

    if (category_id) filter.category_id = category_id;
    if (subcategory_id) filter.subcategory_id = subcategory_id;
    if (typeof is_active !== "undefined") filter.is_active = is_active === "true";
    if (search) {
      filter.tags = { $in: [new RegExp(search.trim(), "i")] };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      TagSuggestion.find(filter)
        .populate("category_id", "name")
        .populate("subcategory_id", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      TagSuggestion.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: items,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get a single tag suggestion rule by ID
 * @route   GET /api/admin/tag-suggestions/:id
 */
export const getTagSuggestionById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid ID format" });
    }

    const suggestion = await TagSuggestion.findById(id)
      .populate("category_id", "name")
      .populate("subcategory_id", "name");

    if (!suggestion) {
      return res.status(404).json({ success: false, message: "Suggestion not found" });
    }

    return res.status(200).json({ success: true, data: suggestion });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Update a tag suggestion rule (tags, references, or status)
 * @route   PUT /api/admin/tag-suggestions/:id
 */
export const updateTagSuggestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { category_id, subcategory_id, tags, is_active } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid ID format" });
    }

    const suggestion = await TagSuggestion.findById(id);
    if (!suggestion) {
      return res.status(404).json({ success: false, message: "Suggestion not found" });
    }

    const targetCategory = category_id !== undefined ? category_id : suggestion.category_id;
    const targetSubCategory = subcategory_id !== undefined ? subcategory_id : suggestion.subcategory_id;

    if (!targetCategory && !targetSubCategory) {
      return res.status(400).json({
        success: false,
        message: "At least one category_id or subcategory_id must remain assigned.",
      });
    }

    // Check collision if category/subcategory combination is changed
    const isComboChanged =
      String(targetCategory) !== String(suggestion.category_id) ||
      String(targetSubCategory) !== String(suggestion.subcategory_id);

    if (isComboChanged) {
      const conflict = await TagSuggestion.findOne({
        _id: { $ne: id },
        category_id: targetCategory || null,
        subcategory_id: targetSubCategory || null,
      });

      if (conflict) {
        return res.status(409).json({
          success: false,
          message: "Another rule already exists for this category/subcategory combination.",
        });
      }
    }

    if (category_id !== undefined) suggestion.category_id = category_id || null;
    if (subcategory_id !== undefined) suggestion.subcategory_id = subcategory_id || null;
    if (typeof is_active === "boolean") suggestion.is_active = is_active;
    if (tags !== undefined) {
      const cleaned = sanitizeTags(tags);
      if (cleaned.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Tags array cannot be empty.",
        });
      }
      suggestion.tags = cleaned;
    }

    await suggestion.save();

    return res.status(200).json({
      success: true,
      message: "Tag suggestion updated successfully",
      data: suggestion,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Append or remove individual tags from an existing rule
 * @route   PATCH /api/admin/tag-suggestions/:id/tags
 */
export const modifyTagsInRule = async (req, res) => {
  try {
    const { id } = req.params;
    const { add = [], remove = [] } = req.body;

    const tagsToAdd = sanitizeTags(add);
    const tagsToRemove = sanitizeTags(remove);

    const updateOperations = {};

    if (tagsToAdd.length > 0) {
      updateOperations.$addToSet = { tags: { $each: tagsToAdd } };
    }
    if (tagsToRemove.length > 0) {
      updateOperations.$pull = { tags: { $in: tagsToRemove } };
    }

    if (Object.keys(updateOperations).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide tags to 'add' or 'remove'.",
      });
    }

    const updated = await TagSuggestion.findByIdAndUpdate(id, updateOperations, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: "Suggestion not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Tags modified successfully",
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Delete a tag suggestion rule
 * @route   DELETE /api/admin/tag-suggestions/:id
 */
export const deleteTagSuggestion = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid ID format" });
    }

    const deleted = await TagSuggestion.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Suggestion not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Tag suggestion deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const parseObjectIds = (input) => {
  if (!input) return [];
  const rawList = Array.isArray(input) ? input : String(input).split(",");
  return rawList
    .map((id) => id.trim())
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
};

/**
 * @desc    Get tag suggestions for product creation/editing based on category & subcategory
 * @route   GET /api/tags/suggestions
 * @route   POST /api/tags/suggestions (useful when sending large ID arrays)
 * @access  Merchant / Public
 */
export const getTagSuggestionsForProduct = async (req, res) => {
  try {
    // Read from req.query (GET) or req.body (POST)
    const categorySource = req.body?.category_id || req.query?.category_id;
    const subcategorySource = req.body?.subcategory_id || req.query?.subcategory_id;
    const queryTerm = (req.body?.q || req.query?.q || "").trim().toLowerCase();

    const categoryIds = parseObjectIds(categorySource);
    const subcategoryIds = parseObjectIds(subcategorySource);

    // If neither category nor subcategory is provided, return an empty set early
    if (categoryIds.length === 0 && subcategoryIds.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
      });
    }

    // Build hierarchical matching conditions
    const orConditions = [];

    // 1. Matched when both category and subcategory align
    if (categoryIds.length > 0 && subcategoryIds.length > 0) {
      orConditions.push({
        category_id: { $in: categoryIds },
        subcategory_id: { $in: subcategoryIds },
      });
    }

    // 2. Fallback to broad category-level rules
    if (categoryIds.length > 0) {
      orConditions.push({
        category_id: { $in: categoryIds },
        subcategory_id: null,
      });
    }

    // 3. Fallback to subcategory-specific rules
    if (subcategoryIds.length > 0) {
      orConditions.push({
        subcategory_id: { $in: subcategoryIds },
        category_id: null,
      });
    }

    // Find active suggestions matching any of the branches
    const matchedRules = await TagSuggestion.find({
      is_active: true,
      $or: orConditions,
    })
      .select("tags")
      .lean();

    // Deduplicate tags across rules
    const uniqueTags = new Set();
    matchedRules.forEach((rule) => {
      rule.tags?.forEach((tag) => uniqueTags.add(tag));
    });

    let results = Array.from(uniqueTags);

    // Optional: Filter tags if the merchant is typing a prefix (auto-complete search)
    if (queryTerm) {
      results = results.filter((tag) => tag.includes(queryTerm));
    }

    // Sort alphabetically for clean UI presentation
    results.sort((a, b) => a.localeCompare(b));

    return res.status(200).json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch tag suggestions",
      error: error.message,
    });
  }
};