import multer from "multer";
import fs from "fs";
import path from "path";

// Target folder: public/uploads/journal
const uploadDir = path.join(process.cwd(), "public", "uploads", "journal");

// Create directory recursively if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname.replace(/\s+/g, "-").toLowerCase()}`;
    cb(null, uniqueName);
  },
});

// File type filter for images and voice notes
const fileFilter = (req, file, cb) => {
  const allowedImages = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
  const allowedAudio = [
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/m4a",
    "audio/aac",
    "audio/ogg",
    "audio/webm",
  ];

  if (file.fieldname === "images" && allowedImages.includes(file.mimetype)) {
    cb(null, true);
  } else if (
    file.fieldname === "voiceNote" &&
    (allowedAudio.includes(file.mimetype) || file.mimetype.startsWith("audio/"))
  ) {
    cb(null, true);
  } else {
    cb(
      new Error(`Unsupported file type for '${file.fieldname}'. Only images and audio files are allowed.`),
      false
    );
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
  fileFilter,
});

// Multer fields handler
const multerFieldsMiddleware = upload.fields([
  { name: "images", maxCount: 5 },
  { name: "voiceNote", maxCount: 1 },
]);

/**
 * Standard Express Middleware wrapper
 */
export const uploadJournalMedia = (req, res, next) => {
  multerFieldsMiddleware(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`,
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || "File upload validation failed.",
      });
    }
    next();
  });
};

export default uploadJournalMedia;