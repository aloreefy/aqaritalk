import type { BuyerCriteria, SellerData } from "./state-machine";

const CATEGORY_MAP: Record<string, string> = {
  شقة: "apartment", apartment: "apartment",
  فيلا: "villa", villa: "villa",
  أرض: "land_residential", land: "land_residential",
  مكتب: "office", office: "office",
  محل: "commercial_shop", shop: "commercial_shop",
  مستودع: "warehouse", warehouse: "warehouse",
  استوديو: "studio", studio: "studio",
};

const TRANSACTION_MAP: Record<string, string> = {
  إيجار: "rent", rent: "rent", للإيجار: "rent",
  بيع: "sale", sale: "sale", للبيع: "sale",
  "إيجار منتهي": "rent_to_own", "rent to own": "rent_to_own",
};

const FURNISHED_MAP: Record<string, string> = {
  مفروش: "fully", "fully furnished": "fully",
  "نص مفروش": "semi", "semi furnished": "semi",
  "غير مفروش": "unfurnished", unfurnished: "unfurnished",
};

const CITY_MAP: Record<string, string> = {
  عمان: "عمان", amman: "عمان", oman: "عمان",
  إربد: "إربد", irbid: "إربد",
  الزرقاء: "الزرقاء", zarqa: "الزرقاء",
  الرياض: "الرياض", riyadh: "الرياض",
  جدة: "جدة", jeddah: "جدة",
};

function findMapping(text: string, map: Record<string, string>): string | undefined {
  const lower = text.toLowerCase();
  for (const [key, val] of Object.entries(map)) {
    if (lower.includes(key.toLowerCase())) return val;
  }
  return undefined;
}

function extractNumber(text: string): number | undefined {
  const cleaned = text.replace(/[,،]/g, "").replace(/[٠-٩]/g, (d) =>
    String("٠١٢٣٤٥٦٧٨٩".indexOf(d))
  );
  const match = cleaned.match(/\d+(?:\.\d+)?/);
  if (!match) return undefined;
  let n = parseFloat(match[0]);
  if (/ألف|thousand|k/i.test(text)) n *= 1000;
  if (/مليون|million|m(?=\b)/i.test(text)) n *= 1_000_000;
  return n;
}

export function extractBuyerCriteria(text: string, existing: BuyerCriteria): BuyerCriteria {
  const updated = { ...existing };

  const category = findMapping(text, CATEGORY_MAP);
  if (category) updated.category = category;

  const txMode = findMapping(text, TRANSACTION_MAP);
  if (txMode) updated.transactionMode = txMode;

  const furnished = findMapping(text, FURNISHED_MAP);
  if (furnished) updated.furnished = furnished;

  const city = findMapping(text, CITY_MAP);
  if (city) updated.city = city;

  const nums = text.match(/\d[\d,،٠-٩]*(?:\.\d+)?(?:\s*(?:ألف|k|thousand|مليون|million))?/gi) ?? [];
  const prices = nums.map((n) => extractNumber(n)).filter((n): n is number => n != null && n > 100);
  if (prices.length === 1) updated.budgetMax = prices[0];
  if (prices.length >= 2) {
    [updated.budgetMin, updated.budgetMax] = [Math.min(...prices), Math.max(...prices)];
  }

  const roomMatch = text.match(/(\d)\s*(?:غرف|غرفة|rooms?|bed)/i);
  if (roomMatch) updated.rooms = parseInt(roomMatch[1]);

  if (/موقف|parking/i.test(text)) updated.parking = true;

  return updated;
}

export function extractSellerData(text: string, existing: SellerData): SellerData {
  const updated = { ...existing };

  const category = findMapping(text, CATEGORY_MAP);
  if (category) updated.category = category;

  const txMode = findMapping(text, TRANSACTION_MAP);
  if (txMode) updated.transactionMode = txMode;

  const furnished = findMapping(text, FURNISHED_MAP);
  if (furnished) updated.furnished = furnished;

  const city = findMapping(text, CITY_MAP);
  if (city) updated.city = city;

  const nums = text.match(/\d[\d,،٠-٩]*(?:\.\d+)?(?:\s*(?:ألف|k|thousand|مليون|million))?/gi) ?? [];
  const prices = nums.map((n) => extractNumber(n)).filter((n): n is number => n != null);

  const areaMatch = text.match(/(\d+)\s*(?:متر|م²|sqm|m²)/i);
  if (areaMatch) updated.areaSqm = parseFloat(areaMatch[1]);

  const roomMatch = text.match(/(\d)\s*(?:غرف|غرفة|rooms?|bed)/i);
  if (roomMatch) updated.rooms = parseInt(roomMatch[1]);

  const bathMatch = text.match(/(\d)\s*(?:حمام|دورة|bathroom|bath)/i);
  if (bathMatch) updated.bathrooms = parseInt(bathMatch[1]);

  const floorMatch = text.match(/(?:الطابق|طابق|floor)\s*(?:ال)?(\d+)/i);
  if (floorMatch) updated.floorNumber = parseInt(floorMatch[1]);

  if (prices.length >= 1 && !updated.areaSqm) {
    const big = prices.find((p) => p > 1000);
    if (big) updated.price = big;
  }

  if (/موقف|parking/i.test(text)) updated.parking = true;

  return updated;
}
