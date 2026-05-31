import { useLocation, Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Home, Search, MessageSquare, PlusSquare, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { key: "home", href: "/", icon: Home, labelKey: "nav.home" },
  { key: "search", href: "/?search=1", icon: Search, labelKey: "nav.search" },
  { key: "chat", href: "/chat", icon: MessageSquare, labelKey: "nav.chat" },
  { key: "list", href: "/list", icon: PlusSquare, labelKey: "nav.list" },
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
      className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-200 safe-area-bottom"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="max-w-[480px] mx-auto flex items-center justify-around h-14">
        {navItems.map(({ key, href, icon: Icon, labelKey }) => {
          const active = isActive(href);
          return (
            <Link key={key} href={href}>
              <button
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1 min-w-[56px] min-h-[48px] justify-center transition-colors",
                  active
                    ? "text-primary"
                    : "text-gray-500 hover:text-gray-700",
                )}
                type="button"
              >
                <Icon
                  size={22}
                  strokeWidth={active ? 2.5 : 1.75}
                  className={active ? "text-primary" : ""}
                />
                <span className="text-[10px] font-medium leading-none">
                  {t(labelKey)}
                </span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
