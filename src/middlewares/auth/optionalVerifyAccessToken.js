import jwt from "jsonwebtoken";

export const optionalVerifyAccessToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // No token → continue as guest
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // Attach user to request
    req.user = {
      userId: decoded.userId,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};
