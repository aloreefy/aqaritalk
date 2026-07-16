import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  MapPin,
  Bed,
  Bath,
  Maximize2,
  Layers,
  Phone,
  Share2,
  Heart,
  Images,
  ArrowUpDown,
  SquareParking,
  Sofa,
  Tag,
  BadgeCheck,
  Building2,
  ChevronLeft,
} from "lucide-react";
import {
  useGetProperty,
  useGetContactReleaseByProperty,
  getGetContactReleaseByPropertyQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/contexts/auth";

export default function PropertyPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [descOpen, setDescOpen] = useState(false);

  const { data: property, isLoading } = useGetProperty(id);
  const { data: release } = useGetContactReleaseByProperty(id, {
    query: {
      enabled: isAuthenticated,
      queryKey: getGetContactReleaseByPropertyQueryKey(id),
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground text-sm">{t("common.loading")}</p>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground text-sm">{t("common.noData")}</p>
      </div>
    );
  }

  const typeLabel = t(`property.types.${property.propertyType}`, {
    defaultValue: property.propertyType,
  });
  const txLabel =
    property.transactionMode === "sale"
      ? t("property.sale")
      : property.transactionMode === "rent"
        ? t("property.rent")
        : t("property.lease");

  const isReleased = release && "status" in release && release.status === "released";
  const location = [property.district, property.city].filter(Boolean).join("، ");
  const images = property.images ?? [];

  // Spec tiles built from real fields
  const specs: { icon: React.ReactNode; value: string; label: string }[] = [];
  if (property.rooms != null)
    specs.push({ icon: <Bed size={22} />, value: String(property.rooms), label: "غرف" });
  if (property.bathrooms != null)
    specs.push({ icon: <Bath size={22} />, value: String(property.bathrooms), label: "حمامات" });
  if (property.areaSqm != null)
    specs.push({
      icon: <Maximize2 size={22} />,
      value: Number(property.areaSqm).toLocaleString(),
      label: "م²",
    });
  if (property.floorNumber != null)
    specs.push({ icon: <Layers size={22} />, value: String(property.floorNumber), label: "طابق" });

  // Feature chips built from real fields
  const features: { icon: React.ReactNode; label: string }[] = [];
  if (property.hasElevator) features.push({ icon: <ArrowUpDown size={18} />, label: "مصعد" });
  if (property.parking) features.push({ icon: <SquareParking size={18} />, label: "موقف سيارات" });
  if (property.furnishedStatus === "furnished")
    features.push({ icon: <Sofa size={18} />, label: "مفروش" });
  if (property.priceNegotiable) features.push({ icon: <Tag size={18} />, label: "قابل للتفاوض" });

  const onContact = () =>
    isAuthenticated ? navigate(`/contact-release/${id}`) : navigate("/auth");

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Hero image */}
      <div className="relative w-full h-[380px]">
        {images.length > 0 ? (
          <img src={images[0].path} alt={typeLabel} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center text-6xl">
            🏠
          </div>
        )}
        {/* gradient for legibility of the floating buttons */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 to-transparent pointer-events-none" />

        {/* Top actions */}
        <div className="absolute top-0 inset-x-0 px-4 pt-4 flex justify-between items-start">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="w-10 h-10 bg-background/80 backdrop-blur-md rounded-full flex items-center justify-center shadow-sm hover:bg-background transition-colors"
          >
            <ArrowRight size={20} className="text-foreground rtl:rotate-180" />
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              className="w-10 h-10 bg-background/80 backdrop-blur-md rounded-full flex items-center justify-center shadow-sm hover:bg-background transition-colors"
            >
              <Share2 size={18} className="text-foreground" />
            </button>
            <button
              type="button"
              className="w-10 h-10 bg-background/80 backdrop-blur-md rounded-full flex items-center justify-center shadow-sm hover:bg-background transition-colors"
            >
              <Heart size={18} className="text-foreground" />
            </button>
          </div>
        </div>

        {/* Gallery counter */}
        {images.length > 0 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs flex items-center gap-1">
            <Images size={14} />
            <span dir="ltr">1/{images.length}</span>
          </div>
        )}
      </div>

      {/* Content sheet */}
      <div className="relative -mt-5 bg-background rounded-t-3xl px-5 pt-6 z-10 shadow-[0_-8px_20px_rgba(0,0,0,0.05)] flex flex-col gap-6">
        {/* Header info */}
        <div>
          <div className="flex justify-between items-start mb-2">
            <span className="bg-primary/10 text-primary px-3 py-1 rounded-md text-xs font-medium">
              {txLabel}
            </span>
            {property.verified && (
              <span className="flex items-center gap-1 text-primary text-xs">
                <BadgeCheck size={15} />
                {t("property.verifiedListing")}
              </span>
            )}
          </div>
          {property.price != null && (
            <h1 className="font-bold text-3xl text-foreground mb-1 flex items-baseline gap-1" dir="rtl">
              {Number(property.price).toLocaleString()}
              <span className="text-xl font-medium text-muted-foreground">
                {property.priceCurrency}
              </span>
            </h1>
          )}
          <h2 className="font-semibold text-xl text-foreground mb-2">{typeLabel}</h2>
          {location && (
            <div className="flex items-center gap-1 text-muted-foreground text-sm">
              <MapPin size={18} />
              {location}
            </div>
          )}
        </div>

        {/* Spec tiles */}
        {specs.length > 0 && (
          <div
            className={`grid gap-3 ${
              specs.length >= 4
                ? "grid-cols-4"
                : specs.length === 3
                  ? "grid-cols-3"
                  : specs.length === 2
                    ? "grid-cols-2"
                    : "grid-cols-1"
            }`}
          >
            {specs.map((s, i) => (
              <div
                key={i}
                className="bg-card border border-border rounded-xl p-3 flex flex-col items-center justify-center text-center gap-1 shadow-sm"
              >
                <span className="text-primary">{s.icon}</span>
                <span className="font-bold text-foreground text-sm mt-1">{s.value}</span>
                <span className="text-muted-foreground text-[10px]">{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Released contact banner */}
        {isReleased && release.sellerPhone && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
            <p className="text-sm font-semibold text-primary mb-1">
              {t("contactRelease.released")}
            </p>
            <a
              href={`tel:${release.sellerPhone}`}
              className="flex items-center gap-2 text-sm text-primary"
            >
              <Phone size={14} />
              {release.sellerPhone}
            </a>
          </div>
        )}

        {/* Description */}
        {property.description && (
          <div>
            <hr className="border-border mb-5" />
            <h3 className="font-semibold text-lg text-foreground mb-3">
              {t("property.description")}
            </h3>
            <p
              className={`text-muted-foreground text-sm leading-relaxed ${
                descOpen ? "" : "line-clamp-3"
              }`}
              dir="auto"
            >
              {property.description}
            </p>
            <button
              type="button"
              onClick={() => setDescOpen((v) => !v)}
              className="text-primary font-medium text-sm mt-2 flex items-center gap-1"
            >
              {descOpen ? "عرض أقل" : "اقرأ المزيد"}
              <ChevronLeft
                size={16}
                className={`transition-transform ${descOpen ? "rotate-90" : "-rotate-90"}`}
              />
            </button>
          </div>
        )}

        {/* Features */}
        {features.length > 0 && (
          <div>
            <hr className="border-border mb-5" />
            <h3 className="font-semibold text-lg text-foreground mb-3">المميزات</h3>
            <div className="flex flex-wrap gap-2">
              {features.map((f, i) => (
                <div
                  key={i}
                  className="bg-secondary px-4 py-2 rounded-full text-foreground text-sm flex items-center gap-2"
                >
                  <span className="text-primary">{f.icon}</span>
                  {f.label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Location */}
        {location && (
          <div>
            <hr className="border-border mb-5" />
            <h3 className="font-semibold text-lg text-foreground mb-3">الموقع</h3>
            <div className="relative w-full h-40 rounded-xl overflow-hidden border border-border bg-muted flex items-center justify-center">
              <div className="flex flex-col items-center">
                <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium shadow-md mb-1 whitespace-nowrap">
                  {location}
                </div>
                <MapPin size={34} className="text-destructive drop-shadow-md" fill="currentColor" />
              </div>
            </div>
          </div>
        )}

        {/* Owner / agent card */}
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-secondary shrink-0 flex items-center justify-center text-primary">
            <Building2 size={22} />
          </div>
          <div className="min-w-0">
            <h4 className="font-semibold text-foreground flex items-center gap-1">
              {property.brokerListing ? "الوكيل العقاري" : "مالك العقار"}
              {property.verified && <BadgeCheck size={16} className="text-primary" />}
            </h4>
            <p className="text-muted-foreground text-sm">
              {property.brokerListing ? "وكيل عقاري معتمد" : "معلن على عقاري توك"}
            </p>
          </div>
        </div>
      </div>

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 inset-x-0 bg-background border-t border-border p-4 z-50 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
        <div className="max-w-4xl mx-auto flex gap-3">
          <button
            type="button"
            onClick={onContact}
            className="flex-1 bg-primary text-primary-foreground font-semibold text-base py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-transform hover:opacity-95"
          >
            {t("property.requestContact")}
          </button>
          {isReleased && release.sellerPhone ? (
            <a
              href={`tel:${release.sellerPhone}`}
              className="w-[120px] border-2 border-primary text-primary font-semibold text-base py-3 px-4 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            >
              <Phone size={20} />
              اتصال
            </a>
          ) : (
            <button
              type="button"
              onClick={onContact}
              className="w-[120px] border-2 border-primary text-primary font-semibold text-base py-3 px-4 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform hover:bg-primary/5"
            >
              <Phone size={20} />
              اتصال
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
