import express from "express";
import {
  saveOfferDraft,
  updateOfferDraft,
  getMerchantOfferDrafts,
  publishOfferDraft,
  discardOfferDraft,
} from "../controllers/offerDraftController.js";
import { protectMerchant } from "../middleware/authMiddleware.js";
import uploadSec from '../middleware/uploadSec.js'

const router = express.Router();

router.post("/", protectMerchant, uploadSec.single('image'),saveOfferDraft);
router.get("/", protectMerchant, getMerchantOfferDrafts);
router.put("/:draftId", protectMerchant, uploadSec.single('image'),updateOfferDraft);
router.post("/:draftId/publish", protectMerchant, publishOfferDraft);
router.delete("/:draftId", protectMerchant, discardOfferDraft);

export default router;