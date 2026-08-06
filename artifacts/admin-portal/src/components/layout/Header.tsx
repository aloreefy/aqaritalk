import { useLocation } from "wouter";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { Bell, User as UserIcon, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";

function LanguageToggle() {
  const { i18n: i18nInstance } = useTranslation();
  const isAr = i18nInstance.language === 'ar';

  const toggle = () => {
    const next = isAr ? 'en' : 'ar';
    i18nInstance.changeLanguage(next);
    localStorage.setItem('admin_lang', next);
    document.documentElement.lang = next;
    document.documentElement.dir  = next === 'ar' ? 'rtl' : 'ltr';
  };

  return (
    <button
      onClick={toggle}
      title={isAr ? 'Switch to English' : 'التبديل إلى العربية'}
      className="flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
    >
      <Globe className="w-3.5 h-3.5" />
      {isAr ? 'EN' : 'ع'}
    </button>
  );
}

export function Header() {
  const { t } = useTranslation();
  const [location] = useLocation();
  const { data: me } = useGetMe({ query: { enabled: !!localStorage.getItem("admin_token"), queryKey: getGetMeQueryKey() } });

  const routes = t('header.routes', { returnObjects: true }) as Record<string, string>;
  const currentTitle = routes[location] ?? t('header.fallback');

  // Prefer name if set; fall back to phone number
  const displayName = me?.name || me?.phone || "Admin";
  // Secondary line: phone if name is shown, otherwise role
  const displaySub  = me?.name ? me.phone : me?.role ?? "admin";

  return (
    <header className="h-14 border-b bg-card flex items-center justify-between px-4 md:px-6 shrink-0 shadow-sm z-10">
      <h1 className="text-sm font-semibold text-foreground tracking-tight">{currentTitle}</h1>

      <div className="flex items-center gap-3">
        <LanguageToggle />

        <button className="text-muted-foreground hover:text-foreground relative">
          <Bell className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-border" />

        <div className="flex items-center gap-2">
          <div className="flex flex-col items-end">
            <span className="text-xs font-medium leading-none">{displayName}</span>
            <span className="text-[10px] text-muted-foreground leading-none mt-1 font-mono">{displaySub}</span>
          </div>
          <div className="w-8 h-8 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <UserIcon className="w-4 h-4" />
          </div>
        </div>
      </div>
    </header>
  );
}
