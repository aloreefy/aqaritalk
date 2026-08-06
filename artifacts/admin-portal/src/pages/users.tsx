import { useState, useMemo } from "react";
import { useAdminListUsers, useAdminUpdateUser, getAdminListUsersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Search, UserCog, ShieldAlert, CheckCircle2, XCircle, MoreHorizontal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Users() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: users, isLoading } = useAdminListUsers({
    query: {
      queryKey: getAdminListUsersQueryKey()
    }
  });

  const updateUserMutation = useAdminUpdateUser();

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter(user => {
      const matchesSearch = 
        (user.name?.toLowerCase().includes(search.toLowerCase())) || 
        user.phone.includes(search);
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesStatus = statusFilter === "all" || user.status === statusFilter;
      
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const handleUpdateStatus = (id: string, newStatus: 'active' | 'suspended') => {
    updateUserMutation.mutate({ id, data: { status: newStatus } }, {
      onSuccess: () => {
        toast({ title: "Operator logged", description: `User status updated to ${newStatus}.` });
        queryClient.invalidateQueries({ queryKey: getAdminListUsersQueryKey() });
      }
    });
  };

  const handleUpdateRole = (id: string, newRole: 'admin' | 'broker' | 'buyer' | 'seller') => {
    updateUserMutation.mutate({ id, data: { role: newRole as any } }, {
      onSuccess: () => {
        toast({ title: "Clearance updated", description: `User role modified to ${newRole}.` });
        queryClient.invalidateQueries({ queryKey: getAdminListUsersQueryKey() });
      }
    });
  };

  if (isLoading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-10 w-full bg-muted rounded-md mb-6" />
      {[...Array(5)].map((_,i) => <div key={i} className="h-16 w-full bg-card border rounded-md" />)}
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Operator Directory</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage personnel clearance and access vectors.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text"
              placeholder="Query identifier or comm-link..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 bg-card border border-input rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all font-mono placeholder:font-sans"
            />
          </div>
          
          <select 
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="h-9 bg-card border border-input rounded-md text-sm px-3 focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Clearances</option>
            <option value="buyer">Buyer</option>
            <option value="seller">Seller</option>
            <option value="broker">Broker</option>
            <option value="admin">Administrator</option>
          </select>
          
          <select 
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="h-9 bg-card border border-input rounded-md text-sm px-3 focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All States</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider font-semibold border-b">
              <tr>
                <th className="px-6 py-4">Identity</th>
                <th className="px-6 py-4">Comm-Link</th>
                <th className="px-6 py-4">Clearance</th>
                <th className="px-6 py-4">State</th>
                <th className="px-6 py-4">Sector</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    <UserCog className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p>No matching personnel found in directory.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase">
                          {user.name ? user.name.substring(0, 2) : 'UK'}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{user.name || "Unknown Identity"}</div>
                          <div className="text-[10px] font-mono text-muted-foreground">{user.id.substring(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3 font-mono text-xs">{user.phone}</td>
                    <td className="px-6 py-3">
                      <span className={cn(
                        "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider",
                        user.role === 'admin' ? "bg-red-500/10 text-red-600" :
                        user.role === 'broker' ? "bg-purple-500/10 text-purple-600" :
                        "bg-blue-500/10 text-blue-600"
                      )}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-1.5">
                        {user.status === 'active' ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-500">Active</span>
                          </>
                        ) : (
                          <>
                            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                            <span className="text-xs font-medium text-amber-600 dark:text-amber-500">Suspended</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3 font-mono text-xs text-muted-foreground">{user.market}</td>
                    <td className="px-6 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel>Operator Controls</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">State Override</div>
                          {user.status === 'suspended' ? (
                            <DropdownMenuItem onClick={() => handleUpdateStatus(user.id, 'active')} className="text-emerald-600 cursor-pointer">
                              <CheckCircle2 className="w-4 h-4 mr-2" /> Reinstate Operator
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleUpdateStatus(user.id, 'suspended')} className="text-amber-600 cursor-pointer">
                              <XCircle className="w-4 h-4 mr-2" /> Suspend Operator
                            </DropdownMenuItem>
                          )}
                          
                          <DropdownMenuSeparator />
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Clearance Override</div>
                          
                          {['buyer', 'seller', 'broker', 'admin'].filter(r => r !== user.role).map(role => (
                            <DropdownMenuItem key={role} onClick={() => handleUpdateRole(user.id, role as any)} className="cursor-pointer">
                              <UserCog className="w-4 h-4 mr-2" /> Set as {role.charAt(0).toUpperCase() + role.slice(1)}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
