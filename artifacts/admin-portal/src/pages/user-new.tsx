import { useLocation } from "wouter";
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

const schema = z.object({
  phone: z.string().min(7, "Phone required").max(20),
  name: z.string().optional(),
  role: z.enum(["buyer", "seller", "broker", "admin"]),
  market: z.enum(["JO", "SA", "AE", "EG", "KW", "QA", "BH", "OM", "MA", "LB", "IQ"]),
  status: z.enum(["active", "restricted", "suspended", "banned"]),
});
type FormValues = z.infer<typeof schema>;

export default function UserNew() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createMutation = useAdminCreateUser();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { phone: "", name: "", role: "buyer", market: "JO", status: "active" },
  });

  const onSubmit = (values: FormValues) => {
    createMutation.mutate(
      { data: { ...values, name: values.name || undefined } },
      {
        onSuccess: (user) => {
          toast({ title: "User created", description: `${user.name ?? user.phone} added successfully.` });
          queryClient.invalidateQueries({ queryKey: getAdminListUsersQueryKey() });
          setLocation(`/users/${user.id}`);
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
            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number *</FormLabel>
                <FormControl><Input {...field} placeholder="+962791234567" className="font-mono" dir="ltr" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl><Input {...field} placeholder="Optional" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

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
