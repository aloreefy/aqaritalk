import { useLocation, Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Home, Heart, MessageSquare, Plus, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { key: "home", href: "/", icon: Home, labelKey: "nav.home" },
  { key: "search", href: "/?search=1", icon: Heart, labelKey: "nav.search" },
  { key: "list", href: "/list", icon: Plus, labelKey: "nav.list", center: true },
  { key: "chat", href: "/chat", icon: MessageSquare, labelKey: "nav.chat" },
  { key: "profile", href: "/profile", icon: User, labelKey: "nav.profile" },
];

export default function BottomNav() {
  const [location] = useLocation();
  const { t } = useTranslation();

  function isActive(href: string) {
    if (href === "/") return location === "/";
    return location.startsWith(href.split("?")[0]);
  }

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 bg-card border-t border-border rounded-t-2xl shadow-[0_-2px_10px_rgba(0,0,0,0.05)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="max-w-[480px] mx-auto flex items-center justify-around px-2 py-2">
        {navItems.map(({ key, href, icon: Icon, labelKey, center }: typeof navItems[number]) => {
          const active = isActive(href);

          // Center "add" tab — raised emerald FAB
          if (center) {
            return (
              <Link key={key} href={href}>
                <button
                  type="button"
                  className="flex flex-col items-center justify-center w-16 relative -top-3 active:scale-90 transition-transform"
                >
                  <div className="bg-primary text-primary-foreground w-12 h-12 rounded-full flex items-center justify-center shadow-lg border-4 border-card">
                    <Plus size={24} strokeWidth={2.5} />
                  </div>
                  <span className="text-[10px] font-medium mt-1 text-muted-foreground">
                    {t(labelKey)}
                  </span>
                </button>
              </Link>
            );
          }

          return (
            <Link key={key} href={href}>
              <button
                type="button"
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 w-16 px-2 py-1 rounded-xl transition-all active:scale-90",
                  active
                    ? "text-primary bg-primary/10 font-bold"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                <Icon size={22} strokeWidth={active ? 2.5 : 1.75} />
                <span className="text-[10px] font-medium leading-none">{t(labelKey)}</span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
