import OfferType from "../models/offer_type.js";

// Helper to determine role and ID from request middleware
const getRequestorDetails = (req) => {
  if (req.admin) return { id: req.admin._id, role: "admin" };
  if (req.merchant) return { id: req.merchant._id, role: "merchant" };
  return { id: null, role: null };
};

// ==========================================
// 1. CREATE OFFER TYPE (With Icon Support)
// ==========================================
export const createOfferType = async (req, res) => {
  try {
    const { id, role } = getRequestorDetails(req);
    if (!role) return res.status(401).json({ success: false, message: "Unauthorized" });

    const { value, label, description } = req.body;

    if (!value || !label) {
      return res.status(400).json({ success: false, message: "Value and Label are required" });
    }

    // Check if value already exists globally
    const cleanValue = value.toLowerCase().trim();
    const existingType = await OfferType.findOne({ value: cleanValue });
    if (existingType) {
      return res.status(400).json({ success: false, message: "This offer type value already exists" });
    }

    // Process local server file storage path injected by Multer middleware
    let iconPath = "";
    if (req.file) {
      iconPath = `/uploads/${req.file.filename}`;
    }

    const newOfferType = new OfferType({
      value: cleanValue,
      label: label.trim(),
      description: description?.trim(),
      icon: iconPath, // Storing static relative file string path cleanly
      created_by_type: role,
      owner_id: id,
    });

    await newOfferType.save();
    res.status(201).json({ success: true, data: newOfferType });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 2. READ/LIST OFFER TYPES (Visibility Rules)
// ==========================================
export const getOfferTypes = async (req, res) => {
  try {
    const { id, role } = getRequestorDetails(req);
    if (!role) return res.status(401).json({ success: false, message: "Unauthorized" });

    let query = {};

    if (role === "admin") {
      // Admins see all admin-created categories to manage system presets comprehensively
      query = { created_by_type: "admin" };
    } else if (role === "merchant") {
      // Merchants see all system types created by admins AND their own custom types
      query = {
        $or: [
          { created_by_type: "admin" }, // Global templates from admins
          { created_by_type: "merchant", owner_id: id } // Merchant's own types
        ]
      };
    }

    const types = await OfferType.find(query).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: types });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 3. UPDATE OFFER TYPE (With Icon Re-upload)
// ==========================================
export const updateOfferType = async (req, res) => {
  try {
    const { id, role } = getRequestorDetails(req);
    const { typeId } = req.params;
    
    // Create copy of body to modify fields safely
    const updates = { ...req.body };

    // Build ownership enforcement query
    const targetQuery = { _id: typeId, created_by_type: role, owner_id: id };

    if (updates.value) updates.value = updates.value.toLowerCase().trim();
    if (updates.label) updates.label = updates.label.trim();
    if (updates.description) updates.description = updates.description.trim();

    // If a brand new graphic file stream is being passed, update the path pointer
    if (req.file) {
      updates.icon = `/uploads/${req.file.filename}`;
    }

    const updatedType = await OfferType.findOneAndUpdate(
      targetQuery,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updatedType) {
      return res.status(404).json({ 
        success: false, 
        message: "Offer Type not found or you do not have permission to edit this record." 
      });
    }

    res.status(200).json({ success: true, message: "Updated successfully", data: updatedType });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ==========================================
// 4. DELETE OFFER TYPE
// ==========================================
export const deleteOfferType = async (req, res) => {
  try {
    const { id, role } = getRequestorDetails(req);
    const { typeId } = req.params;

    // Strict validation: Must match exact creator criteria
    const deletedType = await OfferType.findOneAndDelete({
      _id: typeId,
      created_by_type: role,
      owner_id: id
    });

    if (!deletedType) {
      return res.status(404).json({ 
        success: false, 
        message: "Offer Type not found or you are unauthorized to remove it." 
      });
    }

    res.status(200).json({ success: true, message: "Offer type permanently deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};