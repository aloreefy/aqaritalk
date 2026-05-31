import { Router, type IRouter } from "express";
import {
  db,
  contactReleaseTable,
  propertiesTable,
  usersTable,
  commissionSettingsTable,
  notificationsTable,
} from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";
import {
  RequestContactReleaseBody,
  GetContactReleaseParams,
  GetContactReleaseResponse,
  AcknowledgeContactReleaseParams,
  AcknowledgeContactReleaseBody,
  AcknowledgeContactReleaseResponse,
  GetContactReleaseByPropertyParams,
  GetContactReleaseByPropertyResponse,
} from "@workspace/api-zod";
import { authenticate } from "../middleware/authenticate";
import { toApiContactRelease } from "../lib/property-mapper";

const router: IRouter = Router();

function paramStr(p: string | string[]): string {
  return Array.isArray(p) ? p[0] : p;
}

async function getDefaultCommission(): Promise<{
  buyerPct: string;
  sellerPct: string;
}> {
  const rows = await db.select().from(commissionSettingsTable).limit(1);
  if (rows.length > 0) {
    return { buyerPct: rows[0].defaultBuyerPct, sellerPct: rows[0].defaultSellerPct };
  }
  await db.insert(commissionSettingsTable).values({
    defaultBuyerPct: "2.50",
    defaultSellerPct: "2.50",
    negotiable: true,
  });
  return { buyerPct: "2.50", sellerPct: "2.50" };
}

router.post("/contact-release", authenticate, async (req, res): Promise<void> => {
  const parsed = RequestContactReleaseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { propertyId } = parsed.data;
  const buyerId = req.user!.userId;

  const [property] = await db
    .select()
    .from(propertiesTable)
    .where(
      and(eq(propertiesTable.id, propertyId), isNull(propertiesTable.deletedAt)),
    );

  if (!property) {
    res.status(404).json({ error: "Property not found" });
    return;
  }

  if (property.createdBy === buyerId) {
    res.status(400).json({ error: "Cannot request contact for your own property" });
    return;
  }

  const existing = await db
    .select()
    .from(contactReleaseTable)
    .where(
      and(
        eq(contactReleaseTable.propertyId, propertyId),
        eq(contactReleaseTable.buyerId, buyerId),
      ),
    );

  if (existing.length > 0) {
    res.status(409).json({ error: "Contact release already requested" });
    return;
  }

  const { buyerPct, sellerPct } = await getDefaultCommission();

  const [release] = await db
    .insert(contactReleaseTable)
    .values({
      buyerId,
      sellerId: property.createdBy,
      propertyId,
      status: "pending",
      commissionBuyerPct: buyerPct,
      commissionSellerPct: sellerPct,
    })
    .returning();

  await db.insert(notificationsTable).values({
    userId: property.createdBy,
    type: "contact_request",
    titleAr: "طلب تواصل جديد",
    titleEn: "New Contact Request",
    bodyAr: `مشتري مهتم بعقارك طلب التواصل معك`,
    bodyEn: `A buyer is interested in your property and requested contact`,
  });

  const [seller] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, property.createdBy));

  res.status(201).json(
    GetContactReleaseResponse.parse(
      toApiContactRelease(release, undefined, seller?.phone),
    ),
  );
});

router.get("/contact-release/:id", authenticate, async (req, res): Promise<void> => {
  const parsed = GetContactReleaseParams.safeParse({ id: paramStr(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [release] = await db
    .select()
    .from(contactReleaseTable)
    .where(eq(contactReleaseTable.id, parsed.data.id));

  if (!release) {
    res.status(404).json({ error: "Contact release not found" });
    return;
  }

  const userId = req.user!.userId;
  if (release.buyerId !== userId && release.sellerId !== userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  let buyerPhone: string | null = null;
  let sellerPhone: string | null = null;

  if (release.status === "released") {
    const [buyer] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, release.buyerId));
    const [seller] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, release.sellerId));
    buyerPhone = buyer?.phone ?? null;
    sellerPhone = seller?.phone ?? null;
  }

  res.json(
    GetContactReleaseResponse.parse(
      toApiContactRelease(release, buyerPhone, sellerPhone),
    ),
  );
});

