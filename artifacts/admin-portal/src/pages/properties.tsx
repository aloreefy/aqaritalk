import { useState } from "react";
import { useLocation } from "wouter";
import {
  useAdminListProperties,
  useAdminDeleteProperty,
  getAdminListPropertiesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Search, Plus, LayoutList, LayoutGrid,
  Eye, Pencil, Trash2,
  Building2, MapPin, DollarSign,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { usePagePreferences } from "@/hooks/use-page-preferences";
import { DataPagination } from "@/components/ui/data-pagination";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  pending_review: "bg-amber-100 text-amber-700 border-amber-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
  deleted: "bg-slate-100 text-slate-500 border-slate-200",
  draft: "bg-blue-100 text-blue-700 border-blue-200",
};

const PROPERTY_TYPES = [
  "apartment", "house", "floor", "building", "villa", "palace", "roof",
  "studio", "room", "office", "shop", "warehouse", "factory", "farm",
  "land_residential", "land_commercial", "land_agricultural",
  "hotel", "hospital", "clinic", "showroom", "mixed", "chalet", "rest_house", "other",
];

interface PropertiesPrefs {
  viewMode: "table" | "card";
  pageSize: number;
  statusFilter: string;
  typeFilter: string;
  modeFilter: string;
}

export default function Properties() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // ── Persisted preferences ──────────────────────────────────────────────
  const [prefs, setPrefs] = usePagePreferences<PropertiesPrefs>("properties", {
    viewMode: "table",
    pageSize: 25,
    statusFilter: "all",
    typeFilter: "all",
    modeFilter: "all",
  });

  // ── Transient state ────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  // ── Derived helpers ────────────────────────────────────────────────────
  const { viewMode, pageSize, statusFilter, typeFilter, modeFilter } = prefs;

  const setViewMode = (v: "table" | "card") => setPrefs({ viewMode: v });
  const setPageSize = (s: number) => { setPrefs({ pageSize: s }); setPage(1); };
  const setStatusFilter = (v: string) => { setPrefs({ statusFilter: v }); setPage(1); };
  const setTypeFilter = (v: string) => { setPrefs({ typeFilter: v }); setPage(1); };
  const setModeFilter = (v: string) => { setPrefs({ modeFilter: v }); setPage(1); };

  // ── Query ──────────────────────────────────────────────────────────────
  const queryParams = {
    page,
    limit: pageSize,
    ...(search ? { search } : {}),
    ...(statusFilter !== "all" ? { status: statusFilter } : {}),
    ...(typeFilter !== "all" ? { propertyType: typeFilter } : {}),
    ...(modeFilter !== "all" ? { transactionMode: modeFilter } : {}),
  };

  const { data, isLoading } = useAdminListProperties(queryParams as any, {
    query: { queryKey: getAdminListPropertiesQueryKey(queryParams as any) },
  });

  const deleteMutation = useAdminDeleteProperty();

  const properties = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // ── Delete ─────────────────────────────────────────────────────────────
  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(
      { id: deleteTarget.id },
      {
        onSuccess: () => {
          toast({ title: "Listing removed", description: `"${deleteTarget.name}" has been soft-deleted.` });
          queryClient.invalidateQueries({ queryKey: getAdminListPropertiesQueryKey() });
          setDeleteTarget(null);
        },
        onError: (e: any) => {
          toast({ title: "Error", description: e.message, variant: "destructive" });
          setDeleteTarget(null);
        },
      },
    );
  };

  // ── Sub-components ─────────────────────────────────────────────────────
  const StatusBadge = ({ status }: { status: string }) => (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize", STATUS_COLORS[status] ?? "bg-muted text-muted-foreground border-border")}>
      {status.replace("_", " ")}
    </span>
  );

  const ActionButtons = ({ prop }: { prop: any }) => (
    <div className="flex items-center gap-1">
      <button onClick={(e) => { e.stopPropagation(); setLocation(`/properties/${prop.id}`); }} className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="View">
        <Eye className="w-4 h-4" />
      </button>
      <button onClick={(e) => { e.stopPropagation(); setLocation(`/properties/${prop.id}/edit`); }} className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-blue-600 transition-colors" title="Edit">
        <Pencil className="w-4 h-4" />
      </button>
      <button onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: prop.id, name: prop.listingName ?? prop.propertyType }); }} className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-destructive transition-colors" title="Delete">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t("properties.title")}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t("properties.subtitle")}</p>
        </div>
        <button onClick={() => setLocation("/properties/new")} className="flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm">
          <Plus className="w-4 h-4" />
          New Listing
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search name or city…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="h-9 ps-9 pe-3 w-80 bg-card border border-input rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 px-3 bg-card border border-input rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="pending_review">Pending Review</option>
          <option value="rejected">Rejected</option>
          <option value="deleted">Deleted</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-9 px-3 bg-card border border-input rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="all">All Types</option>
          {PROPERTY_TYPES.map((tp) => <option key={tp} value={tp}>{tp.replace(/_/g, " ")}</option>)}
        </select>
        <select
          value={modeFilter}
          onChange={(e) => setModeFilter(e.target.value)}
          className="h-9 px-3 bg-card border border-input rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="all">All Modes</option>
          <option value="sale">Sale</option>
          <option value="rent">Rent</option>
          <option value="lease">Lease</option>
        </select>

        <div className="ms-auto flex items-center gap-1 bg-muted rounded-md p-1">
          <button
            onClick={() => setViewMode("table")}
            className={cn("h-7 w-7 flex items-center justify-center rounded", viewMode === "table" ? "bg-background shadow-sm" : "text-muted-foreground")}
            title="Table view"
          >
            <LayoutList className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("card")}
            className={cn("h-7 w-7 flex items-center justify-center rounded", viewMode === "card" ? "bg-background shadow-sm" : "text-muted-foreground")}
            title="Card view"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-card border rounded-md" />)}
        </div>
      ) : viewMode === "table" ? (
        <div className="bg-card border rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-start px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Listing</th>
                  <th className="text-start px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Type</th>
                  <th className="text-start px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Mode</th>
                  <th className="text-start px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Location</th>
                  <th className="text-start px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Price</th>
                  <th className="text-start px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                  <th className="text-start px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Date</th>
                  <th className="text-end px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {properties.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-muted-foreground text-sm">No listings found.</td></tr>
                ) : properties.map((prop) => (
                  <tr
                    key={prop.id}
                    onClick={() => setLocation(`/properties/${prop.id}`)}
                    className="hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium truncate max-w-[160px]">{prop.listingName ?? "Untitled"}</p>
                      <p className="text-xs text-muted-foreground">{[prop.city, prop.district].filter(Boolean).join(", ") || prop.propertyType?.replace(/_/g, " ") || "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-xs capitalize">{prop.propertyType?.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3 text-xs capitalize">{prop.transactionMode}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {[prop.city, prop.district].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono">
                      {prop.price ? `${Number(prop.price).toLocaleString()} ${prop.priceCurrency ?? ""}` : "—"}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={prop.status} /></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(prop.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-end"><ActionButtons prop={prop} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {properties.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground text-sm">No listings found.</div>
          ) : properties.map((prop) => (
            <div
              key={prop.id}
              onClick={() => setLocation(`/properties/${prop.id}`)}
              className="bg-card border rounded-xl overflow-hidden hover:shadow-md cursor-pointer transition-all hover:border-primary/30"
            >
              <div className="h-32 bg-muted flex items-center justify-center text-muted-foreground">
                {prop.images?.[0] ? (
                  <img src={prop.images[0].path} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-8 h-8 opacity-30" />
                )}
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-sm leading-snug line-clamp-2">{prop.listingName ?? "Untitled"}</p>
                  <StatusBadge status={prop.status} />
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3 shrink-0" />
                  {[prop.city, prop.district].filter(Boolean).join(", ") || "No location"}
                </div>
                <div className="flex items-center gap-1 text-xs font-medium">
                  <DollarSign className="w-3 h-3 shrink-0 text-muted-foreground" />
                  {prop.price ? `${Number(prop.price).toLocaleString()} ${prop.priceCurrency ?? ""}` : "Price TBD"}
                </div>
                <div className="flex items-center justify-between pt-1 border-t">
                  <span className="text-xs text-muted-foreground capitalize">{prop.propertyType?.replace(/_/g, " ")} · {prop.transactionMode}</span>
                  <ActionButtons prop={prop} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      <DataPagination
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Listing?</AlertDialogTitle>
            <AlertDialogDescription>
              This will soft-delete <strong>"{deleteTarget?.name}"</strong>. The listing will be hidden from all views but remains in the database.
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
