import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const secretKey = process.env.JWT_SECRET_KEY;

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export default function VerifyToken(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!secretKey) {
    console.log("Please add JWT key to the environment variables.");
    process.exit(1);
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res
      .status(400)
      .json({ success: false, message: "Authorization header is missing." });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res
      .status(400)
      .json({ success: false, message: "Token is missing." });
  }

  jwt.verify(token, secretKey, (err, user) => {
    if (err) {
      return res.status(498).json({
        success: false,
        message: "Invalid or expired token. Please log in again.",
      });
    }
    req.user = user;
    next();
  });
}
