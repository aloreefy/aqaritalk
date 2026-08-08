import { useEffect, useRef, useState } from "react";
import { useGetAdminSettings, useUpdateAdminSettings, getGetAdminSettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Save, Server, Shield, BrainCircuit, Globe, LayoutGrid, Mic, Bot, ArrowLeft, Check, ChevronsUpDown, Eye, EyeOff, Key } from "lucide-react";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTranslation } from "react-i18next";

// AqariTalk brand emerald — matches the public app's --primary token
const EM   = "hsl(161,100%,21%)";
const EM55 = "hsl(161 100% 21% / 0.55)";
const EM35 = "hsl(161 100% 21% / 0.35)";
const EM30 = "hsl(161 100% 21% / 0.30)";
const EM10 = "hsl(161 100% 21% / 0.10)";

const VP_STYLES = `
  @keyframes vpa-orb-breathe { 0%,100%{transform:scale(1)} 50%{transform:scale(1.09)} }
  @keyframes vpa-ring-ripple { 0%{transform:scale(1);opacity:0.75} 100%{transform:scale(2.6);opacity:0} }
  @keyframes vpa-bar-wave    { 0%,100%{transform:scaleY(0.12)} 50%{transform:scaleY(1)} }
  @keyframes vpa-radar-ping  { 0%{transform:scale(0.4);opacity:0.9} 100%{transform:scale(3.2);opacity:0} }

  .vpa-orb { animation: vpa-orb-breathe 3s ease-in-out infinite; }

  .vpa-ring {
    position:absolute; inset:0; border-radius:9999px;
    border:2px solid ${EM};
    animation: vpa-ring-ripple 3s ease-out infinite;
  }
  .vpa-ring-2 { animation-delay:1s; }
  .vpa-ring-3 { animation-delay:2s; }

  .vpa-bar {
    width:2px; border-radius:9999px; transform-origin:center bottom;
    background-color:${EM};
    animation: vpa-bar-wave 1.1s ease-in-out infinite;
  }

  .vpa-radar {
    position:absolute; inset:0; border-radius:9999px;
    border:1.5px solid ${EM};
    animation: vpa-radar-ping 2s ease-out infinite;
  }
  .vpa-radar-2 { animation-delay:0.5s; }
  .vpa-radar-3 { animation-delay:1s; }
  .vpa-radar-4 { animation-delay:1.5s; }
`;

function VoiceStylePreview({ style }: { style: string }) {
  const { t } = useTranslation();
  const meta = t(`settings.voiceMeta.${style}`, { returnObjects: true }) as { label: string; description: string };

  return (
    <div className="flex flex-col gap-2 shrink-0" style={{ width: 210 }}>
      <style>{VP_STYLES}</style>
      <div className="rounded-3xl overflow-hidden" style={{ height: 96 }}>
        {style === 'green_card' && (
          <div className="relative h-full flex items-center gap-3 px-4" style={{ background: EM }}>
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 100% 100%, #fff 0, #fff 3px, transparent 3px)", backgroundSize: "20px 20px" }} />
            <div className="relative z-10 flex-1 min-w-0" dir="rtl">
              <div className="flex items-center gap-1 mb-1" style={{ color: "rgba(255,255,255,0.8)" }}>
                <Bot className="w-3 h-3 shrink-0" />
                <span className="text-[8px] font-bold tracking-widest">الذكاء الاصطناعي</span>
              </div>
              <p className="text-white font-extrabold text-[11px] leading-tight mb-0.5">تحدث مع وكيلك الذكي</p>
              <p className="text-[9px] leading-tight" style={{ color: "rgba(255,255,255,0.7)" }}>صِف ما تبحث عنه بالصوت</p>
            </div>
            <div className="relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-md" style={{ background: "white", color: EM }}>
              <ArrowLeft className="w-4 h-4" />
            </div>
          </div>
        )}
        {style === 'orb' && (
          <div className="h-full flex flex-col items-center justify-center gap-2" style={{ background: "linear-gradient(160deg, #0d1a12 0%, #0a1a0e 100%)" }}>
            <div className="relative flex items-center justify-center" style={{ width: 48, height: 48 }}>
              <div className="vpa-ring" /><div className="vpa-ring vpa-ring-2" /><div className="vpa-ring vpa-ring-3" />
              <div className="vpa-orb relative z-10 rounded-full flex items-center justify-center" style={{ width: 48, height: 48, background: `radial-gradient(circle at 35% 35%, ${EM}, ${EM55})`, boxShadow: `0 0 20px 6px ${EM35}` }}>
                <Mic size={20} className="text-white" strokeWidth={1.75} />
              </div>
            </div>
            <p className="text-white font-extrabold text-sm tracking-tight">كلّمني</p>
          </div>
        )}
        {style === 'waveform' && (
          <div className="h-full bg-card border flex flex-col items-center justify-center gap-2 px-3">
            <p className="font-extrabold text-foreground text-[11px]">اسألني عن أي عقار</p>
            <div className="flex items-end justify-center gap-[2.5px]" style={{ height: 28 }}>
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="vpa-bar" style={{ height: 28, animationDelay: `${((i * 1.1) / 24).toFixed(3)}s`, animationDuration: `${0.9 + (i % 5) * 0.08}s`, opacity: 0.4 + 0.6 * Math.abs(Math.sin((i / 24) * Math.PI)) }} />
              ))}
            </div>
          </div>
        )}
        {style === 'sonar' && (
          <div className="h-full bg-card border flex items-center gap-4 px-4">
            <div className="relative flex items-center justify-center shrink-0" style={{ width: 40, height: 40 }}>
              <div className="vpa-radar" /><div className="vpa-radar vpa-radar-2" /><div className="vpa-radar vpa-radar-3" /><div className="vpa-radar vpa-radar-4" />
              <div className="relative z-10 rounded-full flex items-center justify-center" style={{ width: 40, height: 40, background: EM10, border: `1px solid ${EM30}` }}>
                <Mic size={18} style={{ color: EM }} strokeWidth={1.75} />
              </div>
            </div>
            <div className="flex-1 min-w-0 text-start" dir="rtl">
              <p className="font-extrabold text-foreground text-xs leading-snug">تحدّث، أنا أسمعك</p>
              <p className="text-muted-foreground text-[10px] mt-0.5 truncate">صِف عقارك بكلماتك</p>
            </div>
          </div>
        )}
      </div>
      <div>
        <p className="text-xs font-semibold">{meta?.label}</p>
        <p className="text-[10px] text-muted-foreground">{meta?.description}</p>
      </div>
    </div>
  );
}

