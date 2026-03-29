import { getPagination } from "../../utils/pagination.js";
import PaymentRequest from "./schema.js";

const PLAN_PRICES = {
  professional: 499,
  enterprise: 999,
  starter: 9,
};

export const createPaymentRequest = async (req) => {
  const userId = req.user.userId;
  const {
    plan,
    paymentMethod,
    transactionId,
    senderNumber,
    paymentProofImage,
    note,
  } = req.body;

  if (!["professional", "enterprise", "starter"].includes(plan)) {
    throw new Error("Invalid plan selected");
  }

  if (!["bkash", "nagad", "rocket", "bank"].includes(paymentMethod)) {
    throw new Error("Invalid payment method");
  }

  const existingPending = await PaymentRequest.findOne({
    userId,
    status: "pending",
  });

  if (existingPending) {
    throw new Error("You already have a pending payment request");
  }

  const duplicateTxn = await PaymentRequest.findOne({
    transactionId,
    paymentMethod,
  });

  if (duplicateTxn) {
    throw new Error("This transaction ID has already been submitted");
  }

  const paymentRequest = await PaymentRequest.create({
    userId,
    plan,
    amount: PLAN_PRICES[plan],
    currency: "BDT",
    paymentMethod,
    transactionId,
    senderNumber,
    paymentProofImage,
    note,
    status: "pending",
  });

  return paymentRequest;
};

export const getMyPaymentRequests = async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  try {
    const [total, result] = await Promise.all([
      PaymentRequest.countDocuments({ userId: req.user.userId }),
      PaymentRequest.find({ userId: req.user.userId })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 }),
    ]);

    const pagination = getPagination({ page, limit, total });
    return res.status(200).json({
      success: true,
      message: "Payment requests fetched successfully",
      data: result,
      pagination,
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      status: error.status || 500,
      message: error.message || "Failed to fetch payment requests",
      data: null,
    });
  }
};

export const getAdminPaymentRequests = async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  try {
    const [total, result] = await Promise.all([
      PaymentRequest.countDocuments(),
      PaymentRequest.find()
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 }),
    ]);
    const pagination = getPagination({ page, limit, total });
    return res.status(200).json({
      success: true,
      message: "Payment requests fetched successfully",
      data: result,
      pagination,
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      status: error.status || 500,
      message: error.message || "Failed to fetch payment requests",
      data: null,
    });
  }
};
