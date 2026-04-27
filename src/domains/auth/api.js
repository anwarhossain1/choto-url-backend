import express from "express";
import { verifyAccessToken } from "../../middlewares/auth/verifyAccessToken.js";
import { verifyAdminAccessToken } from "../../middlewares/auth/verifyAdminAccessToken.js";
import { logRequest } from "../../middlewares/log/index.js";
import { validateRequest } from "../../middlewares/request-validate/index.js";
import {
  googleLoginSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "./request.js";
import {
  createUser,
  googleLogin,
  issueAuthSession,
  forgotPassword,
  loginUser,
  logout,
  resetPassword,
} from "./service.js";
const router = express.Router();
router.post(
  "/auth/register",
  logRequest({}),
  validateRequest({ schema: registerSchema, isParam: false }),
  async (req, res) => {
    try {
      const user = await createUser(req.body);
      if (user) {
        return res.status(201).json({
          message: "Account created successfully",
          success: true,
          status: 201,
          data: user,
        });
      }
    } catch (error) {
      res.status(400).json({
        message: error.message,
        success: false,
      });
    }
  },
);
router.post(
  "/auth/login",
  logRequest({}),
  validateRequest({ schema: loginSchema, isParam: false }),
  async (req, res) => {
    try {
      const user = await loginUser(req.body);
      if (user) {
        const isMatch = await user.comparePassword(req.body.password);
        if (!isMatch) {
          return res.status(401).json({
            message: "Invalid email or password gt",
          });
        }
        const { accessToken, refreshToken, user: userObj } =
          await issueAuthSession(user);

        res.cookie("refreshToken", refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return res.status(201).json({
          message: "Login successfully",
          success: true,
          status: 201,
          accessToken,
          data: userObj,
        });
      }
      return res.status(401).json({
        message: "Invalid email or password",
        status: 401,
      });
    } catch (error) {
      res.status(400).json({
        message: error.message,
        success: false,
      });
    }
  },
);
router.post(
  "/auth/google",
  logRequest({}),
  validateRequest({ schema: googleLoginSchema, isParam: false }),
  async (req, res) => {
    try {
      const user = await googleLogin(req.body.credential);
      const { accessToken, refreshToken, user: userObj } =
        await issueAuthSession(user);

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.status(200).json({
        message: "Google login successful",
        success: true,
        status: 200,
        accessToken,
        data: userObj,
      });
    } catch (error) {
      return res.status(error.statusCode || 400).json({
        message: error.message,
        success: false,
      });
    }
  },
);
router.post("/auth/logout", verifyAccessToken, logout);
router.post("/auth/admin/logout", verifyAdminAccessToken, logout);
router.post(
  "/auth/forgot-password",
  validateRequest({ schema: forgotPasswordSchema, isParam: false }),
  forgotPassword,
);
router.post(
  "/auth/reset-password",
  validateRequest({ schema: resetPasswordSchema, isParam: false }),
  resetPassword,
);

export default router;