// ── AI Models ─────────────────────────────────────────────────────────────
const AI_MODEL_GROUPS: { label: string; models: string[] }[] = [
  { label: "GPT-4o family",   models: ["gpt-4o-mini", "gpt-4o"] },
  { label: "GPT-4.1 family",  models: ["gpt-4.1-nano", "gpt-4.1-mini", "gpt-4.1"] },
  { label: "GPT-4 Turbo",     models: ["gpt-4-turbo", "gpt-4-turbo-preview"] },
  { label: "Reasoning",       models: ["o1-mini", "o3-mini", "o4-mini"] },
];
const AI_MODELS_FLAT = AI_MODEL_GROUPS.flatMap((g) => g.models);

// Pricing sourced from https://platform.openai.com/docs/pricing — per 1M tokens (USD)
const AI_MODEL_PRICING: Record<string, { input: number; output: number; note?: string }> = {
  "gpt-4o-mini":          { input: 0.15,  output: 0.60  },
  "gpt-4o":               { input: 2.50,  output: 10.00 },
  "gpt-4.1-nano":         { input: 0.10,  output: 0.40  },
  "gpt-4.1-mini":         { input: 0.40,  output: 1.60  },
  "gpt-4.1":              { input: 2.00,  output: 8.00  },
  "gpt-4-turbo":          { input: 10.00, output: 30.00 },
  "gpt-4-turbo-preview":  { input: 10.00, output: 30.00, note: "Legacy alias for gpt-4-turbo" },
  "o1-mini":              { input: 1.10,  output: 4.40,  note: "Reasoning model — thinking tokens billed as output" },
  "o3-mini":              { input: 1.10,  output: 4.40,  note: "Reasoning model — thinking tokens billed as output" },
  "o4-mini":              { input: 1.10,  output: 4.40,  note: "Reasoning model — thinking tokens billed as output" },
};

// Model capabilities — context window, max output, tool calling support
type ToolSupport = "full" | "limited" | "none";
const AI_MODEL_META: Record<string, { contextK: number; maxOutputK: number; tools: ToolSupport; toolNote?: string }> = {
  "gpt-4o-mini":         { contextK: 128,  maxOutputK: 16,  tools: "full" },
  "gpt-4o":              { contextK: 128,  maxOutputK: 16,  tools: "full" },
  "gpt-4.1-nano":        { contextK: 1024, maxOutputK: 32,  tools: "full" },
  "gpt-4.1-mini":        { contextK: 1024, maxOutputK: 32,  tools: "full" },
  "gpt-4.1":             { contextK: 1024, maxOutputK: 32,  tools: "full" },
  "gpt-4-turbo":         { contextK: 128,  maxOutputK: 4,   tools: "full" },
  "gpt-4-turbo-preview": { contextK: 128,  maxOutputK: 4,   tools: "full" },
  "o1-mini":             { contextK: 128,  maxOutputK: 65,  tools: "limited", toolNote: "No parallel tool calls" },
  "o3-mini":             { contextK: 200,  maxOutputK: 100, tools: "full" },
  "o4-mini":             { contextK: 200,  maxOutputK: 100, tools: "full" },
};

