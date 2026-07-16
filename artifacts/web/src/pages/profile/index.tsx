import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { LogOut, ChevronLeft, Globe, MapPin, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth";
import { useUpdateMe } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

export default function ProfilePage() {
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated, logout, updateUser } = useAuth();
  const [, navigate] = useLocation();
  const updateMe = useUpdateMe();
  const queryClient = useQueryClient();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center gap-4">
        <p className="text-gray-500 text-sm">{t("common.loginRequired")}</p>
        <Button onClick={() => navigate("/auth")}>{t("auth.sendCode")}</Button>
      </div>
    );
  }

  async function toggleLanguage() {
    const newLang = i18n.language === "ar" ? "en" : "ar";
    await i18n.changeLanguage(newLang);
    document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = newLang;
  }

  function handleLogout() {
    logout();
    queryClient.clear();
    navigate("/");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-6 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
          👤
        </div>
        <div>
          <p className="font-bold text-lg text-gray-900">{user?.name ?? "—"}</p>
          <p className="text-sm text-gray-500 dir-ltr">{user?.phone}</p>
          {user?.verificationStatus === "verified" && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full mt-1 inline-block">
              ✓ {t("admin.verify")}
            </span>
          )}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Settings */}
        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
          <SettingRow
            icon={<Globe size={18} />}
            label={t("profile.language")}
            value={i18n.language === "ar" ? "العربية" : "English"}
            onClick={toggleLanguage}
          />
          <SettingRow
            icon={<MapPin size={18} />}
            label={t("profile.market")}
            value={t(`profile.markets.${user?.market ?? "JO"}`)}
          />
          <SettingRow
            icon={<Bell size={18} />}
            label={t("profile.notifications")}
            value=""
          />
        </div>

        {/* Logout */}
        <Button
          variant="outline"
          className="w-full h-12 text-red-600 border-red-200 hover:bg-red-50"
          onClick={handleLogout}
        >
          <LogOut size={16} className="me-2" />
          {t("auth.logout")}
        </Button>
      </div>
    </div>
  );
}

function SettingRow({
  icon,
  label,
  value,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors"
    >
      <span className="text-gray-500">{icon}</span>
      <span className="flex-1 text-sm font-medium text-gray-800 text-start">{label}</span>
      {value && <span className="text-sm text-gray-400">{value}</span>}
      {onClick && <ChevronLeft size={14} className="text-gray-400 rtl:rotate-180" />}
    </button>
  );
}
