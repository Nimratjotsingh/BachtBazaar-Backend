import express from "express";
import {
  getAllServicesAdmin,
  getServiceDetailsAdmin,
  verifyServiceListing,
  updateServiceAdmin,
  deleteServiceAdmin,
} from "../../controllers/adminServiceController.js";
import upload from "../../middleware/uploadSec.js";
import { protectStaff } from "../../middleware/staffAuthMiddleware.js";

const router = express.Router();

const serviceUploadFields = upload.fields([
  { name: "thumbnail", maxCount: 1 },
  { name: "images", maxCount: 10 },
  { name: "provider_image", maxCount: 1 },
]);




// Apply admin protection
router.use(protectStaff);

router.get("/", getAllServicesAdmin);



router.get("/:id", getServiceDetailsAdmin);
router.patch("/:id/verify", upload.single("thumbnail"),verifyServiceListing);
router.put("/:id", serviceUploadFields, updateServiceAdmin);
router.delete("/:id", deleteServiceAdmin);

export default router;