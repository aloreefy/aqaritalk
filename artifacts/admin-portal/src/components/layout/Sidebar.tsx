import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  Settings, 
  BadgePercent, 
  LogOut,
  Building
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

const navItems = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/users", label: "Users", icon: Users },
  { href: "/properties", label: "Listings", icon: Building2 },
  { href: "/commission", label: "Commissions", icon: BadgePercent },
  { href: "/settings", label: "System Config", icon: Settings },
];

export function Sidebar() {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    queryClient.clear();
    setLocation("/login");
  };

  return (
    <aside className="w-64 border-r bg-card flex flex-col hidden md:flex shrink-0">
      <div className="h-14 border-b flex items-center px-6 gap-2">
        <div className="bg-primary/10 text-primary p-1.5 rounded-md">
          <Building className="w-5 h-5" />
        </div>
        <span className="font-bold text-sm tracking-tight">AqariTalk Control</span>
      </div>
      
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-3 mt-2">Platform</div>
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-md transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Terminate Session
        </button>
      </div>
    </aside>
  );
}
