import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { ArrowRight, ChevronLeft, MapPin, Navigation, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGetProperty, useUpdateProperty } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import WizardProgress from "./WizardProgress";

const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-primary";

export default function WizardStep2Location() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  const { toast } = useToast();

  const { data: property, isLoading } = useGetProperty(id ?? "");
  const updateMutation = useUpdateProperty();

  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [street, setStreet] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"idle" | "locating" | "done" | "error">("idle");

  useEffect(() => {
    if (!property) return;
    setCity(property.city ?? "");
    setDistrict(property.district ?? "");
    setStreet(property.street ?? "");
    if (property.latitude != null) setLat(property.latitude);
    if (property.longitude != null) setLng(property.longitude);
    if (property.latitude != null && property.longitude != null) setGpsStatus("done");
  }, [property]);

  function handleGps() {
    if (!navigator.geolocation) {
      toast({ title: "خطأ", description: "الموقع الجغرافي غير مدعوم في هذا المتصفح", variant: "destructive" });
      return;
    }
    setGpsStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setGpsStatus("done");
      },
      () => {
        setGpsStatus("error");
        toast({ title: "تعذر تحديد الموقع", description: "أدخل العنوان يدوياً أدناه", variant: "destructive" });
      },
      { timeout: 10_000, maximumAge: 60_000, enableHighAccuracy: true },
    );
  }

  async function handleSave() {
    if (!id) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {
      city: city || undefined,
      district: district || undefined,
      street: street || undefined,
      latitude: lat ?? undefined,
      longitude: lng ?? undefined,
      locationAccuracy: lat != null ? "gps" : undefined,
    };
    try {
      await updateMutation.mutateAsync({ id, data });
      navigate(`/list/wizard/${id}/photos`);
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
        <button onClick={() => navigate(`/list/wizard/${id}/preview`)} type="button">
          <ArrowRight size={20} className="text-gray-600 rtl:rotate-180" />
        </button>
        <p className="font-semibold text-sm text-gray-900 flex-1">{t("wizard.locationTitle")}</p>
      </div>

      <WizardProgress currentStep={2} />

      <div className="flex-1 p-4 space-y-4 pb-24">
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t("wizard.gpsSection")}</p>

          <button
            type="button"
            onClick={handleGps}
            disabled={gpsStatus === "locating"}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-colors ${
              gpsStatus === "done"
                ? "border-green-400 bg-green-50 text-green-700"
                : gpsStatus === "error"
                  ? "border-red-300 bg-red-50 text-red-600"
                  : "border-primary/40 bg-primary/5 text-primary hover:border-primary"
            }`}
          >
            {gpsStatus === "done" ? (
              <CheckCircle2 size={20} className="shrink-0" />
            ) : gpsStatus === "locating" ? (
              <Navigation size={20} className="shrink-0 animate-pulse" />
            ) : (
              <MapPin size={20} className="shrink-0" />
            )}
            <div className="text-right flex-1">
              <p className="text-sm font-medium">
                {gpsStatus === "done"
                  ? t("wizard.locationSet")
                  : gpsStatus === "locating"
                    ? t("wizard.locating")
                    : t("wizard.useGps")}
              </p>
              {gpsStatus === "done" && lat != null && lng != null && (
                <p className="text-xs opacity-70 mt-0.5 font-mono">
                  {lat.toFixed(5)}, {lng.toFixed(5)}
                </p>
              )}
            </div>
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t("wizard.manualAddress")}</p>

          <div className="space-y-1">
            <label className="text-xs text-gray-500 font-medium">{t("wizard.city")}</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={inputCls}
              placeholder="عمان"
              dir="rtl"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-gray-500 font-medium">{t("wizard.district")}</label>
            <input
              type="text"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className={inputCls}
              placeholder="اسم الحي"
              dir="rtl"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-gray-500 font-medium">{t("wizard.street")}</label>
            <input
              type="text"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              className={inputCls}
              placeholder="اسم الشارع (اختياري)"
              dir="rtl"
            />
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center px-4">{t("wizard.locationHint")}</p>
      </div>

      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 px-4 py-3 safe-pb">
        <Button
          className="w-full gap-2"
          onClick={handleSave}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? t("wizard.saving") : t("wizard.nextPhotos")}
          <ChevronLeft size={16} className="rtl:rotate-180" />
        </Button>
      </div>
    </div>
  );
}
