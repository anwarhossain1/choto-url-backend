import mongoose from "mongoose";

const linkSchema = new mongoose.Schema(
  {
    ownerType: {
      type: String,
      enum: ["User", "Guest"],
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    guestId: {
      type: String,
      default: null,
    },
    alias: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    longUrl: {
      type: String,
      required: true,
    },
    clicks: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("Link", linkSchema);
