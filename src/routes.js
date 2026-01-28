import express from "express";
import linkRoutes from "./domains/links/api.js";
const router = express.Router();

router.get("/", (req, res) => {
  res.send("Welcome to the Choto URL Service!");
});

router.use(linkRoutes);

export default router;
