import fs from "fs/promises";
import path from "path";
import { Router, type IRouter } from "express";
import { db, propertiesTable, propertyImagesTable, usersTable } from "@workspace/db";
import { eq, and, isNull, sql, inArray } from "drizzle-orm";
import {
  ListPropertiesQueryParams,
  CreatePropertyBody,
  GetPropertyParams,
  GetPropertyResponse,
  UpdatePropertyParams,
  UpdatePropertyBody,
  UpdatePropertyResponse,
  DeletePropertyParams,
  ListMyPropertiesQueryParams,
} from "@workspace/api-zod";
import { authenticate } from "../middleware/authenticate";
import { toApiProperty } from "../lib/property-mapper";

const router: IRouter = Router();

function paramStr(p: string | string[]): string {
  return Array.isArray(p) ? p[0] : p;
}

router.get("/properties", async (req, res): Promise<void> => {
  const parsed = ListPropertiesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const {
    lat,
    lng,
    radiusKm,
    propertyType,
    transactionMode,
    minPrice,
    maxPrice,
    rooms,
    furnished,
    district,
    country,
    status,
    page,
    limit,
  } = parsed.data;

  const conditions = [isNull(propertiesTable.deletedAt)];

  if (status) {
    conditions.push(sql`${propertiesTable.status} = ${status}`);
  } else {
    conditions.push(eq(propertiesTable.status, "active"));
  }

  if (propertyType) conditions.push(sql`${propertiesTable.propertyType} = ${propertyType}`);
  if (transactionMode) conditions.push(sql`${propertiesTable.transactionMode} = ${transactionMode}`);
  if (rooms != null) conditions.push(eq(propertiesTable.rooms, rooms));
  if (furnished) conditions.push(sql`${propertiesTable.furnishedStatus} = ${furnished}`);
  if (district) conditions.push(sql`lower(${propertiesTable.district}) = lower(${district})`);
  if (country) conditions.push(sql`${propertiesTable.country} = ${country}`);

  if (minPrice != null) {
    conditions.push(sql`${propertiesTable.price}::numeric >= ${minPrice}`);
  }
  if (maxPrice != null) {
    conditions.push(sql`${propertiesTable.price}::numeric <= ${maxPrice}`);
  }

  const geoFilter =
    lat != null && lng != null && radiusKm != null
      ? sql`
          6371 * acos(LEAST(1, cos(radians(${lat})) *
            cos(radians(${propertiesTable.latitude}::double precision)) *
            cos(radians(${propertiesTable.longitude}::double precision) - radians(${lng})) +
            sin(radians(${lat})) *
            sin(radians(${propertiesTable.latitude}::double precision))
          )) <= ${radiusKm}
        `
      : null;

  if (geoFilter) conditions.push(geoFilter);

  const offset = (page - 1) * limit;

  let orderBy = sql`${propertiesTable.createdAt} desc`;
  if (lat != null && lng != null) {
    orderBy = sql`
      6371 * acos(LEAST(1, cos(radians(${lat})) *
        cos(radians(${propertiesTable.latitude}::double precision)) *
        cos(radians(${propertiesTable.longitude}::double precision) - radians(${lng})) +
        sin(radians(${lat})) *
        sin(radians(${propertiesTable.latitude}::double precision))
      )) asc
    `;
  }

  const where = and(...conditions);

  const rows = await db
    .select()
    .from(propertiesTable)
    .where(where)
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);

  const total = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(propertiesTable)
    .where(where)
    .then((r) => r[0]?.count ?? 0);

  const items = rows.map((r) => {
    let distance: number | undefined;
    if (lat != null && lng != null && r.latitude != null && r.longitude != null) {
      const lat2 = parseFloat(r.latitude);
      const lng2 = parseFloat(r.longitude);
      const dLat = ((lat2 - lat) * Math.PI) / 180;
      const dLng = ((lng2 - lng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLng / 2) ** 2;
      distance = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
    return toApiProperty(r, undefined, distance);
  });

  res.json({ items, total, page, limit });
});

router.post("/properties", authenticate, async (req, res): Promise<void> => {
  const parsed = CreatePropertyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const body = parsed.data;
  const insertValues: Record<string, unknown> = {
    createdBy: req.user!.userId,
    listingDirection: body.listingDirection ?? "offering",
    propertyType: body.propertyType,
    transactionMode: body.transactionMode,
    status: "draft",
  };

  if (body.listingName != null) insertValues.listingName = body.listingName;
  if (body.rentalPeriod != null) insertValues.rentalPeriod = body.rentalPeriod;
  if (body.price != null) insertValues.price = String(body.price);
  if (body.priceCurrency != null) insertValues.priceCurrency = body.priceCurrency;
  if (body.priceNegotiable != null) insertValues.priceNegotiable = body.priceNegotiable;
  if (body.country != null) insertValues.country = body.country;
  if (body.city != null) insertValues.city = body.city;
  if (body.district != null) insertValues.district = body.district;
  if (body.street != null) insertValues.street = body.street;
  if (body.latitude != null) insertValues.latitude = String(body.latitude);
  if (body.longitude != null) insertValues.longitude = String(body.longitude);
  if (body.areaSqm != null) insertValues.areaSqm = String(body.areaSqm);
  if (body.rooms != null) insertValues.rooms = body.rooms;
  if (body.bathrooms != null) insertValues.bathrooms = body.bathrooms;
  if (body.floorNumber != null) insertValues.floorNumber = body.floorNumber;
  if (body.furnishedStatus != null) insertValues.furnishedStatus = body.furnishedStatus as "furnished" | "semi_furnished" | "unfurnished";
  if (body.parking != null) insertValues.parking = body.parking;
  if (body.hasElevator != null) insertValues.hasElevator = body.hasElevator;
  if (body.condition != null) insertValues.condition = body.condition as "new" | "excellent" | "good" | "needs_renovation";
  if (body.description != null) insertValues.description = body.description;

  const [property] = await db
    .insert(propertiesTable)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .values(insertValues as any)
    .returning();

  res.status(201).json(GetPropertyResponse.parse(toApiProperty(property, [])));
});

router.get("/properties/:id", async (req, res): Promise<void> => {
  const parsed = GetPropertyParams.safeParse({ id: paramStr(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [property] = await db
    .select()
    .from(propertiesTable)
    .where(
      and(
        eq(propertiesTable.id, parsed.data.id),
        isNull(propertiesTable.deletedAt),
      ),
    );

  if (!property) {
    res.status(404).json({ error: "Property not found" });
    return;
  }

  const images = await db
    .select()
    .from(propertyImagesTable)
    .where(eq(propertyImagesTable.propertyId, property.id));

  res.json(GetPropertyResponse.parse(toApiProperty(property, images)));
});

router.put("/properties/:id", authenticate, async (req, res): Promise<void> => {
  const params = UpdatePropertyParams.safeParse({ id: paramStr(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdatePropertyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(propertiesTable)
    .where(
      and(
        eq(propertiesTable.id, params.data.id),
        isNull(propertiesTable.deletedAt),
      ),
    );

  if (!existing) {
    res.status(404).json({ error: "Property not found" });
    return;
  }

  const isAdmin = req.user!.role === "admin";
  const isOwner = existing.createdBy === req.user!.userId;
  if (!isOwner && !isAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const body = parsed.data;
  const updateValues: Record<string, unknown> = { updatedAt: new Date() };

  if (body.listingName != null) updateValues.listingName = body.listingName;
  if (body.propertyType != null) updateValues.propertyType = body.propertyType;
  if (body.transactionMode != null) updateValues.transactionMode = body.transactionMode;
  if (body.rentalPeriod != null) updateValues.rentalPeriod = body.rentalPeriod;
  if (body.price != null) updateValues.price = String(body.price);
  if (body.priceCurrency != null) updateValues.priceCurrency = body.priceCurrency;
  if (body.priceNegotiable != null) updateValues.priceNegotiable = body.priceNegotiable;
  if (body.country != null) updateValues.country = body.country;
  if (body.city != null) updateValues.city = body.city;
  if (body.district != null) updateValues.district = body.district;
  if (body.street != null) updateValues.street = body.street;
  if (body.addressFull != null) updateValues.addressFull = body.addressFull;
  if (body.latitude != null) updateValues.latitude = String(body.latitude);
  if (body.longitude != null) updateValues.longitude = String(body.longitude);
  if (body.areaSqm != null) updateValues.areaSqm = String(body.areaSqm);
  if (body.rooms != null) updateValues.rooms = body.rooms;
  if (body.bathrooms != null) updateValues.bathrooms = body.bathrooms;
  if (body.floorNumber != null) updateValues.floorNumber = body.floorNumber;
  if (body.furnishedStatus != null) updateValues.furnishedStatus = body.furnishedStatus as "furnished" | "semi_furnished" | "unfurnished";
  if (body.parking != null) updateValues.parking = body.parking;
  if (body.hasElevator != null) updateValues.hasElevator = body.hasElevator;
  if (body.condition != null) updateValues.condition = body.condition as "new" | "excellent" | "good" | "needs_renovation";
  if (body.description != null) updateValues.description = body.description;

  const [updated] = await db
    .update(propertiesTable)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .set(updateValues as any)
    .where(eq(propertiesTable.id, params.data.id))
    .returning();

  const images = await db
    .select()
    .from(propertyImagesTable)
    .where(eq(propertyImagesTable.propertyId, updated.id));

  res.json(UpdatePropertyResponse.parse(toApiProperty(updated, images)));
});

router.delete("/properties/:id", authenticate, async (req, res): Promise<void> => {
  const parsed = DeletePropertyParams.safeParse({ id: paramStr(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(propertiesTable)
    .where(
      and(
        eq(propertiesTable.id, parsed.data.id),
        isNull(propertiesTable.deletedAt),
      ),
    );

  if (!existing) {
    res.status(404).json({ error: "Property not found" });
    return;
  }

  const isAdmin = req.user!.role === "admin";
  const isOwner = existing.createdBy === req.user!.userId;
  if (!isOwner && !isAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db
    .update(propertiesTable)
    .set({ deletedAt: new Date(), status: "deleted", updatedAt: new Date() })
    .where(eq(propertiesTable.id, parsed.data.id));

  res.sendStatus(204);
});

router.get("/my/properties", authenticate, async (req, res): Promise<void> => {
  const parsed = ListMyPropertiesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const conditions = [
    eq(propertiesTable.createdBy, req.user!.userId),
    isNull(propertiesTable.deletedAt),
  ];

  if (parsed.data.status) {
    conditions.push(sql`${propertiesTable.status} = ${parsed.data.status}`);
  }

  const rows = await db
    .select()
    .from(propertiesTable)
    .where(and(...conditions))
    .orderBy(sql`${propertiesTable.createdAt} desc`);

  const items = rows.map((r) => toApiProperty(r));

  res.json({ items, total: items.length });
});

// POST /properties/:id/images — base64 JSON upload
router.post("/properties/:id/images", authenticate, async (req, res): Promise<void> => {
  const id = paramStr(req.params.id);
  const { data: imageData, filename = "photo.jpg" } = req.body as { data?: string; filename?: string };

  if (!imageData) {
    res.status(400).json({ error: "Image data (base64) is required" });
    return;
  }

  const [property] = await db
    .select()
    .from(propertiesTable)
    .where(and(eq(propertiesTable.id, id), isNull(propertiesTable.deletedAt)));
  if (!property) { res.status(404).json({ error: "Property not found" }); return; }
  if (property.createdBy !== req.user!.userId && req.user!.role !== "admin") {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  const existingImages = await db
    .select()
    .from(propertyImagesTable)
    .where(eq(propertyImagesTable.propertyId, id));
  if (existingImages.length >= 20) {
    res.status(400).json({ error: "Maximum 20 images per property" });
    return;
  }

  const base64 = imageData.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64, "base64");

  const uploadsDir = path.join(process.cwd(), "uploads");
  await fs.mkdir(uploadsDir, { recursive: true });
  const rawExt = (filename.split(".").pop() ?? "jpg").toLowerCase();
  const ext = ["jpg", "jpeg", "png", "webp", "gif"].includes(rawExt) ? rawExt : "jpg";
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  await fs.writeFile(path.join(uploadsDir, uniqueName), buffer);

  const [image] = await db.insert(propertyImagesTable).values({
    propertyId: id,
    path: `/api/uploads/${uniqueName}`,
    sizeBytes: buffer.length,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any).returning();

  req.log.info({ propertyId: id, imageId: image.id }, "Image uploaded");
  res.status(201).json({ id: image.id, path: image.path, sizeBytes: image.sizeBytes });
});

// DELETE /properties/:id/images/:imageId
router.delete("/properties/:id/images/:imageId", authenticate, async (req, res): Promise<void> => {
  const propertyId = paramStr(req.params.id);
  const imageId = paramStr(req.params.imageId);

  const [image] = await db
    .select()
    .from(propertyImagesTable)
    .where(and(eq(propertyImagesTable.id, imageId), eq(propertyImagesTable.propertyId, propertyId)));
  if (!image) { res.status(404).json({ error: "Image not found" }); return; }

  const [property] = await db
    .select({ createdBy: propertiesTable.createdBy })
    .from(propertiesTable)
    .where(eq(propertiesTable.id, propertyId));
  if (property?.createdBy !== req.user!.userId && req.user!.role !== "admin") {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  const fileName = image.path.replace("/api/uploads/", "");
  await fs.unlink(path.join(process.cwd(), "uploads", fileName)).catch(() => {});
  await db.delete(propertyImagesTable).where(eq(propertyImagesTable.id, imageId));

  res.sendStatus(204);
});

// POST /properties/:id/publish — move draft → pending_review
router.post("/properties/:id/publish", authenticate, async (req, res): Promise<void> => {
  const id = paramStr(req.params.id);

  const [property] = await db
    .select()
    .from(propertiesTable)
    .where(and(eq(propertiesTable.id, id), isNull(propertiesTable.deletedAt)));
  if (!property) { res.status(404).json({ error: "Property not found" }); return; }
  if (property.createdBy !== req.user!.userId && req.user!.role !== "admin") {
    res.status(403).json({ error: "Forbidden" }); return;
  }
  if (property.status !== "draft") {
    res.status(409).json({ error: "Property must be in draft state to publish" }); return;
  }
  if (!property.propertyType || !property.transactionMode) {
    res.status(400).json({ error: "Property type and transaction mode are required before publishing" }); return;
  }

  const [updated] = await db
    .update(propertiesTable)
    .set({ status: "pending_review", updatedAt: new Date() })
    .where(eq(propertiesTable.id, id))
    .returning();

  const images = await db
    .select()
    .from(propertyImagesTable)
    .where(eq(propertyImagesTable.propertyId, id));

  req.log.info({ propertyId: id }, "Property submitted for review");
  res.json(GetPropertyResponse.parse(toApiProperty(updated, images)));
});

export default router;
