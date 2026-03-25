import express from "express";
import { verifyAdminAccessToken } from "../../../middlewares/auth/verifyAdminAccessToken.js";
import { logRequest } from "../../../middlewares/log/index.js";
import { getAllUsers } from "./service.js";

const router = express.Router();
router.get(
  "/users",
  verifyAdminAccessToken,
  logRequest({}),
  async (req, res) => {
    try {
      const users = await getAllUsers();
      return res.status(200).json({
        success: true,
        data: users,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch users",
      });
    }
  },
);
export default router;
