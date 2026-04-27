import crypto from "crypto";
import fetch from "node-fetch";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import sendEmail from "../../emails/emailService.js";
import { accountCreatedTemplate } from "../../emails/templates/accountCreatedTemplate.js";
import { forgotPasswordTemplate } from "../../emails/templates/forgotPassword.js";
import { resetPasswordSuccessTemplate } from "../../emails/templates/resetPassword.js";
import User from "./schema.js";
// import User from "./schema.js";

const normalizeEmail = (email) => email.toLowerCase().trim();

const buildUserResponse = (user) => {
  const userObj = user.toObject();
  delete userObj.passwordHash;
  delete userObj.refreshTokens;
  return userObj;
};

export const issueAuthSession = async (user) => {
  const accessToken = jwt.sign(
    { userId: user._id, role: user.role },
    env.accessTokenSecret,
    { expiresIn: "1d" },
  );

  const refreshToken = jwt.sign(
    { userId: user._id, role: user.role },
    env.refreshTokenSecret,
    { expiresIn: "7d" },
  );

  user.lastLoginAt = new Date();
  user.refreshTokens.push({ token: refreshToken });
  await user.save();

  return {
    accessToken,
    refreshToken,
    user: buildUserResponse(user),
  };
};

export const createUser = async (payload) => {
  const { name, password, email } = payload;
  const normalizedEmail = normalizeEmail(email);
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
      authProvider: "local",
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
    if (error.code === 11000) {
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
  const normalizedEmail = normalizeEmail(email);
  const userExists = await findUser(normalizedEmail);
  return userExists;
};

const verifyGoogleCredential = async (credential) => {
  if (!env.googleClientId) {
    const error = new Error("Google login is not configured.");
    error.statusCode = 500;
    throw error;
  }

  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
  );

  const payload = await response.json();

  if (!response.ok) {
    const error = new Error(payload.error_description || payload.error || "Invalid Google credential");
    error.statusCode = 401;
    throw error;
  }

  if (payload.aud !== env.googleClientId) {
    const error = new Error("Google credential audience mismatch.");
    error.statusCode = 401;
    throw error;
  }

  const emailVerified = payload.email_verified === true || payload.email_verified === "true";
  if (!emailVerified) {
    const error = new Error("Google account email is not verified.");
    error.statusCode = 401;
    throw error;
  }

  return payload;
};

export const googleLogin = async (credential) => {
  const googleProfile = await verifyGoogleCredential(credential);
  const normalizedEmail = normalizeEmail(googleProfile.email);

  let user = await User.findOne({ googleId: googleProfile.sub }).select(
    "+passwordHash",
  );

  if (!user) {
    user = await User.findOne({ email: normalizedEmail }).select(
      "+passwordHash",
    );
  }

  if (!user) {
    const createdUser = await User.create({
      name:
        googleProfile.name ||
        googleProfile.given_name ||
        normalizedEmail.split("@")[0],
      email: normalizedEmail,
      googleId: googleProfile.sub,
      authProvider: "google",
      avatar: googleProfile.picture || null,
      isEmailVerified: true,
      lastLoginAt: new Date(),
    });

    return await User.findById(createdUser._id).select("+passwordHash");
  }

  user.googleId = user.googleId || googleProfile.sub;
  user.authProvider = user.googleId ? "google" : user.authProvider || "local";
  user.avatar = user.avatar || googleProfile.picture || null;
  user.isEmailVerified = true;
  user.lastLoginAt = new Date();
  await user.save();

  return user;
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
