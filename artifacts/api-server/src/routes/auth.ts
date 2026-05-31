import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  RequestOtpBody,
  RequestOtpResponse,
  VerifyOtpBody,
  VerifyOtpResponse,
  GetMeResponse,
  UpdateMeBody,
  UpdateMeResponse,
} from "@workspace/api-zod";
import { requestOtp, verifyOtp } from "../services/otp";
import { signToken } from "../lib/jwt";
import { authenticate } from "../middleware/authenticate";

const router: IRouter = Router();

router.post("/auth/otp/request", async (req, res): Promise<void> => {
  const parsed = RequestOtpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let devCode: string | undefined;
  try {
    devCode = await requestOtp(parsed.data.phone);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "RATE_LIMITED") {
      res.status(429).json({ error: "Too many OTP requests. Try again in 15 minutes." });
      return;
    }
    throw err;
  }

  const isDev = process.env.NODE_ENV !== "production";
  res.json(RequestOtpResponse.parse({
    message: "OTP sent",
    ...(isDev && devCode ? { devCode } : {}),
  }));
});

router.post("/auth/otp/verify", async (req, res): Promise<void> => {
  const parsed = VerifyOtpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { phone, code } = parsed.data;
  const isValid = await verifyOtp(phone, code);

  if (!isValid) {
    res.status(401).json({ error: "Invalid or expired OTP" });
    return;
  }

  let [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.phone, phone));

  let isNewUser = false;
  if (!user) {
    isNewUser = true;
    [user] = await db
      .insert(usersTable)
      .values({ phone, role: "buyer", verificationStatus: "verified", status: "active" })
      .returning();
  } else if (user.verificationStatus !== "verified") {
    [user] = await db
      .update(usersTable)
      .set({ verificationStatus: "verified", updatedAt: new Date() })
      .where(eq(usersTable.id, user.id))
      .returning();
  }

  const token = signToken({ userId: user.id, role: user.role, phone: user.phone });

  res.cookie("auth_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: "lax",
  });

  res.json(
    VerifyOtpResponse.parse({
      token,
      isNewUser,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        role: user.role,
        market: user.market,
        language: user.language,
        verificationStatus: user.verificationStatus,
        status: user.status,
        autoSendVoice: user.autoSendVoice,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    }),
  );
});

router.get("/auth/me", authenticate, async (req, res): Promise<void> => {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.user!.userId));

  if (!user || user.deletedAt) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(GetMeResponse.parse(user));
});

router.put("/auth/me", authenticate, async (req, res): Promise<void> => {
  const parsed = UpdateMeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db
    .update(usersTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(usersTable.id, req.user!.userId))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(UpdateMeResponse.parse(user));
});

export default router;
