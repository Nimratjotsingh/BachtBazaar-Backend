 // Or your storage handler (Multer / S3)

export const updateEntityImage = async (req, res) => {
  try {
    const { entityId } = req.params;
    const { entityType } = req.body; // e.g., 'product', 'banner', 'service', 'qr-template'

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image file provided." });
    }

    let Model;
    let imageField = "thumbnail"; // default field name

    switch (entityType) {
      case "product":
        Model = (await import("../models/productModel.js")).default;
        imageField = "thumbnail";
        break;
      case "service":
        Model = (await import("../models/serviceModel.js")).default;
        imageField = "thumbnail";
        break;
      case "offer":
        Model = (await import("../models/offerModel.js")).default;
        imageField = "image";
        break;
      case "qr-template":
        Model = (await import("../models/qrTemplateModel.js")).default;
        imageField = "templateImageUrl";
        break;
      default:
        return res.status(400).json({ success: false, message: "Invalid entity type specified." });
    }

    const entity = await Model.findById(entityId);
    if (!entity) {
      return res.status(404).json({ success: false, message: "Target entity record not found." });
    }

    // Assign the newly uploaded file path (assuming Multer / Cloudinary middleware attached req.file.path or req.file.url)
    const newImageUrl = req.file.path || req.file.url;
    entity[imageField] = newImageUrl;
    await entity.save();

    return res.status(200).json({
      success: true,
      message: "Image asset updated successfully.",
      imageUrl: newImageUrl,
      data: entity
    });

  } catch (error) {
    console.error("Single Image Update Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};