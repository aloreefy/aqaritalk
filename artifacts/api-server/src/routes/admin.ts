import { Router, type IRouter } from "express";
import {
  db,
  usersTable,
  propertiesTable,
  contactReleaseTable,
  propertyImagesTable,
} from "@workspace/db";
import { eq, and, isNull, sql, or, ilike } from "drizzle-orm";
import {
  AdminListUsersQueryParams,
  AdminListUsersResponse,
  AdminCreateUserBody,
  AdminGetUserParams,
  AdminGetUserResponse,
  AdminUpdateUserParams,
  AdminUpdateUserBody,
  AdminUpdateUserResponse,
  AdminDeleteUserParams,
  AdminListPropertiesQueryParams,
  AdminCreatePropertyBody,
  AdminGetPropertyParams,
  AdminUpdatePropertyBody,
  AdminDeletePropertyParams,
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

// ── Users ─────────────────────────────────────────────────────────────────

router.get("/admin/users", ...adminGuard, async (req, res): Promise<void> => {
  const parsed = AdminListUsersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { search, role, status, page, limit } = parsed.data as {
    search?: string | null;
    role?: string | null;
    status?: string | null;
    page: number;
    limit: number;
  };

  const conditions = [isNull(usersTable.deletedAt)];
  if (role) conditions.push(sql`${usersTable.role} = ${role}`);
  if (status) conditions.push(sql`${usersTable.status} = ${status}`);
  if (search) {
    conditions.push(
      or(
        ilike(usersTable.name, `%${search}%`),
        ilike(usersTable.phone, `%${search}%`),
      )!,
    );
  }

  const offset = (page - 1) * limit;
  const [rows, countResult] = await Promise.all([
    db
      .select()
      .from(usersTable)
      .where(and(...conditions))
      .orderBy(sql`${usersTable.createdAt} desc`)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(usersTable)
      .where(and(...conditions)),
  ]);

  res.json({ items: rows, total: countResult[0]?.count ?? 0, page, limit });
});

router.post("/admin/users", ...adminGuard, async (req, res): Promise<void> => {
  const parsed = AdminCreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { phone, name, role, market, status } = parsed.data;

  // Check for duplicate phone
  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.phone, phone))
    .limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "Phone number already registered" });
    return;
  }

  const [user] = await db
    .insert(usersTable)
    .values({
      phone,
      name: name ?? null,
      role: role ?? "buyer",
      market: (market as any) ?? "JO",
      status: (status as any) ?? "active",
      verificationStatus: "verified", // admin-created accounts are auto-verified
    })
    .returning();

  res.status(201).json(user);
});

