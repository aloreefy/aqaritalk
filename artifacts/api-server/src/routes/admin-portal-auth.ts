import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { AdminPortalLoginBody, AdminPortalLoginResponse } from "@workspace/api-zod";
import { signToken } from "../lib/jwt";

const router: IRouter = Router();

router.post("/admin/portal/login", async (req, res): Promise<void> => {
  const parsed = AdminPortalLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    res.status(503).json({ error: "Admin portal not configured — set ADMIN_PASSWORD secret" });
    return;
  }

  const provided = Buffer.from(parsed.data.password);
  const stored = Buffer.from(adminPassword);
  const valid =
    provided.length === stored.length &&
    crypto.timingSafeEqual(provided, stored);

  if (!valid) {
    // Constant-delay response to slow brute-force
    await new Promise((r) => setTimeout(r, 500));
    res.status(401).json({ error: "Invalid password" });
    return;
  }

  const [admin] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.role, "admin"))
    .limit(1);

  if (!admin) {
    res.status(401).json({ error: "No admin account found in database" });
    return;
  }

  const token = signToken({ userId: admin.id, role: admin.role, phone: admin.phone });

  res.json(
    AdminPortalLoginResponse.parse({
      token,
      user: {
        id: admin.id,
        phone: admin.phone,
        name: admin.name ?? null,
        role: admin.role,
        market: admin.market,
        language: admin.language,
        verificationStatus: admin.verificationStatus,
        status: admin.status,
        autoSendVoice: admin.autoSendVoice,
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt,
      },
      isNewUser: false,
    }),
  );
});

export default router;
