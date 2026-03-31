import mongoose from "mongoose";
import sendEmail from "../../emails/emailService.js";
import { paymentApprovedTemplate } from "../../emails/templates/paymentApprovedTemplate.js";
import { getPagination } from "../../utils/pagination.js";
import User from "../auth/schema.js";
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

const addMonths = (date, months) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

const addYears = (date, years) => {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return d;
};

export const approvePaymentRequest = async (req, res) => {
  const { id } = req.params;

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const paymentRequest = await PaymentRequest.findById(id).session(session);

    if (!paymentRequest) {
      throw new Error("Payment request not found");
    }

    if (paymentRequest.status !== "pending") {
      throw new Error("Only pending requests can be approved");
    }

    const user = await User.findById(paymentRequest.userId).session(session);

    if (!user) {
      throw new Error("User not found");
    }

    const now = new Date();

    const currentEnd = user.subscription?.currentPeriodEnd;

    const isValidDate = currentEnd && !isNaN(new Date(currentEnd).getTime());

    const baseDate =
      isValidDate && new Date(currentEnd) > now ? new Date(currentEnd) : now;

    // 🔥 determine plan duration
    let currentPeriodEnd;

    if (paymentRequest.billingCycle === "yearly") {
      currentPeriodEnd = addYears(baseDate, 1);
    } else {
      currentPeriodEnd = addMonths(baseDate, 1);
    }

    // ✅ update user subscription
    user.subscription = {
      ...user.subscription,
      plan: paymentRequest.plan, // must exist in request
      price: PLAN_PRICES[paymentRequest.plan],
      status: "active",
      currentPeriodStart: now,
      currentPeriodEnd,
      cancelAtPeriodEnd: false,
      provider: "manual",
      approvedBy: req.user.userId,
      approvedAt: now,
      providerCustomerId: null,
      providerSubscriptionId: null,
    };

    await user.save({ session });

    // ✅ update payment request
    paymentRequest.status = "approved";
    paymentRequest.reviewedAt = now;
    paymentRequest.reviewedBy = req.user.userId;

    await paymentRequest.save({ session });

    await session.commitTransaction();
    const html = paymentApprovedTemplate({
      userName: user.name,
      plan: paymentRequest.plan,
      amount: paymentRequest.amount,
      billingCycle: paymentRequest.billingCycle,
      validUntil: currentPeriodEnd,
    });
    await sendEmail({
      to: user.email,
      subject: "Your Payment Request Has Been Approved",
      html,
    });
    return res.status(200).json({
      success: true,
      message: "Payment request approved successfully",
      data: {
        paymentRequestId: paymentRequest._id,
        plan: user.subscription.plan,
        validUntil: user.subscription.currentPeriodEnd,
      },
    });
  } catch (error) {
    await session.abortTransaction();

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to approve payment request",
    });
  } finally {
    session.endSession();
  }
};
