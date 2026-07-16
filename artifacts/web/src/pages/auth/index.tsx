import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth";
import { useRequestOtp, useVerifyOtp, useUpdateMe } from "@workspace/api-client-react";
import OtpInput from "./OtpInput";
import RoleSelect from "./RoleSelect";

type Step = "phone" | "otp" | "role" | "name";

export default function AuthPage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { login, updateUser } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"buyer" | "seller" | "broker">("buyer");
  const [name, setName] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  const requestOtp = useRequestOtp();
  const verifyOtp = useVerifyOtp();
  const updateMe = useUpdateMe();

  // Resend countdown on the OTP step
  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [resendIn]);

  async function sendOtp() {
    setDevCode(null);
    const res = await requestOtp.mutateAsync({ data: { phone } });
    if (res.devCode) setDevCode(res.devCode);
    setResendIn(30);
  }

  async function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await sendOtp();
      setStep("otp");
    } catch {
      toast({ title: t("common.error"), variant: "destructive" });
    }
  }

  async function handleResend() {
    if (resendIn > 0 || requestOtp.isPending) return;
    try {
      await sendOtp();
    } catch {
      toast({ title: t("common.error"), variant: "destructive" });
    }
  }

  async function handleOtpSubmit(otp: string) {
    try {
      const res = await verifyOtp.mutateAsync({ data: { phone, code: otp } });
      login(res.token, res.user);
      if (res.isNewUser) {
        setStep("role");
      } else {
        navigate("/");
      }
    } catch {
      toast({ title: t("common.error"), variant: "destructive" });
    }
  }

  async function handleRoleSubmit() {
    setStep("name");
  }

  async function handleNameSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const updated = await updateMe.mutateAsync({ data: { name, role } });
      updateUser(updated);
      navigate("/");
    } catch {
      toast({ title: t("common.error"), variant: "destructive" });
    }
  }

  function goBack() {
    if (step === "otp") setStep("phone");
    else if (step === "name") setStep("role");
    else if (step === "role") setStep("otp");
    else window.history.back();
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground antialiased">
      {/* Top app bar — Stitch style */}
      <header className="bg-background/90 backdrop-blur-md shadow-sm fixed top-0 inset-x-0 z-50">
        <div className="flex items-center justify-between px-4 h-16 w-full max-w-md mx-auto">
          <button
            aria-label={t("common.back")}
            onClick={goBack}
            type="button"
            className="p-2 -ms-2 text-primary hover:bg-muted rounded-full flex items-center justify-center active:scale-95 transition-all"
          >
            <ArrowRight size={22} className="rtl:rotate-180" />
          </button>
          <h1 className="flex-1 text-center font-bold text-lg text-primary">{t("app.name")}</h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="flex-1 flex flex-col px-6 pt-24 pb-12 w-full max-w-md mx-auto">
        {step === "phone" && (
          <form onSubmit={handlePhoneSubmit} className="flex flex-col justify-center flex-1 space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-foreground mb-3">{t("auth.title")}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{t("auth.subtitle")}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">{t("auth.phoneLabel")}</Label>
              <Input
                id="phone"
                type="tel"
                placeholder={t("auth.phonePlaceholder")}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                dir="ltr"
                className="text-base h-14 rounded-xl text-center"
              />
            </div>
            <button
              type="submit"
              disabled={requestOtp.isPending || phone.length < 7}
              className="w-full h-14 bg-primary text-primary-foreground font-semibold text-lg rounded-xl shadow-sm active:scale-[0.98] transition-all flex items-center justify-center disabled:opacity-50 disabled:pointer-events-none"
            >
              {requestOtp.isPending ? t("common.loading") : t("auth.sendCode")}
            </button>
          </form>
        )}

        {step === "otp" && (
          <div className="flex flex-col justify-center flex-1">
            <div className="mb-10 text-center">
              <h2 className="text-2xl font-bold text-foreground mb-3">{t("auth.otpTitle")}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                أرسلنا رمزاً مكوناً من ٦ أرقام إلى رقمك
                <br />
                <span className="font-medium text-foreground mt-1 inline-block" dir="ltr">
                  {phone}
                </span>
              </p>
            </div>

            {/* Dev-mode OTP hint — only shown in development */}
            {devCode && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl px-4 py-3 flex items-center gap-3 mb-8">
                <span className="text-amber-600 text-lg">🔑</span>
                <div>
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">رمز التطوير</p>
                  <p className="text-2xl font-mono font-bold tracking-widest text-amber-900 dark:text-amber-300">
                    {devCode}
                  </p>
                </div>
              </div>
            )}

            <OtpInput length={6} onComplete={handleOtpSubmit} loading={verifyOtp.isPending} />

            {/* Resend section — Stitch style */}
            <div className="mt-8 text-center text-sm">
              <span className="text-muted-foreground">لم يصلك الرمز؟</span>
              {resendIn > 0 ? (
                <span className="text-muted-foreground ms-1" dir="ltr">
                  خلال 0:{String(resendIn).padStart(2, "0")}
                </span>
              ) : (
                <button
                  onClick={handleResend}
                  disabled={requestOtp.isPending}
                  className="text-primary font-semibold hover:underline ms-1 focus:outline-none disabled:opacity-50"
                  type="button"
                >
                  إعادة الإرسال
                </button>
              )}
            </div>
          </div>
        )}

        {step === "role" && (
          <div className="flex flex-col justify-center flex-1 space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-foreground">{t("auth.roleTitle")}</h2>
            </div>
            <RoleSelect value={role} onChange={setRole} />
            <button
              onClick={handleRoleSubmit}
              type="button"
              className="w-full h-14 bg-primary text-primary-foreground font-semibold text-lg rounded-xl shadow-sm active:scale-[0.98] transition-all flex items-center justify-center"
            >
              {t("auth.continue")}
            </button>
          </div>
        )}

        {step === "name" && (
          <form onSubmit={handleNameSubmit} className="flex flex-col justify-center flex-1 space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-foreground">{t("auth.nameLabel")}</h2>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">{t("auth.nameLabel")}</Label>
              <Input
                id="name"
                placeholder={t("auth.namePlaceholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                dir="auto"
                className="text-base h-14 rounded-xl"
              />
            </div>
            <button
              type="submit"
              disabled={updateMe.isPending || !name.trim()}
              className="w-full h-14 bg-primary text-primary-foreground font-semibold text-lg rounded-xl shadow-sm active:scale-[0.98] transition-all flex items-center justify-center disabled:opacity-50 disabled:pointer-events-none"
            >
              {updateMe.isPending ? t("common.loading") : t("auth.continue")}
            </button>
          </form>
        )}
      </main>

      {/* Footer disclaimer — Stitch style */}
      <footer className="mt-auto py-6 text-center px-6 w-full max-w-md mx-auto">
        <p className="text-xs text-muted-foreground">
          بتسجيلك أنت توافق على{" "}
          <a className="text-primary hover:underline" href="#">
            الشروط والأحكام
          </a>
        </p>
      </footer>
    </div>
  );
}
