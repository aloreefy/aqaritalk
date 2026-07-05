import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useListMyProperties, getListMyPropertiesQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/auth";
import PropertyStatusCard from "./PropertyStatusCard";

export default function ListPage() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { data, isLoading } = useListMyProperties(
    {},
    { query: { enabled: isAuthenticated, queryKey: getListMyPropertiesQueryKey({}) } },
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center gap-4 bg-background">
        <p className="text-muted-foreground text-sm">{t("common.loginRequired")}</p>
        <Button onClick={() => navigate("/auth")}>{t("auth.sendCode")}</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 h-16 flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">{t("list.title")}</h1>
        <Link href="/chat/new?type=seller_listing">
          <Button size="sm" className="gap-1.5 rounded-full">
            <Plus size={15} />
            {t("list.newListing")}
          </Button>
        </Link>
      </header>

      <div className="p-4 space-y-4">
        {/* AI CTA banner — Stitch emerald */}
        <Link href="/chat/new?type=seller_listing">
          <div className="relative overflow-hidden rounded-2xl bg-primary p-5 flex items-center gap-4 shadow-lg cursor-pointer active:scale-[0.99] transition-transform">
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 100% 100%, #ffffff 0, #ffffff 3px, transparent 3px)",
                backgroundSize: "20px 20px",
              }}
            />
            <div className="w-11 h-11 rounded-full bg-primary-foreground/20 flex items-center justify-center shrink-0 relative z-10">
              <Sparkles size={22} className="text-primary-foreground" />
            </div>
            <div className="flex-1 relative z-10">
              <p className="text-sm font-bold text-primary-foreground">{t("list.startChat")}</p>
              <p className="text-xs text-primary-foreground/80 mt-0.5">{t("list.chatSubtitle")}</p>
            </div>
          </div>
        </Link>

        {/* Listings */}
        {isLoading && (
          <p className="text-center text-sm text-muted-foreground py-8">{t("common.loading")}</p>
        )}
        {!isLoading && !data?.items?.length && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-sm">{t("home.noResults")}</p>
          </div>
        )}
        {data?.items?.map((p) => (
          <PropertyStatusCard key={p.id} property={p} />
        ))}
      </div>
    </div>
  );
}
