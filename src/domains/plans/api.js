import express from "express";
import { logRequest } from "../../middlewares/log/index.js";
import { getAllPlans } from "../admin/plans/service.js";

const router = express.Router();

router.get("/plans", logRequest({}), async (req, res) => {
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
});

export default router;
