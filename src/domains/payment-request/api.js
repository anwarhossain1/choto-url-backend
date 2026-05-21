import express from "express";
import { sendTelegramMessage } from "../../libraries/telegram.js";
import { verifyAccessToken } from "../../middlewares/auth/verifyAccessToken.js";
import { verifyAdminAccessToken } from "../../middlewares/auth/verifyAdminAccessToken.js";
import { validateRequest } from "../../middlewares/request-validate/index.js";
import { logRequest } from "../../middlewares/log/index.js";
import {
  approvePaymentRequest,
  createPaymentRequest,
  getAdminPaymentRequests,
  getMyPaymentRequests,
  getPaymentRequestsSummary,
  rejectPaymentRequest,
} from "./service.js";
import {
  paymentRequestIdParamSchema,
  rejectPaymentRequestSchema,
} from "./request.js";

const router = express.Router();

router.get(
  "/payment-requests/summary",
  verifyAdminAccessToken,
  logRequest({}),
  getPaymentRequestsSummary,
);

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
router.patch(
  "/payment-requests/:id/approve",
  verifyAdminAccessToken,
  logRequest({}),
  approvePaymentRequest,
);

router.patch(
  "/payment-requests/:id/reject",
  verifyAdminAccessToken,
  logRequest({}),
  validateRequest({ schema: paymentRequestIdParamSchema, isParam: true }),
  validateRequest({ schema: rejectPaymentRequestSchema }),
  rejectPaymentRequest,
);

export default router;
