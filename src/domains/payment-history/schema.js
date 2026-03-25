import mongoose from "mongoose";

const paymentHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    paymentRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaymentRequest",
      required: true,
    },

    plan: {
      type: String,
      enum: ["pro", "business"],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    currency: {
      type: String,
      default: "BDT",
    },

    paymentMethod: {
      type: String,
      enum: ["bkash", "nagad", "rocket", "bank"],
      required: true,
    },

    transactionId: {
      type: String,
      required: true,
      trim: true,
    },

    senderNumber: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      enum: ["approved", "rejected"],
      required: true,
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    reviewedAt: {
      type: Date,
      required: true,
    },

    periodStart: {
      type: Date,
      default: null,
    },

    periodEnd: {
      type: Date,
      default: null,
    },

    rejectionReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

paymentHistorySchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("PaymentHistory", paymentHistorySchema);
