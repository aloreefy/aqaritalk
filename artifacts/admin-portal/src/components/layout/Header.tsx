import { useLocation } from "wouter";
import { useGetMe } from "@workspace/api-client-react";
import { Activity, Bell, Search, User as UserIcon } from "lucide-react";

export function Header() {
  const [location] = useLocation();
  const { data: me } = useGetMe({ query: { enabled: !!localStorage.getItem("admin_token") }});

  // Just a simple breadcrumb map for the header
  const routeMap: Record<string, string> = {
    "/": "Overview",
    "/users": "User Directory",
    "/properties": "Property Registry",
    "/commission": "Commission Tables",
    "/settings": "System Config",
  };

  const currentTitle = routeMap[location] || "Dashboard";

  return (
    <header className="h-14 border-b bg-card flex items-center justify-between px-4 md:px-6 shrink-0 shadow-sm z-10">
      <div className="flex items-center gap-2">
        <h1 className="text-sm font-semibold text-foreground tracking-tight">{currentTitle}</h1>
        <div className="h-4 w-px bg-border mx-2" />
        <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20">
          <Activity className="w-3 h-3" />
          <span>System Nominal</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative hidden lg:flex items-center">
          <Search className="w-4 h-4 absolute left-2.5 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Command palette (Ctrl+K)..." 
            className="h-8 w-64 bg-muted/50 border border-border rounded-md pl-9 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary transition-all"
            disabled
          />
        </div>
        
        <div className="flex items-center gap-3">
          <button className="text-muted-foreground hover:text-foreground relative">
            <Bell className="w-4 h-4" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full border border-card"></span>
          </button>
          
          <div className="h-4 w-px bg-border mx-1" />
          
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-end">
              <span className="text-xs font-medium leading-none">{me?.name || 'Administrator'}</span>
              <span className="text-[10px] text-muted-foreground leading-none mt-1">L4 Clearance</span>
            </div>
            <div className="w-8 h-8 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <UserIcon className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
