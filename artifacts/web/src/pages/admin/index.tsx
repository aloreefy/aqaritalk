import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import {
  useGetAdminStats,
  useAdminListUsers,
  useAdminListProperties,
  useAdminUpdateUser,
  useAdminUpdatePropertyStatus,
  useGetAdminSettings,
  useUpdateAdminSettings,
  getAdminListUsersQueryKey,
  getAdminListPropertiesQueryKey,
  getGetAdminSettingsQueryKey,
  type Property,
  type User,
  type SystemSettingsUpdate,
} from "@workspace/api-client-react";
import { useAuth } from "@/contexts/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Building2,
  Handshake,
  Clock,
  ArrowLeft,
  ArrowRight,
  MapPin,
  Bed,
  Bath,
  Maximize2,
  CheckCircle2,
  XCircle,
  Settings as SettingsIcon,
} from "lucide-react";

type Tab = "stats" | "users" | "properties" | "settings";

const formatDate = (dateString?: string | null, locale = "en") => {
  if (!dateString) return "—";
  try {
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(dateString));
  } catch (e) {
    return dateString;
  }
};

export default function AdminPage() {
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<Tab>("stats");

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-dvh max-w-md mx-auto flex flex-col items-center justify-center p-8 text-center gap-4 bg-background border-x border-border shadow-sm">
        <p className="text-muted-foreground text-sm">{t("common.loginRequired")}</p>
        <Button onClick={() => navigate("/auth")}>{t("auth.sendCode")}</Button>
      </div>
    );
  }

  const isRTL = i18n.language === "ar";
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div className="min-h-dvh max-w-md mx-auto bg-muted/10 shadow-sm border-x border-border flex flex-col">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-background border-b border-border shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold text-foreground tracking-tight">{t("admin.title")}</h1>
          <button
            onClick={() => navigate("/")}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95 transition-all"
            aria-label={t("admin.backToApp")}
          >
            <BackIcon size={18} />
          </button>
        </div>

        {/* Tabs Segmented Control */}
        <div className="px-4 pb-3">
          <div className="flex bg-muted/50 p-1 rounded-xl">
            {(["stats", "users", "properties", "settings"] as Tab[]).map((t2) => (
              <button
                key={t2}
                onClick={() => setTab(t2)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  tab === t2
                    ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t(`admin.${t2}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content Area */}
      <div className="flex-1 overflow-y-auto pb-20 relative">
        {tab === "stats" && <StatsTab onReviewNow={() => setTab("properties")} />}
        {tab === "users" && <UsersTab />}
        {tab === "properties" && <PropertiesTab />}
        {tab === "settings" && <SettingsTab />}
      </div>
    </div>
  );
}

function StatsTab({ onReviewNow }: { onReviewNow: () => void }) {
  const { t, i18n } = useTranslation();
  const { data, isLoading } = useGetAdminStats();
  const isRTL = i18n.language === "ar";

  if (isLoading)
    return <p className="text-center text-sm text-muted-foreground py-12">{t("common.loading")}</p>;

  const ReviewIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <div className="p-4 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label={t("admin.totalUsers")}
          value={data?.totalUsers ?? 0}
          icon={<Users size={20} className="text-blue-500" />}
          bgClass="bg-blue-50/50 dark:bg-blue-500/10 border-blue-100/50 dark:border-blue-500/20"
        />
        <StatCard
          label={t("admin.activeListings")}
          value={data?.activeListings ?? 0}
          icon={<Building2 size={20} className="text-emerald-500" />}
          bgClass="bg-emerald-50/50 dark:bg-emerald-500/10 border-emerald-100/50 dark:border-emerald-500/20"
        />
        <StatCard
          label={t("admin.contactsThisMonth")}
          value={data?.contactReleasesThisMonth ?? 0}
          icon={<Handshake size={20} className="text-purple-500" />}
          bgClass="bg-purple-50/50 dark:bg-purple-500/10 border-purple-100/50 dark:border-purple-500/20"
        />
        <StatCard
          label={t("admin.pendingReview")}
          value={data?.pendingReview ?? 0}
          icon={<Clock size={20} className="text-amber-500" />}
          bgClass="bg-amber-50/50 dark:bg-amber-500/10 border-amber-100/50 dark:border-amber-500/20"
        />
      </div>

      {(data?.pendingReview ?? 0) > 0 && (
        <button
          onClick={onReviewNow}
          className="w-full mt-2 flex items-center justify-between bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 p-4 rounded-xl border border-amber-200/50 dark:border-amber-500/20 active:scale-[0.98] transition-transform hover:bg-amber-100/80 dark:hover:bg-amber-500/20 shadow-sm"
        >
          <span className="font-bold text-sm tracking-tight">{t("admin.reviewNow")}</span>
          <ReviewIcon className="w-5 h-5 opacity-80" />
        </button>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  bgClass,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  bgClass: string;
}) {
  return (
    <div className={`p-4 rounded-2xl border flex flex-col gap-4 ${bgClass}`}>
      <div className="flex justify-between items-start">
        <span className="bg-background p-2 rounded-xl shadow-sm border border-border/50">
          {icon}
        </span>
      </div>
      <div>
        <p className="text-3xl font-black text-foreground tracking-tight">{value.toLocaleString()}</p>
        <p className="text-xs font-semibold text-muted-foreground/80 mt-1">{label}</p>
      </div>
    </div>
  );
}

function UsersTab() {
  const { t, i18n } = useTranslation();
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const { data, isLoading } = useAdminListUsers();
  const queryClient = useQueryClient();
  const updateUser = useAdminUpdateUser();

  const users = data?.filter((u) => roleFilter === "all" || u.role === roleFilter) || [];

  const handleStatusToggle = (user: User) => {
    const newStatus = user.status === "active" ? "suspended" : "active";
    updateUser.mutate(
      { id: user.id, data: { status: newStatus as any } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getAdminListUsersQueryKey() });
        },
      }
    );
  };

  const handleRoleChange = (userId: string, newRole: string) => {
    updateUser.mutate(
      { id: userId, data: { role: newRole as any } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getAdminListUsersQueryKey() });
        },
      }
    );
  };

  if (isLoading)
    return <p className="text-center text-sm text-muted-foreground py-12">{t("common.loading")}</p>;

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      {/* Filter Row */}
      <div className="py-3 border-b border-border/50 bg-background/95 backdrop-blur-sm sticky top-0 z-10 overflow-x-auto no-scrollbar">
        <div className="flex gap-2 w-max px-4">
          {["all", "buyer", "seller", "broker", "admin"].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                roleFilter === r
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted border border-border"
              }`}
            >
              {r === "all" ? t("admin.allRoles") : t(`auth.role${r.charAt(0).toUpperCase() + r.slice(1)}`, { defaultValue: r })}
            </button>
          ))}
        </div>
      </div>

      {/* User List */}
      <div className="p-4 space-y-3">
        {users.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8 bg-card rounded-xl border border-border border-dashed">{t("admin.noUsers")}</p>
        ) : (
          users.map((u) => (
            <div key={u.id} className="bg-card rounded-xl border border-border shadow-sm flex flex-col overflow-hidden">
              <div className="p-3.5 flex justify-between items-start gap-3">
                <div className="flex flex-col gap-1">
                  <p className="font-bold text-sm text-foreground">{u.name || "—"}</p>
                  <p className="text-xs font-medium text-muted-foreground w-fit" dir="ltr">{u.phone}</p>
                  <p className="text-[10px] text-muted-foreground/80 mt-1">
                    {t("admin.joinDate")}: {formatDate(u.createdAt, i18n.language)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold tracking-wide ${
                      u.status === "active"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                        : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                    }`}
                  >
                    {u.status === "active" ? t("property.status.active") : (i18n.language === 'ar' ? 'موقوف' : 'Suspended')}
                  </span>
                </div>
              </div>

              <div className="px-3.5 py-3 border-t border-border/50 bg-muted/10 flex items-center gap-2">
                <select
                  value={u.role}
                  onChange={(e) => handleRoleChange(u.id, e.target.value)}
                  disabled={updateUser.isPending}
                  className="bg-background border border-border text-xs font-semibold rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-primary flex-1 min-w-0 h-8 text-foreground"
                >
                  <option value="buyer">{t("auth.roleBuyer")}</option>
                  <option value="seller">{t("auth.roleSeller")}</option>
                  <option value="broker">{t("auth.roleBroker")}</option>
                  <option value="admin">Admin / مدير</option>
                </select>

                <Button
                  size="sm"
                  variant={u.status === "active" ? "outline" : "default"}
                  className={`h-8 text-[11px] px-3 min-w-[80px] font-bold shadow-none ${u.status === 'active' ? 'text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-500/10' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
                  onClick={() => handleStatusToggle(u)}
                  disabled={updateUser.isPending}
                >
                  {u.status === "active" ? t("admin.suspend") : t("admin.activate")}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function PropertiesTab() {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<string>("pending_review");

  const queryParams = statusFilter === "all" ? {} : { status: statusFilter as any };
  const { data, isLoading } = useAdminListProperties(queryParams);
  const queryClient = useQueryClient();
  const updateStatus = useAdminUpdatePropertyStatus();

  const handleStatusChange = (id: string, newStatus: "active" | "rejected") => {
    updateStatus.mutate(
      { id, data: { status: newStatus } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getAdminListPropertiesQueryKey(queryParams) });
        },
      }
    );
  };

  if (isLoading)
    return <p className="text-center text-sm text-muted-foreground py-12">{t("common.loading")}</p>;

  const properties = data?.items || [];

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      {/* Filter Row */}
      <div className="py-3 border-b border-border/50 bg-background/95 backdrop-blur-sm sticky top-0 z-10 overflow-x-auto no-scrollbar">
        <div className="flex gap-2 w-max px-4">
          {[
            { id: "all", label: t("admin.allProperties") },
            { id: "pending_review", label: t("admin.pending") },
            { id: "active", label: t("property.status.active") },
            { id: "rejected", label: t("property.status.rejected") },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                statusFilter === f.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted border border-border"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Property List */}
      <div className="p-4 space-y-3">
        {properties.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8 bg-card rounded-xl border border-border border-dashed">{t("admin.noProperties")}</p>
        ) : (
          properties.map((p) => (
            <AdminPropertyCard
              key={p.id}
              property={p}
              onApprove={() => handleStatusChange(p.id, "active")}
              onReject={() => handleStatusChange(p.id, "rejected")}
              isPending={updateStatus.isPending}
            />
          ))
        )}
      </div>
    </div>
  );
}

function AdminPropertyCard({
  property,
  onApprove,
  onReject,
  isPending,
}: {
  property: Property;
  onApprove: () => void;
  onReject: () => void;
  isPending: boolean;
}) {
  const { t, i18n } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const typeLabel = t(`property.types.${property.propertyType}`, { defaultValue: property.propertyType });
  const txLabel =
    property.transactionMode === "sale"
      ? t("property.sale")
      : property.transactionMode === "rent"
      ? t("property.rent")
      : t("property.lease");

  const currency = property.priceCurrency ?? "JOD";
  const priceDisplay = property.price ? `${Number(property.price).toLocaleString()} ${currency}` : "—";
  
  const statusColor = 
    property.status === "active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" :
    property.status === "rejected" ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400" :
    property.status === "pending_review" ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400" :
    "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col transition-all">
      <div 
        className="p-3.5 cursor-pointer active:bg-muted/50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex gap-3">
          {/* Thumb */}
          {property.images?.[0] ? (
            <img src={property.images[0].path} alt="" className="w-20 h-20 rounded-xl object-cover shrink-0 border border-border/50 bg-muted" />
          ) : (
            <div className="w-20 h-20 rounded-xl bg-muted/50 flex flex-col items-center justify-center shrink-0 border border-border/50 text-muted-foreground/30">
               <Building2 size={24} />
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
             <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                   <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                        {txLabel}
                      </span>
                      <span className="text-[11px] font-bold text-muted-foreground truncate">{typeLabel}</span>
                   </div>
                   <p className="font-black text-[15px] text-foreground leading-tight truncate">{priceDisplay}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0 pt-0.5">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${statusColor}`}>
                    {t(`property.status.${property.status}`, { defaultValue: property.status })}
                  </span>
                  <span className="text-[9px] font-medium text-muted-foreground/80">
                    {formatDate(property.createdAt, i18n.language)}
                  </span>
                </div>
             </div>

             {(property.city || property.district) && (
               <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground mt-2">
                 <MapPin size={12} className="shrink-0 text-muted-foreground/60" />
                 <span className="truncate">
                   {[property.district, property.city].filter(Boolean).join("، ")}
                 </span>
               </div>
             )}
          </div>
        </div>

        {/* Chips for rooms/baths */}
        {(property.rooms != null || property.bathrooms != null || property.areaSqm != null) && (
          <div className="flex items-center gap-3.5 text-[11px] font-semibold text-muted-foreground mt-3.5 pt-2.5 border-t border-border/50">
            {property.rooms != null && (
              <span className="flex items-center gap-1.5">
                <Bed size={13} className="text-muted-foreground/70" /> {property.rooms}
              </span>
            )}
            {property.bathrooms != null && (
              <span className="flex items-center gap-1.5">
                <Bath size={13} className="text-muted-foreground/70" /> {property.bathrooms}
              </span>
            )}
            {property.areaSqm != null && (
              <span className="flex items-center gap-1.5">
                <Maximize2 size={12} className="text-muted-foreground/70" /> {Number(property.areaSqm).toLocaleString()} م²
              </span>
            )}
          </div>
        )}
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-3.5 pb-3.5 animate-in slide-in-from-top-1 fade-in duration-200">
          <div className="pt-2 border-t border-border/50 text-[13px] text-foreground/90 whitespace-pre-wrap leading-relaxed">
             {property.description || <span className="italic text-muted-foreground">{t('common.noData')}</span>}
          </div>
          {property.images && property.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1 mt-3 no-scrollbar snap-x">
              {property.images.slice(1).map((img: any) => (
                <img key={img.id} src={img.path} alt="" className="w-16 h-16 object-cover rounded-lg border border-border/50 snap-start bg-muted" />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions (Pending Only) */}
      {property.status === "pending_review" && (
        <div className="p-2 border-t border-border bg-muted/30 flex gap-2">
          <Button
            size="sm"
            className="flex-1 h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-none"
            onClick={(e) => { e.stopPropagation(); onApprove(); }}
            disabled={isPending}
          >
            <CheckCircle2 size={16} className="me-1.5" />
            {t("admin.approve")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-9 text-red-600 border-red-200 bg-white dark:bg-transparent hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-700 font-bold text-xs shadow-none"
            onClick={(e) => { e.stopPropagation(); onReject(); }}
            disabled={isPending}
          >
            <XCircle size={16} className="me-1.5" />
            {t("admin.reject")}
          </Button>
        </div>
      )}
    </div>
  );
}

function SettingsTab() {
  const { t } = useTranslation();
  const { data: settings, isLoading } = useGetAdminSettings();
  const updateSettings = useUpdateAdminSettings();
  const queryClient = useQueryClient();

  const save = async (patch: SystemSettingsUpdate) => {
    await updateSettings.mutateAsync({ data: patch });
    queryClient.invalidateQueries({ queryKey: getGetAdminSettingsQueryKey() });
  };

  if (isLoading) {
    return <p className="text-center text-sm text-muted-foreground py-12">{t("common.loading")}</p>;
  }

  if (!settings) {
    return <p className="text-center text-sm text-muted-foreground py-12">{t("common.noData")}</p>;
  }

  return (
    <div className="p-4 space-y-4 animate-in fade-in duration-300">
      <Accordion type="multiple" defaultValue={["otp", "ai", "market", "property", "system"]} className="space-y-3">
        
        {/* Section 1 — OTP & Auth */}
        <AccordionItem value="otp" className="bg-card rounded-xl border border-border shadow-sm px-4">
          <AccordionTrigger className="hover:no-underline py-3">
            <span className="font-bold text-sm">{t("admin.settingsSections.otpAuth")}</span>
          </AccordionTrigger>
          <AccordionContent className="pt-1 pb-3">
            <SettingNumberInput label={t("admin.settingsFields.otpExpiry")} value={settings.otpExpiryMinutes} onChange={(v) => save({ otpExpiryMinutes: v })} min={1} max={60} />
            <SettingNumberInput label={t("admin.settingsFields.maxFailedAttempts")} value={settings.otpMaxAttempts} onChange={(v) => save({ otpMaxAttempts: v })} min={1} max={10} />
            <SettingNumberInput label={t("admin.settingsFields.maxOtpRequests")} value={settings.otpRateLimitCount} onChange={(v) => save({ otpRateLimitCount: v })} min={1} max={10} />
            <SettingNumberInput label={t("admin.settingsFields.rateLimitWindow")} value={settings.otpRateLimitWindowMinutes} onChange={(v) => save({ otpRateLimitWindowMinutes: v })} min={1} max={60} />
          </AccordionContent>
        </AccordionItem>

        {/* Section 2 — AI Broker */}
        <AccordionItem value="ai" className="bg-card rounded-xl border border-border shadow-sm px-4">
          <AccordionTrigger className="hover:no-underline py-3">
            <span className="font-bold text-sm">{t("admin.settingsSections.aiBroker")}</span>
          </AccordionTrigger>
          <AccordionContent className="pt-1 pb-3">
            <SettingTextInput label={t("admin.settingsFields.modelName")} value={settings.aiModel} onChange={(v) => save({ aiModel: v })} />
            <SettingSlider label={t("admin.settingsFields.temperature")} value={settings.aiTemperature} onChange={(v) => save({ aiTemperature: v })} min={0.0} max={1.0} step={0.1} />
            <SettingNumberInput label={t("admin.settingsFields.maxAgentTurns")} value={settings.aiMaxTurns} onChange={(v) => save({ aiMaxTurns: v })} min={1} max={20} />
            <SettingSegmented 
              label={t("admin.settingsFields.guardrailLevel")} 
              value={settings.aiGuardrailLevel} 
              options={[
                { value: "strict", label: t("admin.settingsFields.strict") },
                { value: "balanced", label: t("admin.settingsFields.balanced") },
                { value: "relaxed", label: t("admin.settingsFields.relaxed") }
              ]} 
              onChange={(v) => save({ aiGuardrailLevel: v as any })} 
            />
          </AccordionContent>
        </AccordionItem>

        {/* Section 3 — Market & Localization */}
        <AccordionItem value="market" className="bg-card rounded-xl border border-border shadow-sm px-4">
          <AccordionTrigger className="hover:no-underline py-3">
            <span className="font-bold text-sm">{t("admin.settingsSections.marketLoc")}</span>
          </AccordionTrigger>
          <AccordionContent className="pt-1 pb-3">
            <SettingSelect 
              label={t("admin.settingsFields.defaultLanguage")} 
              value={settings.defaultLanguage} 
              options={[
                { value: "ar", label: t("admin.settingsFields.arabic") },
                { value: "en", label: t("admin.settingsFields.english") }
              ]} 
              onChange={(v) => save({ defaultLanguage: v as any })} 
            />
            <SettingSelect 
              label={t("admin.settingsFields.defaultCurrency")} 
              value={settings.defaultCurrency} 
              options={[
                { value: "JOD", label: "JOD" },
                { value: "SAR", label: "SAR" },
                { value: "AED", label: "AED" },
                { value: "EGP", label: "EGP" },
                { value: "KWD", label: "KWD" },
                { value: "QAR", label: "QAR" }
              ]} 
              onChange={(v) => save({ defaultCurrency: v as any })} 
            />
          </AccordionContent>
        </AccordionItem>

        {/* Section 4 — Property Listings */}
        <AccordionItem value="property" className="bg-card rounded-xl border border-border shadow-sm px-4">
          <AccordionTrigger className="hover:no-underline py-3">
            <span className="font-bold text-sm">{t("admin.settingsSections.propertyListings")}</span>
          </AccordionTrigger>
          <AccordionContent className="pt-1 pb-3">
            <SettingNumberInput label={t("admin.settingsFields.maxImagesPerProperty")} value={settings.maxImagesPerProperty} onChange={(v) => save({ maxImagesPerProperty: v })} min={1} max={50} />
            <SettingSwitch label={t("admin.settingsFields.autoApproveListings")} warning={settings.autoApproveListings ? t("admin.settingsFields.autoApproveWarning") : undefined} value={settings.autoApproveListings} onChange={(v) => save({ autoApproveListings: v })} />
            <SettingNumberInput label={t("admin.settingsFields.listingExpiryDays")} value={settings.listingExpiryDays} onChange={(v) => save({ listingExpiryDays: v })} min={1} max={365} />
          </AccordionContent>
        </AccordionItem>

        {/* Section 5 — System & Feature Flags */}
        <AccordionItem value="system" className="bg-card rounded-xl border border-border shadow-sm px-4">
          <AccordionTrigger className="hover:no-underline py-3">
            <span className="font-bold text-sm">{t("admin.settingsSections.systemFlags")}</span>
          </AccordionTrigger>
          <AccordionContent className="pt-1 pb-3">
            <SettingSwitch label={t("admin.settingsFields.maintenanceMode")} warning={settings.maintenanceMode ? t("admin.settingsFields.maintenanceWarning") : undefined} value={settings.maintenanceMode} onChange={(v) => save({ maintenanceMode: v })} />
            <SettingSwitch label={t("admin.settingsFields.voiceInput")} value={settings.featureVoiceInput} onChange={(v) => save({ featureVoiceInput: v })} />
            <SettingSwitch label={t("admin.settingsFields.mapView")} value={settings.featureMapView} onChange={(v) => save({ featureMapView: v })} />
            <SettingSwitch label={t("admin.settingsFields.contactRelease")} value={settings.featureContactRelease} onChange={(v) => save({ featureContactRelease: v })} />
            <SettingSwitch label={t("admin.settingsFields.sellerWizard")} value={settings.featureSellerWizard} onChange={(v) => save({ featureSellerWizard: v })} />
          </AccordionContent>
        </AccordionItem>

      </Accordion>
    </div>
  );
}

// ---------------------------------------------
// Form Subcomponents
// ---------------------------------------------

function SettingRow({ label, description, warning, children, isSaving, saved }: { label: string, description?: string, warning?: string, children: React.ReactNode, isSaving: boolean, saved: boolean }) {
  return (
    <div className="flex flex-col gap-2 py-3 border-b border-border/50 last:border-0">
      <div className="flex justify-between items-center gap-4">
        <div className="flex-1 min-w-0">
          <label className="text-sm font-semibold text-foreground flex items-center gap-2">
            {label}
            {saved && <CheckCircle2 size={14} className="text-emerald-500 animate-in zoom-in" />}
            {isSaving && <span className="text-[10px] font-bold text-muted-foreground animate-pulse">...</span>}
          </label>
          {description && <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>}
          {warning && <p className="text-[11px] text-red-500 font-medium mt-0.5">{warning}</p>}
        </div>
        <div className="shrink-0 w-32 flex justify-end">
          {children}
        </div>
      </div>
    </div>
  );
}

function SettingNumberInput({ label, value, onChange, min, max }: { label: string, value: number, onChange: (v: number) => Promise<void>, min?: number, max?: number }) {
  const [localVal, setLocalVal] = useState(String(value));
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  
  useEffect(() => { setLocalVal(String(value)); }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalVal(e.target.value);
    const num = Number(e.target.value);
    if (isNaN(num)) return;
    
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setIsSaving(true);
      setSaved(false);
      await onChange(num);
      setIsSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 500);
  };

  return (
    <SettingRow label={label} isSaving={isSaving} saved={saved}>
      <Input type="number" value={localVal} onChange={handleChange} min={min} max={max} className="h-8 text-sm px-2 text-right" dir="ltr" />
    </SettingRow>
  );
}

function SettingTextInput({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => Promise<void> }) {
  const [localVal, setLocalVal] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  
  useEffect(() => { setLocalVal(value); }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalVal(val);
    
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setIsSaving(true);
      setSaved(false);
      await onChange(val);
      setIsSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 500);
  };

  return (
    <SettingRow label={label} isSaving={isSaving} saved={saved}>
      <Input type="text" value={localVal} onChange={handleChange} className="h-8 text-sm px-2 text-right" dir="ltr" />
    </SettingRow>
  );
}

function SettingSwitch({ label, warning, value, onChange }: { label: string, warning?: string, value: boolean, onChange: (v: boolean) => Promise<void> }) {
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleToggle = async (v: boolean) => {
    setIsSaving(true);
    setSaved(false);
    await onChange(v);
    setIsSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <SettingRow label={label} warning={warning} isSaving={isSaving} saved={saved}>
      <Switch checked={value} onCheckedChange={handleToggle} disabled={isSaving} />
    </SettingRow>
  );
}

function SettingSelect({ label, value, options, onChange }: { label: string, value: string, options: {value: string, label: string}[], onChange: (v: string) => Promise<void> }) {
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSelect = async (v: string) => {
    if (v === value) return;
    setIsSaving(true);
    setSaved(false);
    await onChange(v);
    setIsSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <SettingRow label={label} isSaving={isSaving} saved={saved}>
      <Select value={value} onValueChange={handleSelect} disabled={isSaving}>
        <SelectTrigger className="h-8 text-xs font-semibold" dir="ltr">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="text-xs font-medium">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </SettingRow>
  );
}

function SettingSegmented({ label, value, options, onChange }: { label: string, value: string, options: {value: string, label: string}[], onChange: (v: string) => Promise<void> }) {
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSelect = async (v: string) => {
    if (v === value) return;
    setIsSaving(true);
    setSaved(false);
    await onChange(v);
    setIsSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col gap-2 py-3 border-b border-border/50 last:border-0">
      <div className="flex justify-between items-center mb-1">
        <label className="text-sm font-semibold text-foreground flex items-center gap-2">
          {label}
          {saved && <CheckCircle2 size={14} className="text-emerald-500 animate-in zoom-in" />}
          {isSaving && <span className="text-[10px] font-bold text-muted-foreground animate-pulse">...</span>}
        </label>
      </div>
      <div className="flex bg-muted/50 p-1 rounded-lg">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleSelect(opt.value)}
            disabled={isSaving}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
              value === opt.value
                ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SettingSlider({ label, value, onChange, min, max, step }: { label: string, value: number, onChange: (v: number) => Promise<void>, min: number, max: number, step: number }) {
  const [localVal, setLocalVal] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => { setLocalVal(value); }, [value]);

  const handleChange = (v: number[]) => {
    const num = v[0];
    setLocalVal(num);
    
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setIsSaving(true);
      setSaved(false);
      await onChange(num);
      setIsSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 500);
  };

  return (
    <div className="flex flex-col gap-3 py-3 border-b border-border/50 last:border-0">
      <div className="flex justify-between items-center">
        <label className="text-sm font-semibold text-foreground flex items-center gap-2">
          {label}
          {saved && <CheckCircle2 size={14} className="text-emerald-500 animate-in zoom-in" />}
          {isSaving && <span className="text-[10px] font-bold text-muted-foreground animate-pulse">...</span>}
        </label>
        <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md" dir="ltr">{localVal.toFixed(1)}</span>
      </div>
      <Slider value={[localVal]} min={min} max={max} step={step} onValueChange={handleChange} className="py-1" dir="ltr" />
    </div>
  );
}
