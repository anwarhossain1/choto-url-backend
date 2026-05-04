import mongoose from "mongoose";
import sendEmail from "../../emails/emailService.js";
import { paymentApprovedTemplate } from "../../emails/templates/paymentApprovedTemplate.js";
import { getPagination } from "../../utils/pagination.js";
import Plan from "../admin/plans/schema.js";
import User from "../auth/schema.js";
import PaymentRequest from "./schema.js";

const ALLOWED_PAYMENT_METHODS = ["bkash", "nagad", "rocket", "bank"];
const ALLOWED_BILLING_CYCLES = ["monthly", "yearly"];

const resolvePlanPricing = (plan, billingCycle) => {
  const amount =
    billingCycle === "yearly" ? plan.priceYearly ?? null : plan.priceMonthly ?? null;

  if (amount === null || amount === undefined || Number(amount) < 1) {
    throw new Error("Selected plan is not available for payment");
  }

  return Number(amount);
};

export const createPaymentRequest = async (req) => {
  const userId = req.user.userId;
  const {
    plan,
    paymentMethod,
    billingCycle = "monthly",
    transactionId,
    senderNumber,
    paymentProofImage,
    note,
  } = req.body;

  if (!plan || typeof plan !== "string") {
    throw new Error("Invalid plan selected");
  }

  if (!ALLOWED_BILLING_CYCLES.includes(billingCycle)) {
    throw new Error("Invalid billing cycle");
  }

  const selectedPlan = await Plan.findOne({ id: plan, isActive: true }).lean();

  if (!selectedPlan) {
    throw new Error("Invalid plan selected");
  }

  if (selectedPlan.id === "free") {
    throw new Error("Free plan does not require payment");
  }

  if (!ALLOWED_PAYMENT_METHODS.includes(paymentMethod)) {
    throw new Error("Invalid payment method");
  }

  const amount = resolvePlanPricing(selectedPlan, billingCycle);

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
    amount,
    currency: "BDT",
    paymentMethod,
    billingCycle,
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

    const baseDate = isValidDate && new Date(currentEnd) > now ? new Date(currentEnd) : now;

    let currentPeriodEnd;

    if (paymentRequest.billingCycle === "yearly") {
      currentPeriodEnd = addYears(baseDate, 1);
    } else {
      currentPeriodEnd = addMonths(baseDate, 1);
    }

    user.subscription = {
      ...user.subscription,
      plan: paymentRequest.plan,
      price: paymentRequest.amount,
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

export const rejectPaymentRequest = async (req, res) => {
  const { id } = req.params;
  const { rejectedReason } = req.body;

  try {
    const paymentRequest = await PaymentRequest.findById(id);

    if (!paymentRequest) {
      throw new Error("Payment request not found");
    }

    if (paymentRequest.status !== "pending") {
      throw new Error("Only pending requests can be rejected");
    }

    paymentRequest.status = "rejected";
    paymentRequest.rejectionReason = rejectedReason.trim();
    paymentRequest.reviewedBy = req.user.userId;
    paymentRequest.reviewedAt = new Date();

    await paymentRequest.save();

    return res.status(200).json({
      success: true,
      message: "Payment request rejected successfully",
      data: {
        paymentRequestId: paymentRequest._id,
        status: paymentRequest.status,
        rejectionReason: paymentRequest.rejectionReason,
      },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to reject payment request",
    });
  }
};
