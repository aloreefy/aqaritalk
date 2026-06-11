import { Router, type IRouter } from "express";
import { db, propertiesTable, usersTable } from "@workspace/db";
import { eq, isNull, sql, and } from "drizzle-orm";

const router: IRouter = Router();

const INTERNAL_KEY = process.env.INTERNAL_API_KEY ?? "";
const SHADDA = "\u0651";

function checkKey(req: any, res: any): boolean {
  const key = req.headers["x-agent-key"];
  if (!INTERNAL_KEY || key !== INTERNAL_KEY) {
    res.status(401).json({ error: "unauthorized" });
    return false;
  }
  return true;
}

// POST /api/internal/search-properties
// Called by the local Python agent to search active listings.
router.post("/internal/search-properties", async (req, res): Promise<void> => {
  if (!checkKey(req, res)) return;

  const { city, property_type, transaction_mode, min_price, max_price, min_rooms, limit = 5 } = req.body ?? {};

  const cap = Math.max(1, Math.min(Number(limit) || 5, 20));
  const conditions = [isNull(propertiesTable.deletedAt), eq(propertiesTable.status, "active")];

  if (city) {
    const stripped = String(city).replace(new RegExp(SHADDA, "g"), "");
    conditions.push(
      sql`REPLACE(${propertiesTable.city}, ${SHADDA}, '') ILIKE ${"%" + stripped + "%"}`,
    );
  }
  if (property_type) conditions.push(sql`${propertiesTable.propertyType} = ${String(property_type)}`);
  if (transaction_mode) conditions.push(sql`${propertiesTable.transactionMode} = ${String(transaction_mode)}`);
  if (min_price != null) conditions.push(sql`${propertiesTable.price}::numeric >= ${Number(min_price)}`);
  if (max_price != null) conditions.push(sql`${propertiesTable.price}::numeric <= ${Number(max_price)}`);
  if (min_rooms != null) conditions.push(eq(propertiesTable.rooms, Number(min_rooms)));

  const rows = await db
    .select({
      id: propertiesTable.id,
      listing_name: propertiesTable.listingName,
      property_type: propertiesTable.propertyType,
      transaction_mode: propertiesTable.transactionMode,
      city: propertiesTable.city,
      district: propertiesTable.district,
      price: propertiesTable.price,
      price_currency: propertiesTable.priceCurrency,
      price_per: propertiesTable.pricePer,
      rooms: propertiesTable.rooms,
      bathrooms: propertiesTable.bathrooms,
      area_sqm: propertiesTable.areaSqm,
      description: propertiesTable.description,
    })
    .from(propertiesTable)
    .where(and(...conditions))
    .orderBy(sql`${propertiesTable.price}::numeric asc nulls last`)
    .limit(cap);

  const results = rows.map((r) => ({
    ...r,
    id: String(r.id),
    price: r.price != null ? parseFloat(r.price) : null,
    area_sqm: r.area_sqm != null ? parseFloat(r.area_sqm) : null,
    description: r.description ? r.description.slice(0, 160) : null,
  }));

  res.json({ count: results.length, results });
});

// POST /api/internal/create-listing
// Called by the local Python agent to create a new pending_review listing.
router.post("/internal/create-listing", async (req, res): Promise<void> => {
  if (!checkKey(req, res)) return;

  const { property_type, transaction_mode, city, price, district, rooms, area_sqm, description } = req.body ?? {};

  if (!property_type || !transaction_mode || !city || price == null) {
    res.status(400).json({ error: "property_type, transaction_mode, city, price are required" });
    return;
  }

  // Find a broker/seller user to own the listing
  const [owner] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(sql`${usersTable.role} IN ('broker', 'seller')`)
    .limit(1);

  if (!owner) {
    res.status(400).json({ error: "لا يوجد مستخدم لإسناد الإعلان إليه." });
    return;
  }

  const insertValues: Record<string, unknown> = {
    createdBy: owner.id,
    listingName: `${property_type} - ${city}`,
    listingDirection: "offering",
    propertyType: property_type,
    transactionMode: transaction_mode,
    city,
    status: "pending_review",
  };

  if (district != null) insertValues.district = district;
  if (price != null) insertValues.price = String(price);
  if (rooms != null) insertValues.rooms = Number(rooms);
  if (area_sqm != null) insertValues.areaSqm = String(area_sqm);
  if (description != null) insertValues.description = description;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [property] = await db.insert(propertiesTable).values(insertValues as any).returning({ id: propertiesTable.id });

  res.status(201).json({
    id: String(property.id),
    status: "pending_review",
    message: "تم إنشاء الإعلان بنجاح وهو الآن قيد المراجعة.",
  });
});

export default router;
