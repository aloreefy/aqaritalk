import bcrypt from "bcryptjs";
import { db, otpSessionsTable, systemSettingsTable } from "@workspace/db";
import { eq, and, gt, count, desc } from "drizzle-orm";
import { logger } from "../lib/logger";

// ── helpers ──────────────────────────────────────────────────────────────
async function getSettings() {
  const rows = await db.select().from(systemSettingsTable).limit(1);
  if (rows.length > 0) return rows[0];
  const [created] = await db.insert(systemSettingsTable).values({}).returning();
  return created;
}

// ── OTP send providers ───────────────────────────────────────────────────
async function sendViaTwilio(
  phone: string,
  code: string,
  accountSid: string,
  authToken: string,
  fromNumber: string,
): Promise<void> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const body = new URLSearchParams({
    From: fromNumber,
    To: phone,
    Body: `رمز التحقق الخاص بك في AqariTalk: ${code}`,
  });
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Twilio error ${res.status}: ${text}`);
  }
}

async function sendViaUnifonic(
  phone: string,
  code: string,
  appSid: string,
  sender: string,
): Promise<void> {
  const res = await fetch("https://api.unifonic.com/rest/Messages/Send", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      AppSid: appSid,
      SenderID: sender,
      Recipient: phone,
      Body: `رمز التحقق الخاص بك في AqariTalk: ${code}`,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Unifonic error ${res.status}: ${text}`);
  }
}

async function sendViaMsegat(
  phone: string,
  code: string,
  apiKey: string,
  sender: string,
): Promise<void> {
  // Msegat expects phone without leading +
  const normalised = phone.startsWith("+") ? phone.slice(1) : phone;
  const res = await fetch("https://www.msegat.com/gw/sendsms.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apiKey,
      userName: sender,
      numbers: normalised,
      userSender: sender,
      msg: `رمز التحقق الخاص بك في AqariTalk: ${code}`,
      msgEncoding: "UTF8",
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Msegat error ${res.status}: ${text}`);
  }
}

async function dispatchSms(
  phone: string,
  code: string,
  settings: Awaited<ReturnType<typeof getSettings>>,
): Promise<void> {
  const provider = settings.otpProvider ?? "console";

  if (provider === "twilio") {
    if (!settings.twilioAccountSid || !settings.twilioAuthToken || !settings.twilioFromNumber) {
      throw new Error("Twilio credentials are not configured in System Settings.");
    }
    await sendViaTwilio(phone, code, settings.twilioAccountSid, settings.twilioAuthToken, settings.twilioFromNumber);
    logger.info({ phone, provider: "twilio" }, "OTP sent via Twilio");

  } else if (provider === "unifonic") {
    if (!settings.unifonicAppSid || !settings.unifonicSender) {
      throw new Error("Unifonic credentials are not configured in System Settings.");
    }
    await sendViaUnifonic(phone, code, settings.unifonicAppSid, settings.unifonicSender);
    logger.info({ phone, provider: "unifonic" }, "OTP sent via Unifonic");

  } else if (provider === "msegat") {
    if (!settings.msegatApiKey || !settings.msegatSender) {
      throw new Error("Msegat credentials are not configured in System Settings.");
    }
    await sendViaMsegat(phone, code, settings.msegatApiKey, settings.msegatSender);
    logger.info({ phone, provider: "msegat" }, "OTP sent via Msegat");

  } else {
    // 'console' — dev/fallback: log the code, never send a real SMS
    logger.info({ phone, code }, "DEV OTP CODE — use this in the verify step (provider=console)");
  }
}

// ── Public API ────────────────────────────────────────────────────────────
export async function requestOtp(phone: string): Promise<string> {
  const settings = await getSettings();

  const rateLimitMax = settings.otpRateLimitCount;
  const rateWindowMs = settings.otpRateLimitWindowMinutes * 60 * 1000;
  const expiryMs     = settings.otpExpiryMinutes * 60 * 1000;

  const windowStart = new Date(Date.now() - rateWindowMs);
  const [{ value: recentCount }] = await db
    .select({ value: count() })
    .from(otpSessionsTable)
    .where(
      and(
        eq(otpSessionsTable.phone, phone),
        gt(otpSessionsTable.createdAt, windowStart),
      ),
    );

  if (Number(recentCount) >= rateLimitMax) {
    throw new Error("RATE_LIMITED");
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + expiryMs);

  await db.insert(otpSessionsTable).values({
    phone,
    codeHash,
    expiresAt,
    verified: false,
    attempts: 0,
  });

  await dispatchSms(phone, code, settings);

  return code;
}

export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  const settings = await getSettings();
  const maxAttempts = settings.otpMaxAttempts;

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

  if (session.attempts >= maxAttempts) return false;

  const isValid = await bcrypt.compare(code, session.codeHash);

  if (isValid) {
    await db
      .update(otpSessionsTable)
      .set({ verified: true })
      .where(eq(otpSessionsTable.id, session.id));
  }

  return isValid;
}
