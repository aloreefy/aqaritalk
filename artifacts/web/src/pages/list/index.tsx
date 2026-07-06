import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import {
  useGetAdminStats,
  useAdminListUsers,
  useAdminListProperties,
  useAdminUpdateUser,
  useAdminUpdatePropertyStatus,
} from "@workspace/api-client-react";
import { useAuth } from "@/contexts/auth";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { getAdminListPropertiesQueryKey, getAdminListUsersQueryKey } from "@workspace/api-client-react";

type Tab = "stats" | "users" | "properties";

export default function AdminPage() {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<Tab>("stats");

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center gap-4">
        <p className="text-gray-500 text-sm">{t("common.loginRequired")}</p>
        <Button onClick={() => navigate("/auth")}>{t("auth.sendCode")}</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-4">
        <h1 className="text-lg font-bold text-gray-900">{t("admin.title")}</h1>
        <div className="flex gap-1 mt-3">
          {(["stats", "users", "properties"] as Tab[]).map((t2) => (
            <button
              key={t2}
              type="button"
              onClick={() => setTab(t2)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                tab === t2
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {t(`admin.${t2}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        {tab === "stats" && <StatsTab />}
        {tab === "users" && <UsersTab />}
        {tab === "properties" && <PropertiesTab />}
      </div>
    </div>
  );
}

function StatsTab() {
  const { t } = useTranslation();
  const { data, isLoading } = useGetAdminStats();

  if (isLoading)
    return <p className="text-center text-sm text-gray-400 py-8">{t("common.loading")}</p>;

  return (
    <div className="grid grid-cols-2 gap-3">
      <StatCard label={t("admin.totalUsers")} value={data?.totalUsers ?? 0} color="text-blue-600" />
      <StatCard label={t("admin.activeListings")} value={data?.activeListings ?? 0} color="text-green-600" />
      <StatCard label={t("admin.contactsThisMonth")} value={data?.contactReleasesThisMonth ?? 0} color="text-purple-600" />
      <StatCard label={t("admin.pendingReview")} value={data?.pendingReview ?? 0} color="text-amber-600" />
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <p className={`text-3xl font-bold ${color}`}>{value.toLocaleString()}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}

function UsersTab() {
  const { t } = useTranslation();
  const { data, isLoading } = useAdminListUsers();
  const updateUser = useAdminUpdateUser();
  const queryClient = useQueryClient();

  async function handleSuspend(id: string, currentStatus: string) {
    const newStatus = currentStatus === "active" ? "suspended" : "active";
    await updateUser.mutateAsync({ id, data: { status: newStatus as "active" | "suspended" } });
    queryClient.invalidateQueries({ queryKey: getAdminListUsersQueryKey() });
  }

  if (isLoading)
    return <p className="text-center text-sm text-gray-400 py-8">{t("common.loading")}</p>;

  return (
    <div className="space-y-2">
      {data?.map((u) => (
        <div key={u.id} className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium text-sm text-gray-900">{u.name ?? "—"}</p>
              <p className="text-xs text-gray-500 dir-ltr">{u.phone}</p>
              <p className="text-xs text-gray-400">{u.role}</p>
            </div>
            <div className="flex flex-col gap-1 items-end">
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full ${
                  u.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                }`}
              >
                {u.status}
              </span>
              <button
                type="button"
                onClick={() => handleSuspend(u.id, u.status)}
                className="text-[11px] text-primary underline"
              >
                {u.status === "active" ? t("admin.suspend") : t("admin.activate")}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PropertiesTab() {
  const { t } = useTranslation();
  const { data, isLoading } = useAdminListProperties({ status: "pending_review" });
  const updateStatus = useAdminUpdatePropertyStatus();
  const queryClient = useQueryClient();

  async function handle(id: string, status: "active" | "rejected") {
    await updateStatus.mutateAsync({ id, data: { status } });
    queryClient.invalidateQueries({ queryKey: getAdminListPropertiesQueryKey() });
  }

  if (isLoading)
    return <p className="text-center text-sm text-gray-400 py-8">{t("common.loading")}</p>;

  return (
    <div className="space-y-2">
      {!data?.items?.length && (
        <p className="text-center text-sm text-gray-400 py-8">{t("common.noData")}</p>
      )}
      {data?.items?.map((p) => (
        <div key={p.id} className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="font-medium text-sm text-gray-900">
              {t(`property.types.${p.propertyType}`, { defaultValue: p.propertyType })}
            </p>
            <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
              {t("property.status.pending_review")}
            </span>
          </div>
          {(p.city || p.district) && (
            <p className="text-xs text-gray-500">
              {[p.district, p.city].filter(Boolean).join("، ")}
            </p>
          )}
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              className="flex-1 h-8 text-xs"
              onClick={() => handle(p.id, "active")}
            >
              {t("admin.approve")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-8 text-xs text-red-600 border-red-200"
              onClick={() => handle(p.id, "rejected")}
            >
              {t("admin.reject")}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
