const REAL_ESTATE_KEYWORDS_AR = [
  "عقار", "شقة", "فيلا", "أرض", "مكتب", "تجاري", "سكني",
  "إيجار", "بيع", "شراء", "استئجار", "سعر", "مساحة", "غرفة",
  "حمام", "طابق", "موقف", "مفروش", "منطقة", "حي", "عمان",
  "الرياض", "جدة", "إربد", "الزرقاء", "بدر", "ديرة", "محافظة",
  "متر", "دونم", "ألف", "مليون", "دينار", "ريال",
  "تواصل", "تسجيل", "إدراج", "بحث", "نتائج", "خريطة",
];

const REAL_ESTATE_KEYWORDS_EN = [
  "property", "apartment", "villa", "land", "office", "commercial", "residential",
  "rent", "sale", "buy", "lease", "price", "area", "room", "bathroom",
  "floor", "parking", "furnished", "district", "neighborhood",
  "sqm", "meter", "thousand", "million", "dinar", "riyal",
  "listing", "search", "location", "map",
];

// Use explicit forms (with and without definite article) rather than bare roots.
// Bare roots like "دين" are dangerous — they match inside "دينار" (Jordanian dinar).
const HARD_OFF_TOPIC: string[] = [
  // politics
  "سياسة", "السياسة", "سياسي", "انتخابات",
  // religion — use full forms to avoid matching "دينار"
  "الدين", "ديني", "دينية", "صلاة", "عبادة", "كنيسة", "مسجد",
  // medicine
  "الطب", "طبيب", "مستشفى", "دواء",
  // cooking / recipes
  "وصفة", "الوصفة", "طبخ", "الطبخ", "مطبخ",
  // sports / entertainment
  "رياضة", "الرياضة", "فيلم", "الفيلم", "أغنية", "أغاني",
  // security exploits
  "politics", "religion", "medicine", "recipe", "cooking", "sport", "movie", "song",
  "hack", "illegal", "crack", "jailbreak",
];

export function isOffTopic(text: string): boolean {
  const lower = text.toLowerCase();

  if (HARD_OFF_TOPIC.some((kw) => lower.includes(kw))) return true;

  const hasRealEstate =
    REAL_ESTATE_KEYWORDS_AR.some((kw) => lower.includes(kw)) ||
    REAL_ESTATE_KEYWORDS_EN.some((kw) => lower.includes(kw));

  if (hasRealEstate) return false;

  if (text.trim().length < 30) return false;

  return false;
}

export const OFF_TOPIC_RESPONSE_AR =
  "أنا مساعد عقاري متخصص. يمكنني مساعدتك في البحث عن عقارات أو تسجيل عقارك للبيع أو الإيجار. كيف يمكنني مساعدتك في ذلك؟";
