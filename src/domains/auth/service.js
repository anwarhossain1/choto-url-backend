import crypto from "crypto";
import { env } from "../../config/env.js";
import sendEmail from "../../emails/emailService.js";
import { accountCreatedTemplate } from "../../emails/templates/accountCreatedTemplate.js";
import { forgotPasswordTemplate } from "../../emails/templates/forgotPassword.js";
import { resetPasswordSuccessTemplate } from "../../emails/templates/resetPassword.js";
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
    const loginURL = env.frontendUrl + "/auth/sign-in";
    const html = accountCreatedTemplate({
      loginURL: loginURL,
      name: user.name,
    });
    await sendEmail({
      to: user.email,
      subject: "Your Account Has Been Created",
      html,
    });
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

  user.passwordResetToken = hashedToken;
  user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000); //15 mins expiration

  await user.save();

  const resetURL = `${env.frontendUrl}/auth/reset-password?token=${resetToken}`;
  console.log("Reset URL:", resetURL, user);
  const html = forgotPasswordTemplate({
    resetURL,
    name: user.name,
  });
  await sendEmail({
    to: user.email,
    subject: "Password Reset",
    html,
  });
  res.json({ message: "Reset email sent", resetURL });
};

export const resetPassword = async (req, res) => {
  const { token, password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match" });
  }
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({ message: "Invalid or expired token" });
  }
  user.passwordHash = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  const html = resetPasswordSuccessTemplate({
    loginURL: env.frontendUrl + "/auth/sign-in",
    name: user.name,
  });
  await sendEmail({
    to: user.email,
    subject: "Your Password Was Successfully Reset",
    html,
  });

  res.json({ message: "Password reset successful" });
};