function fmtK(k: number) { return k >= 1024 ? `${k / 1024}M` : `${k}K`; }

const TOOL_BADGE: Record<ToolSupport, { label: string; className: string }> = {
  full:    { label: "Full support",   className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" },
  limited: { label: "Limited",        className: "bg-amber-500/10  text-amber-700  dark:text-amber-400  border-amber-500/20" },
  none:    { label: "Not supported",  className: "bg-red-500/10    text-red-700    dark:text-red-400    border-red-500/20" },
};

function ModelPricingCard({ model }: { model: string }) {
  const pricing = AI_MODEL_PRICING[model];
  const meta    = AI_MODEL_META[model];
  if (!pricing) return null;

  const toolBadge = meta ? TOOL_BADGE[meta.tools] : null;

  return (
    <div className="mt-3 rounded-lg border bg-muted/20 p-4 space-y-3" dir="ltr">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Model Details</span>
        <a
          href="https://platform.openai.com/docs/pricing"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-primary hover:underline"
        >
          openai.com/api/pricing ↗
        </a>
      </div>

      {/* ── Pricing row ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-md bg-background border px-3 py-2.5">
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-1">Input price</p>
          <p className="text-lg font-bold tabular-nums text-foreground">${pricing.input.toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground">per 1M tokens</p>
        </div>
        <div className="rounded-md bg-background border px-3 py-2.5">
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-1">Output price</p>
          <p className="text-lg font-bold tabular-nums text-foreground">${pricing.output.toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground">per 1M tokens</p>
        </div>
      </div>

      {/* ── Capabilities row ── */}
      {meta && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-md bg-background border px-3 py-2.5">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-1">Context window</p>
            <p className="text-base font-bold tabular-nums text-foreground">{fmtK(meta.contextK)}</p>
            <p className="text-[10px] text-muted-foreground">tokens</p>
          </div>
          <div className="rounded-md bg-background border px-3 py-2.5">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-1">Max output</p>
            <p className="text-base font-bold tabular-nums text-foreground">{fmtK(meta.maxOutputK)}</p>
            <p className="text-[10px] text-muted-foreground">tokens</p>
          </div>
          <div className="rounded-md bg-background border px-3 py-2.5">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-1">Tool calling</p>
            {toolBadge && (
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold mt-1 ${toolBadge.className}`}>
                {toolBadge.label}
              </span>
            )}
            {meta.toolNote && (
              <p className="text-[10px] text-muted-foreground mt-1 leading-snug">{meta.toolNote}</p>
            )}
          </div>
        </div>
      )}

      {/* ── Notes ── */}
      {pricing.note && (
        <p className="text-[10px] text-muted-foreground leading-relaxed">{pricing.note}</p>
      )}
    </div>
  );
}

// ── Currencies ────────────────────────────────────────────────────────────
const CURRENCIES = ['JOD', 'SAR', 'AED', 'EGP', 'KWD', 'QAR', 'BHD', 'OMR', 'MAD', 'LBP', 'IQD'] as const;
type Currency = typeof CURRENCIES[number];

// ── Password field with show/hide toggle ──────────────────────────────────
function SecretInput({ value, onChange, placeholder, dir = "ltr" }: {
  value: string | null | undefined;
  onChange: (v: string | null) => void;
  placeholder?: string;
  dir?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        placeholder={placeholder}
        className="font-mono bg-muted/30 pe-10"
        dir={dir}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute inset-y-0 end-0 flex items-center pe-3 text-muted-foreground hover:text-foreground transition-colors"
        tabIndex={-1}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

// ── Zod schema ────────────────────────────────────────────────────────────
const settingsSchema = z.object({
  otpExpiryMinutes: z.coerce.number().min(1).max(60),
  otpMaxAttempts: z.coerce.number().min(1).max(10),
  otpRateLimitCount: z.coerce.number().min(1).max(10),
  otpRateLimitWindowMinutes: z.coerce.number().min(1).max(60),
  aiModel: z.string().min(1),
  aiTemperature: z.coerce.number().min(0).max(1),
  aiMaxTurns: z.coerce.number().min(1).max(20),
  aiGuardrailLevel: z.enum(['strict', 'balanced', 'relaxed']),
  defaultLanguage: z.enum(['ar', 'en']),
  defaultCurrency: z.enum(['JOD', 'SAR', 'AED', 'EGP', 'KWD', 'QAR', 'BHD', 'OMR', 'MAD', 'LBP', 'IQD']),
  maxImagesPerProperty: z.coerce.number().min(1).max(50),
  autoApproveListings: z.boolean(),
  listingExpiryDays: z.coerce.number().min(1).max(365),
  maintenanceMode: z.boolean(),
  featureVoiceInput: z.boolean(),
  featureMapView: z.boolean(),
  featureContactRelease: z.boolean(),
  featureSellerWizard: z.boolean(),
  voiceCtaStyle: z.enum(['green_card', 'orb', 'waveform', 'sonar']),
  // Map provider
  mapProvider: z.enum(['osm', 'mapbox', 'google']),
  mapboxApiKey: z.string().nullable().optional(),
  googleMapsApiKey: z.string().nullable().optional(),
  // OTP provider
  otpProvider: z.enum(['console', 'twilio', 'unifonic', 'msegat']),
  twilioAccountSid: z.string().nullable().optional(),
  twilioAuthToken: z.string().nullable().optional(),
  twilioFromNumber: z.string().nullable().optional(),
  unifonicAppSid: z.string().nullable().optional(),
  unifonicSender: z.string().nullable().optional(),
  msegatApiKey: z.string().nullable().optional(),
  msegatSender: z.string().nullable().optional(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

// ── Page component ────────────────────────────────────────────────────────
export default function Settings() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useGetAdminSettings({
    query: { queryKey: getGetAdminSettingsQueryKey() }
  });

  const updateMutation = useUpdateAdminSettings();

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      otpExpiryMinutes: 5,
      otpMaxAttempts: 3,
      otpRateLimitCount: 3,
      otpRateLimitWindowMinutes: 60,
      aiModel: "gpt-4o-mini",
      aiTemperature: 0.3,
      aiMaxTurns: 10,
      aiGuardrailLevel: "balanced",
      defaultLanguage: "ar",
      defaultCurrency: "JOD",
      maxImagesPerProperty: 10,
      autoApproveListings: false,
      listingExpiryDays: 90,
      maintenanceMode: false,
      featureVoiceInput: true,
      featureMapView: true,
      featureContactRelease: true,
      featureSellerWizard: true,
      voiceCtaStyle: "waveform",
      mapProvider: "osm",
      mapboxApiKey: null,
      googleMapsApiKey: null,
      otpProvider: "console",
      twilioAccountSid: null,
      twilioAuthToken: null,
      twilioFromNumber: null,
      unifonicAppSid: null,
      unifonicSender: null,
      msegatApiKey: null,
      msegatSender: null,
    }
  });

  // Watch reactive fields for conditional rendering
  const otpProvider = form.watch('otpProvider');
  const mapProvider = form.watch('mapProvider');
  const aiModel = form.watch('aiModel');

  // Combobox open states
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);

  const initialized = useRef(false);

  useEffect(() => {
    if (settings && !initialized.current) {
      form.reset({
        otpExpiryMinutes: settings.otpExpiryMinutes,
        otpMaxAttempts: settings.otpMaxAttempts,
        otpRateLimitCount: settings.otpRateLimitCount,
        otpRateLimitWindowMinutes: settings.otpRateLimitWindowMinutes,
        aiModel: settings.aiModel,
        aiTemperature: settings.aiTemperature,
        aiMaxTurns: settings.aiMaxTurns,
        aiGuardrailLevel: settings.aiGuardrailLevel,
        defaultLanguage: settings.defaultLanguage,
        defaultCurrency: settings.defaultCurrency,
        maxImagesPerProperty: settings.maxImagesPerProperty,
        autoApproveListings: settings.autoApproveListings,
        listingExpiryDays: settings.listingExpiryDays,
        maintenanceMode: settings.maintenanceMode,
        featureVoiceInput: settings.featureVoiceInput,
        featureMapView: settings.featureMapView,
        featureContactRelease: settings.featureContactRelease,
        featureSellerWizard: settings.featureSellerWizard,
        voiceCtaStyle: settings.voiceCtaStyle,
        mapProvider: (settings.mapProvider ?? "osm") as "osm" | "mapbox" | "google",
        mapboxApiKey: settings.mapboxApiKey ?? null,
        googleMapsApiKey: settings.googleMapsApiKey ?? null,
        otpProvider: (settings.otpProvider ?? "console") as "console" | "twilio" | "unifonic" | "msegat",
        twilioAccountSid: settings.twilioAccountSid ?? null,
        twilioAuthToken: settings.twilioAuthToken ?? null,
        twilioFromNumber: settings.twilioFromNumber ?? null,
        unifonicAppSid: settings.unifonicAppSid ?? null,
        unifonicSender: settings.unifonicSender ?? null,
        msegatApiKey: settings.msegatApiKey ?? null,
        msegatSender: settings.msegatSender ?? null,
      });
      initialized.current = true;
    }
  }, [settings, form]);

  const onSubmit = (values: SettingsFormValues) => {
    updateMutation.mutate(
      { data: values },
      {
        onSuccess: (updated) => {
          toast({ title: t('settings.toast.successTitle'), description: t('settings.toast.successDesc') });
          queryClient.setQueryData(getGetAdminSettingsQueryKey(), updated);
          form.reset(values);
        },
        onError: (err) => {
          toast({ title: t('settings.toast.errorTitle'), description: err.message || t('settings.toast.errorDesc'), variant: "destructive" });
        }
      }
    );
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-10 w-full bg-muted rounded-md mb-6" />
        <div className="h-[600px] w-full bg-card border rounded-md" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('settings.title')}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t('settings.subtitle')}</p>
        </div>
        <button
          onClick={form.handleSubmit(onSubmit)}
          disabled={updateMutation.isPending || !form.formState.isDirty}
          className={cn(
            "flex items-center gap-2 h-9 px-4 rounded-md text-sm font-medium transition-all shadow-sm",
            form.formState.isDirty
              ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20"
              : "bg-muted text-muted-foreground cursor-not-allowed border"
          )}
        >
          {updateMutation.isPending ? (
            <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {t('settings.submit')}
        </button>
      </div>

      <Form {...form}>
        <form className="bg-card border rounded-lg overflow-hidden shadow-sm">
          <Tabs defaultValue="engine" className="w-full">
            <div className="border-b bg-muted/20 px-4 overflow-x-auto">
              <TabsList className="bg-transparent h-14 space-x-6 rtl:space-x-reverse">
                <TabsTrigger value="engine" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-4 font-medium text-muted-foreground data-[state=active]:text-foreground">
                  <BrainCircuit className="w-4 h-4 me-2" /> {t('settings.tabs.engine')}
                </TabsTrigger>
                <TabsTrigger value="security" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-4 font-medium text-muted-foreground data-[state=active]:text-foreground">
                  <Shield className="w-4 h-4 me-2" /> {t('settings.tabs.security')}
                </TabsTrigger>
                <TabsTrigger value="features" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-4 font-medium text-muted-foreground data-[state=active]:text-foreground">
                  <LayoutGrid className="w-4 h-4 me-2" /> {t('settings.tabs.features')}
                </TabsTrigger>
                <TabsTrigger value="platform" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-4 font-medium text-muted-foreground data-[state=active]:text-foreground">
                  <Globe className="w-4 h-4 me-2" /> {t('settings.tabs.platform')}
                </TabsTrigger>
                <TabsTrigger value="system" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-4 font-medium text-muted-foreground data-[state=active]:text-foreground">
                  <Server className="w-4 h-4 me-2" /> {t('settings.tabs.system')}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* ── AI Engine Tab ────────────────────────────────────────── */}
            <TabsContent value="engine" className="p-6 m-0 focus-visible:outline-none">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* Model — searchable combobox */}
                <FormField control={form.control} name="aiModel" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{t('settings.engine.model')}</FormLabel>
                    <Popover open={modelOpen} onOpenChange={setModelOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <button
                            type="button"
                            className={cn(
                              "flex w-full items-center justify-between h-10 rounded-md border border-input bg-muted/30 px-3 py-2 text-sm font-mono ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                            )}
                            dir="ltr"
                          >
                            <span>{field.value || "Select model…"}</span>
                            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                          </button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[260px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search models…" />
                          <CommandEmpty>No model found.</CommandEmpty>
                          <div className="max-h-64 overflow-y-auto">
                            {AI_MODEL_GROUPS.map((group) => (
                              <CommandGroup key={group.label} heading={group.label}>
                                {group.models.map((m) => (
                                  <CommandItem
                                    key={m}
                                    value={m}
                                    onSelect={() => { field.onChange(m); setModelOpen(false); }}
                                    className="font-mono text-sm"
                                  >
                                    <Check className={cn("me-2 h-4 w-4", field.value === m ? "opacity-100" : "opacity-0")} />
                                    {m}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            ))}
                          </div>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <p className="text-[10px] text-muted-foreground">{t('settings.engine.modelDesc')}</p>
                    <ModelPricingCard model={aiModel} />
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Temperature — slider + number input */}
                <FormField control={form.control} name="aiTemperature" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                      {t('settings.engine.temperature')}
                      <span className="ms-2 font-bold text-primary tabular-nums">{Number(field.value).toFixed(1)}</span>
                    </FormLabel>
                    <FormControl>
                      <div className="space-y-3">
                        <Slider
                          value={[Number(field.value)]}
                          onValueChange={([v]) => field.onChange(v)}
                          min={0} max={1} step={0.1}
                          className="w-full"
                        />
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground tabular-nums w-6">0.0</span>
                          <div className="flex-1" />
                          <span className="text-[10px] text-muted-foreground tabular-nums w-6 text-end">1.0</span>
                          <Input
                            type="number"
                            step="0.1" min="0" max="1"
                            value={field.value}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            className="w-20 font-mono bg-muted/30 text-sm h-8"
                            dir="ltr"
                          />
                        </div>
                      </div>
                    </FormControl>
                    <p className="text-[10px] text-muted-foreground">{t('settings.engine.temperatureDesc')}</p>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Max Turns */}
                <FormField control={form.control} name="aiMaxTurns" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{t('settings.engine.maxTurns')}</FormLabel>
                    <FormControl>
                      <Input type="number" className="font-mono bg-muted/30" dir="ltr" {...field} />
                    </FormControl>
                    <p className="text-[10px] text-muted-foreground">{t('settings.engine.maxTurnsDesc')}</p>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Guardrail */}
                <FormField control={form.control} name="aiGuardrailLevel" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{t('settings.engine.guardrail')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-muted/30 font-mono text-sm">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="strict">{t('settings.engine.guardrailOptions.strict')}</SelectItem>
                        <SelectItem value="balanced">{t('settings.engine.guardrailOptions.balanced')}</SelectItem>
                        <SelectItem value="relaxed">{t('settings.engine.guardrailOptions.relaxed')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">{t('settings.engine.guardrailDesc')}</p>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </TabsContent>

            {/* ── Security & Auth Tab ──────────────────────────────────── */}
            <TabsContent value="security" className="p-6 m-0 focus-visible:outline-none space-y-6">
              {/* OTP timing fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <FormField control={form.control} name="otpExpiryMinutes" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{t('settings.security.otpExpiry')}</FormLabel>
                    <FormControl><Input type="number" className="font-mono bg-muted/30" dir="ltr" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="otpMaxAttempts" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{t('settings.security.maxAttempts')}</FormLabel>
                    <FormControl><Input type="number" className="font-mono bg-muted/30" dir="ltr" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="otpRateLimitCount" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{t('settings.security.rateLimitCap')}</FormLabel>
                    <FormControl><Input type="number" className="font-mono bg-muted/30" dir="ltr" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="otpRateLimitWindowMinutes" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{t('settings.security.rateLimitWindow')}</FormLabel>
                    <FormControl><Input type="number" className="font-mono bg-muted/30" dir="ltr" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* OTP Provider selection */}
              <div className="border-t pt-6 space-y-5">
                <FormField control={form.control} name="otpProvider" render={({ field }) => (
                  <FormItem className="max-w-sm">
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{t('settings.security.otpProvider')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-muted/30 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="console">{t('settings.security.otpProviders.console')}</SelectItem>
                        <SelectItem value="twilio">{t('settings.security.otpProviders.twilio')}</SelectItem>
                        <SelectItem value="unifonic">{t('settings.security.otpProviders.unifonic')}</SelectItem>
                        <SelectItem value="msegat">{t('settings.security.otpProviders.msegat')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">{t('settings.security.otpProviderDesc')}</p>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Conditional credentials — Twilio */}
                {otpProvider === 'twilio' && (
                  <div className="rounded-lg border bg-muted/10 p-5 space-y-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Key className="w-4 h-4 text-primary" />
                      {t('settings.security.credentialsTitle')} — Twilio
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField control={form.control} name="twilioAccountSid" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">{t('settings.security.twilioAccountSid')}</FormLabel>
                          <FormControl>
                            <SecretInput value={field.value} onChange={field.onChange} placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="twilioAuthToken" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">{t('settings.security.twilioAuthToken')}</FormLabel>
                          <FormControl>
                            <SecretInput value={field.value} onChange={field.onChange} placeholder="••••••••••••••••••••••••••••••••" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="twilioFromNumber" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">{t('settings.security.twilioFromNumber')}</FormLabel>
                          <FormControl>
                            <Input value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)} placeholder="+1234567890" className="font-mono bg-muted/30" dir="ltr" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>
                )}

                {/* Conditional credentials — Unifonic */}
                {otpProvider === 'unifonic' && (
                  <div className="rounded-lg border bg-muted/10 p-5 space-y-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Key className="w-4 h-4 text-primary" />
                      {t('settings.security.credentialsTitle')} — Unifonic
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="unifonicAppSid" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">{t('settings.security.unifonicAppSid')}</FormLabel>
                          <FormControl>
                            <SecretInput value={field.value} onChange={field.onChange} placeholder="Your Unifonic App SID" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="unifonicSender" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">{t('settings.security.unifonicSender')}</FormLabel>
                          <FormControl>
                            <Input value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)} placeholder="AqariTalk" className="font-mono bg-muted/30" dir="ltr" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>
                )}

                {/* Conditional credentials — Msegat */}
                {otpProvider === 'msegat' && (
                  <div className="rounded-lg border bg-muted/10 p-5 space-y-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Key className="w-4 h-4 text-primary" />
                      {t('settings.security.credentialsTitle')} — Msegat
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="msegatApiKey" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">{t('settings.security.msegatApiKey')}</FormLabel>
                          <FormControl>
                            <SecretInput value={field.value} onChange={field.onChange} placeholder="Your Msegat API Key" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="msegatSender" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">{t('settings.security.msegatSender')}</FormLabel>
                          <FormControl>
                            <Input value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)} placeholder="AqariTalk" className="font-mono bg-muted/30" dir="ltr" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ── Feature Flags Tab ────────────────────────────────────── */}
            <TabsContent value="features" className="p-6 m-0 focus-visible:outline-none space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(["featureVoiceInput", "featureMapView", "featureContactRelease", "featureSellerWizard"] as const).map((name) => {
                  const key = name.replace("feature", "").charAt(0).toLowerCase() + name.replace("feature", "").slice(1);
                  const labelKey = key.charAt(0).toLowerCase() + key.slice(1);
                  const featureKeys: Record<string, { label: string; desc: string }> = {
                    voiceInput: { label: t('settings.features.voiceInput'), desc: t('settings.features.voiceInputDesc') },
                    mapView: { label: t('settings.features.mapView'), desc: t('settings.features.mapViewDesc') },
                    contactRelease: { label: t('settings.features.contactRelease'), desc: t('settings.features.contactReleaseDesc') },
                    sellerWizard: { label: t('settings.features.sellerWizard'), desc: t('settings.features.sellerWizardDesc') },
                  };
                  const meta = featureKeys[labelKey] ?? { label: name, desc: "" };
                  return (
                    <FormField key={name} control={form.control} name={name} render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted/10">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm font-semibold">{meta.label}</FormLabel>
                          <p className="text-xs text-muted-foreground">{meta.desc}</p>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )} />
                  );
                })}
              </div>

              <div className="border-t pt-6">
                <FormField control={form.control} name="voiceCtaStyle" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{t('settings.features.voiceAesthetic')}</FormLabel>
                    <div className="flex items-start gap-6 mt-1">
                      <div className="flex-1 max-w-xs space-y-2">
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-muted/30"><SelectValue /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="green_card">{t('settings.features.voiceStyles.greenCard')}</SelectItem>
                            <SelectItem value="orb">{t('settings.features.voiceStyles.orb')}</SelectItem>
                            <SelectItem value="waveform">{t('settings.features.voiceStyles.waveform')}</SelectItem>
                            <SelectItem value="sonar">{t('settings.features.voiceStyles.sonar')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-[10px] text-muted-foreground">{t('settings.features.voiceAestheticDesc')}</p>
                        <FormMessage />
                      </div>
                      <VoiceStylePreview style={field.value} />
                    </div>
                  </FormItem>
                )} />
              </div>
            </TabsContent>

            {/* ── Regional & Rules Tab ─────────────────────────────────── */}
            <TabsContent value="platform" className="p-6 m-0 focus-visible:outline-none space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Default Locale */}
                <FormField control={form.control} name="defaultLanguage" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{t('settings.platform.defaultLocale')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-muted/30"><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="en">{t('settings.platform.localeEn')}</SelectItem>
                        <SelectItem value="ar">{t('settings.platform.localeAr')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Base Currency — searchable combobox */}
                <FormField control={form.control} name="defaultCurrency" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{t('settings.platform.baseCurrency')}</FormLabel>
                    <Popover open={currencyOpen} onOpenChange={setCurrencyOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <button
                            type="button"
                            className={cn(
                              "flex w-full items-center justify-between h-10 rounded-md border border-input bg-muted/30 px-3 py-2 text-sm font-mono ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                            )}
                          >
                            <span>{field.value || t('settings.platform.baseCurrency')}</span>
                            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                          </button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[200px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder={t('settings.platform.currencySearch')} />
                          <CommandEmpty>{t('settings.platform.currencyNotFound')}</CommandEmpty>
                          <CommandGroup className="max-h-52 overflow-y-auto">
                            {CURRENCIES.map((c) => (
                              <CommandItem
                                key={c}
                                value={c}
                                onSelect={() => { field.onChange(c as Currency); setCurrencyOpen(false); }}
                                className="font-mono"
                              >
                                <Check className={cn("me-2 h-4 w-4", field.value === c ? "opacity-100" : "opacity-0")} />
                                {c}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Max Images */}
                <FormField control={form.control} name="maxImagesPerProperty" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{t('settings.platform.maxImages')}</FormLabel>
                    <FormControl><Input type="number" className="font-mono bg-muted/30" dir="ltr" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Listing TTL */}
                <FormField control={form.control} name="listingExpiryDays" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{t('settings.platform.listingTtl')}</FormLabel>
                    <FormControl><Input type="number" className="font-mono bg-muted/30" dir="ltr" {...field} /></FormControl>
                    <p className="text-[10px] text-muted-foreground">{t('settings.platform.listingTtlDesc')}</p>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Auto-approve */}
                <FormField control={form.control} name="autoApproveListings" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted/10 col-span-1 md:col-span-2">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-semibold">{t('settings.platform.autoApprove')}</FormLabel>
                      <p className="text-xs text-muted-foreground">{t('settings.platform.autoApproveDesc')}</p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )} />
              </div>

              {/* Map Provider section */}
              <div className="border-t pt-6 space-y-5">
                <FormField control={form.control} name="mapProvider" render={({ field }) => (
                  <FormItem className="max-w-sm">
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{t('settings.platform.mapProvider')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-muted/30 text-sm"><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="osm">{t('settings.platform.mapProviders.osm')}</SelectItem>
                        <SelectItem value="mapbox">{t('settings.platform.mapProviders.mapbox')}</SelectItem>
                        <SelectItem value="google">{t('settings.platform.mapProviders.google')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">{t('settings.platform.mapProviderDesc')}</p>
                    <FormMessage />
                  </FormItem>
                )} />

                {mapProvider === 'mapbox' && (
                  <div className="rounded-lg border bg-muted/10 p-5 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
                      <Key className="w-4 h-4 text-primary" />
                      {t('settings.platform.mapboxApiKey')}
                    </div>
                    <FormField control={form.control} name="mapboxApiKey" render={({ field }) => (
                      <FormItem className="max-w-lg">
                        <FormControl>
                          <SecretInput value={field.value} onChange={field.onChange} placeholder={t('settings.platform.mapKeyPlaceholder')} />
                        </FormControl>
                        <p className="text-[10px] text-muted-foreground">{t('settings.platform.mapKeyNote')}</p>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                )}

                {mapProvider === 'google' && (
                  <div className="rounded-lg border bg-muted/10 p-5 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
                      <Key className="w-4 h-4 text-primary" />
                      {t('settings.platform.googleMapsApiKey')}
                    </div>
                    <FormField control={form.control} name="googleMapsApiKey" render={({ field }) => (
                      <FormItem className="max-w-lg">
                        <FormControl>
                          <SecretInput value={field.value} onChange={field.onChange} placeholder={t('settings.platform.mapKeyPlaceholder')} />
                        </FormControl>
                        <p className="text-[10px] text-muted-foreground">{t('settings.platform.mapKeyNote')}</p>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ── System State Tab ─────────────────────────────────────── */}
            <TabsContent value="system" className="p-6 m-0 focus-visible:outline-none">
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 flex items-start gap-4">
                <Server className="w-8 h-8 text-destructive shrink-0" />
                <div className="space-y-4 w-full">
                  <div>
                    <h3 className="text-lg font-bold text-destructive">{t('settings.system.maintenanceTitle')}</h3>
                    <p className="text-sm text-destructive/80 mt-1">{t('settings.system.maintenanceDesc')}</p>
                  </div>
                  <FormField control={form.control} name="maintenanceMode" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-md border border-destructive/30 p-4 bg-destructive/5">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm font-semibold text-destructive">{t('settings.system.engageLockdown')}</FormLabel>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-destructive" />
                      </FormControl>
                    </FormItem>
                  )} />
                </div>
              </div>
            </TabsContent>

          </Tabs>
        </form>
      </Form>
    </div>
  );
}
