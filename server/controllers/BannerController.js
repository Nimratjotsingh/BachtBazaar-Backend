import Offer from "../models/offerModel.js";
import BannerType from "../models/BannerTypeModel.js";
import Area from "../models/AreaModel.js";

export const createBannerOffer = async (req, res) => {
  try {
    const data = { ...req.body };
    const merchantId = req.merchant._id; // Extracted from auth middleware session

    const { banner_type_id, start_date, end_date, lat, lng } = data;

    // 1. Structural Validation Checklist
    if (!banner_type_id) {
      return res.status(400).json({ success: false, message: "banner_type_id is required." });
    }

    if (lat === undefined || lng === undefined || lat === "" || lng === "") {
      return res.status(400).json({ 
        success: false, 
        message: "Explicit 'lat' and 'lng' parameters are required to anchor the banner location." 
      });
    }

    // Verify layout profile exists and is active
    const targetBannerType = await BannerType.findOne({ _id: banner_type_id, isActive: true }).lean();
    if (!targetBannerType) {
      return res.status(404).json({ 
        success: false, 
        message: "The requested banner layout type configuration is invalid or inactive." 
      });
    }

    // 2. Process Asset Image Upload path from Multer
    if (req.file) {
      data.thumbnail = `/uploads/${req.file.filename}`;
    } else {
      return res.status(400).json({ success: false, message: "Banner creative display image asset is required." });
    }

    // 3. Timeframe Windows Normalization
    const finalStartDate = start_date ? new Date(start_date) : new Date();
    const finalEndDate = end_date ? new Date(end_date) : undefined;
    
    finalStartDate.setUTCHours(0, 0, 0, 0);
    if (finalEndDate) {
      finalEndDate.setUTCHours(23, 59, 59, 999);
      if (finalStartDate > finalEndDate) {
        return res.status(400).json({ success: false, message: "Start date cannot exceed the campaign end date." });
      }
    }

    // 4. Geospatial Area Mapping Execution
    const resolvedLat = Number(lat);
    const resolvedLng = Number(lng);

    const geoResults = await Area.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [resolvedLng, resolvedLat] }, // [longitude, latitude]
          distanceField: "distance_meters",
          spherical: true,
          query: { is_active: true }
        }
      },
      { $limit: 1 }
    ]);

    if (geoResults.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Your targeted coordinate points fall outside active operational boundaries."
      });
    }

    // 5. Build and Save Clean Minimalist Banner Document
    const newBannerOffer = new Offer({
      ...data,
      merchant_id: merchantId,
      display_type: "banner", // Forced fallback to lock this entity into your banner streams
      banner_type_id: targetBannerType._id,
      start_date: finalStartDate,
      end_date: finalEndDate,
      location: {
        type: "Point",
        coordinates: [resolvedLng, resolvedLat]
      },
      // Safely transform numbers, defaulting to null/0 where applicable
      discount_percentage: data.discount_percentage ? Number(data.discount_percentage) : null,
      discount_value: data.discount_value ? Number(data.discount_value) : null,
      minimum_purchase_amount: data.minimum_purchase_amount ? Number(data.minimum_purchase_amount) : 0,
      tags: typeof data.tags === "string" ? data.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
      product_id: typeof data.product_id === "string" ? data.product_id.split(",").map(id => id.trim()).filter(Boolean) : []
    });

    await newBannerOffer.save();

    return res.status(201).json({
      success: true,
      message: "Banner advertising campaign created successfully.",
      data: newBannerOffer
    });

  } catch (error) {
    console.error("Create Merchant Banner Controller Exception:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};