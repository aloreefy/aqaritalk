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
              top: "14px",
              right: "max(14px, calc(50vw - 226px))",
              zIndex: 60,
            }}
            className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30 active:scale-90 transition-transform border-2 border-primary-foreground/20"
          >
            <ShieldCheck size={17} strokeWidth={2.25} />
          </button>
        </Link>
      )}
    </div>
  );
}
