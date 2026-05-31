import bcrypt from "bcryptjs";
import { db, otpSessionsTable } from "@workspace/db";
import { eq, and, gt, count, desc } from "drizzle-orm";
import { logger } from "../lib/logger";

const OTP_EXPIRY_MS = 10 * 60 * 1000;
const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 3;
const MAX_ATTEMPTS = 5;

export async function requestOtp(phone: string): Promise<string> {
  const windowStart = new Date(Date.now() - RATE_WINDOW_MS);
  const [{ value: recentCount }] = await db
    .select({ value: count() })
    .from(otpSessionsTable)
    .where(
      and(
        eq(otpSessionsTable.phone, phone),
        gt(otpSessionsTable.createdAt, windowStart),
      ),
    );

  if (Number(recentCount) >= RATE_LIMIT_MAX) {
    throw new Error("RATE_LIMITED");
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

  await db.insert(otpSessionsTable).values({
    phone,
    codeHash,
    expiresAt,
    verified: false,
    attempts: 0,
  });

  if (process.env.NODE_ENV !== "production") {
    logger.info({ phone, code }, "DEV OTP CODE — use this in the verify step");
  } else {
    logger.info({ phone }, "OTP requested — send via provider");
  }

  return code;
}

export async function verifyOtp(
  phone: string,
  code: string,
): Promise<boolean> {
  const now = new Date();
  const sessions = await db
    .select()
    .from(otpSessionsTable)
    .where(
      and(
        eq(otpSessionsTable.phone, phone),
        eq(otpSessionsTable.verified, false),
        gt(otpSessionsTable.expiresAt, now),
      ),
    )
    .orderBy(desc(otpSessionsTable.createdAt))
    .limit(1);

  if (sessions.length === 0) return false;

  const session = sessions[0];

  await db
    .update(otpSessionsTable)
    .set({ attempts: session.attempts + 1 })
    .where(eq(otpSessionsTable.id, session.id));

  if (session.attempts >= MAX_ATTEMPTS) return false;

  const isValid = await bcrypt.compare(code, session.codeHash);

  if (isValid) {
    await db
      .update(otpSessionsTable)
      .set({ verified: true })
      .where(eq(otpSessionsTable.id, session.id));
  }

  return isValid;
}
