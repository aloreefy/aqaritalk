import { useState } from "react";
import { useLocation } from "wouter";
import { useAdminPortalLogin } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Building, Lock, ShieldAlert } from "lucide-react";

export default function Login() {
  const [password, setPassword] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const loginMutation = useAdminPortalLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    loginMutation.mutate({ data: { password } }, {
      onSuccess: (res) => {
        localStorage.setItem("admin_token", res.token);
        setLocation("/");
      },
      onError: (err) => {
        toast({
          title: "Access Denied",
          description: (err.data as Record<string, string> | null)?.error ?? err.message ?? "Invalid operator credentials.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground relative overflow-hidden">
      {/* Decorative background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-sm relative z-10">
        <div className="bg-card border shadow-xl rounded-lg overflow-hidden">
          <div className="p-6 pb-8 border-b bg-muted/30">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="bg-primary text-primary-foreground p-2 rounded-md shadow-sm">
                <Building className="w-6 h-6" />
              </div>
            </div>
            <h1 className="text-xl font-semibold text-center tracking-tight">AqariTalk Central</h1>
            <p className="text-xs text-muted-foreground text-center mt-1 font-mono uppercase tracking-wider">Restricted Operator Access</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Lock className="w-3 h-3" /> Passkey Required
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-background border border-input h-10 px-3 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  placeholder="••••••••••••"
                  autoFocus
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending || !password}
              className="w-full h-10 bg-primary text-primary-foreground text-sm font-semibold rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loginMutation.isPending ? (
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
              ) : (
                "Authenticate & Initialize"
              )}
            </button>
          </form>
          
          <div className="px-6 py-4 bg-muted/50 border-t flex items-start gap-3 text-xs text-muted-foreground">
            <ShieldAlert className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
            <p className="leading-relaxed">
              This system is restricted to authorized administrative personnel. All actions are logged and audited.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
