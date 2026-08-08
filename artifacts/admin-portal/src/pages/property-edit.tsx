import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useAdminGetProperty,
  useAdminUpdateProperty,
  getAdminGetPropertyQueryKey,
  getAdminListPropertiesQueryKey,
  AdminGetProperty200,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PROPERTY_TYPES = [
  "apartment", "house", "floor", "building", "villa", "palace", "roof",
  "studio", "room", "office", "shop", "warehouse", "factory", "farm",
  "land_residential", "land_commercial", "land_agricultural",
  "hotel", "hospital", "clinic", "showroom", "mixed", "chalet", "rest_house", "other",
];

const CURRENCIES = ["JOD", "SAR", "AED", "EGP", "KWD", "QAR", "USD"];

const schema = z.object({
  listingName: z.string().optional(),
  propertyType: z.string().min(1),
  transactionMode: z.enum(["sale", "rent", "lease"]),
  status: z.enum(["active", "pending_review", "rejected", "deleted", "draft"]),
  price: z.coerce.number().positive().optional().or(z.literal("")),
  priceCurrency: z.string().default("JOD"),
  country: z.string().max(3, "Use a 2-3 letter country code, e.g. JO").optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  street: z.string().optional(),
  areaSqm: z.coerce.number().positive().optional().or(z.literal("")),
  rooms: z.coerce.number().int().positive().optional().or(z.literal("")),
  bathrooms: z.coerce.number().int().positive().optional().or(z.literal("")),
  floorNumber: z.coerce.number().int().optional().or(z.literal("")),
  furnishedStatus: z.enum(["furnished", "semi_furnished", "unfurnished"]).optional(),
  condition: z.enum(["new", "excellent", "good", "needs_renovation"]).optional(),
  description: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

// ─── Inner form — only mounts after `prop` is guaranteed non-null ──────────────
// defaultValues are populated directly from prop so Selects mount with the
// correct value and never need a programmatic reset().
function PropertyEditForm({ prop, id }: { prop: AdminGetProperty200; id: string }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateMutation = useAdminUpdateProperty();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      listingName: prop.listingName ?? "",
      propertyType: prop.propertyType ?? "apartment",
      transactionMode: (prop.transactionMode as any) ?? "sale",
      status: (prop.status as any) ?? "active",
      price: prop.price ? Number(prop.price) : "",
      priceCurrency: prop.priceCurrency ?? "JOD",
      country: prop.country ?? "",
      city: prop.city ?? "",
      district: prop.district ?? "",
      street: (prop as any).street ?? "",
      areaSqm: prop.areaSqm ? Number(prop.areaSqm) : "",
      rooms: prop.rooms ?? "",
      bathrooms: prop.bathrooms ?? "",
      floorNumber: prop.floorNumber ?? "",
      furnishedStatus: (prop.furnishedStatus as any) || undefined,
      condition: (prop.condition as any) || undefined,
      description: prop.description ?? "",
    },
  });

  const onSubmit = (values: FormValues) => {
    const payload: any = {
      listingName: values.listingName || null,
      propertyType: values.propertyType,
      transactionMode: values.transactionMode,
      status: values.status,
      price: values.price ? Number(values.price) : null,
      priceCurrency: values.priceCurrency,
      country: values.country || null,
      city: values.city || null,
      district: values.district || null,
      street: values.street || null,
      areaSqm: values.areaSqm ? Number(values.areaSqm) : null,
      rooms: values.rooms ? Number(values.rooms) : null,
      bathrooms: values.bathrooms ? Number(values.bathrooms) : null,
      floorNumber: values.floorNumber ? Number(values.floorNumber) : null,
      furnishedStatus: values.furnishedStatus || null,
      condition: values.condition || null,
      description: values.description || null,
    };

    updateMutation.mutate(
      { id, data: payload },
      {
        onSuccess: (updated) => {
          toast({ title: "Listing updated", description: `"${updated.listingName ?? updated.propertyType}" saved.` });
          queryClient.invalidateQueries({ queryKey: getAdminGetPropertyQueryKey(id) });
          queryClient.invalidateQueries({ queryKey: getAdminListPropertiesQueryKey() });
          setLocation(`/properties/${id}`);
        },
        onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
      },
    );
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <button onClick={() => setLocation(`/properties/${id}`)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Listing
        </button>
        <h1 className="text-xl font-bold">Edit Listing</h1>
      </div>

      <div className="bg-card border rounded-xl p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormField control={form.control} name="listingName" render={({ field }) => (
                <FormItem className="md:col-span-2"><FormLabel>Listing Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="propertyType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Property Type *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent className="max-h-60">
                      {PROPERTY_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="transactionMode" render={({ field }) => (
                <FormItem>
                  <FormLabel>Transaction Mode *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="sale">Sale</SelectItem>
                      <SelectItem value="rent">Rent</SelectItem>
                      <SelectItem value="lease">Lease</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending_review">Pending Review</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="deleted">Deleted</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Location */}
            <div className="border-t pt-5">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-4">Location</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <FormField control={form.control} name="country" render={({ field }) => (
                  <FormItem><FormLabel>Country Code</FormLabel><FormControl><Input {...field} placeholder="JO" maxLength={3} className="uppercase" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="city" render={({ field }) => (
                  <FormItem><FormLabel>City</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="district" render={({ field }) => (
                  <FormItem><FormLabel>District</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="street" render={({ field }) => (
                  <FormItem className="md:col-span-3"><FormLabel>Street</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </div>

            {/* Price & Size */}
            <div className="border-t pt-5">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-4">Price & Size</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <FormField control={form.control} name="price" render={({ field }) => (
                  <FormItem className="col-span-2"><FormLabel>Price</FormLabel><FormControl><Input type="number" {...field as any} className="font-mono" dir="ltr" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="priceCurrency" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="areaSqm" render={({ field }) => (
                  <FormItem><FormLabel>Area (m²)</FormLabel><FormControl><Input type="number" {...field as any} className="font-mono" dir="ltr" /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </div>

            {/* Features */}
            <div className="border-t pt-5">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-4">Features</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <FormField control={form.control} name="rooms" render={({ field }) => (
                  <FormItem><FormLabel>Rooms</FormLabel><FormControl><Input type="number" {...field as any} className="font-mono" dir="ltr" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="bathrooms" render={({ field }) => (
                  <FormItem><FormLabel>Bathrooms</FormLabel><FormControl><Input type="number" {...field as any} className="font-mono" dir="ltr" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="floorNumber" render={({ field }) => (
                  <FormItem><FormLabel>Floor #</FormLabel><FormControl><Input type="number" {...field as any} className="font-mono" dir="ltr" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="furnishedStatus" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Furnished</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v === "__none__" ? undefined : v)} value={field.value ?? "__none__"}>
                      <FormControl><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">—</SelectItem>
                        <SelectItem value="furnished">Furnished</SelectItem>
                        <SelectItem value="semi_furnished">Semi-Furnished</SelectItem>
                        <SelectItem value="unfurnished">Unfurnished</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="condition" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Condition</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v === "__none__" ? undefined : v)} value={field.value ?? "__none__"}>
                      <FormControl><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">—</SelectItem>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="excellent">Excellent</SelectItem>
                        <SelectItem value="good">Good</SelectItem>
                        <SelectItem value="needs_renovation">Needs Renovation</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

            {/* Description */}
            <div className="border-t pt-5">
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><textarea {...field} rows={4} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button type="submit" disabled={updateMutation.isPending || !form.formState.isDirty}
                className="flex items-center gap-2 h-9 px-5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors">
                {updateMutation.isPending ? <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
              <button type="button" onClick={() => setLocation(`/properties/${id}`)} className="h-9 px-4 rounded-md border border-input text-sm font-medium hover:bg-muted transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}

// ─── Outer shell — handles loading / not-found, then mounts the form ──────────
export default function PropertyEdit() {
  const { id } = useParams<{ id: string }>();
  const { data: prop, isLoading } = useAdminGetProperty(id!, {
    query: { queryKey: getAdminGetPropertyQueryKey(id!) },
  });

  if (isLoading) return (
    <div className="animate-pulse space-y-4 max-w-3xl">
      <div className="h-10 bg-muted rounded" />
      <div className="h-[600px] bg-card border rounded-xl" />
    </div>
  );
  if (!prop) return <div className="text-center py-20 text-muted-foreground">Property not found.</div>;

  return <PropertyEditForm prop={prop} id={id!} />;
}
