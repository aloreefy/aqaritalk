import type { BuyerCriteria, SellerData } from "./state-machine";

const CATEGORY_MAP: Record<string, string> = {
  شقة: "apartment", apartment: "apartment",
  فيلا: "villa", villa: "villa",
  بيت: "house", بيوت: "house", دار: "house", house: "house",
  "بيت مستقل": "house", "دار مستقل": "house",
  طابق: "floor", floor: "floor",
  بناية: "building", building: "building",
  قصر: "palace", palace: "palace",
  روف: "roof", roof: "roof",
  استوديو: "studio", studio: "studio",
  غرفة: "room", room: "room",
  مكتب: "office", office: "office",
  محل: "shop", shop: "shop",
  مستودع: "warehouse", warehouse: "warehouse",
  مصنع: "factory", factory: "factory",
  مزرعة: "farm", farm: "farm",
  أرض: "land_residential", land: "land_residential",
  "أرض سكنية": "land_residential",
  "أرض تجارية": "land_commercial",
  "أرض زراعية": "land_agricultural",
  فندق: "hotel", hotel: "hotel",
  شاليه: "chalet", chalet: "chalet",
  استراحة: "rest_house",
};

const TRANSACTION_MAP: Record<string, string> = {
  للإيجار: "rent", تأجير: "rent", للايجار: "rent", تاجير: "rent",
  إيجار: "rent", ايجار: "rent", rent: "rent", بأجار: "rent", بأجر: "rent",
  للبيع: "sale", بيع: "sale", sale: "sale",
  "إيجار منتهي": "rent_to_own", "rent to own": "rent_to_own",
};

const FURNISHED_MAP: Record<string, string> = {
  مفروش: "fully", "fully furnished": "fully",
  "نص مفروش": "semi", "semi furnished": "semi", "نصف مفروش": "semi",
  "غير مفروش": "unfurnished", unfurnished: "unfurnished", "بدون أثاث": "unfurnished",
};

const CITY_MAP: Record<string, string> = {
  عمان: "عمان", amman: "عمان", oman: "عمان",
  إربد: "إربد", irbid: "إربد",
  الزرقاء: "الزرقاء", zarqa: "الزرقاء",
  عقبة: "عقبة", aqaba: "عقبة",
  المفرق: "المفرق",
  الرياض: "الرياض", riyadh: "الرياض",
  جدة: "جدة", jeddah: "جدة",
  مكة: "مكة", mecca: "مكة",
  المدينة: "المدينة",
};

const AR_NUMBER_WORDS: Record<string, number> = {
  واحد: 1, واحدة: 1, وحده: 1, وحدة: 1,
  اثنين: 2, اثنتين: 2, اثنان: 2, اثنتان: 2, ثنتين: 2,
  ثلاث: 3, ثلاثة: 3,
  أربع: 4, أربعة: 4, اربع: 4, اربعة: 4,
  خمس: 5, خمسة: 5,
  ست: 6, ستة: 6,
  سبع: 7, سبعة: 7,
  ثماني: 8, ثمانية: 8, ثمان: 8,
  تسع: 9, تسعة: 9,
  عشر: 10, عشرة: 10,
};

const SUBMIT_INTENT_PHRASES = [
  "نزله", "نزلها", "نشره", "نشرها", "انشر", "نشر الإعلان", "ابعثه", "أرسله", "ارسله",
  "خلص", "كفاية", "يكفي", "كافي", "اكتفينا", "انتهينا", "انتهى وصف",
  "ضعه", "ضعها", "نشر", "publish", "post the ad",
  // Common end-of-conversation phrasing
  "تنزيل الإعلان", "تنزيل الاعلان", "انتهى العرض", "انهى العرض",
  "سجل الإعلان", "سجل الاعلان", "اضف الإعلان", "ضع الإعلان",
  "رفع الإعلان", "ارفع الإعلان", "submit", "ابدأ الإعلان",
];

export function isSubmitIntent(text: string): boolean {
  const lower = text.toLowerCase();
  return SUBMIT_INTENT_PHRASES.some((p) => lower.includes(p));
}

