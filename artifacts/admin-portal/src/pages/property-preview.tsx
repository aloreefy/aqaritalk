import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useAdminGetProperty, useAdminDeleteProperty, getAdminGetPropertyQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Trash2, Building2, MapPin, DollarSign, Bed, Bath, Maximize } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  pending_review: "bg-amber-100 text-amber-700",
  rejected: "bg-red-100 text-red-700",
  deleted: "bg-slate-100 text-slate-500",
  draft: "bg-blue-100 text-blue-700",
};

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">{label}</p>
      <p className="text-sm font-medium">{value != null && value !== "" ? String(value) : <span className="text-muted-foreground italic">—</span>}</p>
    </div>
  );
}

export default function PropertyPreview() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDelete, setShowDelete] = useState(false);

  const { data: prop, isLoading } = useAdminGetProperty(id!, {
    query: { queryKey: getAdminGetPropertyQueryKey(id!) },
  });

  const deleteMutation = useAdminDeleteProperty();

  const handleDelete = () => {
    deleteMutation.mutate({ id: id! }, {
      onSuccess: () => {
        toast({ title: "Listing deleted", description: "Property has been soft-deleted." });
        setLocation("/properties");
      },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  if (isLoading) return <div className="animate-pulse space-y-4"><div className="h-48 bg-muted rounded-xl" /><div className="h-60 bg-card border rounded-xl" /></div>;
  if (!prop) return <div className="text-center py-20 text-muted-foreground">Property not found.</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <button onClick={() => setLocation("/properties")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Listings
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => setLocation(`/properties/${id}/edit`)} className="flex items-center gap-2 h-9 px-4 rounded-md border border-input text-sm font-medium hover:bg-muted transition-colors">
            <Pencil className="w-4 h-4" /> Edit
          </button>
          <button onClick={() => setShowDelete(true)} className="flex items-center gap-2 h-9 px-4 rounded-md bg-destructive/10 text-destructive border border-destructive/20 text-sm font-medium hover:bg-destructive/20 transition-colors">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      </div>

      {/* Images */}
      {prop.images && prop.images.length > 0 ? (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {prop.images.map((img: any) => (
            <img key={img.id} src={img.path} alt="" className="h-48 w-72 object-cover rounded-xl shrink-0" />
          ))}
        </div>
      ) : (
        <div className="h-48 bg-muted rounded-xl flex items-center justify-center text-muted-foreground">
          <Building2 className="w-10 h-10 opacity-30" />
        </div>
      )}

      {/* Header card */}
      <div className="bg-card border rounded-xl p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">{prop.listingName ?? "Untitled Listing"}</h1>
            <div className="flex items-center gap-1 mt-1 text-muted-foreground text-sm">
              <MapPin className="w-4 h-4" />
              {[prop.city, prop.district, prop.street].filter(Boolean).join(", ") || "No location set"}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("px-3 py-1 rounded-full text-sm font-semibold capitalize", STATUS_COLORS[prop.status] ?? "bg-muted text-muted-foreground")}>
              {prop.status?.replace("_", " ")}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-5 mt-4 flex-wrap">
          {prop.price && (
            <div className="flex items-center gap-1 text-lg font-bold text-primary">
              <DollarSign className="w-5 h-5" />
              {Number(prop.price).toLocaleString()} {prop.priceCurrency}
            </div>
          )}
          {prop.rooms && <div className="flex items-center gap-1 text-sm"><Bed className="w-4 h-4 text-muted-foreground" />{prop.rooms} rooms</div>}
          {prop.bathrooms && <div className="flex items-center gap-1 text-sm"><Bath className="w-4 h-4 text-muted-foreground" />{prop.bathrooms} bath</div>}
          {prop.areaSqm && <div className="flex items-center gap-1 text-sm"><Maximize className="w-4 h-4 text-muted-foreground" />{prop.areaSqm} m²</div>}
        </div>

        {prop.description && (
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{prop.description}</p>
        )}
      </div>

      {/* Details */}
      <div className="bg-card border rounded-xl p-6 grid grid-cols-2 md:grid-cols-3 gap-6">
        <Field label="Type" value={prop.propertyType?.replace(/_/g, " ")} />
        <Field label="Transaction" value={prop.transactionMode} />
        <Field label="Direction" value={prop.listingDirection} />
        <Field label="Country" value={prop.country} />
        <Field label="City" value={prop.city} />
        <Field label="District" value={prop.district} />
        <Field label="Floor" value={prop.floorNumber} />
        <Field label="Furnished" value={prop.furnishedStatus?.replace(/_/g, " ")} />
        <Field label="Condition" value={prop.condition?.replace(/_/g, " ")} />
        <Field label="Negotiable" value={prop.priceNegotiable ? "Yes" : "No"} />
        <Field label="Created" value={new Date(prop.createdAt).toLocaleString()} />
      </div>

      {/* Delete dialog */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Listing?</AlertDialogTitle>
            <AlertDialogDescription>
              This will soft-delete <strong>"{prop.listingName ?? "this listing"}"</strong>. It will be hidden but remains in the database.
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
