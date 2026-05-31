import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { ArrowRight, CheckCircle, AlertCircle, MapPin, Ruler, BedDouble, Bath, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGetProperty } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import WizardProgress from "./WizardProgress";

function MissingAlert({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
      <AlertCircle size={13} className="shrink-0" />
      {message}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}

export default function WizardStep4Review() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  const { toast } = useToast();

  const { data: property, isLoading } = useGetProperty(id ?? "");
  const [publishing, setPublishing] = useState(false);

  async function handlePublish() {
    if (!id) return;
    setPublishing(true);
    const token = localStorage.getItem("aqari_token");
    try {
      const res = await fetch(`/api/properties/${id}/publish`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token ?? ""}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "فشل نشر الإعلان");
      }
      toast({
        title: t("wizard.publishedTitle"),
        description: t("wizard.publishedDesc"),
      });
      navigate(`/property/${id}`);
    } catch (err: unknown) {
      toast({
        title: t("common.error"),
        description: err instanceof Error ? err.message : t("common.retry"),
        variant: "destructive",
      });
    } finally {
      setPublishing(false);
    }
  }

  if (isLoading || !property) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-400 text-sm">{t("common.loading")}</p>
      </div>
    );
  }

  const missing: string[] = [];
  if (!property.price) missing.push(t("wizard.noPrice"));
  if (!property.city && !property.latitude) missing.push(t("wizard.noLocation"));
  if (!property.areaSqm) missing.push(t("wizard.noArea"));
  const hasPhotos = (property.images?.length ?? 0) > 0;
  if (!hasPhotos) missing.push(t("wizard.noPhotos"));

  const typeLabel = t(`property.types.${property.propertyType}`, { defaultValue: property.propertyType ?? "" });
  const txLabel =
    property.transactionMode === "sale"
      ? t("property.sale")
      : property.transactionMode === "rent"
        ? t("property.rent")
        : t("property.lease");

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(`/list/wizard/${id}/photos`)} type="button">
          <ArrowRight size={20} className="text-gray-600 rtl:rotate-180" />
        </button>
        <p className="font-semibold text-sm text-gray-900 flex-1">{t("wizard.reviewTitle")}</p>
      </div>

      <WizardProgress currentStep={4} />

      <div className="flex-1 p-4 space-y-4 pb-32">
        {missing.length > 0 && (
          <div className="bg-white rounded-xl border border-amber-200 p-4 space-y-2">
            <p className="text-xs font-semibold text-amber-700 mb-2">{t("wizard.missingFields")}</p>
            {missing.map((m) => (
              <MissingAlert key={m} message={m} />
            ))}
          </div>
        )}

        {hasPhotos && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {property.images?.slice(0, 5).map((img) => (
              <div key={img.id} className="w-28 h-20 shrink-0 rounded-lg overflow-hidden bg-gray-100">
                <img src={img.path} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
            {(property.images?.length ?? 0) > 5 && (
              <div className="w-28 h-20 shrink-0 rounded-lg bg-gray-100 flex items-center justify-center text-sm text-gray-500 font-medium">
                +{(property.images?.length ?? 0) - 5}
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-1">
          <div className="flex items-center justify-between mb-3">
            <p className="font-bold text-gray-900 text-base">{typeLabel}</p>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              property.transactionMode === "sale" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
            }`}>
              {txLabel}
            </span>
          </div>

          {property.price && (
            <p className="text-xl font-bold text-primary pb-2">
              {Number(property.price).toLocaleString()} {property.priceCurrency}
            </p>
          )}

          {(property.city || property.district) && (
            <div className="flex items-center gap-1.5 text-gray-500 text-sm pb-2">
              <MapPin size={13} />
              {[property.district, property.city].filter(Boolean).join("، ")}
            </div>
          )}

          <div className="grid grid-cols-2 gap-1 pt-2">
            {property.areaSqm != null && (
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <Ruler size={12} className="text-gray-400" />
                {property.areaSqm} م²
              </div>
            )}
            {property.rooms != null && (
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <BedDouble size={12} className="text-gray-400" />
                {property.rooms} {t("wizard.roomsLabel")}
              </div>
            )}
            {property.bathrooms != null && (
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <Bath size={12} className="text-gray-400" />
                {property.bathrooms} {t("wizard.bathroomsLabel")}
              </div>
            )}
            {property.parking && (
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <Car size={12} className="text-gray-400" />
                {t("property.parking")}
              </div>
            )}
          </div>

          {property.furnishedStatus && (
            <div className="pt-2">
              <InfoRow
                label={t("wizard.furnished")}
                value={
                  property.furnishedStatus === "furnished"
                    ? t("property.furnished")
                    : property.furnishedStatus === "semi_furnished"
                      ? t("property.semiFurnished")
                      : t("property.unfurnished")
                }
              />
            </div>
          )}
        </div>

        {property.description && (
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs font-semibold text-gray-500 mb-2">{t("property.description")}</p>
            <p className="text-sm text-gray-700 leading-relaxed" dir="rtl">{property.description}</p>
          </div>
        )}

        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
          <p className="text-xs text-primary/80 text-center">{t("wizard.publishHint")}</p>
        </div>
      </div>

      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 px-4 py-3 safe-pb space-y-2">
        <Button
          className="w-full gap-2 bg-green-600 hover:bg-green-700"
          onClick={handlePublish}
          disabled={publishing}
        >
          <CheckCircle size={16} />
          {publishing ? t("wizard.publishing") : t("wizard.publish")}
        </Button>
        <button
          type="button"
          onClick={() => navigate(`/list/wizard/${id}/preview`)}
          className="w-full text-xs text-gray-400 py-1"
        >
          {t("wizard.editMore")}
        </button>
      </div>
    </div>
  );
}
