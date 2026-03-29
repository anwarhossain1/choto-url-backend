import express from "express";
import { sendTelegramMessage } from "../../libraries/telegram.js";
import { verifyAccessToken } from "../../middlewares/auth/verifyAccessToken.js";
import { verifyAdminAccessToken } from "../../middlewares/auth/verifyAdminAccessToken.js";
import { logRequest } from "../../middlewares/log/index.js";
import {
  createPaymentRequest,
  getAdminPaymentRequests,
  getMyPaymentRequests,
} from "./service.js";

const router = express.Router();

router.get(
  "/payment-requests",
  verifyAdminAccessToken,
  logRequest({}),
  getAdminPaymentRequests,
);

router.get(
  "/payment-requests/my",
  verifyAccessToken,
  logRequest({}),
  getMyPaymentRequests,
);
router.post(
  "/payment-request",
  verifyAccessToken,
  logRequest({}),
  async (req, res) => {
    try {
      const paymentRequest = await createPaymentRequest(req);
      await sendTelegramMessage(
        `🆕 New Payment Request Submitted!\nUser ID: ${req.user.userId}\nPlan: ${paymentRequest.plan}\nAmount: ${paymentRequest.amount} ${paymentRequest.currency}\nPayment Method: ${paymentRequest.paymentMethod}\nTransaction ID: ${paymentRequest.transactionId}\nSender Number: ${paymentRequest.senderNumber}\nNote: ${paymentRequest.note || "N/A"}`,
      );
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
  },
);

export default router;
