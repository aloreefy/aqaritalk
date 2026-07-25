import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { MapPin, Bed, Bath, Maximize2, Heart, PhoneCall } from "lucide-react";
import type { Property } from "@workspace/api-client-react";

interface Props {
  property: Property;
  // Chat cards show the gated owner-contact CTA (docs/adr/0002); the home
  // grid keeps the compact card and reaches the same flow via the details page.
  showContactCta?: boolean;
}

export default function PropertyCard({ property, showContactCta }: Props) {
  const { t } = useTranslation();
  const [, navigate] = useLocation();

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
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden cursor-pointer hover:shadow-md active:scale-[0.99] transition-all">
        {/* Image */}
        <div className="h-44 bg-muted relative flex items-center justify-center">
          {property.images && property.images.length > 0 ? (
            <img
              src={property.images[0].path}
              alt={typeLabel}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-muted-foreground/40 text-4xl">🏠</div>
          )}
          {/* Transaction badge — top-start (right in RTL) */}
          <span className="absolute top-2 start-2 bg-primary/90 backdrop-blur-sm text-primary-foreground text-xs font-semibold px-2.5 py-1 rounded-lg">
            {txLabel}
          </span>
          {property.verified && (
            <span className="absolute top-2 end-2 bg-emerald-500 text-white text-[11px] font-semibold px-2 py-0.5 rounded-lg shadow-sm">
              ✓ موثّق
            </span>
          )}
        </div>

        {/* Info */}
        <div className="p-3 space-y-2">
          {/* Price + type on the start side, favorite on the end side */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">{typeLabel}</p>
              {priceDisplay && (
                <p className="font-bold text-lg text-foreground leading-tight">
                  {priceDisplay}
                </p>
              )}
            </div>
            <button
              type="button"
              aria-label="حفظ"
              onClick={(e) => e.preventDefault()}
              className="shrink-0 text-muted-foreground/60 hover:text-destructive transition-colors p-1 -m-1"
            >
              <Heart size={18} />
            </button>
          </div>

          {(property.city || property.district) && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin size={13} className="shrink-0" />
              <span className="truncate">
                {[property.district, property.city].filter(Boolean).join("، ")}
              </span>
            </div>
          )}

          {/* Gated owner-contact CTA — routes into the contact-release flow;
              the broker itself never reveals owner contact (docs/adr/0002) */}
          {showContactCta && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate(`/contact-release/${property.id}`);
              }}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-primary border border-primary/40 rounded-xl py-2 hover:bg-primary/5 transition-colors"
            >
              <PhoneCall size={13} />
              طلب التواصل مع المالك
            </button>
          )}

          {/* Attributes cluster with a top divider */}
          {(property.rooms != null ||
            property.bathrooms != null ||
            property.areaSqm != null) && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-border">
              {property.rooms != null && (
                <span className="flex items-center gap-1">
                  <Bed size={14} />
                  {property.rooms}
                </span>
              )}
              {property.bathrooms != null && (
                <span className="flex items-center gap-1">
                  <Bath size={14} />
                  {property.bathrooms}
                </span>
              )}
              {property.areaSqm != null && (
                <span className="flex items-center gap-1">
                  <Maximize2 size={14} />
                  {Number(property.areaSqm).toLocaleString()} م²
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
