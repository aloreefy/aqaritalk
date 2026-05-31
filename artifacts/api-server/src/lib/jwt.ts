import jwt from "jsonwebtoken";

export interface JwtPayload {
  userId: string;
  role: string;
  phone: string;
}

const secret = process.env.SESSION_SECRET;
if (!secret) throw new Error("SESSION_SECRET environment variable is required");

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, secret!, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, secret!) as JwtPayload;
  } catch {
    return null;
  }
}
