import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { Search, SlidersHorizontal, List, Map, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useListProperties } from "@workspace/api-client-react";
import PropertyCard from "./PropertyCard";
import MapView from "@/components/map/MapView";

type FilterChip = { label: string; key: string };

const FILTER_CHIPS: FilterChip[] = [
  { label: "شقق", key: "apartment" },
  { label: "فلل", key: "villa" },
  { label: "للبيع", key: "sale" },
  { label: "للإيجار", key: "rent" },
  { label: "أراضي", key: "land" },
];

export default function HomePage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 31.9539, lng: 35.9106 });

  const { data, isLoading, refetch } = useListProperties({
    limit: 50,
    status: "active",
    ...(activeFilter === "sale" || activeFilter === "rent"
      ? { transactionMode: activeFilter }
      : activeFilter
        ? { propertyType: activeFilter as any }
        : {}),
    lat: mapCenter.lat,
    lng: mapCenter.lng,
    radiusKm: 30,
  });

  const properties = data?.items ?? [];

  const handleBoundsChange = useCallback(
    (center: { lat: number; lng: number }, _zoom: number) => {
      setMapCenter(center);
      refetch();
    },
    [refetch],
  );

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 pt-3 pb-2 space-y-2">
        {/* Search + filters button */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute top-1/2 -translate-y-1/2 start-3 text-gray-400"
            />
            <Input
              className="ps-9 h-10 text-sm bg-gray-50 border-gray-200"
              placeholder={t("home.searchPlaceholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              dir="auto"
            />
          </div>
          <Button variant="outline" size="icon" className="h-10 w-10 shrink-0">
            <SlidersHorizontal size={16} />
          </Button>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
          {FILTER_CHIPS.map((chip) => (
            <button
              key={chip.key}
              onClick={() =>
                setActiveFilter(activeFilter === chip.key ? null : chip.key)
              }
              className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                activeFilter === chip.key
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-gray-600 border-gray-200"
              }`}
              type="button"
            >
              {chip.label}
            </button>
          ))}

          {/* Spacer + view toggle */}
          <div className="flex-1" />
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === "list"
                  ? "bg-primary/10 text-primary"
                  : "text-gray-400"
              }`}
              type="button"
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setViewMode("map")}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === "map"
                  ? "bg-primary/10 text-primary"
                  : "text-gray-400"
              }`}
              type="button"
            >
              <Map size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden relative">
        {viewMode === "map" ? (
          <div className="absolute inset-0">
            <MapView
              properties={properties}
              onBoundsChange={handleBoundsChange}
            />
            {/* Floating property count */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-md text-xs font-medium text-gray-700">
              {isLoading
                ? "جاري البحث..."
                : `${properties.length} عقار${properties.length !== 1 ? "ات" : ""}`}
            </div>
          </div>
        ) : (
          <div className="h-full overflow-y-auto p-4 space-y-3">
            {isLoading && (
              <p className="text-center text-sm text-gray-400 py-8">
                {t("common.loading")}
              </p>
            )}
            {!isLoading && !properties.length && (
              <p className="text-center text-sm text-gray-400 py-8">
                {t("home.noResults")}
              </p>
            )}
            {properties.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        )}
      </div>

      {/* AI search FAB */}
      <button
        onClick={() => navigate("/chat/new?type=buyer_search")}
        className="fixed bottom-20 end-4 z-40 bg-primary text-white rounded-full w-14 h-14 flex items-center justify-center shadow-xl"
        type="button"
        aria-label="بحث بالذكاء الاصطناعي"
      >
        <MessageCircle size={22} />
      </button>
    </div>
  );
}
