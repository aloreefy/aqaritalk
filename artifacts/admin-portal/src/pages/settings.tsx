import { useEffect, useRef } from "react";
import { useGetAdminSettings, useUpdateAdminSettings, getGetAdminSettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Save, Server, Shield, BrainCircuit, Globe, LayoutGrid, Mic, Bot, ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "react-i18next";

// AqariTalk brand emerald — matches the public app's --primary token
const EM   = "hsl(161,100%,21%)";
const EM55 = "hsl(161 100% 21% / 0.55)";
const EM35 = "hsl(161 100% 21% / 0.35)";
const EM30 = "hsl(161 100% 21% / 0.30)";
const EM10 = "hsl(161 100% 21% / 0.10)";

// Animations copied verbatim from the public app's index.css
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

      {/* ── container matches the actual component's outer shape ── */}
      <div className="rounded-3xl overflow-hidden" style={{ height: 96 }}>

        {/* GREEN CARD — emerald bg, dot-grid, Bot icon, Arabic text, white arrow */}
        {style === 'green_card' && (
          <div className="relative h-full flex items-center gap-3 px-4" style={{ background: EM }}>
            <div
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{
                backgroundImage: "radial-gradient(circle at 100% 100%, #fff 0, #fff 3px, transparent 3px)",
                backgroundSize: "20px 20px",
              }}
            />
            <div className="relative z-10 flex-1 min-w-0" dir="rtl">
              <div className="flex items-center gap-1 mb-1" style={{ color: "rgba(255,255,255,0.8)" }}>
                <Bot className="w-3 h-3 shrink-0" />
                <span className="text-[8px] font-bold tracking-widest">الذكاء الاصطناعي</span>
              </div>
              <p className="text-white font-extrabold text-[11px] leading-tight mb-0.5">تحدث مع وكيلك الذكي</p>
              <p className="text-[9px] leading-tight" style={{ color: "rgba(255,255,255,0.7)" }}>صِف ما تبحث عنه بالصوت</p>
            </div>
            <div
              className="relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-md"
              style={{ background: "white", color: EM }}
            >
              <ArrowLeft className="w-4 h-4" />
            </div>
          </div>
        )}

        {/* ORB — dark gradient canvas, emerald orb with radial gradient + glow, 3 ripple rings */}
        {style === 'orb' && (
          <div
            className="h-full flex flex-col items-center justify-center gap-2"
            style={{ background: "linear-gradient(160deg, #0d1a12 0%, #0a1a0e 100%)" }}
          >
            <div className="relative flex items-center justify-center" style={{ width: 48, height: 48 }}>
              <div className="vpa-ring" />
              <div className="vpa-ring vpa-ring-2" />
              <div className="vpa-ring vpa-ring-3" />
              <div
                className="vpa-orb relative z-10 rounded-full flex items-center justify-center"
                style={{
                  width: 48, height: 48,
                  background: `radial-gradient(circle at 35% 35%, ${EM}, ${EM55})`,
                  boxShadow: `0 0 20px 6px ${EM35}`,
                }}
              >
                <Mic size={20} className="text-white" strokeWidth={1.75} />
              </div>
            </div>
            <p className="text-white font-extrabold text-sm tracking-tight">كلّمني</p>
          </div>
        )}

        {/* WAVEFORM — card bg, 24 emerald bars with bar-wave animation */}
        {style === 'waveform' && (
          <div className="h-full bg-card border flex flex-col items-center justify-center gap-2 px-3">
            <p className="font-extrabold text-foreground text-[11px]">اسألني عن أي عقار</p>
            <div className="flex items-end justify-center gap-[2.5px]" style={{ height: 28 }}>
              {Array.from({ length: 24 }).map((_, i) => (
                <div
                  key={i}
                  className="vpa-bar"
                  style={{
                    height: 28,
                    animationDelay:    `${((i * 1.1) / 24).toFixed(3)}s`,
                    animationDuration: `${0.9 + (i % 5) * 0.08}s`,
                    opacity: 0.4 + 0.6 * Math.abs(Math.sin((i / 24) * Math.PI)),
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* SONAR — card bg, 4 radar-ping rings, primary/10 circle, mic icon, text */}
        {style === 'sonar' && (
          <div className="h-full bg-card border flex items-center gap-4 px-4">
            <div className="relative flex items-center justify-center shrink-0" style={{ width: 40, height: 40 }}>
              <div className="vpa-radar" />
              <div className="vpa-radar vpa-radar-2" />
              <div className="vpa-radar vpa-radar-3" />
              <div className="vpa-radar vpa-radar-4" />
              <div
                className="relative z-10 rounded-full flex items-center justify-center"
                style={{ width: 40, height: 40, background: EM10, border: `1px solid ${EM30}` }}
              >
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
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function Settings() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: settings, isLoading } = useGetAdminSettings({
    query: {
      queryKey: getGetAdminSettingsQueryKey()
    }
  });

  const updateMutation = useUpdateAdminSettings();
  
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      otpExpiryMinutes: 5,
      otpMaxAttempts: 3,
      otpRateLimitCount: 3,
      otpRateLimitWindowMinutes: 60,
      aiModel: "gpt-4o",
      aiTemperature: 0.3,
      aiMaxTurns: 10,
      aiGuardrailLevel: "balanced",
      defaultLanguage: "en",
      defaultCurrency: "AED",
      maxImagesPerProperty: 10,
      autoApproveListings: false,
      listingExpiryDays: 30,
      maintenanceMode: false,
      featureVoiceInput: true,
      featureMapView: true,
      featureContactRelease: true,
      featureSellerWizard: true,
      voiceCtaStyle: "waveform",
    }
  });

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
            <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
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

            {/* AI Engine Tab */}
            <TabsContent value="engine" className="p-6 m-0 focus-visible:outline-none">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField control={form.control} name="aiModel" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{t('settings.engine.model')}</FormLabel>
                    <FormControl>
                      <Input className="font-mono bg-muted/30" dir="ltr" {...field} />
                    </FormControl>
                    <p className="text-[10px] text-muted-foreground">{t('settings.engine.modelDesc')}</p>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="aiTemperature" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{t('settings.engine.temperature')}</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" min="0" max="1" className="font-mono bg-muted/30" dir="ltr" {...field} />
                    </FormControl>
                    <p className="text-[10px] text-muted-foreground">{t('settings.engine.temperatureDesc')}</p>
                    <FormMessage />
                  </FormItem>
                )} />

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

                <FormField control={form.control} name="aiGuardrailLevel" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{t('settings.engine.guardrail')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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

            {/* Security Tab */}
            <TabsContent value="security" className="p-6 m-0 focus-visible:outline-none">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <FormField control={form.control} name="otpExpiryMinutes" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{t('settings.security.otpExpiry')}</FormLabel>
                    <FormControl>
                      <Input type="number" className="font-mono bg-muted/30" dir="ltr" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="otpMaxAttempts" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{t('settings.security.maxAttempts')}</FormLabel>
                    <FormControl>
                      <Input type="number" className="font-mono bg-muted/30" dir="ltr" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="otpRateLimitCount" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{t('settings.security.rateLimitCap')}</FormLabel>
                    <FormControl>
                      <Input type="number" className="font-mono bg-muted/30" dir="ltr" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="otpRateLimitWindowMinutes" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{t('settings.security.rateLimitWindow')}</FormLabel>
                    <FormControl>
                      <Input type="number" className="font-mono bg-muted/30" dir="ltr" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </TabsContent>

            {/* Features Tab */}
            <TabsContent value="features" className="p-6 m-0 focus-visible:outline-none space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="featureVoiceInput" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted/10">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-semibold">{t('settings.features.voiceInput')}</FormLabel>
                      <p className="text-xs text-muted-foreground">{t('settings.features.voiceInputDesc')}</p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )} />

                <FormField control={form.control} name="featureMapView" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted/10">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-semibold">{t('settings.features.mapView')}</FormLabel>
                      <p className="text-xs text-muted-foreground">{t('settings.features.mapViewDesc')}</p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )} />

                <FormField control={form.control} name="featureContactRelease" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted/10">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-semibold">{t('settings.features.contactRelease')}</FormLabel>
                      <p className="text-xs text-muted-foreground">{t('settings.features.contactReleaseDesc')}</p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )} />

                <FormField control={form.control} name="featureSellerWizard" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted/10">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-semibold">{t('settings.features.sellerWizard')}</FormLabel>
                      <p className="text-xs text-muted-foreground">{t('settings.features.sellerWizardDesc')}</p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )} />
              </div>

              <div className="border-t pt-6">
                <FormField control={form.control} name="voiceCtaStyle" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{t('settings.features.voiceAesthetic')}</FormLabel>
                    <div className="flex items-start gap-6 mt-1">
                      <div className="flex-1 max-w-xs space-y-2">
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-muted/30">
                              <SelectValue />
                            </SelectTrigger>
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

            {/* Platform Tab */}
            <TabsContent value="platform" className="p-6 m-0 focus-visible:outline-none">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField control={form.control} name="defaultLanguage" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{t('settings.platform.defaultLocale')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-muted/30">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="en">{t('settings.platform.localeEn')}</SelectItem>
                        <SelectItem value="ar">{t('settings.platform.localeAr')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="defaultCurrency" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{t('settings.platform.baseCurrency')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-muted/30 font-mono">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {['JOD', 'SAR', 'AED', 'EGP', 'KWD', 'QAR', 'BHD', 'OMR', 'MAD', 'LBP', 'IQD'].map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="maxImagesPerProperty" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{t('settings.platform.maxImages')}</FormLabel>
                    <FormControl>
                      <Input type="number" className="font-mono bg-muted/30" dir="ltr" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="listingExpiryDays" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{t('settings.platform.listingTtl')}</FormLabel>
                    <FormControl>
                      <Input type="number" className="font-mono bg-muted/30" dir="ltr" {...field} />
                    </FormControl>
                    <p className="text-[10px] text-muted-foreground">{t('settings.platform.listingTtlDesc')}</p>
                    <FormMessage />
                  </FormItem>
                )} />

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
            </TabsContent>

            {/* System Tab */}
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
                        <Switch 
                          checked={field.value} 
                          onCheckedChange={field.onChange}
                          className="data-[state=checked]:bg-destructive" 
                        />
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
