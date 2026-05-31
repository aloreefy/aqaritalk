import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import type { Property } from "@workspace/api-client-react";

interface Props {
  property: Property;
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-500",
  pending_review: "bg-amber-100 text-amber-700",
  active: "bg-green-100 text-green-700",
  sold: "bg-blue-100 text-blue-700",
  rented: "bg-blue-100 text-blue-700",
  expired: "bg-gray-100 text-gray-500",
  rejected: "bg-red-100 text-red-600",
  deleted: "bg-gray-100 text-gray-400",
};

export default function PropertyStatusCard({ property }: Props) {
  const { t } = useTranslation();

  const typeLabel = t(`property.types.${property.propertyType}`, {
    defaultValue: property.propertyType,
  });
  const statusLabel = t(`property.status.${property.status}`, {
    defaultValue: property.status,
  });
  const statusClass = statusColors[property.status] ?? "bg-gray-100 text-gray-500";

  return (
    <Link href={`/property/${property.id}`}>
      <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-2 cursor-pointer hover:shadow-sm transition-shadow">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-sm text-gray-900">{typeLabel}</p>
            {(property.city || property.district) && (
              <p className="text-xs text-gray-500 mt-0.5">
                {[property.district, property.city].filter(Boolean).join("، ")}
              </p>
            )}
          </div>
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${statusClass}`}>
            {statusLabel}
          </span>
        </div>
        {property.price && (
          <p className="text-base font-bold text-gray-900">
            {Number(property.price).toLocaleString()} {property.priceCurrency}
          </p>
        )}
        {property.aiMissingFields && property.aiMissingFields.length > 0 && (
          <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            <p className="text-xs text-amber-700">
              💡 {property.aiMissingFields[0]}
            </p>
          </div>
        )}
      </div>
    </Link>
  );
}
