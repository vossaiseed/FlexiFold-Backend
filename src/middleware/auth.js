import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

// Verifies the JWT from the Authorization header and attaches req.user
export const auth = (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    req.user = jwt.verify(token, env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
