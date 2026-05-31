import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, MapPin, SlidersHorizontal, List, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useListProperties } from "@workspace/api-client-react";
import PropertyCard from "./PropertyCard";

export default function HomePage() {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [query, setQuery] = useState("");

  const { data, isLoading } = useListProperties({ limit: 20, status: "active" });

  return (
    <div className="flex flex-col h-screen">
      {/* Search bar */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 space-y-2">
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
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs gap-1 h-7 text-primary"
          >
            <MapPin size={12} />
            {t("home.nearMe")}
          </Button>
          <div className="flex-1" />
          <button
            onClick={() => setViewMode("list")}
            className={`p-1.5 rounded ${viewMode === "list" ? "bg-primary/10 text-primary" : "text-gray-400"}`}
          >
            <List size={16} />
          </button>
          <button
            onClick={() => setViewMode("map")}
            className={`p-1.5 rounded ${viewMode === "map" ? "bg-primary/10 text-primary" : "text-gray-400"}`}
          >
            <Map size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {viewMode === "map" ? (
          <MapPlaceholder />
        ) : (
          <div className="p-4 space-y-3">
            {isLoading && (
              <p className="text-center text-sm text-gray-400 py-8">
                {t("common.loading")}
              </p>
            )}
            {!isLoading && !data?.items?.length && (
              <p className="text-center text-sm text-gray-400 py-8">
                {t("home.noResults")}
              </p>
            )}
            {data?.items?.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MapPlaceholder() {
  const { t } = useTranslation();
  return (
    <div className="h-full min-h-[400px] bg-gray-200 flex items-center justify-center">
      <div className="text-center text-gray-500">
        <MapPin size={40} className="mx-auto mb-2 opacity-40" />
        <p className="text-sm">{t("home.loading")}</p>
        <p className="text-xs text-gray-400 mt-1">Mapbox — Phase 3</p>
      </div>
    </div>
  );
}
