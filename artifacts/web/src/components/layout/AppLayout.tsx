import { type ReactNode, useEffect, useRef, useState } from "react";
import { useLocation, Link } from "wouter";
import { ShieldCheck } from "lucide-react";
import BottomNav from "./BottomNav";
import { useAuth } from "@/contexts/auth";

const NO_NAV_PATHS = ["/auth"];
const STORAGE_KEY = "admin-fab-pos";
const FAB_SIZE = 56; // w-14 = 56px

function getDefaultPos() {
  return {
    x: window.innerWidth - FAB_SIZE - 16,
    y: window.innerHeight - FAB_SIZE - 96,
  };
}

function loadPos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as { x: number; y: number };
  } catch {}
  return null;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

interface Props {
  children: ReactNode;
}

export default function AppLayout({ children }: Props) {
  const [location] = useLocation();
  const { user } = useAuth();
  const showNav = !NO_NAV_PATHS.some((p) => location.startsWith(p));
  const showAdminFab = user?.role === "admin" && !location.startsWith("/admin") && showNav;

  const [pos, setPos] = useState<{ x: number; y: number }>(() => loadPos() ?? getDefaultPos());
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number; moved: boolean } | null>(null);

  // Keep in bounds on resize
  useEffect(() => {
    function onResize() {
      setPos((p) => ({
        x: clamp(p.x, 0, window.innerWidth - FAB_SIZE),
        y: clamp(p.y, 0, window.innerHeight - FAB_SIZE),
      }));
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function savePos(p: { x: number; y: number }) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  }

  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, originX: pos.x, originY: pos.y, moved: false };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragRef.current.moved = true;
    if (!dragRef.current.moved) return;
    const newX = clamp(dragRef.current.originX + dx, 0, window.innerWidth - FAB_SIZE);
    const newY = clamp(dragRef.current.originY + dy, 0, window.innerHeight - FAB_SIZE);
    setPos({ x: newX, y: newY });
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const moved = dragRef.current.moved;
    dragRef.current = null;

    if (!moved) return; // let the Link click through

    // Snap to nearest vertical edge
    setPos((p) => {
      const snapped = {
        x: p.x < window.innerWidth / 2 ? 16 : window.innerWidth - FAB_SIZE - 16,
        y: clamp(p.y, 80, window.innerHeight - FAB_SIZE - 80),
      };
      savePos(snapped);
      return snapped;
    });
    // Prevent the click from firing after a drag
    e.currentTarget.releasePointerCapture(e.pointerId);
  }

  return (
    <div className="min-h-screen bg-background max-w-[480px] mx-auto relative">
      <main className={showNav ? "pb-20" : ""}>{children}</main>
      {showNav && <BottomNav />}

      {showAdminFab && (
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          style={{ position: "fixed", left: pos.x, top: pos.y, zIndex: 60, touchAction: "none" }}
          className="cursor-grab active:cursor-grabbing"
        >
          <Link href="/admin">
            <button
              type="button"
              aria-label="Admin panel"
              onClickCapture={(e) => { if (dragRef.current?.moved) e.preventDefault(); }}
              className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xl shadow-primary/40 active:scale-90 transition-transform border-2 border-primary-foreground/20 select-none"
            >
              <ShieldCheck size={24} strokeWidth={2} />
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}
