import express from "express";
import { 
  createService, 
  listServices, 
  getServiceDetails, 
  updateService, 
  deleteService 
} from "../controllers/serviceController.js";

import { protectMerchant } from "../middleware/authMiddleware.js";

const router = express.Router(); 

router.post("/", protectMerchant, createService);

router.get("/", listServices);
router.get("/:id", getServiceDetails);

router.put("/:id", protectMerchant, updateService);

router.delete("/:id", protectMerchant, deleteService);

export default router