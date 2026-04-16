import axios from "axios";
import { ValidationError } from "../validators/validate.js";

const validateKycPayload = (body) => {
  const aadhaarNumber = String(body?.aadhaarNumber || "").trim();
  const panNumber = String(body?.panNumber || "").trim().toUpperCase();

  if (!aadhaarNumber || !panNumber) {
    throw new ValidationError("aadhaarNumber and panNumber are required");
  }

  return { aadhaarNumber, panNumber };
};

export const verifyKyc = async (req, res) => {
  try {
    const { aadhaarNumber, panNumber } = validateKycPayload(req.body);

    const response = await axios.post(
      process.env.CASHFREE_KYC_VERIFY_URL || "https://sandbox.cashfree.com/verification/kyc",
      {
        aadhaarNumber,
        panNumber
      },
      {
        headers: {
          "x-client-id": process.env.CASHFREE_CLIENT_ID,
          "x-client-secret": process.env.CASHFREE_SECRET_KEY,
          "Content-Type": "application/json"
        }
      }
    );

    // Passthrough response as-is from Cashfree
    return res.status(response.status).send(response.data);
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ message: error.message });
    }

    if (error.response) {
      // Passthrough Cashfree error response as-is
      return res.status(error.response.status).send(error.response.data);
    }

    return res.status(500).json({ message: "KYC verification failed" });
  }
};
