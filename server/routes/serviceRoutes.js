import express from "express";
import {
  createService,
  listServices,
  getServiceDetails,
  updateService,
  deleteService,
  searchServiceSuggestions,
} from "../controllers/serviceController.js";
import upload from "../middleware/uploadSec.js";
import { protectMerchant } from "../middleware/authMiddleware.js";

const router = express.Router();

// Define allowed upload fields (Thumbnail, Gallery Images, Provider Avatar)
const serviceUploadFields = upload.fields([
  { name: "thumbnail", maxCount: 1 },
  { name: "images", maxCount: 10 },
  { name: "provider_image", maxCount: 1 },
]);

// 1. Merchant suggestion autocomplete search (Must sit before /:id)
router.get("/suggestions", protectMerchant, searchServiceSuggestions);

// 2. Core Service CRUD
router.post("/", protectMerchant, serviceUploadFields, createService);
router.get("/", protectMerchant, listServices);
router.get("/:id", getServiceDetails);
router.put("/:id", protectMerchant, serviceUploadFields, updateService);
router.delete("/:id", protectMerchant, deleteService);

export default router;