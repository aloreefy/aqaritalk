import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import {
  Search,
  SlidersHorizontal,
  Mic,
  List,
  Map,
  Bot,
  ArrowLeft,
  MapPin,
  ChevronDown,
  Bell,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useListProperties, useGetAppSettings } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/auth";
import PropertyCard from "./PropertyCard";
import MapView from "@/components/map/MapView";

type FilterChip = { label: string; key: string };

const FILTER_CHIPS: FilterChip[] = [
  { label: "الكل", key: "" },
  { label: "شقق", key: "apartment" },
  { label: "فلل", key: "villa" },
  { label: "للبيع", key: "sale" },
  { label: "للإيجار", key: "rent" },
  { label: "أراضي", key: "land" },
];

export default function HomePage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("");
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

  const { data: appSettings } = useGetAppSettings();
  const voiceCta = appSettings?.voiceCtaStyle ?? "green_card";

  const goToAi = () => navigate("/chat/new?type=buyer_search");
  const firstName = user?.name?.split(" ")[0];

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* Greeting header — Stitch style */}
      <header className="shrink-0 bg-card border-b border-border px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary/30 bg-secondary flex items-center justify-center text-primary shrink-0">
            {user?.name ? (
              <span className="font-bold text-sm">{user.name.charAt(0)}</span>
            ) : (
              <span className="text-lg">👤</span>
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground text-xs">
              {firstName ? `مرحباً، ${firstName}` : "مرحباً بك"}
            </span>
            <div className="flex items-center gap-1 text-foreground">
              <MapPin size={14} className="text-primary" fill="currentColor" />
              <span className="font-semibold text-sm">عمّان، الأردن</span>
              <ChevronDown size={14} className="text-muted-foreground" />
            </div>
          </div>
        </div>
        <button
          type="button"
          className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors relative"
          aria-label={t("nav.notifications", { defaultValue: "الإشعارات" })}
        >
          <Bell size={20} />
          <span className="absolute top-2 end-2 w-2 h-2 bg-destructive rounded-full" />
        </button>
      </header>

      {/* Scroll area */}
      <div className="flex-1 overflow-y-auto">
        {/* Search */}
        <div className="px-4 pt-4">
          <div className="relative">
            <Search
              size={18}
              className="absolute top-1/2 -translate-y-1/2 start-4 text-muted-foreground pointer-events-none"
            />
            <Input
              className="ps-11 pe-24 h-12 text-sm bg-card border-border rounded-2xl shadow-sm"
              placeholder={t("home.searchPlaceholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              dir="auto"
            />
            <div className="absolute inset-y-0 end-2 flex items-center gap-1">
              <button
                type="button"
                onClick={goToAi}
                aria-label="بحث صوتي"
                className="p-2 rounded-xl text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
              >
                <Mic size={18} />
              </button>
              <button
                type="button"
                aria-label="فلترة"
                className="p-2 rounded-xl text-muted-foreground hover:bg-muted transition-colors"
              >
                <SlidersHorizontal size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Category chips */}
        <div className="mt-4 overflow-x-auto scrollbar-none px-4">
          <div className="flex items-center gap-2 min-w-max pb-1">
            {FILTER_CHIPS.map((chip) => {
              const active = activeFilter === chip.key;
              return (
                <button
                  key={chip.key || "all"}
                  onClick={() => setActiveFilter(chip.key)}
                  type="button"
                  className={`shrink-0 px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                    active
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-card text-foreground border border-border hover:bg-muted"
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Voice CTA — rendered style controlled from admin settings ── */}

        {voiceCta === "green_card" && (
          <div className="px-4 mt-5">
            <button
              type="button"
              onClick={goToAi}
              className="w-full text-start relative overflow-hidden rounded-3xl bg-primary shadow-lg group active:scale-[0.99] transition-transform"
            >
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 100% 100%, #ffffff 0, #ffffff 3px, transparent 3px)",
                  backgroundSize: "20px 20px",
                }}
              />
              <div className="relative z-10 p-6 flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 text-primary-foreground/80">
                    <Bot size={18} />
                    <span className="font-bold text-xs tracking-widest">الذكاء الاصطناعي</span>
                  </div>
                  <h2 className="text-primary-foreground font-extrabold text-xl mb-1">
                    تحدث مع وكيلك العقاري الذكي
                  </h2>
                  <p className="text-primary-foreground/80 text-sm">
                    صِف ما تبحث عنه بالصوت أو النص، وسأجد لك الأنسب فوراً.
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-primary-foreground text-primary flex items-center justify-center shrink-0 shadow-md group-hover:scale-110 transition-transform">
                  <ArrowLeft size={22} className="rtl:rotate-180" />
                </div>
              </div>
            </button>
          </div>
        )}

        {voiceCta === "orb" && (
          <div className="px-4 mt-5">
            <button
              type="button"
              onClick={goToAi}
              className="w-full rounded-3xl overflow-hidden active:scale-[0.98] transition-transform"
              style={{ background: "linear-gradient(160deg, #0d1a12 0%, #0a1a0e 100%)" }}
            >
              <div className="flex flex-col items-center py-10 px-6">
                <div className="relative flex items-center justify-center w-32 h-32">
                  <div className="voice-ring" />
                  <div className="voice-ring voice-ring-2" />
                  <div className="voice-ring voice-ring-3" />
                  <div
                    className="voice-orb relative z-10 w-32 h-32 rounded-full flex items-center justify-center"
                    style={{
                      background: "radial-gradient(circle at 35% 35%, hsl(var(--primary)), hsl(var(--primary) / 0.55))",
                      boxShadow: "0 0 48px 12px hsl(var(--primary) / 0.35)",
                    }}
                  >
                    <Mic size={38} className="text-white" strokeWidth={1.75} />
                  </div>
                </div>
                <p className="mt-6 text-white font-extrabold text-2xl tracking-tight">كلّمني</p>
                <p className="mt-1.5 text-white/50 text-sm">ابحث عن عقارك بصوتك</p>
              </div>
            </button>
          </div>
        )}

        {voiceCta === "waveform" && (
          <div className="px-4 mt-5">
            <button
              type="button"
              onClick={goToAi}
              className="w-full rounded-3xl bg-card border border-border overflow-hidden active:scale-[0.98] transition-transform"
            >
              <div className="px-6 pt-6 pb-5">
                <p className="text-center font-extrabold text-foreground text-xl mb-1">
                  اسألني عن أي عقار
                </p>
                <p className="text-center text-muted-foreground text-sm mb-5">
                  اضغط وتحدث — أنا هنا أستمع
                </p>
                <div className="flex items-end justify-center gap-[3.5px] h-12 px-2">
                  {Array.from({ length: 36 }).map((_, i) => (
                    <div
                      key={i}
                      className="waveform-bar"
                      style={{
                        animationDelay: `${((i * 1.1) / 36).toFixed(3)}s`,
                        animationDuration: `${0.9 + (i % 5) * 0.08}s`,
                        opacity: 0.4 + 0.6 * Math.abs(Math.sin((i / 36) * Math.PI)),
                      }}
                    />
                  ))}
                </div>
              </div>
            </button>
          </div>
        )}

        {voiceCta === "sonar" && (
          <div className="px-4 mt-5">
            <button
              type="button"
              onClick={goToAi}
              className="w-full rounded-3xl bg-card border border-border overflow-hidden active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-6 px-6 py-7">
                <div className="relative flex items-center justify-center w-16 h-16 shrink-0">
                  <div className="radar-ring" />
                  <div className="radar-ring radar-ring-2" />
                  <div className="radar-ring radar-ring-3" />
                  <div className="radar-ring radar-ring-4" />
                  <div className="relative z-10 w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                    <Mic size={26} className="text-primary" strokeWidth={1.75} />
                  </div>
                </div>
                <div className="flex-1 text-start">
                  <p className="font-extrabold text-foreground text-lg leading-snug">تحدّث، أنا أسمعك</p>
                  <p className="text-muted-foreground text-sm mt-1">صِف عقارك بكلماتك، وسأجد الأنسب</p>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Section header + view toggle */}
        <div className="px-4 mt-6 flex items-center justify-between">
          <h3 className="font-bold text-lg text-foreground">عقارات مميزة</h3>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setViewMode("list")}
              type="button"
              aria-label="قائمة"
              className={`p-2 rounded-lg transition-colors ${
                viewMode === "list" ? "bg-primary/10 text-primary" : "text-muted-foreground"
              }`}
            >
              <List size={18} />
            </button>
            <button
              onClick={() => setViewMode("map")}
              type="button"
              aria-label="خريطة"
              className={`p-2 rounded-lg transition-colors ${
                viewMode === "map" ? "bg-primary/10 text-primary" : "text-muted-foreground"
              }`}
            >
              <Map size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        {viewMode === "map" ? (
          <div className="mx-4 mt-3 mb-6 relative h-[60vh] rounded-3xl overflow-hidden border border-border">
            <MapView properties={properties} onBoundsChange={handleBoundsChange} />
            <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-md text-xs font-medium text-foreground">
              {isLoading
                ? "جاري البحث..."
                : `${properties.length} عقار${properties.length !== 1 ? "ات" : ""}`}
            </div>
          </div>
        ) : (
          <div className="px-4 mt-3 pb-6 space-y-4">
            {isLoading && (
              <p className="text-center text-sm text-muted-foreground py-8">
                {t("common.loading")}
              </p>
            )}
            {!isLoading && !properties.length && (
              <p className="text-center text-sm text-muted-foreground py-8">
                {t("home.noResults")}
              </p>
            )}
            {properties.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
