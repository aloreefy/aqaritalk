import { useLocation } from "wouter";
import { AvatarUpload } from "@/components/ui/avatar-upload";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAdminCreateUser, getAdminListUsersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const MARKETS = ["JO", "SA", "AE", "EG", "KW", "QA", "BH", "OM", "MA", "LB", "IQ"];

const CURRENCIES = [
  { value: "JOD", label: "JOD — Jordanian Dinar" },
  { value: "SAR", label: "SAR — Saudi Riyal" },
  { value: "AED", label: "AED — UAE Dirham" },
  { value: "EGP", label: "EGP — Egyptian Pound" },
  { value: "KWD", label: "KWD — Kuwaiti Dinar" },
  { value: "QAR", label: "QAR — Qatari Riyal" },
  { value: "BHD", label: "BHD — Bahraini Dinar" },
  { value: "OMR", label: "OMR — Omani Rial" },
  { value: "MAD", label: "MAD — Moroccan Dirham" },
  { value: "LBP", label: "LBP — Lebanese Pound" },
  { value: "IQD", label: "IQD — Iraqi Dinar" },
  { value: "USD", label: "USD — US Dollar" },
  { value: "EUR", label: "EUR — Euro" },
];

const schema = z.object({
  phone: z.string().min(7, "Phone required").max(20),
  name: z.string().optional(),
  role: z.enum(["buyer", "seller", "broker", "admin"]),
  market: z.enum(["JO", "SA", "AE", "EG", "KW", "QA", "BH", "OM", "MA", "LB", "IQ"]),
  status: z.enum(["active", "restricted", "suspended", "banned"]),
  avatarUrl: z.string().optional().refine(
    (v) => !v || v.startsWith("/") || /^https?:\/\//.test(v),
    { message: "Must be a URL or a storage path" }
  ),
  preferredCurrency: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function UserNew() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createMutation = useAdminCreateUser();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { phone: "", name: "", role: "buyer", market: "JO", status: "active", avatarUrl: "", preferredCurrency: "" },
  });

  const onSubmit = (values: FormValues) => {
    createMutation.mutate(
      {
        data: {
          ...values,
          name: values.name || undefined,
          avatarUrl: values.avatarUrl || null,
          preferredCurrency: values.preferredCurrency || null,
        } as any,
      },
      {
        onSuccess: (user) => {
          toast({ title: "User created", description: `${(user as any).name ?? (user as any).phone} added successfully.` });
          queryClient.invalidateQueries({ queryKey: getAdminListUsersQueryKey() });
          setLocation(`/users/${(user as any).id}`);
        },
        onError: (e: any) => toast({ title: "Error", description: e.message ?? "Failed to create user", variant: "destructive" }),
      },
    );
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <button onClick={() => setLocation("/users")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Users
        </button>
        <h1 className="text-xl font-bold">New User</h1>
      </div>

      <div className="bg-card border rounded-xl p-6">
        <p className="text-sm text-muted-foreground mb-6">
          Admin-created accounts bypass OTP and are automatically verified. The phone number becomes the user's login credential.
        </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

            {/* Phone */}
            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number *</FormLabel>
                <FormControl><Input {...field} placeholder="+962791234567" className="font-mono" dir="ltr" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Name */}
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl><Input {...field} placeholder="Optional" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Avatar URL + Upload button */}
            <FormField control={form.control} name="avatarUrl" render={({ field }) => (
              <FormItem>
                <FormLabel>Avatar</FormLabel>
                <div className="flex items-start gap-2">
                  {field.value && (
                    <img
                      src={field.value}
                      alt="Avatar preview"
                      className="w-10 h-10 rounded-full object-cover border shrink-0 mt-0.5"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    />
                  )}
                  <FormControl className="flex-1">
                    <Input {...field} placeholder="https://example.com/photo.jpg" dir="ltr" />
                  </FormControl>
                  <AvatarUpload onUploaded={(url) => form.setValue("avatarUrl", url, { shouldDirty: true })} />
                </div>
                <FormMessage />
              </FormItem>
            )} />

            {/* Role + Status */}
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="role" render={({ field }) => (
                <FormItem>
                  <FormLabel>Role *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="buyer">Buyer</SelectItem>
                      <SelectItem value="seller">Seller</SelectItem>
                      <SelectItem value="broker">Broker</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="restricted">Restricted</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="banned">Banned</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Market + Currency */}
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="market" render={({ field }) => (
                <FormItem>
                  <FormLabel>Market</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {MARKETS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="preferredCurrency" render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred Currency</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select currency" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {CURRENCIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button type="submit" disabled={createMutation.isPending}
                className="flex items-center gap-2 h-9 px-5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors">
                {createMutation.isPending ? <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Create User
              </button>
              <button type="button" onClick={() => setLocation("/users")} className="h-9 px-4 rounded-md border border-input text-sm font-medium hover:bg-muted transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
