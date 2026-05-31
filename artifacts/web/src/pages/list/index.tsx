import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { Plus, MessageSquare } from "lucide-react";
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
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center gap-4">
        <p className="text-gray-500 text-sm">{t("common.loginRequired")}</p>
        <Button onClick={() => navigate("/auth")}>{t("auth.sendCode")}</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">{t("list.title")}</h1>
        <Link href="/chat/new?type=seller_listing">
          <Button size="sm" className="gap-1.5">
            <Plus size={15} />
            {t("list.newListing")}
          </Button>
        </Link>
      </div>

      <div className="p-4 space-y-4">
        {/* CTA banner */}
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <MessageSquare size={20} className="text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-primary">{t("list.startChat")}</p>
            <p className="text-xs text-primary/70 mt-0.5">{t("list.chatSubtitle")}</p>
          </div>
        </div>

        {/* Listings */}
        {isLoading && (
          <p className="text-center text-sm text-gray-400 py-8">{t("common.loading")}</p>
        )}
        {!isLoading && !data?.items?.length && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm">{t("home.noResults")}</p>
          </div>
        )}
        {data?.items?.map((p) => (
          <PropertyStatusCard key={p.id} property={p} />
        ))}
      </div>
    </div>
  );
}
