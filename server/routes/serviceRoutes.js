import express from "express";
import { 
  createService, 
  listServices, 
  getServiceDetails, 
  updateService, 
  deleteService 
} from "../controllers/serviceController.js";
import upload from '../middleware/uploadSec.js'

import { protectMerchant } from "../middleware/authMiddleware.js";

const router = express.Router(); 

router.post("/", protectMerchant, upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "images", maxCount: 10 }
  ]),createService);

router.get("/", protectMerchant,listServices);
router.get("/:id", getServiceDetails);

router.put("/:id", protectMerchant, upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "images", maxCount: 10 }
  ]),updateService);

router.delete("/:id", protectMerchant, deleteService);

export default router