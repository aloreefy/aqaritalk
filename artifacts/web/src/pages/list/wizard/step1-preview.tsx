import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { ArrowRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGetProperty, useUpdateProperty } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import WizardProgress from "./WizardProgress";

const PROPERTY_TYPES = [
  "apartment","house","floor","building","villa","palace","roof","studio","room",
  "office","shop","warehouse","factory","farm","land_residential","land_commercial",
  "land_agricultural","hotel","chalet","rest_house","other",
];

const FURNISHED_OPTIONS = [
  { value: "furnished", label: "مفروش" },
  { value: "semi_furnished", label: "نصف مفروش" },
  { value: "unfurnished", label: "غير مفروش" },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-gray-500 font-medium">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-primary";
const selectCls = `${inputCls} appearance-none`;

export default function WizardStep1Preview() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  const { toast } = useToast();

  const { data: property, isLoading } = useGetProperty(id ?? "");
  const updateMutation = useUpdateProperty();

  const [form, setForm] = useState({
    propertyType: "",
    transactionMode: "sale" as "sale" | "rent" | "lease",
    price: "",
    priceCurrency: "JOD",
    city: "",
    district: "",
    street: "",
    areaSqm: "",
    rooms: "",
    bathrooms: "",
    floorNumber: "",
    furnishedStatus: "",
    parking: false,
    hasElevator: false,
    description: "",
  });

  useEffect(() => {
    if (!property) return;
    setForm({
      propertyType: property.propertyType ?? "",
      transactionMode: (property.transactionMode as "sale" | "rent" | "lease") ?? "sale",
      price: property.price != null ? String(property.price) : "",
      priceCurrency: property.priceCurrency ?? "JOD",
      city: property.city ?? "",
      district: property.district ?? "",
      street: property.street ?? "",
      areaSqm: property.areaSqm != null ? String(property.areaSqm) : "",
      rooms: property.rooms != null ? String(property.rooms) : "",
      bathrooms: property.bathrooms != null ? String(property.bathrooms) : "",
      floorNumber: property.floorNumber != null ? String(property.floorNumber) : "",
      furnishedStatus: property.furnishedStatus ?? "",
      parking: property.parking ?? false,
      hasElevator: property.hasElevator ?? false,
      description: property.description ?? "",
    });
  }, [property]);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    if (!id) return;
    const data: Record<string, unknown> = {
      propertyType: form.propertyType || undefined,
      transactionMode: form.transactionMode || undefined,
      price: form.price ? Number(form.price) : undefined,
      priceCurrency: form.priceCurrency || undefined,
      city: form.city || undefined,
      district: form.district || undefined,
      street: form.street || undefined,
      areaSqm: form.areaSqm ? Number(form.areaSqm) : undefined,
      rooms: form.rooms ? Number(form.rooms) : undefined,
      bathrooms: form.bathrooms ? Number(form.bathrooms) : undefined,
      floorNumber: form.floorNumber ? Number(form.floorNumber) : undefined,
      furnishedStatus: form.furnishedStatus || undefined,
      parking: form.parking,
      hasElevator: form.hasElevator,
      description: form.description || undefined,
    };
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await updateMutation.mutateAsync({ id, data: data as any });
      navigate(`/list/wizard/${id}/location`);
    } catch {
      toast({ title: t("common.error"), description: t("common.retry"), variant: "destructive" });
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-400 text-sm">{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(`/chat/${property?.id ?? id}`)} type="button">
          <ArrowRight size={20} className="text-gray-600 rtl:rotate-180" />
        </button>
        <p className="font-semibold text-sm text-gray-900 flex-1">{t("wizard.preview")}</p>
      </div>

      <WizardProgress currentStep={1} />

      <div className="flex-1 p-4 space-y-4 pb-24">
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t("wizard.propertyDetails")}</p>

          <Field label={t("wizard.propertyType")}>
            <select
              value={form.propertyType}
              onChange={(e) => set("propertyType", e.target.value)}
              className={selectCls}
              dir="rtl"
            >
              <option value="">— اختر —</option>
              {PROPERTY_TYPES.map((pt) => (
                <option key={pt} value={pt}>{t(`property.types.${pt}`, { defaultValue: pt })}</option>
              ))}
            </select>
          </Field>

          <Field label={t("wizard.transactionMode")}>
            <select
              value={form.transactionMode}
              onChange={(e) => set("transactionMode", e.target.value as "sale" | "rent" | "lease")}
              className={selectCls}
              dir="rtl"
            >
              <option value="sale">{t("property.sale")}</option>
              <option value="rent">{t("property.rent")}</option>
              <option value="lease">{t("property.lease")}</option>
            </select>
          </Field>

          <div className="flex gap-2">
            <div className="flex-1">
              <Field label={t("wizard.price")}>
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) => set("price", e.target.value)}
                  className={inputCls}
                  placeholder="0"
                  min="0"
                />
              </Field>
            </div>
            <div className="w-24">
              <Field label={t("wizard.currency")}>
                <select
                  value={form.priceCurrency}
                  onChange={(e) => set("priceCurrency", e.target.value)}
                  className={selectCls}
                >
                  <option value="JOD">JOD</option>
                  <option value="SAR">SAR</option>
                </select>
              </Field>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t("wizard.locationSection")}</p>

          <Field label={t("wizard.city")}>
            <input
              type="text"
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
              className={inputCls}
              placeholder="عمان"
              dir="rtl"
            />
          </Field>

          <Field label={t("wizard.district")}>
            <input
              type="text"
              value={form.district}
              onChange={(e) => set("district", e.target.value)}
              className={inputCls}
              placeholder="الاسم الحي"
              dir="rtl"
            />
          </Field>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t("wizard.detailsSection")}</p>

          <div className="grid grid-cols-2 gap-3">
            <Field label={`${t("wizard.areaSqm")} م²`}>
              <input type="number" value={form.areaSqm} onChange={(e) => set("areaSqm", e.target.value)} className={inputCls} placeholder="0" min="0" />
            </Field>
            <Field label={t("wizard.rooms")}>
              <input type="number" value={form.rooms} onChange={(e) => set("rooms", e.target.value)} className={inputCls} placeholder="0" min="0" max="20" />
            </Field>
            <Field label={t("wizard.bathrooms")}>
              <input type="number" value={form.bathrooms} onChange={(e) => set("bathrooms", e.target.value)} className={inputCls} placeholder="0" min="0" max="20" />
            </Field>
            <Field label={t("wizard.floor")}>
              <input type="number" value={form.floorNumber} onChange={(e) => set("floorNumber", e.target.value)} className={inputCls} placeholder="0" min="0" max="100" />
            </Field>
          </div>

          <Field label={t("wizard.furnished")}>
            <select value={form.furnishedStatus} onChange={(e) => set("furnishedStatus", e.target.value)} className={selectCls} dir="rtl">
              <option value="">— اختياري —</option>
              {FURNISHED_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={form.parking} onChange={(e) => set("parking", e.target.checked)} className="w-4 h-4 accent-primary" />
              {t("property.parking")}
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={form.hasElevator} onChange={(e) => set("hasElevator", e.target.checked)} className="w-4 h-4 accent-primary" />
              {t("property.elevator")}
            </label>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t("wizard.description")}</p>
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            className={`${inputCls} min-h-[100px] resize-none`}
            placeholder="اكتب وصفاً تفصيلياً للعقار..."
            dir="rtl"
            rows={4}
          />
        </div>
      </div>

      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 px-4 py-3 safe-pb">
        <Button
          className="w-full gap-2"
          onClick={handleSave}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? t("wizard.saving") : t("wizard.nextLocation")}
          <ChevronLeft size={16} className="rtl:rotate-180" />
        </Button>
      </div>
    </div>
  );
}
