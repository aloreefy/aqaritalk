import { Router, type IRouter, type Request } from "express";
import multer, { type FileFilterCallback } from "multer";
import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import { db, propertyImagesTable, propertiesTable, systemSettingsTable } from "@workspace/db";
import { eq, and, isNull, count } from "drizzle-orm";
import { authenticate } from "../middleware/authenticate";

async function getMaxImagesPerProperty(): Promise<number> {
  const rows = await db.select({ maxImagesPerProperty: systemSettingsTable.maxImagesPerProperty }).from(systemSettingsTable).limit(1);
  return rows[0]?.maxImagesPerProperty ?? 20;
}

type MulterRequest = Request & { file?: Express.Multer.File };

const router: IRouter = Router();

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "properties");

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB raw
  fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

function paramStr(p: string | string[]): string {
  return Array.isArray(p) ? p[0] : p;
}

router.post(
  "/properties/:id/images",
  authenticate,
  upload.single("image"),
  async (req: MulterRequest, res): Promise<void> => {
    const propertyId = paramStr(req.params.id);

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

    const isOwner = property.createdBy === req.user!.userId;
    const isAdmin = req.user!.role === "admin";
    if (!isOwner && !isAdmin) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const [{ value: imageCount }] = await db
      .select({ value: count() })
      .from(propertyImagesTable)
      .where(eq(propertyImagesTable.propertyId, propertyId));

    const maxImages = await getMaxImagesPerProperty();
    if (Number(imageCount) >= maxImages) {
      res.status(400).json({ error: `Maximum ${maxImages} images per property` });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: "No image file provided" });
      return;
    }

    const dir = path.join(UPLOAD_DIR, propertyId);
    await ensureDir(dir);

    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
    const filepath = path.join(dir, filename);

    await sharp(req.file.buffer)
      .resize({ width: 1200, height: 900, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(filepath);

    const stat = await fs.stat(filepath);
    const relativePath = `/uploads/properties/${propertyId}/${filename}`;

    const [image] = await db
      .insert(propertyImagesTable)
      .values({
        propertyId,
        path: relativePath,
        sizeBytes: stat.size,
      })
      .returning();

    res.status(201).json({
      id: image.id,
      path: image.path,
      sizeBytes: image.sizeBytes,
    });
  },
);

router.delete(
  "/properties/:id/images/:imageId",
  authenticate,
  async (req, res): Promise<void> => {
    const propertyId = paramStr(req.params.id);
    const imageId = paramStr(req.params.imageId);

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

    const isOwner = property.createdBy === req.user!.userId;
    const isAdmin = req.user!.role === "admin";
    if (!isOwner && !isAdmin) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const [image] = await db
      .select()
      .from(propertyImagesTable)
      .where(
        and(
          eq(propertyImagesTable.id, imageId),
          eq(propertyImagesTable.propertyId, propertyId),
        ),
      );

    if (!image) {
      res.status(404).json({ error: "Image not found" });
      return;
    }

    const fullPath = path.join(process.cwd(), image.path);
    await fs.unlink(fullPath).catch(() => {});

    await db
      .delete(propertyImagesTable)
      .where(eq(propertyImagesTable.id, imageId));

    res.sendStatus(204);
  },
);

export default router;
