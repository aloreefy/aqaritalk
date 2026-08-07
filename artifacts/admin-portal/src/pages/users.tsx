import { useState } from "react";
import { useLocation } from "wouter";
import {
  useAdminListUsers,
  useAdminDeleteUser,
  getAdminListUsersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Search, UserPlus, LayoutList, LayoutGrid,
  Eye, Pencil, Trash2, ChevronLeft, ChevronRight,
  Phone, Calendar, MapPin,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

const PAGE_SIZES = [10, 25, 50, 100];

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  restricted: "bg-amber-100 text-amber-700 border-amber-200",
  suspended: "bg-orange-100 text-orange-700 border-orange-200",
  banned: "bg-red-100 text-red-700 border-red-200",
};

const ROLE_COLORS: Record<string, string> = {
  buyer: "bg-blue-100 text-blue-700 border-blue-200",
  seller: "bg-purple-100 text-purple-700 border-purple-200",
  broker: "bg-cyan-100 text-cyan-700 border-cyan-200",
  admin: "bg-slate-100 text-slate-700 border-slate-200",
};

export default function Users() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const queryParams = {
    page,
    limit: pageSize,
    ...(search ? { search } : {}),
    ...(roleFilter !== "all" ? { role: roleFilter } : {}),
    ...(statusFilter !== "all" ? { status: statusFilter } : {}),
  };

  const { data, isLoading } = useAdminListUsers(queryParams, {
    query: { queryKey: getAdminListUsersQueryKey(queryParams) },
  });

  const deleteMutation = useAdminDeleteUser();

  const users = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleFilter = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setPage(1);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(
      { id: deleteTarget.id },
      {
        onSuccess: () => {
          toast({ title: "User removed", description: `${deleteTarget.name} has been soft-deleted.` });
          queryClient.invalidateQueries({ queryKey: getAdminListUsersQueryKey() });
          setDeleteTarget(null);
        },
        onError: (e: any) => {
          toast({ title: "Error", description: e.message, variant: "destructive" });
          setDeleteTarget(null);
        },
      },
    );
  };

  const StatusBadge = ({ status }: { status: string }) => (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize", STATUS_COLORS[status] ?? "bg-muted text-muted-foreground")}>
      {status}
    </span>
  );

  const RoleBadge = ({ role }: { role: string }) => (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize", ROLE_COLORS[role] ?? "bg-muted text-muted-foreground")}>
      {role}
    </span>
  );

  const ActionButtons = ({ user }: { user: any }) => (
    <div className="flex items-center gap-1">
      <button onClick={(e) => { e.stopPropagation(); setLocation(`/users/${user.id}`); }} className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="View">
        <Eye className="w-4 h-4" />
      </button>
      <button onClick={(e) => { e.stopPropagation(); setLocation(`/users/${user.id}/edit`); }} className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-blue-600 transition-colors" title="Edit">
        <Pencil className="w-4 h-4" />
      </button>
      <button onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: user.id, name: user.name ?? user.phone }); }} className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-destructive transition-colors" title="Delete">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t("users.title")}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t("users.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setLocation("/users/new")} className="flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm">
            <UserPlus className="w-4 h-4" />
            New User
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder={t("users.searchPlaceholder")} value={search}
            onChange={(e) => handleFilter(setSearch)(e.target.value)}
            className="h-9 ps-9 pe-3 w-56 bg-card border border-input rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all" />
        </div>
        <select value={roleFilter} onChange={(e) => handleFilter(setRoleFilter)(e.target.value)}
          className="h-9 px-3 bg-card border border-input rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary">
          <option value="all">All Roles</option>
          <option value="buyer">Buyer</option>
          <option value="seller">Seller</option>
          <option value="broker">Broker</option>
          <option value="admin">Admin</option>
        </select>
        <select value={statusFilter} onChange={(e) => handleFilter(setStatusFilter)(e.target.value)}
          className="h-9 px-3 bg-card border border-input rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary">
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="restricted">Restricted</option>
          <option value="suspended">Suspended</option>
          <option value="banned">Banned</option>
        </select>

        <div className="ms-auto flex items-center gap-1 bg-muted rounded-md p-1">
          <button onClick={() => setViewMode("table")} className={cn("h-7 w-7 flex items-center justify-center rounded", viewMode === "table" ? "bg-background shadow-sm" : "text-muted-foreground")}>
            <LayoutList className="w-4 h-4" />
          </button>
          <button onClick={() => setViewMode("card")} className={cn("h-7 w-7 flex items-center justify-center rounded", viewMode === "card" ? "bg-background shadow-sm" : "text-muted-foreground")}>
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-card border rounded-md" />)}
        </div>
      ) : viewMode === "table" ? (
        <div className="bg-card border rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-start px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Name / Phone</th>
                  <th className="text-start px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Role</th>
                  <th className="text-start px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                  <th className="text-start px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Market</th>
                  <th className="text-start px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Joined</th>
                  <th className="text-end px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-muted-foreground text-sm">No users found.</td></tr>
                ) : users.map((user) => (
                  <tr key={user.id} onClick={() => setLocation(`/users/${user.id}`)}
                    className="hover:bg-muted/30 cursor-pointer transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium">{user.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground font-mono">{user.phone}</p>
                    </td>
                    <td className="px-4 py-3"><RoleBadge role={user.role} /></td>
                    <td className="px-4 py-3"><StatusBadge status={user.status} /></td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{user.market}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-end"><ActionButtons user={user} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {users.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground text-sm">No users found.</div>
          ) : users.map((user) => (
            <div key={user.id} onClick={() => setLocation(`/users/${user.id}`)}
              className="bg-card border rounded-xl p-4 hover:shadow-md cursor-pointer transition-all hover:border-primary/30 space-y-3">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                  {(user.name ?? user.phone).charAt(0).toUpperCase()}
                </div>
                <div className="flex gap-1">
                  <StatusBadge status={user.status} />
                </div>
              </div>
              <div>
                <p className="font-semibold text-sm">{user.name ?? "No name"}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Phone className="w-3 h-3 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground font-mono">{user.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <RoleBadge role={user.role} />
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />{user.market}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />{new Date(user.createdAt).toLocaleDateString()}
                </span>
                <ActionButtons user={user} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Rows per page:</span>
          <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="h-8 px-2 bg-card border border-input rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary">
            {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="text-sm text-muted-foreground">
          {total === 0 ? "No results" : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="h-8 w-8 flex items-center justify-center rounded-md border border-input disabled:opacity-40 hover:bg-muted transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm px-3 font-medium">{page} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
            className="h-8 w-8 flex items-center justify-center rounded-md border border-input disabled:opacity-40 hover:bg-muted transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User?</AlertDialogTitle>
            <AlertDialogDescription>
              This will soft-delete <strong>{deleteTarget?.name}</strong>. The account will be hidden from all views but can be recovered from the database.
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
