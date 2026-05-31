import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
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

  const requestOtp = useRequestOtp();
  const verifyOtp = useVerifyOtp();
  const updateMe = useUpdateMe();

  async function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault();
    setDevCode(null);
    try {
      const res = await requestOtp.mutateAsync({ data: { phone } });
      if (res.devCode) setDevCode(res.devCode);
      setStep("otp");
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

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="bg-primary px-6 pt-16 pb-10 text-white">
        <h1 className="text-3xl font-bold">{t("app.name")}</h1>
        <p className="mt-1 text-sm opacity-80">{t("app.tagline")}</p>
      </div>

      <div className="flex-1 px-6 py-8">
        {step === "phone" && (
          <form onSubmit={handlePhoneSubmit} className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{t("auth.title")}</h2>
              <p className="text-sm text-gray-500 mt-1">{t("auth.subtitle")}</p>
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
                className="text-base h-12"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-12 text-base"
              disabled={requestOtp.isPending || phone.length < 7}
            >
              {requestOtp.isPending ? t("common.loading") : t("auth.sendCode")}
            </Button>
          </form>
        )}

        {step === "otp" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{t("auth.otpTitle")}</h2>
              <p className="text-sm text-gray-500 mt-1">
                {t("auth.otpSubtitle", { phone })}
              </p>
            </div>

            {/* Dev-mode OTP hint — only shown in development */}
            {devCode && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
                <span className="text-amber-600 text-lg">🔑</span>
                <div>
                  <p className="text-xs text-amber-700 font-medium">رمز التطوير</p>
                  <p className="text-2xl font-mono font-bold tracking-widest text-amber-900">
                    {devCode}
                  </p>
                </div>
              </div>
            )}

            <OtpInput
              length={6}
              onComplete={handleOtpSubmit}
              loading={verifyOtp.isPending}
            />
            <button
              className="text-sm text-primary underline"
              onClick={() => setStep("phone")}
              type="button"
            >
              {t("common.back")}
            </button>
          </div>
        )}

        {step === "role" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{t("auth.roleTitle")}</h2>
            </div>
            <RoleSelect value={role} onChange={setRole} />
            <Button className="w-full h-12 text-base" onClick={handleRoleSubmit}>
              {t("auth.continue")}
            </Button>
          </div>
        )}

        {step === "name" && (
          <form onSubmit={handleNameSubmit} className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{t("auth.nameLabel")}</h2>
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
                className="text-base h-12"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-12 text-base"
              disabled={updateMe.isPending || !name.trim()}
            >
              {updateMe.isPending ? t("common.loading") : t("auth.continue")}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