router.get("/admin/users/:id", ...adminGuard, async (req, res): Promise<void> => {
  const params = AdminGetUserParams.safeParse({ id: paramStr(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(and(eq(usersTable.id, params.data.id), isNull(usersTable.deletedAt)))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(user);
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
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.role != null) updates.role = parsed.data.role;
  if (parsed.data.status != null) updates.status = parsed.data.status;
  if (parsed.data.market != null) updates.market = parsed.data.market;

  const [user] = await db
    .update(usersTable)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .set(updates as any)
    .where(and(eq(usersTable.id, params.data.id), isNull(usersTable.deletedAt)))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(AdminUpdateUserResponse.parse(user));
});

router.delete("/admin/users/:id", ...adminGuard, async (req, res): Promise<void> => {
  const params = AdminDeleteUserParams.safeParse({ id: paramStr(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [user] = await db
    .update(usersTable)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(usersTable.id, params.data.id), isNull(usersTable.deletedAt)))
    .returning({ id: usersTable.id });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.status(204).send();
});

// ── Properties ────────────────────────────────────────────────────────────

router.get("/admin/properties", ...adminGuard, async (req, res): Promise<void> => {
  const parsed = AdminListPropertiesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { status, page, limit } = parsed.data;
  const search = (req.query.search as string) || null;
  const propertyType = (req.query.propertyType as string) || null;
  const transactionMode = (req.query.transactionMode as string) || null;

  const conditions = [isNull(propertiesTable.deletedAt)];
  if (status) conditions.push(sql`${propertiesTable.status} = ${status}`);
  if (propertyType) conditions.push(sql`${propertiesTable.propertyType} = ${propertyType}`);
  if (transactionMode) conditions.push(sql`${propertiesTable.transactionMode} = ${transactionMode}`);
  if (search) {
    conditions.push(
      or(
        ilike(propertiesTable.listingName, `%${search}%`),
        ilike(propertiesTable.city, `%${search}%`),
        ilike(propertiesTable.district, `%${search}%`),
      )!,
    );
  }

  const offset = (page - 1) * limit;
  const [rows, countResult] = await Promise.all([
    db
      .select()
      .from(propertiesTable)
      .where(and(...conditions))
      .orderBy(sql`${propertiesTable.createdAt} desc`)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(propertiesTable)
      .where(and(...conditions)),
  ]);

  const items = rows.map((r) => toApiProperty(r));
  res.json({ items, total: countResult[0]?.count ?? 0, page, limit });
});

router.post("/admin/properties", ...adminGuard, async (req, res): Promise<void> => {
  const parsed = AdminCreatePropertyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const user = (req as any).user;
  const data = parsed.data;

  const [row] = await db
    .insert(propertiesTable)
    .values({
      createdBy: user.id,
      listingDirection: "offering",
      status: "active", // admin listings go live immediately
      propertyType: data.propertyType as any,
      transactionMode: data.transactionMode as any,
      listingName: data.listingName ?? null,
      price: data.price ? String(data.price) : null,
      priceCurrency: data.priceCurrency ?? "JOD",
      priceNegotiable: data.priceNegotiable ?? false,
      country: data.country ?? null,
      city: data.city ?? null,
      district: data.district ?? null,
      street: data.street ?? null,
      areaSqm: data.areaSqm ? String(data.areaSqm) : null,
      rooms: data.rooms ?? null,
      bathrooms: data.bathrooms ?? null,
      floorNumber: data.floorNumber ?? null,
      furnishedStatus: (data.furnishedStatus as any) ?? null,
      condition: (data.condition as any) ?? null,
      description: data.description ?? null,
    })
    .returning();

  res.status(201).json(toApiProperty(row));
});

router.get("/admin/properties/:id", ...adminGuard, async (req, res): Promise<void> => {
  const id = paramStr(req.params.id);
  const [row] = await db
    .select()
    .from(propertiesTable)
    .where(and(eq(propertiesTable.id, id), isNull(propertiesTable.deletedAt)))
    .limit(1);

  if (!row) {
    res.status(404).json({ error: "Property not found" });
    return;
  }

  const images = await db
    .select()
    .from(propertyImagesTable)
    .where(eq(propertyImagesTable.propertyId, id))
    .orderBy(propertyImagesTable.createdAt);

  res.json(toApiProperty(row, images));
});

router.put("/admin/properties/:id", ...adminGuard, async (req, res): Promise<void> => {
  const id = paramStr(req.params.id);
  const parsed = AdminUpdatePropertyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db
    .select({ id: propertiesTable.id })
    .from(propertiesTable)
    .where(and(eq(propertiesTable.id, id), isNull(propertiesTable.deletedAt)))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Property not found" });
    return;
  }

  const data = parsed.data;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (data.listingName !== undefined) updates.listingName = data.listingName;
  if (data.propertyType != null) updates.propertyType = data.propertyType;
  if (data.transactionMode != null) updates.transactionMode = data.transactionMode;
  if (data.status != null) updates.status = data.status;
  if (data.price !== undefined) updates.price = data.price != null ? String(data.price) : null;
  if (data.priceCurrency != null) updates.priceCurrency = data.priceCurrency;
  if (data.priceNegotiable !== undefined) updates.priceNegotiable = data.priceNegotiable;
  if (data.country !== undefined) updates.country = data.country;
  if (data.city !== undefined) updates.city = data.city;
  if (data.district !== undefined) updates.district = data.district;
  if (data.street !== undefined) updates.street = data.street;
  if (data.areaSqm !== undefined) updates.areaSqm = data.areaSqm != null ? String(data.areaSqm) : null;
  if (data.rooms !== undefined) updates.rooms = data.rooms;
  if (data.bathrooms !== undefined) updates.bathrooms = data.bathrooms;
  if (data.floorNumber !== undefined) updates.floorNumber = data.floorNumber;
  if (data.furnishedStatus !== undefined) updates.furnishedStatus = data.furnishedStatus;
  if (data.condition !== undefined) updates.condition = data.condition;
  if (data.description !== undefined) updates.description = data.description;

  const [row] = await db
    .update(propertiesTable)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .set(updates as any)
    .where(eq(propertiesTable.id, id))
    .returning();

  const images = await db
    .select()
    .from(propertyImagesTable)
    .where(eq(propertyImagesTable.propertyId, id))
    .orderBy(propertyImagesTable.createdAt);

  res.json(toApiProperty(row, images));
});

router.delete("/admin/properties/:id", ...adminGuard, async (req, res): Promise<void> => {
  const params = AdminDeletePropertyParams.safeParse({ id: paramStr(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .update(propertiesTable)
    .set({ deletedAt: new Date(), status: "deleted" as any, updatedAt: new Date() })
    .where(
      and(eq(propertiesTable.id, params.data.id), isNull(propertiesTable.deletedAt)),
    )
    .returning({ id: propertiesTable.id });

  if (!row) {
    res.status(404).json({ error: "Property not found" });
    return;
  }

  res.status(204).send();
});

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

    const body = AdminUpdatePropertyStatusBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }

    const [row] = await db
      .update(propertiesTable)
      .set({
        status: body.data.status as any,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(propertiesTable.id, params.data.id),
          isNull(propertiesTable.deletedAt),
        ),
      )
      .returning();

    if (!row) {
      res.status(404).json({ error: "Property not found" });
      return;
    }

    const images = await db
      .select()
      .from(propertyImagesTable)
      .where(eq(propertyImagesTable.propertyId, params.data.id))
      .orderBy(propertyImagesTable.createdAt);

    res.json(AdminUpdatePropertyStatusResponse.parse(toApiProperty(row, images)));
  },
);

// ── Stats ─────────────────────────────────────────────────────────────────

router.get("/admin/stats", ...adminGuard, async (_req, res): Promise<void> => {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

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
