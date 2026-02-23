import express from "express";
import { logRequest } from "../../middlewares/log/index.js";
import { validateRequest } from "../../middlewares/request-validate/index.js";
import { registerSchema } from "./request.js";
import { createUser } from "./service.js";

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

export default router;
