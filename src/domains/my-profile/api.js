import express from "express";
import { verifyAccessToken } from "../../middlewares/auth/verifyAccessToken.js";
import { logRequest } from "../../middlewares/log/index.js";
import { validateRequest } from "../../middlewares/request-validate/index.js";
import {
  changeEmailSchema,
  changeNameSchema,
  changePasswordSchema,
} from "./request.js";
import {
  changeEmail,
  changePassword,
  changeUserName,
  getProfileData,
} from "./service.js";

const router = express.Router();
router.get(
  "/my-profile",
  logRequest({}),
  verifyAccessToken,
  async (req, res, next) => {
    try {
      const userId = req.user.userId;
      const profileData = await getProfileData(userId);
      return res.status(200).json({
        message: true,
        data: profileData,
      });
    } catch (error) {
      res.status(500).json({
        mess,
      });
    }
  },
);
router.patch(
  "/my-profile/change-name",
  logRequest({}),
  verifyAccessToken,
  validateRequest({ schema: changeNameSchema, isParam: false }),
  changeUserName,
);
router.patch(
  "/my-profile/change-email",
  logRequest({}),
  verifyAccessToken,
  validateRequest({ schema: changeEmailSchema, isParam: false }),
  changeEmail,
);
router.post(
  "/my-profile/change-password",
  logRequest({}),
  verifyAccessToken,
  validateRequest({ schema: changePasswordSchema, isParam: false }),
  changePassword,
);

export default router;
