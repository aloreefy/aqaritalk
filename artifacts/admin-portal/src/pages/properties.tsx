import { useState } from "react";
import { useAdminListProperties, useAdminUpdatePropertyStatus, getAdminListPropertiesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, Filter, CheckCircle, XCircle, Trash2, MoreHorizontal, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Properties() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  const queryParams = {
    page,
    limit: 50,
    ...(statusFilter !== 'all' ? { status: statusFilter } : {})
  };

  const { data, isLoading } = useAdminListProperties(queryParams, {
    query: {
      queryKey: getAdminListPropertiesQueryKey(queryParams)
    }
  });

  const updateStatusMutation = useAdminUpdatePropertyStatus();

  const handleStatusChange = (id: string, newStatus: 'active' | 'rejected' | 'deleted') => {
    updateStatusMutation.mutate(
      { id, data: { status: newStatus } },
      {
        onSuccess: () => {
          toast({ title: t('properties.toast.title'), description: t('properties.toast.desc', { status: newStatus }) });
          queryClient.invalidateQueries({ queryKey: getAdminListPropertiesQueryKey() });
        }
      }
    );
  };

  if (isLoading && !data) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 w-full bg-muted rounded-md mb-6" />
        {[...Array(5)].map((_, i) => <div key={i} className="h-20 w-full bg-card border rounded-md" />)}
      </div>
    );
  }

  const properties = data?.items || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('properties.title')}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t('properties.subtitle')}</p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-card border border-input rounded-md px-2 h-9">
            <Filter className="w-4 h-4 text-muted-foreground me-2" />
            <select 
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="bg-transparent text-sm focus:outline-none focus:ring-0 min-w-[140px]"
            >
              <option value="all">{t('properties.filters.allStates')}</option>
              <option value="pending_review">{t('properties.filters.pendingReview')}</option>
              <option value="active">{t('properties.filters.active')}</option>
              <option value="draft">{t('properties.filters.draft')}</option>
              <option value="sold">{t('properties.filters.sold')}</option>
              <option value="rented">{t('properties.filters.rented')}</option>
              <option value="rejected">{t('properties.filters.rejected')}</option>
              <option value="deleted">{t('properties.filters.deleted')}</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-start whitespace-nowrap">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider font-semibold border-b">
              <tr>
                <th className="px-6 py-4 text-start">{t('properties.table.assetId')}</th>
                <th className="px-6 py-4 text-start">{t('properties.table.classification')}</th>
                <th className="px-6 py-4 text-start">{t('properties.table.valuation')}</th>
                <th className="px-6 py-4 text-start">{t('properties.table.location')}</th>
                <th className="px-6 py-4 text-start">{t('properties.table.state')}</th>
                <th className="px-6 py-4 text-end">{t('properties.table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {properties.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    <Building2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p>{t('properties.empty')}</p>
                  </td>
                </tr>
              ) : (
                properties.map((property) => (
                  <tr key={property.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-mono text-xs font-medium">{property.id.substring(0, 8).toUpperCase()}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{t('properties.by')} {property.createdBy.substring(0, 8)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium capitalize">{property.propertyType}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded w-fit">
                          {property.transactionMode}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono">
                      {property.price ? (
                        <span className="font-medium text-emerald-600 dark:text-emerald-500">
                          {property.price.toLocaleString()} {property.priceCurrency || 'USD'}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">{t('properties.tbd')}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-xs truncate max-w-[150px]">
                          {[property.district, property.city, property.country].filter(Boolean).join(', ') || t('properties.unspecified')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5",
                        property.status === 'active' ? "bg-emerald-500/10 text-emerald-600" :
                        property.status === 'pending_review' ? "bg-amber-500/10 text-amber-600" :
                        property.status === 'rejected' ? "bg-red-500/10 text-red-600" :
                        property.status === 'deleted' ? "bg-zinc-500/10 text-zinc-600" :
                        "bg-blue-500/10 text-blue-600"
                      )}>
                        {property.status === 'active' && <CheckCircle className="w-3 h-3" />}
                        {property.status === 'pending_review' && <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
                        {property.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel>{t('properties.dropdown.label')}</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          
                          {property.status !== 'active' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(property.id, 'active')} className="text-emerald-600 cursor-pointer">
                              <CheckCircle className="w-4 h-4 me-2" /> {t('properties.dropdown.authorize')}
                            </DropdownMenuItem>
                          )}
                          
                          {property.status !== 'rejected' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(property.id, 'rejected')} className="text-amber-600 cursor-pointer">
                              <XCircle className="w-4 h-4 me-2" /> {t('properties.dropdown.reject')}
                            </DropdownMenuItem>
                          )}

                          {property.status !== 'deleted' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleStatusChange(property.id, 'deleted')} className="text-destructive cursor-pointer">
                                <Trash2 className="w-4 h-4 me-2" /> {t('properties.dropdown.markDeleted')}
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {data?.total && data.total > 50 && (
          <div className="p-4 border-t bg-muted/20 flex justify-between items-center text-xs text-muted-foreground">
            <span>{t('properties.pagination.showing', { count: properties.length, total: data.total })}</span>
            <div className="flex gap-2">
              <button 
                disabled={page === 1} 
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 bg-card border rounded-md disabled:opacity-50"
              >
                {t('properties.pagination.previous')}
              </button>
              <button 
                disabled={page * 50 >= data.total} 
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 bg-card border rounded-md disabled:opacity-50"
              >
                {t('properties.pagination.next')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
