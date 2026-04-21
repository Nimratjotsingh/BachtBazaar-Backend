import Legal from "../models/legalModel.js";

// 🟢 CREATE DOCUMENT
export const createLegal = async (req, res) => {
  try {
    const { title, content, type, status } = req.body;

    const slug = title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-");

    const existing = await Legal.findOne({ slug });
    if (existing) {
      return res.status(400).json({ message: "Slug already exists" });
    }

    const doc = await Legal.create({
      title,
      slug,
      content,
      type,
      status,
      updatedBy: req.admin?._id
    });

    res.status(201).json({
      success: true,
      doc
    });

  } catch (error) {
    console.log("create legal error", error.message);
    res.status(500).json({ message: "Failed to create document" });
  }
};

 // 🟢 GET ALL DOCUMENTS (Admin Panel)
export const getAllLegals = async (req, res) => {
  try {
    const docs = await Legal.find().sort({ updatedAt: -1 });

    res.json({
      success: true,
      count: docs.length,
      docs
    });

  } catch (error) {
    console.log("get all error", error.message);
    res.status(500).json({ message: "Failed to fetch documents" });
  }
};

 // 🟢 GET SINGLE DOCUMENT (EDIT)
export const getLegalById = async (req, res) => {
  try {
    const doc = await Legal.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }

    res.json({
      success: true,
      doc
    });

  } catch (error) {
    console.log("get one error", error.message);
    res.status(500).json({ message: "Failed to fetch document" });
  }
};

 // 🟢 UPDATE DOCUMENT
export const updateLegal = async (req, res) => {
  try {
    const { title, content, type, status } = req.body;

    const doc = await Legal.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }

    // regenerate slug if title changes
    if (title && title !== doc.title) {
      const slug = title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-");

      const exists = await Legal.findOne({ slug });
      if (exists && exists._id.toString() !== doc._id.toString()) {
        return res.status(400).json({ message: "Slug already exists" });
      }

      doc.slug = slug;
      doc.title = title;
    }

    if (content !== undefined) doc.content = content;
    if (type) doc.type = type;
    if (status) doc.status = status;

    doc.updatedBy = req.admin?._id;

    await doc.save();

    res.json({
      success: true,
      doc
    });

  } catch (error) {
    console.log("update error", error.message);
    res.status(500).json({ message: "Update failed" });
  }
};

 // 🔴 DELETE DOCUMENT
export const deleteLegal = async (req, res) => {
  try {
    const doc = await Legal.findByIdAndDelete(req.params.id);

    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }

    res.json({
      success: true,
      message: "Document deleted"
    });

  } catch (error) {
    console.log("delete error", error.message);
    res.status(500).json({ message: "Delete failed" });
  }
};

 // 🌍 PUBLIC: GET BY SLUG (for frontend website)
export const getLegalBySlug = async (req, res) => {
  try {
    const doc = await Legal.findOne({
      slug: req.params.slug,
      status: "Published"
    });

    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }

    res.json({
      success: true,
      doc
    });

  } catch (error) {
    console.log("slug error", error.message);
    res.status(500).json({ message: "Failed to fetch document" });
  }
};