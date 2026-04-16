import axios from "axios";
import { ValidationError } from "../validators/validate.js";

const BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://api.cashfree.com"
    : "https://sandbox.cashfree.com";

const cashfreeHeaders = () => ({
  "Content-Type": "application/json",
  "x-client-id": process.env.CASHFREE_CLIENT_ID,
  "x-client-secret": process.env.CASHFREE_SECRET_KEY
});

const handleCashfreeError = (res, error, fallbackMessage) => {
  if (error instanceof ValidationError) {
    return res.status(400).json({ success: false, message: error.message });
  }
  if (error.response) {
    return res.status(error.response.status).json({
      success: false,
      ...error.response.data
    });
  }
  return res.status(500).json({ success: false, message: fallbackMessage });
};

const isCashfreeApiError = (error) => {
  const code = error?.response?.data?.code;
  return code === "api_error";
};

const verifyPanPrimary = async (pan, name) => {
  return axios.post(
    `${BASE_URL}/verification/pan`,
    { pan, name },
    { headers: cashfreeHeaders() }
  );
};

const verifyPanLiteFallback = async (pan, name) => {
  return axios.post(
    `${BASE_URL}/verification/pan-lite`,
    {
      verification_id: `ver_${Date.now()}`,
      pan,
      name
    },
    { headers: cashfreeHeaders() }
  );
};

// ─── PAN Verification ────────────────────────────────────────────────────────
// POST /api/kyc/pan
export const verifyPan = async (req, res) => {
  try {
    const pan = String(req.body?.pan || "").trim().toUpperCase();
    const name = String(req.body?.name || "").trim();

    if (!pan || !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan)) {
      throw new ValidationError("A valid 10-character PAN is required");
    }

    let response;
    try {
      response = await verifyPanPrimary(pan, name);
    } catch (primaryError) {
      // Some sandbox accounts are not enabled for /verification/pan; use pan-lite as fallback.
      if (isCashfreeApiError(primaryError)) {
        response = await verifyPanLiteFallback(pan, name);
      } else {
        throw primaryError;
      }
    }

    return res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    return handleCashfreeError(res, error, "PAN verification failed");
  }
};

// ─── Aadhaar – Step 1: Initiate OTP ──────────────────────────────────────────
// POST /api/kyc/aadhaar/initiate
export const initiateAadhaarOtp = async (req, res) => {
  try {
    const uid = String(req.body?.aadhaarNumber || "").trim();

    if (!uid || !/^\d{12}$/.test(uid)) {
      throw new ValidationError("A valid 12-digit Aadhaar number is required");
    }

    const response = await axios.post(
      `${BASE_URL}/verification/aadhaar`,
      { uid },
      { headers: cashfreeHeaders() }
    );

    return res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    return handleCashfreeError(res, error, "Aadhaar OTP initiation failed");
  }
};

// ─── Aadhaar – Step 2: Verify OTP ────────────────────────────────────────────
// POST /api/kyc/aadhaar/verify
export const verifyAadhaarOtp = async (req, res) => {
  try {
    const refId = String(req.body?.refId || "").trim();
    const otp = String(req.body?.otp || "").trim();

    if (!refId) throw new ValidationError("refId is required");
    if (!otp || !/^\d{6}$/.test(otp)) throw new ValidationError("A valid 6-digit OTP is required");

    const response = await axios.post(
      `${BASE_URL}/verification/aadhaar/verify`,
      { ref_id: refId, otp },
      { headers: cashfreeHeaders() }
    );

    return res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    return handleCashfreeError(res, error, "Aadhaar OTP verification failed");
  }
};
