import { useEffect, useRef } from "react";
import { useGetCommissionSettings, useUpdateCommissionSettings, getGetCommissionSettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { BadgePercent, Save, AlertTriangle } from "lucide-react";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

const commissionSchema = z.object({
  defaultBuyerPct: z.coerce.number().min(0).max(10),
  defaultSellerPct: z.coerce.number().min(0).max(10),
  negotiable: z.boolean(),
});

type CommissionFormValues = z.infer<typeof commissionSchema>;

export default function Commission() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: settings, isLoading } = useGetCommissionSettings({
    query: {
      queryKey: getGetCommissionSettingsQueryKey()
    }
  });

  const updateMutation = useUpdateCommissionSettings();
  
  const form = useForm<CommissionFormValues>({
    resolver: zodResolver(commissionSchema),
    defaultValues: {
      defaultBuyerPct: 0,
      defaultSellerPct: 0,
      negotiable: false,
    }
  });

  const initialized = useRef(false);
  
  useEffect(() => {
    if (settings && !initialized.current) {
      form.reset({
        defaultBuyerPct: settings.defaultBuyerPct,
        defaultSellerPct: settings.defaultSellerPct,
        negotiable: settings.negotiable,
      });
      initialized.current = true;
    }
  }, [settings, form]);

  const onSubmit = (values: CommissionFormValues) => {
    updateMutation.mutate(
      { data: values },
      {
        onSuccess: (updated) => {
          toast({ title: "Configuration Updated", description: "Commission rates have been synchronized." });
          queryClient.setQueryData(getGetCommissionSettingsQueryKey(), updated);
        }
      }
    );
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6 max-w-2xl">
        <div className="h-10 w-full bg-muted rounded-md mb-6" />
        <div className="h-64 w-full bg-card border rounded-md" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Commission Architecture</h2>
        <p className="text-sm text-muted-foreground mt-1">Configure global fee structures for platform transactions.</p>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
        <div>
          <h4 className="text-sm font-semibold text-amber-600">Global Revenue Impact</h4>
          <p className="text-xs text-amber-600/80 mt-1">
            Modifications to these parameters immediately affect all new contact releases and smart contracts. 
            Existing agreements are locked at their historical rates.
          </p>
        </div>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden shadow-sm">
        <div className="p-5 border-b bg-muted/20 flex items-center gap-2">
          <BadgePercent className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Fee Parameters</h3>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="defaultBuyerPct"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Buyer Commission (%)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          type="number" 
                          step="0.1" 
                          className="font-mono pl-3 pr-8"
                          {...field} 
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">%</div>
                      </div>
                    </FormControl>
                    <p className="text-[10px] text-muted-foreground">Standard fee applied to the buyer side.</p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="defaultSellerPct"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Seller Commission (%)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          type="number" 
                          step="0.1" 
                          className="font-mono pl-3 pr-8"
                          {...field} 
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">%</div>
                      </div>
                    </FormControl>
                    <p className="text-[10px] text-muted-foreground">Standard fee applied to the seller side.</p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="h-px w-full bg-border" />

            <FormField
              control={form.control}
              name="negotiable"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted/30">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm font-semibold">Agent Negotiation Authority</FormLabel>
                    <p className="text-xs text-muted-foreground max-w-[80%]">
                      Allow the AI broker to dynamically adjust commission rates during negotiation to secure agreements.
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={updateMutation.isPending || !form.formState.isDirty}
                className={cn(
                  "flex items-center gap-2 h-9 px-4 rounded-md text-sm font-medium transition-all",
                  form.formState.isDirty 
                    ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                {updateMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Commit Configuration
              </button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
