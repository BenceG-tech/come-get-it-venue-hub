import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageLayout } from "@/components/PageLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { formatAuditAction, formatResourceType } from "@/lib/auditLogger";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
import { Search, Eye, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface AuditLog {
  id: string;
  actor_id: string;
  actor_email: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  ip_address: string;
  user_agent: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface AuditLogsResponse {
  logs: AuditLog[];
  total: number;
  limit: number;
  offset: number;
  filters: {
    actions: string[];
    resource_types: string[];
  };
}

export default function AuditLog() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("");
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string>("");
  const [page, setPage] = useState(0);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const limit = 25;

  const { data, isLoading, refetch } = useQuery<AuditLogsResponse>({
    queryKey: ["audit-logs", search, actionFilter, resourceTypeFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("limit", limit.toString());
      params.set("offset", (page * limit).toString());
      if (search) params.set("search", search);
      if (actionFilter) params.set("action", actionFilter);
      if (resourceTypeFilter) params.set("resource_type", resourceTypeFilter);

      const { data: sessionData } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke("get-audit-logs", {
        body: null,
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
      });

      if (response.error) throw response.error;
      
      // Apply client-side filtering since we're using invoke
      let logs = response.data.logs || [];
      if (search) {
        logs = logs.filter((log: AuditLog) => 
          log.actor_email?.toLowerCase().includes(search.toLowerCase()) ||
          log.resource_type?.toLowerCase().includes(search.toLowerCase())
        );
      }
      if (actionFilter) {
        logs = logs.filter((log: AuditLog) => log.action === actionFilter);
      }
      if (resourceTypeFilter) {
        logs = logs.filter((log: AuditLog) => log.resource_type === resourceTypeFilter);
      }
      
      return {
        ...response.data,
        logs: logs.slice(page * limit, (page + 1) * limit),
        total: logs.length,
      };
    },
  });

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case "create":
        return "default";
      case "update":
        return "secondary";
      case "delete":
        return "destructive";
      case "login":
      case "logout":
        return "outline";
      default:
        return "secondary";
    }
  };

  const totalPages = Math.ceil((data?.total || 0) / limit);

  return (
    <PageLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-cgi-surface-foreground">
            Audit Napló
          </h1>
          <p className="text-cgi-muted-foreground mt-1">
            Admin műveletek teljes nyomkövetése
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Frissítés
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-cgi-muted-foreground" />
            <Input
              placeholder="Keresés email vagy erőforrás alapján..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="pl-9"
            />
          </div>
          <Select
            value={actionFilter}
            onValueChange={(value) => {
              setActionFilter(value === "all" ? "" : value);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Művelet típus" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Összes művelet</SelectItem>
              {data?.filters?.actions?.map((action) => (
                <SelectItem key={action} value={action}>
                  {formatAuditAction(action)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={resourceTypeFilter}
            onValueChange={(value) => {
              setResourceTypeFilter(value === "all" ? "" : value);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Erőforrás típus" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Összes típus</SelectItem>
              {data?.filters?.resource_types?.map((type) => (
                <SelectItem key={type} value={type}>
                  {formatResourceType(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-sm text-cgi-muted-foreground">Összes bejegyzés</div>
          <div className="text-2xl font-bold text-cgi-surface-foreground">
            {data?.total || 0}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-cgi-muted-foreground">Ma</div>
          <div className="text-2xl font-bold text-emerald-500">
            {data?.logs?.filter(
              (log) =>
                new Date(log.created_at).toDateString() ===
                new Date().toDateString()
            ).length || 0}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-cgi-muted-foreground">Létrehozások</div>
          <div className="text-2xl font-bold text-primary">
            {data?.logs?.filter((log) => log.action === "create").length || 0}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-cgi-muted-foreground">Törlések</div>
          <div className="text-2xl font-bold text-destructive">
            {data?.logs?.filter((log) => log.action === "delete").length || 0}
          </div>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Időpont</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>Művelet</TableHead>
              <TableHead>Erőforrás</TableHead>
              <TableHead>IP cím</TableHead>
              <TableHead className="text-right">Részletek</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : data?.logs?.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-cgi-muted-foreground py-8"
                >
                  Nincs audit napló bejegyzés
                </TableCell>
              </TableRow>
            ) : (
              data?.logs?.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm">
                    {format(new Date(log.created_at), "MMM d, HH:mm", {
                      locale: hu,
                    })}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {log.actor_email || "Ismeretlen"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getActionBadgeVariant(log.action)}>
                      {formatAuditAction(log.action)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {formatResourceType(log.resource_type)}
                    </span>
                    {log.resource_id && (
                      <span className="text-xs text-cgi-muted-foreground ml-2">
                        ({log.resource_id.slice(0, 8)}...)
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-cgi-muted-foreground">
                    {log.ip_address}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedLog(log)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <div className="text-sm text-cgi-muted-foreground">
              {page * limit + 1}-{Math.min((page + 1) * limit, data?.total || 0)}{" "}
              / {data?.total} bejegyzés
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Detail Modal */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit Napló Részletek</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-cgi-muted-foreground">
                    Időpont
                  </label>
                  <p className="text-cgi-surface-foreground">
                    {format(new Date(selectedLog.created_at), "yyyy. MMMM d. HH:mm:ss", {
                      locale: hu,
                    })}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-cgi-muted-foreground">
                    Admin
                  </label>
                  <p className="text-cgi-surface-foreground">
                    {selectedLog.actor_email}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-cgi-muted-foreground">
                    Művelet
                  </label>
                  <p>
                    <Badge variant={getActionBadgeVariant(selectedLog.action)}>
                      {formatAuditAction(selectedLog.action)}
                    </Badge>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-cgi-muted-foreground">
                    Erőforrás
                  </label>
                  <p className="text-cgi-surface-foreground">
                    {formatResourceType(selectedLog.resource_type)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-cgi-muted-foreground">
                    IP cím
                  </label>
                  <p className="text-cgi-surface-foreground">
                    {selectedLog.ip_address}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-cgi-muted-foreground">
                    Erőforrás ID
                  </label>
                  <p className="text-cgi-surface-foreground font-mono text-sm">
                    {selectedLog.resource_id || "-"}
                  </p>
                </div>
              </div>

              {selectedLog.old_value && (
                <div>
                  <label className="text-sm font-medium text-cgi-muted-foreground">
                    Előző érték
                  </label>
                  <pre className="mt-1 p-3 bg-muted rounded-md text-sm overflow-x-auto">
                    {JSON.stringify(selectedLog.old_value, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.new_value && (
                <div>
                  <label className="text-sm font-medium text-cgi-muted-foreground">
                    Új érték
                  </label>
                  <pre className="mt-1 p-3 bg-muted rounded-md text-sm overflow-x-auto">
                    {JSON.stringify(selectedLog.new_value, null, 2)}
                  </pre>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-cgi-muted-foreground">
                  User Agent
                </label>
                <p className="text-sm text-cgi-muted-foreground break-all">
                  {selectedLog.user_agent}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
