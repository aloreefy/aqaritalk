import { Router, type IRouter } from "express";
import {
  db,
  usersTable,
  propertiesTable,
  contactReleaseTable,
  propertyImagesTable,
} from "@workspace/db";
import { eq, and, isNull, sql } from "drizzle-orm";
import {
  AdminListUsersQueryParams,
  AdminListUsersResponse,
  AdminUpdateUserParams,
  AdminUpdateUserBody,
  AdminUpdateUserResponse,
  AdminListPropertiesQueryParams,
  AdminUpdatePropertyStatusParams,
  AdminUpdatePropertyStatusBody,
  AdminUpdatePropertyStatusResponse,
  GetAdminStatsResponse,
} from "@workspace/api-zod";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { toApiProperty } from "../lib/property-mapper";

const router: IRouter = Router();

function paramStr(p: string | string[]): string {
  return Array.isArray(p) ? p[0] : p;
}

const adminGuard = [authenticate, authorize("admin")];

router.get("/admin/users", ...adminGuard, async (req, res): Promise<void> => {
  const parsed = AdminListUsersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { role, status, page, limit } = parsed.data;
  const conditions = [isNull(usersTable.deletedAt)];

  if (role) conditions.push(sql`${usersTable.role} = ${role}`);
  if (status) conditions.push(sql`${usersTable.status} = ${status}`);

  const offset = (page - 1) * limit;
  const rows = await db
    .select()
    .from(usersTable)
    .where(and(...conditions))
    .orderBy(sql`${usersTable.createdAt} desc`)
    .limit(limit)
    .offset(offset);

  res.json(AdminListUsersResponse.parse(rows));
});

router.put("/admin/users/:id", ...adminGuard, async (req, res): Promise<void> => {
  const params = AdminUpdateUserParams.safeParse({ id: paramStr(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = AdminUpdateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.role != null) updates.role = parsed.data.role;
  if (parsed.data.status != null) updates.status = parsed.data.status;

  const [user] = await db
    .update(usersTable)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .set(updates as any)
    .where(eq(usersTable.id, params.data.id))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(AdminUpdateUserResponse.parse(user));
});

router.get(
  "/admin/properties",
  ...adminGuard,
  async (req, res): Promise<void> => {
    const parsed = AdminListPropertiesQueryParams.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const { status, page, limit } = parsed.data;
    const conditions = [isNull(propertiesTable.deletedAt)];

    if (status) {
      conditions.push(sql`${propertiesTable.status} = ${status}`);
    }

    const offset = (page - 1) * limit;
    const rows = await db
      .select()
      .from(propertiesTable)
      .where(and(...conditions))
      .orderBy(sql`${propertiesTable.createdAt} desc`)
      .limit(limit)
      .offset(offset);

    const total = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(propertiesTable)
      .where(and(...conditions))
      .then((r) => r[0]?.count ?? 0);

    const items = rows.map((r) => toApiProperty(r));

    res.json({ items, total, page, limit });
  },
);

router.put(
  "/admin/properties/:id/status",
  ...adminGuard,
  async (req, res): Promise<void> => {
    const params = AdminUpdatePropertyStatusParams.safeParse({
      id: paramStr(req.params.id),
    });
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const parsed = AdminUpdatePropertyStatusBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [property] = await db
      .update(propertiesTable)
      .set({ status: parsed.data.status as "active" | "rejected" | "deleted", updatedAt: new Date() })
      .where(eq(propertiesTable.id, params.data.id))
      .returning();

    if (!property) {
      res.status(404).json({ error: "Property not found" });
      return;
    }

    const images = await db
      .select()
      .from(propertyImagesTable)
      .where(eq(propertyImagesTable.propertyId, property.id));

    res.json(AdminUpdatePropertyStatusResponse.parse(toApiProperty(property, images)));
  },
);

router.get("/admin/stats", ...adminGuard, async (_req, res): Promise<void> => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalUsersResult,
    activeListingsResult,
    pendingReviewResult,
    contactReleasesResult,
    usersByRoleResult,
  ] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(usersTable)
      .where(isNull(usersTable.deletedAt)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(propertiesTable)
      .where(
        and(eq(propertiesTable.status, "active"), isNull(propertiesTable.deletedAt)),
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(propertiesTable)
      .where(
        and(
          eq(propertiesTable.status, "pending_review"),
          isNull(propertiesTable.deletedAt),
        ),
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(contactReleaseTable)
      .where(
        and(
          eq(contactReleaseTable.status, "released"),
          sql`${contactReleaseTable.releasedAt} >= ${startOfMonth}`,
        ),
      ),
    db
      .select({ role: usersTable.role, count: sql<number>`count(*)::int` })
      .from(usersTable)
      .where(isNull(usersTable.deletedAt))
      .groupBy(usersTable.role),
  ]);

  const usersByRole: Record<string, number> = {};
  for (const row of usersByRoleResult) {
    usersByRole[row.role] = row.count;
  }

  res.json(
    GetAdminStatsResponse.parse({
      totalUsers: totalUsersResult[0]?.count ?? 0,
      activeListings: activeListingsResult[0]?.count ?? 0,
      contactReleasesThisMonth: contactReleasesResult[0]?.count ?? 0,
      pendingReview: pendingReviewResult[0]?.count ?? 0,
      usersByRole,
    }),
  );
});

export default router;
