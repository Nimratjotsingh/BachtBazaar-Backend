import QuickOfferTemplate from "../models/QuickOfferTemplateModel.js";

/**
 * POST /api/admin/quick-templates
 * Creates a brand new quick-reply phrase template for merchants
 */
export const adminCreateQuickTemplate = async (req, res) => {
  try {
    const { title, messageContent } = req.body;

    // 1. Basic Parameters Presence Validation Check
    if (!title || !messageContent) {
      return res.status(400).json({
        success: false,
        message: "Validation Failed: Both 'title' and 'messageContent' parameters are required."
      });
    }

    // 2. Instantiate and save the new quick-reply block
    const newTemplate = new QuickOfferTemplate({
      title: title.trim(),
      messageContent: messageContent.trim(),
      isActive: true
    });

    await newTemplate.save();

    return res.status(201).json({
      success: true,
      message: "Admin configuration template created successfully.",
      data: newTemplate
    });

  } catch (error) {
    console.error("Admin Create Quick Template Exception:", error);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while publishing the admin template.",
      error: error.message
    });
  }
};

/**
 * GET /api/admin/quick-templates
 * Retrieves all quick-templates (both active and inactive) with custom pagination limits
 */
export const adminGetAllQuickTemplates = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, activeOnly } = req.query;

    const query = {};

    // Filter by string searches if matching text grids from searchbars
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { messageContent: { $regex: search, $options: "i" } }
      ];
    }

    // Filter if looking purely for running configurations (e.g., for merchant dropdown injection)
    if (activeOnly === "true") {
      query.isActive = true;
    }

    const currentLimit = Number(limit);
    const skip = (Math.max(1, Number(page)) - 1) * currentLimit;

    const total = await QuickOfferTemplate.countDocuments(query);
    const templates = await QuickOfferTemplate.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(currentLimit)
      .lean();

    return res.status(200).json({
      success: true,
      total,
      pages: Math.ceil(total / currentLimit) || 1,
      currentPage: Number(page),
      data: templates
    });

  } catch (error) {
    console.error("Admin Fetch All Templates Matrix Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to extract administrative quick template records.",
      error: error.message
    });
  }
};

/**
 * PUT /api/admin/quick-templates/:id
 * Updates text details, titles, or active/inactive deployment states of an existing template
 */
export const adminUpdateQuickTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, messageContent, isActive } = req.body;

    // Find the target profile block configuration row
    const targetTemplate = await QuickOfferTemplate.findById(id);
    if (!targetTemplate) {
      return res.status(404).json({
        success: false,
        message: "The requested quick template entity was not found inside database indexes."
      });
    }

    // Apply partial updates safely
    if (title !== undefined) targetTemplate.title = title.trim();
    if (messageContent !== undefined) targetTemplate.messageContent = messageContent.trim();
    if (isActive !== undefined) targetTemplate.isActive = Boolean(isActive);

    await targetTemplate.save();

    return res.status(200).json({
      success: true,
      message: "Administrative template settings updated successfully.",
      data: targetTemplate
    });

  } catch (error) {
    console.error("Admin Update Template Pipeline Error:", error);
    return res.status(500).json({
      success: false,
      message: "An internal crash occurred while updating the template framework data properties.",
      error: error.message
    });
  }
};

/**
 * DELETE /api/admin/quick-templates/:id
 * Performs a hard delete to wipe a quick template out of system registers
 */
export const adminDeleteQuickTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    const deletionReport = await QuickOfferTemplate.findByIdAndDelete(id);
    
    if (!deletionReport) {
      return res.status(404).json({
        success: false,
        message: "Failed execution: Target template mapping record does not exist."
      });
    }

    return res.status(200).json({
      success: true,
      message: "The selected quick offer template was successfully dropped from production databases."
    });

  } catch (error) {
    console.error("Admin Template Deletion Step Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to clear the specific resource target record index.",
      error: error.message
    });
  }
};