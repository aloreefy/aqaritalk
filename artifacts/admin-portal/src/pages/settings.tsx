import { useEffect, useRef } from "react";
import { useGetAdminSettings, useUpdateAdminSettings, getGetAdminSettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Save, Server, Shield, BrainCircuit, Globe, LayoutGrid } from "lucide-react";
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
          toast({ title: "Configuration Updated", description: "System parameters successfully applied." });
          queryClient.setQueryData(getGetAdminSettingsQueryKey(), updated);
          // Reset dirty state
          form.reset(values);
        },
        onError: (err) => {
          toast({ title: "Configuration Error", description: err.message || "Failed to apply parameters", variant: "destructive" });
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
          <h2 className="text-2xl font-bold tracking-tight">System Configuration</h2>
          <p className="text-sm text-muted-foreground mt-1">Core platform parameters, AI model tuning, and feature flags.</p>
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
          Commit Changes
        </button>
      </div>

      <Form {...form}>
        <form className="bg-card border rounded-lg overflow-hidden shadow-sm">
          <Tabs defaultValue="engine" className="w-full">
            <div className="border-b bg-muted/20 px-4">
              <TabsList className="bg-transparent h-14 space-x-6">
                <TabsTrigger value="engine" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-4 font-medium text-muted-foreground data-[state=active]:text-foreground">
                  <BrainCircuit className="w-4 h-4 mr-2" /> AI Engine
                </TabsTrigger>
                <TabsTrigger value="security" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-4 font-medium text-muted-foreground data-[state=active]:text-foreground">
                  <Shield className="w-4 h-4 mr-2" /> Security & Auth
                </TabsTrigger>
                <TabsTrigger value="features" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-4 font-medium text-muted-foreground data-[state=active]:text-foreground">
                  <LayoutGrid className="w-4 h-4 mr-2" /> Feature Flags
                </TabsTrigger>
                <TabsTrigger value="platform" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-4 font-medium text-muted-foreground data-[state=active]:text-foreground">
                  <Globe className="w-4 h-4 mr-2" /> Regional & Rules
                </TabsTrigger>
                <TabsTrigger value="system" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-4 font-medium text-muted-foreground data-[state=active]:text-foreground">
                  <Server className="w-4 h-4 mr-2" /> System State
                </TabsTrigger>
              </TabsList>
            </div>

            {/* AI Engine Tab */}
            <TabsContent value="engine" className="p-6 m-0 focus-visible:outline-none">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField control={form.control} name="aiModel" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Inference Model</FormLabel>
                    <FormControl>
                      <Input className="font-mono bg-muted/30" {...field} />
                    </FormControl>
                    <p className="text-[10px] text-muted-foreground">Provider identifier (e.g. gpt-4o, claude-3-opus).</p>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="aiTemperature" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Temperature</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" min="0" max="1" className="font-mono bg-muted/30" {...field} />
                    </FormControl>
                    <p className="text-[10px] text-muted-foreground">Creativity vs precision (0.0 to 1.0). Lower is more deterministic.</p>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="aiMaxTurns" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Max Conversation Turns</FormLabel>
                    <FormControl>
                      <Input type="number" className="font-mono bg-muted/30" {...field} />
                    </FormControl>
                    <p className="text-[10px] text-muted-foreground">Hard limit to prevent infinite loops.</p>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="aiGuardrailLevel" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Guardrail Strictness</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-muted/30 font-mono text-sm">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="strict">Strict (Blocks all edge cases)</SelectItem>
                        <SelectItem value="balanced">Balanced (Recommended)</SelectItem>
                        <SelectItem value="relaxed">Relaxed (Fluid conversation)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">Controls off-topic detection aggressiveness.</p>
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
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">OTP Expiry (Min)</FormLabel>
                    <FormControl>
                      <Input type="number" className="font-mono bg-muted/30" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="otpMaxAttempts" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Max OTP Attempts</FormLabel>
                    <FormControl>
                      <Input type="number" className="font-mono bg-muted/30" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="otpRateLimitCount" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Rate Limit Cap</FormLabel>
                    <FormControl>
                      <Input type="number" className="font-mono bg-muted/30" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="otpRateLimitWindowMinutes" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Rate Limit Window (Min)</FormLabel>
                    <FormControl>
                      <Input type="number" className="font-mono bg-muted/30" {...field} />
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
                      <FormLabel className="text-sm font-semibold">Voice Input</FormLabel>
                      <p className="text-xs text-muted-foreground">Allow voice recording for AI interaction.</p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )} />

                <FormField control={form.control} name="featureMapView" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted/10">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-semibold">Interactive Map</FormLabel>
                      <p className="text-xs text-muted-foreground">Show map visualization for search results.</p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )} />

                <FormField control={form.control} name="featureContactRelease" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted/10">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-semibold">Contact Release Contract</FormLabel>
                      <p className="text-xs text-muted-foreground">Enable digital commission agreements.</p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )} />

                <FormField control={form.control} name="featureSellerWizard" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted/10">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-semibold">AI Seller Wizard</FormLabel>
                      <p className="text-xs text-muted-foreground">Allow property addition via conversational AI.</p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )} />
              </div>

              <div className="border-t pt-6">
                <FormField control={form.control} name="voiceCtaStyle" render={({ field }) => (
                  <FormItem className="max-w-md">
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Voice Interface Aesthetic</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-muted/30">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="green_card">Green Card (Classic)</SelectItem>
                        <SelectItem value="orb">Floating Orb (Modern)</SelectItem>
                        <SelectItem value="waveform">Waveform (Technical)</SelectItem>
                        <SelectItem value="sonar">Sonar Pulse (Dynamic)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">Visual style of the main AI interaction component.</p>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </TabsContent>

            {/* Platform Tab */}
            <TabsContent value="platform" className="p-6 m-0 focus-visible:outline-none">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField control={form.control} name="defaultLanguage" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Default Locale</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-muted/30">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="en">English (US)</SelectItem>
                        <SelectItem value="ar">Arabic (Standard)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="defaultCurrency" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Base Currency</FormLabel>
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
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Max Assets per Listing</FormLabel>
                    <FormControl>
                      <Input type="number" className="font-mono bg-muted/30" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="listingExpiryDays" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Listing TTL (Days)</FormLabel>
                    <FormControl>
                      <Input type="number" className="font-mono bg-muted/30" {...field} />
                    </FormControl>
                    <p className="text-[10px] text-muted-foreground">Days until automatic archival.</p>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="autoApproveListings" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted/10 col-span-1 md:col-span-2">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-semibold">Auto-Approve Listings</FormLabel>
                      <p className="text-xs text-muted-foreground">Bypass manual administrator review for new properties.</p>
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
                    <h3 className="text-lg font-bold text-destructive">Platform Maintenance Mode</h3>
                    <p className="text-sm text-destructive/80 mt-1">
                      Engaging maintenance mode will immediately suspend all active user sessions and disable API access for non-administrators.
                    </p>
                  </div>
                  
                  <FormField control={form.control} name="maintenanceMode" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-md border border-destructive/30 p-4 bg-destructive/5">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm font-semibold text-destructive">Engage Lockdown</FormLabel>
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
