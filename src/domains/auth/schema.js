import bcrypt from "bcrypt";
import mongoose from "mongoose";
const refreshTokenSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    deviceInfo: {
      type: String,
    },
  },
  { _id: true },
);
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      //   index: true,
    },

    passwordHash: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    emailVerificationToken: {
      type: String,
    },

    passwordResetToken: {
      type: String,
    },

    passwordResetExpires: {
      type: Date,
    },

    subscriptionPlan: {
      type: String,
      enum: ["free", "pro"],
      default: "free",
    },
    subscription: {
      plan: {
        type: String,
        enum: ["free", "starter", "professional", "enterprise"],
        default: "free",
      },

      status: {
        type: String,
        enum: ["active", "trialing", "past_due", "canceled"],
        default: "active",
      },

      currentPeriodStart: {
        type: Date,
        default: Date.now(),
      },

      currentPeriodEnd: {
        type: Date,
      },

      cancelAtPeriodEnd: {
        type: Boolean,
        default: false,
      },

      // Payment Provider (Stripe etc.)
      provider: {
        type: String,
        enum: ["stripe", "manual", null],
        default: null,
      },
      approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      approvedAt: {
        type: Date,
        default: null,
      },

      providerCustomerId: String,
      providerSubscriptionId: String,
    },
    refreshTokens: [refreshTokenSchema],

    tokenVersion: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

// 🔐 Hash password before saving
userSchema.pre("save", async function () {
  if (!this.isModified("passwordHash")) return;
  const salt = await bcrypt.genSalt(12);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
});

// 🔑 Compare password method
userSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

// // 🚀 Unique index for email (extra safety)
userSchema.index({ email: 1 }, { unique: true });

const User = mongoose.model("User", userSchema);
export default User;
