import type { SellerData } from "./state-machine";

interface GuidanceNudge {
  field: keyof SellerData;
  messageAr: string;
}

const NUDGES: GuidanceNudge[] = [
  {
    field: "areaSqm",
    messageAr:
      "المشترون يسألون دائماً عن مساحة العقار — إضافتها تزيد من جدية الإعلان كثيراً.",
  },
  {
    field: "rooms",
    messageAr:
      "عدد الغرف من أولى المعلومات التي يبحث عنها المهتمون بالشراء أو الإيجار.",
  },
  {
    field: "bathrooms",
    messageAr:
      "إضافة عدد الحمامات تساعد المهتمين في اتخاذ القرار بسرعة.",
  },
  {
    field: "furnished",
    messageAr:
      "ذكر حالة التأثيث (مفروش / غير مفروش) يوفر الوقت على الطرفين.",
  },
  {
    field: "parking",
    messageAr:
      "وجود موقف سيارة أو عدمه مؤثر جداً في قرار كثير من المشترين.",
  },
  {
    field: "description",
    messageAr:
      "الإعلانات التي تحتوي على وصف تفصيلي تحصل على تواصل أكثر بنسبة كبيرة.",
  },
  {
    field: "floorNumber",
    messageAr:
      "تحديد الطابق يساعد في استهداف المشترين المناسبين — خاصةً لمن يبحثون عن طوابق بعينها.",
  },
];

export function getMissingFieldNudges(data: SellerData): GuidanceNudge[] {
  return NUDGES.filter((n) => data[n.field] == null);
}

export function buildGuidanceText(data: SellerData): string {
  const missing = getMissingFieldNudges(data);
  if (missing.length === 0) {
    return "ممتاز! إعلانك اكتمل بشكل جيد جداً وجاهز للنشر.";
  }

  const first = missing[0];
  const remaining = missing.length - 1;

  let text = first.messageAr;
  if (remaining === 1) {
    text += ` هناك أيضاً معلومة واحدة أخرى يمكن إضافتها.`;
  } else if (remaining > 1) {
    text += ` هناك ${remaining} معلومات أخرى يمكن إضافتها لتقوية الإعلان.`;
  }

  return text;
}
