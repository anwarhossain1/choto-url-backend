import express from "express";
import { verifyAdminAccessToken } from "../../../middlewares/auth/verifyAdminAccessToken.js";
import { logRequest } from "../../../middlewares/log/index.js";
import { validateRequest } from "../../../middlewares/request-validate/index.js";
import {
  createPlan,
  deletePlan,
  getAllPlans,
  updatePlan,
} from "./service.js";
import {
  createPlanSchema,
  planIdParamSchema,
  updatePlanSchema,
} from "./request.js";

const router = express.Router();

router.get(
  "/plans",
  verifyAdminAccessToken,
  logRequest({}),
  async (req, res) => {
    try {
      const plans = await getAllPlans();
      return res.status(200).json({
        success: true,
        data: plans,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch plans",
      });
    }
  },
);

router.post(
  "/plans",
  verifyAdminAccessToken,
  logRequest({}),
  validateRequest({ schema: createPlanSchema }),
  async (req, res) => {
    try {
      const plan = await createPlan(req.body);
      return res.status(201).json({
        success: true,
        message: "Plan created successfully",
        data: plan,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message || "Failed to create plan",
      });
    }
  },
);

router.patch(
  "/plans/:id",
  verifyAdminAccessToken,
  logRequest({}),
  validateRequest({ schema: planIdParamSchema, isParam: true }),
  validateRequest({ schema: updatePlanSchema }),
  async (req, res) => {
    try {
      const plan = await updatePlan(req.params.id, req.body);
      return res.status(200).json({
        success: true,
        message: "Plan updated successfully",
        data: plan,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message || "Failed to update plan",
      });
    }
  },
);

router.delete(
  "/plans/:id",
  verifyAdminAccessToken,
  logRequest({}),
  validateRequest({ schema: planIdParamSchema, isParam: true }),
  async (req, res) => {
    try {
      const result = await deletePlan(req.params.id);
      return res.status(200).json({
        success: true,
        message: "Plan deleted successfully",
        data: result,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message || "Failed to delete plan",
      });
    }
  },
);

export default router;
