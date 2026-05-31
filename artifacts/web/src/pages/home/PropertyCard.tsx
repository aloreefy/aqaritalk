import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { MapPin, Bed, Bath, Maximize2 } from "lucide-react";
import type { Property } from "@workspace/api-client-react";

interface Props {
  property: Property;
}

export default function PropertyCard({ property }: Props) {
  const { t } = useTranslation();

  const typeLabel =
    t(`property.types.${property.propertyType}`, { defaultValue: property.propertyType });
  const txLabel =
    property.transactionMode === "sale"
      ? t("property.sale")
      : property.transactionMode === "rent"
        ? t("property.rent")
        : t("property.lease");

  const currency = property.priceCurrency ?? "JOD";
  const priceDisplay = property.price
    ? `${Number(property.price).toLocaleString()} ${currency}`
    : null;

  return (
    <Link href={`/property/${property.id}`}>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow">
        {/* Image placeholder */}
        <div className="h-44 bg-gray-100 relative flex items-center justify-center">
          {property.images && property.images.length > 0 ? (
            <img
              src={property.images[0].path}
              alt={typeLabel}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-gray-300 text-4xl">🏠</div>
          )}
          <span className="absolute top-2 start-2 bg-primary text-white text-xs font-semibold px-2 py-0.5 rounded">
            {txLabel}
          </span>
          {property.verified && (
            <span className="absolute top-2 end-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded">
              ✓
            </span>
          )}
        </div>

        {/* Info */}
        <div className="p-3 space-y-1.5">
          {priceDisplay && (
            <p className="font-bold text-lg text-gray-900">{priceDisplay}</p>
          )}
          <p className="text-sm font-medium text-gray-700">{typeLabel}</p>

          {(property.city || property.district) && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <MapPin size={12} />
              <span>
                {[property.district, property.city].filter(Boolean).join("، ")}
              </span>
            </div>
          )}

          <div className="flex items-center gap-3 text-xs text-gray-500 pt-0.5">
            {property.rooms != null && (
              <span className="flex items-center gap-0.5">
                <Bed size={12} />
                {property.rooms}
              </span>
            )}
            {property.bathrooms != null && (
              <span className="flex items-center gap-0.5">
                <Bath size={12} />
                {property.bathrooms}
              </span>
            )}
            {property.areaSqm != null && (
              <span className="flex items-center gap-0.5">
                <Maximize2 size={12} />
                {Number(property.areaSqm).toLocaleString()} م²
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
