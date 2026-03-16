import crypto from "crypto";
import { env } from "../../config/env.js";
import sendEmail from "../../utils/sendEmail.js";
import User from "./schema.js";
// import User from "./schema.js";
export const createUser = async (payload) => {
  const { name, password, email } = payload;
  const normalizedEmail = email.toLowerCase().trim();
  const userAlreadyExists = await User.findOne({ email: normalizedEmail });
  if (userAlreadyExists) {
    const error = new Error("Email already registered.");
    error.statusCode = 409;
    throw error;
  }
  try {
    const createdUser = await User.create({
      name,
      email: normalizedEmail,
      passwordHash: password, // pre-save will hash it
    });
    const user = await User.findById(createdUser._id); // passwordHash excluded
    return user;
  } catch (error) {
    if (err.code === 11000) {
      const error = new Error("Email already registered.");
      error.statusCode = 409;
      throw error;
    }
    throw error;
  }
};

export const findUser = async (email) => {
  return await User.findOne({ email }).select("+passwordHash");
};

export const loginUser = async (payload) => {
  const { email } = payload;
  const normalizedEmail = email.toLowerCase().trim();
  const userExists = await findUser(normalizedEmail);
  return userExists;
};

export const logout = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      await User.updateOne(
        { _id: userId },
        {
          $pull: {
            refreshTokens: refreshToken,
          },
        },
      );
    }

    // Clear auth cookies
    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
    });

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
    });

    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  // Do not reveal if email exists
  if (!user) {
    return res.json({
      message: "If this email exists, you will receive a password reset link.",
    });
  }

  // generate token
  const resetToken = crypto.randomBytes(32).toString("hex");

  // hash token
  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; //15 mins expiration

  await user.save();

  const resetURL = `${env.frontendUrl}/auth/reset-password?token=${resetToken}`;

  await sendEmail({
    to: user.email,
    subject: "Password Reset",
    html: `
      <p>Click the link below to reset your password:</p>
      <a href="${resetURL}">${resetURL}</a>
      <p>This link expires in 15 minutes.</p>
    `,
  });
  res.json({ message: "Reset email sent", resetURL });
};