router.post(
  "/contact-release/:id/acknowledge",
  authenticate,
  async (req, res): Promise<void> => {
    const params = AcknowledgeContactReleaseParams.safeParse({ id: paramStr(req.params.id) });
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const body = AcknowledgeContactReleaseBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }

    const [release] = await db
      .select()
      .from(contactReleaseTable)
      .where(eq(contactReleaseTable.id, params.data.id));

    if (!release) {
      res.status(404).json({ error: "Contact release not found" });
      return;
    }

    const userId = req.user!.userId;
    const { role } = body.data;

    if (role === "buyer" && release.buyerId !== userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    if (role === "seller" && release.sellerId !== userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const now = new Date();
    const updates: Record<string, Date | string> = {};

    if (role === "buyer") {
      if (release.buyerAckAt) {
        res.status(409).json({ error: "Already acknowledged" });
        return;
      }
      updates.buyerAckAt = now;
      updates.status = release.sellerAckAt ? "released" : "buyer_acked";
    } else {
      if (release.sellerAckAt) {
        res.status(409).json({ error: "Already acknowledged" });
        return;
      }
      updates.sellerAckAt = now;
      updates.status = release.buyerAckAt ? "released" : "seller_acked";
    }

    if (updates.status === "released") {
      updates.releasedAt = now;
    }

    const [updated] = await db
      .update(contactReleaseTable)
      .set(updates as Parameters<typeof db.update>[0] extends infer _T ? Record<string, unknown> : never)
      .where(eq(contactReleaseTable.id, release.id))
      .returning();

    if (updates.status === "released") {
      await Promise.all([
        db.insert(notificationsTable).values({
          userId: release.buyerId,
          type: "contact_released",
          titleAr: "تم الإفراج عن بيانات التواصل",
          titleEn: "Contact Released",
          bodyAr: "يمكنك الآن رؤية رقم هاتف البائع",
          bodyEn: "You can now see the seller's phone number",
        }),
        db.insert(notificationsTable).values({
          userId: release.sellerId,
          type: "contact_released",
          titleAr: "تم الإفراج عن بيانات التواصل",
          titleEn: "Contact Released",
          bodyAr: "يمكنك الآن رؤية رقم هاتف المشتري",
          bodyEn: "You can now see the buyer's phone number",
        }),
      ]);
    }

    let buyerPhone: string | null = null;
    let sellerPhone: string | null = null;

    if (updated.status === "released") {
      const [buyer] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, updated.buyerId));
      const [seller] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, updated.sellerId));
      buyerPhone = buyer?.phone ?? null;
      sellerPhone = seller?.phone ?? null;
    }

    res.json(
      AcknowledgeContactReleaseResponse.parse(
        toApiContactRelease(updated, buyerPhone, sellerPhone),
      ),
    );
  },
);

router.get(
  "/contact-release/property/:propertyId",
  authenticate,
  async (req, res): Promise<void> => {
    const parsed = GetContactReleaseByPropertyParams.safeParse({
      propertyId: paramStr(req.params.propertyId),
    });
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const userId = req.user!.userId;

    const [release] = await db
      .select()
      .from(contactReleaseTable)
      .where(
        and(
          eq(contactReleaseTable.propertyId, parsed.data.propertyId),
          eq(contactReleaseTable.buyerId, userId),
        ),
      );

    if (!release) {
      res.json(GetContactReleaseByPropertyResponse.parse(null));
      return;
    }

    let buyerPhone: string | null = null;
    let sellerPhone: string | null = null;

    if (release.status === "released") {
      const [buyer] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, release.buyerId));
      const [seller] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, release.sellerId));
      buyerPhone = buyer?.phone ?? null;
      sellerPhone = seller?.phone ?? null;
    }

    res.json(
      GetContactReleaseByPropertyResponse.parse(
        toApiContactRelease(release, buyerPhone, sellerPhone),
      ),
    );
  },
);

export default router;
