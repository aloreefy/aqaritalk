import type { ReactNode } from "react";
import { useLocation } from "wouter";
import BottomNav from "./BottomNav";

const NO_NAV_PATHS = ["/auth"];

interface Props {
  children: ReactNode;
}

export default function AppLayout({ children }: Props) {
  const [location] = useLocation();
  const showNav = !NO_NAV_PATHS.some((p) => location.startsWith(p));

  return (
    <div className="min-h-screen bg-gray-50 max-w-[480px] mx-auto relative">
      <main className={showNav ? "pb-14" : ""}>{children}</main>
      {showNav && <BottomNav />}
    </div>
  );
}
