import Area from "../models/AreaModel.js";
import mongoose from "mongoose";

// ====================================================================
// --- 1. CREATE NEW AREA ZONE (Admin Only) ---------------------------
// ====================================================================
export const createArea = async (req, res) => {
  try {
    const { name, city, latitude, longitude, radius_km } = req.body;

    if (!name || !city || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: "Area name, city, latitude, and longitude are required fields."
      });
    }

    // Check if an area with the exact same name already exists in this city
    const existingArea = await Area.findOne({
      name: { $regex: `^${name.trim()}$`, $options: "i" },
      city: city.trim().toLowerCase()
    });

    if (existingArea) {
      return res.status(400).json({
        success: false,
        message: "An area zone with this name already exists in the target city."
      });
    }

    const newArea = await Area.create({
      name: name.trim(),
      city: city.trim().toLowerCase(),
      radius_km: Number(radius_km) || 5,
      center_location: {
        type: "Point",
        // GeoJSON Rule: Longitude always comes FIRST, Latitude comes SECOND
        coordinates: [Number(longitude), Number(latitude)]
      }
    });

    return res.status(201).json({
      success: true,
      message: "Hyper-local area zone defined and geofenced successfully.",
      data: newArea
    });

  } catch (error) {
    console.error("Create Area Zone Error:", error);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while creating the area zone."
    });
  }
};

// ====================================================================
// --- 2. GET ALL AREAS BY CITY (User & Merchant Dropdowns) ----------
// ====================================================================
export const getAreasByCity = async (req, res) => {
  try {
    const { city } = req.query;

    const filter = { is_active: true };
    if (city) {
      filter.city = city.trim().toLowerCase();
    }

    // Sort alphabetically by area name
    const areas = await Area.find(filter).sort({ name: 1 }).lean();

    return res.status(200).json({
      success: true,
      count: areas.length,
      data: areas
    });

  } catch (error) {
    console.error("Get Areas By City Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to collect area zoning registries."
    });
  }
};

// ====================================================================
// --- 3. GET ALL AREAS FOR MANAGEMENT (Admin Grid View) -------------
// ====================================================================
export const getAllAreasAdmin = async (req, res) => {
  try {
    const areas = await Area.find({}).sort({ city: 1, name: 1 }).lean();

    return res.status(200).json({
      success: true,
      count: areas.length,
      data: areas
    });
  } catch (error) {
    console.error("Get Admin Areas Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to trace complete administrative area schemas."
    });
  }
};

// ====================================================================
// --- 4. UPDATE AREA ZONE DETAILS (Admin Only) ----------------------
// ====================================================================
export const updateArea = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, city, latitude, longitude, radius_km, is_active } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid Area ID format." });
    }

    const area = await Area.findById(id);
    if (!area) {
      return res.status(404).json({ success: false, message: "Target area zone registry file not found." });
    }

    const updates = {};
    if (name) updates.name = name.trim();
    if (city) updates.city = city.trim().toLowerCase();
    if (radius_km !== undefined) updates.radius_km = Number(radius_km);
    if (is_active !== undefined) updates.is_active = is_active;

    // Handle coordinate parsing safely if updated
    if (latitude !== undefined || longitude !== undefined) {
      const finalLng = longitude !== undefined ? Number(longitude) : area.center_location.coordinates[0];
      const finalLat = latitude !== undefined ? Number(latitude) : area.center_location.coordinates[1];
      
      updates.center_location = {
        type: "Point",
        coordinates: [finalLng, finalLat]
      };
    }

    const updatedArea = await Area.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: "Area boundaries updated successfully.",
      data: updatedArea
    });

  } catch (error) {
    console.error("Update Area Error:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while modifying zone specifications."
    });
  }
};

// ====================================================================
// --- 5. PERMANENT DELETE AREA ZONE (Admin Only) --------------------
// ====================================================================
export const deleteArea = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid ID parameter format." });
    }

    // Check if there are any dependent calendar configurations locked to this area before stripping it
    const hasDependencies = await mongoose.model("CalendarConfig").exists({ area_id: id });
    if (hasDependencies) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete this area zone. Active promotional calendar configurations are currently locked to it."
      });
    }

    const deletedArea = await Area.findByIdAndDelete(id);
    if (!deletedArea) {
      return res.status(404).json({ success: false, message: "Area zone missing from database target records." });
    }

    return res.status(200).json({
      success: true,
      message: "Area zone wiped permanently from geofencing directory maps."
    });

  } catch (error) {
    console.error("Delete Area Error:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred during transaction execution processing paths."
    });
  }
};