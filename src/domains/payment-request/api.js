import express from "express";
import { verifyAccessToken } from "../../middlewares/auth/verifyAccessToken.js";
import { createPaymentRequest } from "./service.js";

const router = express.Router();

router.post("/payment-request", verifyAccessToken, async (req, res) => {
  try {
    const paymentRequest = await createPaymentRequest(req);
    return res.status(201).json({
      success: true,
      message: "Payment request submitted successfully",
      data: paymentRequest,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
