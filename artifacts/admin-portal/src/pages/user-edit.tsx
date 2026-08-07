import { useParams, useLocation } from "wouter";
import { AvatarUpload } from "@/components/ui/avatar-upload";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useAdminGetUser,
  useAdminUpdateUser,
  getAdminGetUserQueryKey,
  getAdminListUsersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save } from "lucide-react";
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
  status: z.enum(["active", "restricted", "suspended", "banned"]),
  market: z.enum(["JO", "SA", "AE", "EG", "KW", "QA", "BH", "OM", "MA", "LB", "IQ"]),
  avatarUrl: z.string().optional().refine(
    (v) => !v || v.startsWith("/") || /^https?:\/\//.test(v),
    { message: "Must be a URL or a storage path" }
  ),
  preferredCurrency: z.string().optional(),
  username: z.string().optional(),
  newPassword: z.string().optional(),
  confirmPassword: z.string().optional(),
}).refine((d) => !d.newPassword || d.newPassword === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});
type FormValues = z.infer<typeof schema>;

/** Inner form — only rendered once user data is loaded, so defaultValues are always correct. */
function EditForm({ user, id }: { user: any; id: string }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateMutation = useAdminUpdateUser();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      phone: user.phone ?? "",
      name: user.name ?? "",
      role: (user.role as FormValues["role"]) ?? "buyer",
      status: (user.status as FormValues["status"]) ?? "active",
      market: (user.market as FormValues["market"]) ?? "JO",
      avatarUrl: user.avatarUrl ?? "",
      preferredCurrency: user.preferredCurrency ?? "",
      username: (user as any).username ?? "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = (values: FormValues) => {
    updateMutation.mutate(
      {
        id,
        data: {
          phone: values.phone,
          name: values.name || null,
          role: values.role,
          status: values.status,
          market: values.market,
          avatarUrl: values.avatarUrl || null,
          preferredCurrency: values.preferredCurrency || null,
          username: values.username || null,
          password: values.newPassword || null,
        } as any,
      },
      {
        onSuccess: (updated: any) => {
          toast({ title: "User updated", description: `${updated.name ?? updated.phone} saved.` });
          queryClient.invalidateQueries({ queryKey: getAdminGetUserQueryKey(id) });
          queryClient.invalidateQueries({ queryKey: getAdminListUsersQueryKey() });
          setLocation(`/users/${id}`);
        },
        onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
      },
    );
  };

  return (
    <div className="bg-card border rounded-xl p-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

          {/* Phone — editable */}
          <FormField control={form.control} name="phone" render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl><Input {...field} placeholder="+962791234567" className="font-mono" dir="ltr" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          {/* Name */}
          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl><Input {...field} placeholder="Display name" /></FormControl>
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
                <FormLabel>Role</FormLabel>
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
                <FormLabel>Status</FormLabel>
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

          {/* Admin credentials — only shown when role = admin */}
          {form.watch("role") === "admin" && (
            <div className="border border-dashed rounded-lg p-4 space-y-4 bg-muted/30">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Portal Credentials (Admin Only)</p>

              <FormField control={form.control} name="username" render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g. jdoe" dir="ltr" autoComplete="off" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="newPassword" render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl><Input {...field} type="password" placeholder="Leave blank to keep current" dir="ltr" autoComplete="new-password" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl><Input {...field} type="password" placeholder="••••••••" dir="ltr" autoComplete="new-password" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={updateMutation.isPending || !form.formState.isDirty}
              className="flex items-center gap-2 h-9 px-5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors">
              {updateMutation.isPending ? <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
            <button type="button" onClick={() => setLocation(`/users/${id}`)} className="h-9 px-4 rounded-md border border-input text-sm font-medium hover:bg-muted transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </Form>
    </div>
  );
}

export default function UserEdit() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const { data: user, isLoading } = useAdminGetUser(id!, {
    query: { queryKey: getAdminGetUserQueryKey(id!) },
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-muted rounded" />
        <div className="h-80 bg-card border rounded-lg" />
      </div>
    );
  }
  if (!user) return <div className="text-center py-20 text-muted-foreground">User not found.</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <button onClick={() => setLocation(`/users/${id}`)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to User
        </button>
        <h1 className="text-xl font-bold">Edit User</h1>
      </div>

      {/* EditForm is only mounted after user data is ready, so defaultValues are always correct —
          this avoids the Radix Select blank-label bug caused by form.reset() after mount. */}
      <EditForm user={user} id={id!} />
    </div>
  );
}
