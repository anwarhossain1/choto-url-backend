import mongoose from "mongoose";

const planSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    priceMonthly: {
      type: Number,
      required: true,
      min: 0,
    },
    priceYearly: {
      type: Number,
      default: null,
      min: 0,
    },
    description: {
      type: String,
      default: null,
      trim: true,
      maxlength: 500,
    },
    features: {
      type: [String],
      default: [],
    },
    linksPerMonth: {
      type: Number,
      default: null,
      min: 0,
    },
    qrCodesPerMonth: {
      type: Number,
      default: null,
      min: 0,
    },
    analyticsLinksPerMonth: {
      type: Number,
      default: null,
      min: 0,
    },
    reportsLinksPerMonth: {
      type: Number,
      default: null,
      min: 0,
    },
    isPopular: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

planSchema.index({ id: 1 }, { unique: true });

export default mongoose.model("Plan", planSchema);
