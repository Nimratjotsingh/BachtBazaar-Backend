import express from "express";
import upload from "../middleware/uploadSec.js";
import { protectMerchant } from "../middleware/authMiddleware.js";
import { checkTaskStatus,requestAadhaarVerification,requestPanVerification, upsertBusinessDocs,requestFssaiVerification,requestDrivingLicenseVerification } from "../controllers/merchantBusinessDocController.js";

const router = express.Router();

router.post(
  "/",
  protectMerchant,
  upload.fields([
    { name: "gstImage", maxCount: 1 },
    { name: "tradeLicenseImage", maxCount: 1 },
    { name: "shopRegistrationImage", maxCount: 1 },
    { name: "fssaiImage", maxCount: 1 },
    { name: "panImage", maxCount: 1 }
  ]),
  upsertBusinessDocs
);

router.post("/pan/request", protectMerchant, requestPanVerification);
router.post("/aadhaar/request", protectMerchant, requestAadhaarVerification);


// Async FSSAI Request
router.post("/fssai/request", protectMerchant, requestFssaiVerification);

// 2. Poll or check verification result by requestId
router.get("/task-status/:requestId", protectMerchant, checkTaskStatus);

router.post('/dl/request',protectMerchant,requestDrivingLicenseVerification)



export default router;