function findMapping(text: string, map: Record<string, string>): string | undefined {
  const lower = text.toLowerCase();
  const sortedKeys = Object.keys(map).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (lower.includes(key.toLowerCase())) return map[key];
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

function parseArCount(text: string, keywords: string[]): number | undefined {
  for (const kw of keywords) {
    const digitMatch = new RegExp(`(\\d+)\\s*${kw}`, "u").exec(text);
    if (digitMatch) return parseInt(digitMatch[1]);

    for (const [word, num] of Object.entries(AR_NUMBER_WORDS)) {
      if (text.includes(`${word} ${kw}`) || text.includes(`${word}ة ${kw}`) || text.includes(`${word}ات`)) {
        if (text.includes(word) && text.includes(kw)) return num;
      }
    }
  }
  return undefined;
}

function extractAreaSqm(text: string): number | undefined {
  const gardenPattern = /(?:مساح[هة]\s+(?:الحديقه?|الحديقة|البستان|الحديقة الخلفية?))\s+(\d+(?:\.\d+)?)\s*(?:م²|م(?![\u0600-\u06FF])|متر)/u;
  const gardenMatch = gardenPattern.exec(text);
  const gardenArea = gardenMatch ? parseFloat(gardenMatch[1]) : null;

  const buildingPattern = /(?:مساح[هة]\s+(?:البيت|الشقة|العقار|الوحدة|الدار|المنزل))\s+(\d+(?:\.\d+)?)\s*(?:م²|م(?![\u0600-\u06FF])|متر)/u;
  const buildingMatch = buildingPattern.exec(text);
  if (buildingMatch) return parseFloat(buildingMatch[1]);

  const genericPattern = /(\d+(?:\.\d+)?)\s*(?:م²|م²|متر\s*(?:مربع)?|sqm|m²|م(?![\u0600-\u06FF]))/u;
  const allMatches = [...text.matchAll(new RegExp(genericPattern.source, "gu"))];
  const areas = allMatches
    .map((m) => parseFloat(m[1]))
    .filter((n) => n !== gardenArea && n > 10 && n < 100_000);

  if (areas.length > 0) return areas[areas.length - 1];
  return undefined;
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

  const rooms = parseArCount(text, ["غرف", "غرفة", "rooms", "bed"]);
  if (rooms != null) updated.rooms = rooms;

  if (/موقف|parking|كرجل|كراج|جراج|garage/i.test(text)) updated.parking = true;

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

  const areaSqm = extractAreaSqm(text);
  if (areaSqm != null) updated.areaSqm = areaSqm;

  const rooms = parseArCount(text, ["غرف", "غرفة", "rooms", "bed"]);
  if (rooms != null) updated.rooms = rooms;

  const bathrooms = parseArCount(text, ["حمام", "حمامات", "دورة", "bathroom", "bath"]);
  if (bathrooms != null) updated.bathrooms = bathrooms;

  const floorMatch = text.match(/(?:الطابق|طابق|floor)\s*(?:ال)?(\d+)/i);
  if (floorMatch) updated.floorNumber = parseInt(floorMatch[1]);

  const nums = text.match(/\d[\d,،٠-٩]*(?:\.\d+)?(?:\s*(?:ألف|k|thousand|مليون|million))?/gi) ?? [];
  const prices = nums.map((n) => extractNumber(n)).filter((n): n is number => n != null);

  if (prices.length >= 1 && !updated.areaSqm) {
    const big = prices.find((p) => p > 1000);
    if (big) updated.price = big;
  } else if (prices.length >= 1 && updated.areaSqm) {
    const priceCandidate = prices.find((p) => p > updated.areaSqm! * 2 && p !== updated.areaSqm);
    if (priceCandidate) updated.price = priceCandidate;
  }

  if (/موقف|parking|كرجل|كراج|جراج|garage/i.test(text)) updated.parking = true;

  if (text.length > 60 && !updated.description) {
    updated.description = text.trim();
  } else if (text.length > 60 && updated.description && text.length > updated.description.length) {
    updated.description = text.trim();
  }

  return updated;
}
