import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
export const verifyAccessToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Access token missing",
    });
  }
  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, env.accessTokenSecret);
    req.user = decoded;
    next();
  } catch (error) {
    console.log("re", error);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired access token",
    });
  }
};
