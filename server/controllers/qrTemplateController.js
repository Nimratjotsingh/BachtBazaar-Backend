import QrTemplate from "../models/QrTemplate.js";
import MerchantShop from "../models/merchantShopModel.js";
import fs from "fs";
import path from "path";

/**
 * Helper to delete unlinked local files when replacing or deleting templates
 */
const removeLocalFile = (fileUrl) => {
  if (!fileUrl || !fileUrl.startsWith("/uploads/")) return;
  const fileName = fileUrl.replace("/uploads/", "");
  const filePath = path.join(process.cwd(), "public", "uploads", fileName);
  if (fs.existsSync(filePath)) {
    fs.unlink(filePath, (err) => {
      if (err) console.error("Error deleting local file:", err.message);
    });
  }
};

/**
 * POST /api/admin/qr-templates
 * Multipart/form-data upload using local disk storage
 */
export const createQrTemplate = async (req, res) => {
  try {
    const {
      title,
      description,
      category = "GENERAL",
      qrBoxPositionX,
      qrBoxPositionY,
      qrBoxWidth,
      qrBoxHeight,
      showShopName,
      showLogo,
      isDefault = false,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Template title is required.",
      });
    }

    // Extract uploaded files from local storage
    const templateImageFile = req.files?.["templateImage"]?.[0];
    const previewThumbnailFile = req.files?.["previewThumbnail"]?.[0];

    if (!templateImageFile) {
      return res.status(400).json({
        success: false,
        message: "Template image file ('templateImage') is required.",
      });
    }

    // Relative web paths served by express.static
    const templateImageUrl = `/uploads/${templateImageFile.filename}`;
    const previewThumbnailUrl = previewThumbnailFile
      ? `/uploads/${previewThumbnailFile.filename}`
      : templateImageUrl;

    const makeDefault = isDefault === "true" || isDefault === true;
    if (makeDefault) {
      await QrTemplate.updateMany({ category }, { isDefault: false });
    }

    const qrPlacementConfig = {
      qrBoxPositionX: qrBoxPositionX ? Number(qrBoxPositionX) : 50,
      qrBoxPositionY: qrBoxPositionY ? Number(qrBoxPositionY) : 50,
      qrBoxWidth: qrBoxWidth ? Number(qrBoxWidth) : 200,
      qrBoxHeight: qrBoxHeight ? Number(qrBoxHeight) : 200,
      showShopName: showShopName !== undefined ? showShopName === "true" || showShopName === true : true,
      showLogo: showLogo !== undefined ? showLogo === "true" || showLogo === true : true,
    };

    const newTemplate = new QrTemplate({
      title: title.trim(),
      description: description ? description.trim() : "",
      templateImageUrl,
      previewThumbnailUrl,
      category,
      qrPlacementConfig,
      isDefault: makeDefault,
      createdBy: req.admin?._id || null,
    });

    await newTemplate.save();

    return res.status(201).json({
      success: true,
      message: "QR background template uploaded successfully.",
      data: newTemplate,
    });
  } catch (error) {
    console.error("Upload QR Template Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to upload QR template.",
      error: error.message,
    });
  }
};

/**
 * GET /api/admin/qr-templates
 */
export const getAllQrTemplatesAdmin = async (req, res) => {
  try {
    const { page = 1, limit = 20, category, isActive } = req.query;

    const query = {};
    if (category) query.category = category;
    if (isActive !== undefined) query.isActive = isActive === "true";

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Number(limit));
    const skip = (pageNum - 1) * limitNum;

    const [templates, total] = await Promise.all([
      QrTemplate.find(query)
        .sort({ isDefault: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      QrTemplate.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      data: templates,
    });
  } catch (error) {
    console.error("Admin Get QR Templates Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch QR templates.",
      error: error.message,
    });
  }
};

/**
 * PATCH /api/admin/qr-templates/:id
 */
