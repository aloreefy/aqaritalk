import { useEffect } from "react";
import { useLocation, useParams } from "wouter";
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

const schema = z.object({
  name: z.string().optional(),
  role: z.enum(["buyer", "seller", "broker", "admin"]),
  status: z.enum(["active", "restricted", "suspended", "banned"]),
  market: z.enum(["JO", "SA", "AE", "EG", "KW", "QA", "BH", "OM", "MA", "LB", "IQ"]),
});
type FormValues = z.infer<typeof schema>;

export default function UserEdit() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useAdminGetUser(id!, {
    query: { queryKey: getAdminGetUserQueryKey(id!) },
  });

  const updateMutation = useAdminUpdateUser();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", role: "buyer", status: "active", market: "JO" },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name ?? "",
        role: user.role as any,
        status: user.status as any,
        market: user.market as any,
      });
    }
  }, [user, form]);

  const onSubmit = (values: FormValues) => {
    updateMutation.mutate(
      { id: id!, data: { name: values.name || null, role: values.role, status: values.status, market: values.market } },
      {
        onSuccess: (updated) => {
          toast({ title: "User updated", description: `${updated.name ?? updated.phone} saved.` });
          queryClient.invalidateQueries({ queryKey: getAdminGetUserQueryKey(id!) });
          queryClient.invalidateQueries({ queryKey: getAdminListUsersQueryKey() });
          setLocation(`/users/${id}`);
        },
        onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
      },
    );
  };

  if (isLoading) return <div className="animate-pulse space-y-4"><div className="h-10 bg-muted rounded" /><div className="h-80 bg-card border rounded-lg" /></div>;
  if (!user) return <div className="text-center py-20 text-muted-foreground">User not found.</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <button onClick={() => setLocation(`/users/${id}`)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to User
        </button>
        <h1 className="text-xl font-bold">Edit User</h1>
      </div>

      {/* Read-only identity */}
      <div className="bg-muted/30 border rounded-xl p-4 text-sm">
        <p className="text-muted-foreground text-xs uppercase tracking-wider font-semibold mb-1">Phone (read-only)</p>
        <p className="font-mono font-medium">{user.phone}</p>
      </div>

      <div className="bg-card border rounded-xl p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl><Input {...field} placeholder="Display name" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

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
    </div>
  );
}
