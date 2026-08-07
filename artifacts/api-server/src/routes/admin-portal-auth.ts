import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { AdminPortalLoginBody, AdminPortalLoginResponse } from "@workspace/api-zod";
import { signToken } from "../lib/jwt";

const router: IRouter = Router();

router.post("/admin/portal/login", async (req, res): Promise<void> => {
  const parsed = AdminPortalLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { login, password } = parsed.data;

  const fail = async (msg: string) => {
    // Constant-delay to slow brute-force
    await new Promise((r) => setTimeout(r, 500));
    res.status(401).json({ error: msg });
  };

  // Look up by username OR phone
  const [user] = await db
    .select()
    .from(usersTable)
    .where(or(eq(usersTable.username, login), eq(usersTable.phone, login)))
    .limit(1);

  if (!user) return void (await fail("Invalid credentials"));
  if (user.role !== "admin") return void (await fail("Not authorized"));
  if (user.status !== "active") return void (await fail("Account suspended"));
  if (!user.passwordHash) return void (await fail("No password set for this account. Ask your system administrator."));

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return void (await fail("Invalid credentials"));

  const token = signToken({ userId: user.id, role: user.role, phone: user.phone });

  res.json(
    AdminPortalLoginResponse.parse({
      token,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name ?? null,
        username: user.username ?? null,
        role: user.role,
        market: user.market,
        language: user.language,
        verificationStatus: user.verificationStatus,
        status: user.status,
        autoSendVoice: user.autoSendVoice,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      isNewUser: false,
    }),
  );
});

export default router;
