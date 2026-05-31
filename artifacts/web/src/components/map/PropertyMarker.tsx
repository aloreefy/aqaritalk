import { useState } from "react";
import { Marker, Popup } from "react-map-gl/mapbox";
import { useLocation } from "wouter";
import type { Property } from "@workspace/api-client-react";

interface Props {
  property: Property;
}

function formatPrice(price: number | null | undefined): string {
  if (!price) return "—";
  if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(1)}م`;
  if (price >= 1_000) return `${(price / 1_000).toFixed(0)}ك`;
  return String(price);
}

export default function PropertyMarker({ property }: Props) {
  const [, navigate] = useLocation();
  const [showPopup, setShowPopup] = useState(false);

  const lat = property.latitude;
  const lng = property.longitude;
  if (!lat || !lng) return null;

  return (
    <>
      <Marker
        latitude={lat}
        longitude={lng}
        anchor="bottom"
        onClick={(e) => {
          e.originalEvent.stopPropagation();
          setShowPopup(true);
        }}
      >
        <button
          className="bg-primary text-white text-xs font-bold px-2 py-1 rounded-full shadow-md
                     border-2 border-white whitespace-nowrap hover:scale-110 transition-transform"
          type="button"
        >
          {formatPrice(property.price)}
        </button>
      </Marker>

      {showPopup && (
        <Popup
          latitude={lat}
          longitude={lng}
          anchor="top"
          onClose={() => setShowPopup(false)}
          closeButton={false}
          maxWidth="240px"
        >
          <div
            className="bg-white rounded-xl overflow-hidden shadow-lg cursor-pointer"
            onClick={() => navigate(`/property/${property.id}`)}
            role="button"
            tabIndex={0}
          >
            {property.images?.[0] && (
              <img
                src={property.images[0].path}
                alt=""
                className="w-full h-28 object-cover"
              />
            )}
            <div className="p-2.5 text-right" dir="rtl">
              <p className="text-xs text-gray-500 truncate">
                {property.district ?? property.city}
              </p>
              <p className="font-bold text-sm text-gray-900">
                {formatPrice(property.price)} {property.priceCurrency ?? "JOD"}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {property.rooms != null && `${property.rooms} غرف · `}
                {property.areaSqm != null && `${property.areaSqm} م²`}
              </p>
            </div>
          </div>
        </Popup>
      )}
    </>
  );
}
