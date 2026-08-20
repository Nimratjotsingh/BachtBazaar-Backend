import { incrementUserMilestoneProgress } from "../utils/milestoneHelper.js";

/**
 * Universal safe wrapper to trigger milestone increments asynchronously
 * without blocking API response pipelines.
 */
export const triggerMilestoneActionHook = ({ merchantId, userId, actionType }) => {
  if (!merchantId || !userId || !actionType) return;

  setImmediate(async () => {
    try {
      await incrementUserMilestoneProgress(merchantId, userId, actionType);
    } catch (err) {
      console.error(`[Milestone Hook Error - ${actionType}]:`, err.message);
    }
  });
};

/**
 * Hook 1: Triggered when a user redeems an offer at a store
 */
export const onOfferRedeemedHook = (merchantId, userId) => {
  triggerMilestoneActionHook({
    merchantId,
    userId,
    actionType: "REDEEM",
  });
};

/**
 * Hook 2: Triggered when a user claims an offer/coupon into their wallet
 */
export const onOfferClaimedHook = (merchantId, userId) => {
  triggerMilestoneActionHook({
    merchantId,
    userId,
    actionType: "CLAIM",
  });
};

/**
 * Hook 3: Triggered when a user clicks/views a merchant's offer or profile
 */
export const onOfferClickedHook = (merchantId, userId) => {
  triggerMilestoneActionHook({
    merchantId,
    userId,
    actionType: "OFFER_CLICK",
  });
};

/**
 * Hook 4: Triggered when a user checks in / scans QR physically at the shop (Footfall)
 */
export const onFootfallVisitHook = (merchantId, userId) => {
  triggerMilestoneActionHook({
    merchantId,
    userId,
    actionType: "FOOTFALL_VISIT",
  });
};