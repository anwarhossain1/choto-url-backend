import rateLimit from "express-rate-limit";

export const guestLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 5,
  message: "Guest link limit reached",
});
