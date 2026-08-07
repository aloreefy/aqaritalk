import { useLocation, useParams } from "wouter";
import { useAdminGetUser, useAdminDeleteUser, getAdminGetUserQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Pencil, Trash2, Phone, Calendar, Shield, MapPin, BadgeCheck, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  restricted: "bg-amber-100 text-amber-700",
  suspended: "bg-orange-100 text-orange-700",
  banned: "bg-red-100 text-red-700",
};

const ROLE_COLORS: Record<string, string> = {
  buyer: "bg-blue-100 text-blue-700",
  seller: "bg-purple-100 text-purple-700",
  broker: "bg-cyan-100 text-cyan-700",
  admin: "bg-slate-100 text-slate-700",
};

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">{label}</p>
      <p className="text-sm font-medium">{value ?? <span className="text-muted-foreground italic">—</span>}</p>
    </div>
  );
}

export default function UserPreview() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDelete, setShowDelete] = useState(false);

  const { data: user, isLoading } = useAdminGetUser(id!, {
    query: { queryKey: getAdminGetUserQueryKey(id!) },
  });

  const deleteMutation = useAdminDeleteUser();

  const handleDelete = () => {
    deleteMutation.mutate({ id: id! }, {
      onSuccess: () => {
        toast({ title: "User removed", description: "User has been soft-deleted." });
        setLocation("/users");
      },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  if (isLoading) {
    return <div className="animate-pulse space-y-4"><div className="h-40 bg-card border rounded-lg" /><div className="h-60 bg-card border rounded-lg" /></div>;
  }

  if (!user) {
    return <div className="text-center py-20 text-muted-foreground">User not found.</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <button onClick={() => setLocation("/users")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Users
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => setLocation(`/users/${id}/edit`)} className="flex items-center gap-2 h-9 px-4 rounded-md border border-input text-sm font-medium hover:bg-muted transition-colors">
            <Pencil className="w-4 h-4" /> Edit
          </button>
          <button onClick={() => setShowDelete(true)} className="flex items-center gap-2 h-9 px-4 rounded-md bg-destructive/10 text-destructive border border-destructive/20 text-sm font-medium hover:bg-destructive/20 transition-colors">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      </div>

      {/* Profile card */}
      <div className="bg-card border rounded-xl p-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl shrink-0">
          {(user.name ?? user.phone).charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold">{user.name ?? "No name"}</h1>
          <div className="flex items-center gap-1 mt-0.5 text-muted-foreground text-sm">
            <Phone className="w-3.5 h-3.5" />
            <span className="font-mono">{user.phone}</span>
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize", ROLE_COLORS[user.role] ?? "bg-muted text-muted-foreground")}>{user.role}</span>
            <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize", STATUS_COLORS[user.status] ?? "bg-muted text-muted-foreground")}>{user.status}</span>
            {user.verificationStatus === "verified" && (
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                <BadgeCheck className="w-3 h-3" /> Verified
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="bg-card border rounded-xl p-6 grid grid-cols-2 md:grid-cols-3 gap-6">
        <Field label="User ID" value={user.id} />
        <Field label="Market" value={user.market} />
        <Field label="Language" value={user.language?.toUpperCase()} />
        <Field label="Verification" value={user.verificationStatus} />
        <Field label="Voice Input" value={user.autoSendVoice ? "Enabled" : "Disabled"} />
        <Field label="Created" value={new Date(user.createdAt).toLocaleString()} />
        <Field label="Updated" value={new Date(user.updatedAt).toLocaleString()} />
      </div>

      {/* Delete dialog */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User?</AlertDialogTitle>
            <AlertDialogDescription>
              This will soft-delete <strong>{user.name ?? user.phone}</strong>. The account will be hidden but remains in the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteMutation.isPending ? "Deleting…" : "Yes, Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
