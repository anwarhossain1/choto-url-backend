import mongoose from "mongoose";

const paymentRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    plan: {
      type: String,
      enum: ["pro", "business"],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 1,
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
      trim: true,
      default: null,
    },

    paymentProofImage: {
      type: String,
      default: null,
    },

    note: {
      type: String,
      trim: true,
      maxlength: 300,
      default: null,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },

    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 300,
      default: null,
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

paymentRequestSchema.index({ transactionId: 1, paymentMethod: 1 });
paymentRequestSchema.index({ userId: 1, status: 1 });

export default mongoose.model("PaymentRequest", paymentRequestSchema);
