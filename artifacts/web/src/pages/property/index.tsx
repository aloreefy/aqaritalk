import { useParams, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { ArrowRight, MapPin, Bed, Bath, Maximize2, Phone, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  const { data: property, isLoading } = useGetProperty(id);
  const { data: release } = useGetContactReleaseByProperty(id, {
    query: {
      enabled: isAuthenticated,
      queryKey: getGetContactReleaseByPropertyQueryKey(id),
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">{t("common.loading")}</p>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">{t("common.noData")}</p>
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

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => window.history.back()} type="button">
          <ArrowRight size={20} className="text-gray-600 rtl:rotate-180" />
        </button>
        <h1 className="flex-1 font-semibold text-sm text-gray-900 truncate">{typeLabel}</h1>
        <button type="button">
          <Share2 size={18} className="text-gray-500" />
        </button>
      </div>

      {/* Images */}
      <div className="h-56 bg-gray-100 flex items-center justify-center overflow-hidden">
        {property.images && property.images.length > 0 ? (
          <img
            src={property.images[0].path}
            alt={typeLabel}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-6xl">🏠</span>
        )}
      </div>

      <div className="p-4 space-y-5">
        {/* Price + badges */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-primary text-white text-xs font-semibold px-2.5 py-1 rounded-full">
              {txLabel}
            </span>
            {property.verified && (
              <span className="bg-green-100 text-green-700 text-xs px-2.5 py-1 rounded-full">
                ✓ {t("property.verifiedListing")}
              </span>
            )}
          </div>
          {property.price && (
            <p className="text-2xl font-bold text-gray-900">
              {Number(property.price).toLocaleString()}{" "}
              <span className="text-base font-normal text-gray-500">
                {property.priceCurrency}
              </span>
            </p>
          )}
          {property.priceNegotiable && (
            <p className="text-xs text-gray-500">{t("property.negotiable")}</p>
          )}
        </div>

        {/* Type + Location */}
        <div className="space-y-1">
          <p className="font-semibold text-gray-800">{typeLabel}</p>
          {(property.city || property.district) && (
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <MapPin size={14} />
              <span>
                {[property.district, property.city].filter(Boolean).join("، ")}
              </span>
            </div>
          )}
        </div>

        {/* Key stats */}
        <div className="grid grid-cols-3 gap-3">
          {property.rooms != null && (
            <Stat icon={<Bed size={18} />} label={t("property.bedrooms", { count: property.rooms })} />
          )}
          {property.bathrooms != null && (
            <Stat icon={<Bath size={18} />} label={t("property.bathrooms", { count: property.bathrooms })} />
          )}
          {property.areaSqm != null && (
            <Stat icon={<Maximize2 size={18} />} label={t("property.area", { size: Number(property.areaSqm).toLocaleString() })} />
          )}
        </div>

        {/* Description */}
        {property.description && (
          <div className="space-y-2">
            <p className="font-semibold text-sm text-gray-900">{t("property.description")}</p>
            <p className="text-sm text-gray-600 leading-relaxed" dir="auto">
              {property.description}
            </p>
          </div>
        )}

        {/* Contact CTA */}
        <div className="pb-4">
          {isReleased ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-green-700 mb-1">
                {t("contactRelease.released")}
              </p>
              {release.sellerPhone && (
                <a
                  href={`tel:${release.sellerPhone}`}
                  className="flex items-center gap-2 text-sm text-green-700"
                >
                  <Phone size={14} />
                  {release.sellerPhone}
                </a>
              )}
            </div>
          ) : (
            <Button
              className="w-full h-12 text-base"
              onClick={() =>
                isAuthenticated
                  ? navigate(`/contact-release/${id}`)
                  : navigate("/auth")
              }
            >
              {t("property.requestContact")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3 flex flex-col items-center gap-1.5">
      <span className="text-primary">{icon}</span>
      <span className="text-xs text-gray-600 text-center">{label}</span>
    </div>
  );
}