export const updateQrTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      category,
      qrBoxPositionX,
      qrBoxPositionY,
      qrBoxWidth,
      qrBoxHeight,
      showShopName,
      showLogo,
      isDefault,
      isActive,
    } = req.body;

    const template = await QrTemplate.findById(id);
    if (!template) {
      return res.status(404).json({ success: false, message: "Template not found." });
    }

    if (title) template.title = title.trim();
    if (description !== undefined) template.description = description.trim();
    if (category) template.category = category;
    if (isActive !== undefined) template.isActive = isActive === "true" || isActive === true;

    // Replace images if new ones are uploaded
    const templateImageFile = req.files?.["templateImage"]?.[0];
    const previewThumbnailFile = req.files?.["previewThumbnail"]?.[0];

    if (templateImageFile) {
      removeLocalFile(template.templateImageUrl);
      template.templateImageUrl = `/uploads/${templateImageFile.filename}`;
    }

    if (previewThumbnailFile) {
      removeLocalFile(template.previewThumbnailUrl);
      template.previewThumbnailUrl = `/uploads/${previewThumbnailFile.filename}`;
    }

    if (qrBoxPositionX !== undefined) template.qrPlacementConfig.qrBoxPositionX = Number(qrBoxPositionX);
    if (qrBoxPositionY !== undefined) template.qrPlacementConfig.qrBoxPositionY = Number(qrBoxPositionY);
    if (qrBoxWidth !== undefined) template.qrPlacementConfig.qrBoxWidth = Number(qrBoxWidth);
    if (qrBoxHeight !== undefined) template.qrPlacementConfig.qrBoxHeight = Number(qrBoxHeight);
    if (showShopName !== undefined) template.qrPlacementConfig.showShopName = showShopName === "true" || showShopName === true;
    if (showLogo !== undefined) template.qrPlacementConfig.showLogo = showLogo === "true" || showLogo === true;

    if (isDefault !== undefined) {
      const makeDefault = isDefault === "true" || isDefault === true;
      if (makeDefault) {
        await QrTemplate.updateMany({ category: template.category }, { isDefault: false });
      }
      template.isDefault = makeDefault;
    }

    await template.save();

    return res.status(200).json({
      success: true,
      message: "QR Template updated successfully.",
      data: template,
    });
  } catch (error) {
    console.error("Update QR Template Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/admin/qr-templates/:id
 */
export const deleteQrTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const template = await QrTemplate.findByIdAndDelete(id);

    if (!template) {
      return res.status(404).json({ success: false, message: "Template not found." });
    }

    // Clean up local images
    removeLocalFile(template.templateImageUrl);
    removeLocalFile(template.previewThumbnailUrl);

    return res.status(200).json({
      success: true,
      message: "QR Template and local files deleted successfully.",
    });
  } catch (error) {
    console.error("Delete QR Template Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * =========================================================================
 * MERCHANT CONTROLLER METHODS
 * =========================================================================
 */

/**
 * GET /api/merchant/qr-templates
 */
export const getAvailableTemplatesForMerchant = async (req, res) => {
  try {
    const { category } = req.query;

    const query = { isActive: true };
    if (category && category !== "ALL") {
      query.category = category;
    }

    const templates = await QrTemplate.find(query)
      .select("title description templateImageUrl previewThumbnailUrl category qrPlacementConfig isDefault")
      .sort({ isDefault: -1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: templates.length,
      data: templates,
    });
  } catch (error) {
    console.error("Merchant Fetch QR Templates Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load QR templates.",
      error: error.message,
    });
  }
};

/**
 * GET /api/merchant/qr-templates/:templateId/preview
 */
export const getTemplatePreviewWithShopData = async (req, res) => {
  try {
    const { templateId } = req.params;
    const merchantId = req.merchant._id;

    const [template, shop] = await Promise.all([
      QrTemplate.findOne({ _id: templateId, isActive: true }).lean(),
      MerchantShop.findOne({ merchantId })
        .select("shopName address city qrCode logo")
        .lean(),
    ]);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found or inactive.",
      });
    }

    // if (!shop) {
    //   return res.status(404).json({
    //     success: false,
    //     message: "Shop profile not found.",
    //   });
    // }

    if(shop){
        return res.status(200).json({
      success: true,
      data: {
        template: {
          _id: template._id,
          title: template.title,
          templateImageUrl: template.templateImageUrl,
          qrPlacementConfig: template.qrPlacementConfig,
        },
        shop: {
          shopName: shop.shopName,
          address: `${shop.address || ""}, ${shop.city || ""}`,
          logoUrl: shop.logo?.url || null,
        },
      },
    });
    }
    return res.status(200).json({
      success: true,
      data: {
        template: {
          _id: template._id,
          title: template.title,
          templateImageUrl: template.templateImageUrl,
          qrPlacementConfig: template.qrPlacementConfig,
        },
        
      },
    });
    
  } catch (error) {
    console.error("Preview QR Standee Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to build preview payload.",
      error: error.message,
    });
  }
};