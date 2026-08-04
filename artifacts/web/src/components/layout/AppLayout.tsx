import type { ReactNode } from "react";
import { useLocation, Link } from "wouter";
import { ShieldCheck } from "lucide-react";
import BottomNav from "./BottomNav";
import { useAuth } from "@/contexts/auth";

const NO_NAV_PATHS = ["/auth"];

interface Props {
  children: ReactNode;
}

export default function AppLayout({ children }: Props) {
  const [location] = useLocation();
  const { user } = useAuth();
  const showNav = !NO_NAV_PATHS.some((p) => location.startsWith(p));
  const showAdminFab = user?.role === "admin" && !location.startsWith("/admin") && showNav;

  return (
    <div className="min-h-screen bg-background max-w-[480px] mx-auto relative">
      <main className={showNav ? "pb-20" : ""}>{children}</main>
      {showNav && <BottomNav />}

      {showAdminFab && (
        <Link href="/admin">
          <button
            type="button"
            aria-label="Admin panel"
            style={{
              position: "fixed",
              bottom: "88px",
              right: "max(16px, calc(50vw - 224px))",
              zIndex: 60,
            }}
            className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xl shadow-primary/40 active:scale-90 transition-transform border-2 border-primary-foreground/20"
          >
            <ShieldCheck size={24} strokeWidth={2} />
          </button>
        </Link>
      )}
    </div>
  );
}
