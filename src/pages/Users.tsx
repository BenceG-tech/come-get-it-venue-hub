import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Search, 
  Users as UsersIcon, 
  ChevronRight,
  TrendingUp,
  Gift,
  Calendar,
  Clock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { hu } from "date-fns/locale";

interface UserListItem {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  last_seen_at: string | null;
  signup_source: string | null;
  is_admin: boolean;
  status: "active" | "inactive" | "new";
  points_balance: number;
  lifetime_points: number;
  total_redemptions: number;
  total_sessions: number;
}

interface UsersResponse {
  users: UserListItem[];
  total: number;
  limit: number;
  offset: number;
}

export default function Users() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search
  useState(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  });

  const { data, isLoading, error } = useQuery<UsersResponse>({
    queryKey: ["users", debouncedSearch, statusFilter],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-users", {
        body: null,
        headers: {},
      });

      if (error) throw error;
      
      // The edge function expects query params, but invoke sends body
      // So we'll use the full URL approach for now
      const params = new URLSearchParams({
        search: debouncedSearch,
        status: statusFilter,
        limit: "50",
        offset: "0"
      });

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-users?${params}`,
        {
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            "Content-Type": "application/json"
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch users");
      }

      return response.json();
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Aktív</Badge>;
      case "inactive":
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">Inaktív</Badge>;
      case "new":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Új</Badge>;
      default:
        return null;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <PageLayout
      title="Felhasználók"
      description="Regisztrált felhasználók kezelése és monitorozása"
      icon={UsersIcon}
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="cgi-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-cgi-muted-foreground">Összes felhasználó</p>
                  <p className="text-2xl font-bold text-cgi-surface-foreground">
                    {data?.total || 0}
                  </p>
                </div>
                <UsersIcon className="h-8 w-8 text-cgi-primary opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="cgi-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-cgi-muted-foreground">Aktív (7 nap)</p>
                  <p className="text-2xl font-bold text-green-400">
                    {data?.users.filter(u => u.status === "active").length || 0}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-400 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="cgi-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-cgi-muted-foreground">Új (7 nap)</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {data?.users.filter(u => u.status === "new").length || 0}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-blue-400 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="cgi-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-cgi-muted-foreground">Összes beváltás</p>
                  <p className="text-2xl font-bold text-cgi-secondary">
                    {data?.users.reduce((sum, u) => sum + u.total_redemptions, 0) || 0}
                  </p>
                </div>
                <Gift className="h-8 w-8 text-cgi-secondary opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="cgi-card">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cgi-muted-foreground" />
                <Input
                  placeholder="Keresés név vagy email alapján..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 cgi-input"
                />
              </div>

              <Tabs value={statusFilter} onValueChange={setStatusFilter}>
                <TabsList className="bg-cgi-muted/30">
                  <TabsTrigger value="all" className="data-[state=active]:bg-cgi-primary">
                    Összes
                  </TabsTrigger>
                  <TabsTrigger value="active" className="data-[state=active]:bg-green-500">
                    Aktív
                  </TabsTrigger>
                  <TabsTrigger value="inactive" className="data-[state=active]:bg-gray-500">
                    Inaktív
                  </TabsTrigger>
                  <TabsTrigger value="new" className="data-[state=active]:bg-blue-500">
                    Új
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card className="cgi-card">
          <CardHeader>
            <CardTitle className="text-cgi-surface-foreground">Felhasználók listája</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-lg bg-cgi-muted/20">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-400">
                Hiba történt a felhasználók betöltése közben
              </div>
            ) : data?.users.length === 0 ? (
              <div className="text-center py-8 text-cgi-muted-foreground">
                Nincs találat a keresési feltételekre
              </div>
            ) : (
              <div className="space-y-2">
                {data?.users.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => navigate(`/users/${user.id}`)}
                    className="flex items-center gap-4 p-4 rounded-lg bg-cgi-muted/20 hover:bg-cgi-muted/40 cursor-pointer transition-colors group"
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback className="bg-cgi-secondary/20 text-cgi-secondary">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-cgi-surface-foreground truncate">
                          {user.name}
                        </p>
                        {getStatusBadge(user.status)}
                        {user.is_admin && (
                          <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                            Admin
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-cgi-muted-foreground truncate">
                        {user.email || "Nincs email"}
                      </p>
                    </div>

                    <div className="hidden md:flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <p className="font-medium text-cgi-secondary">{user.points_balance}</p>
                        <p className="text-xs text-cgi-muted-foreground">pont</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium text-cgi-surface-foreground">{user.total_redemptions}</p>
                        <p className="text-xs text-cgi-muted-foreground">beváltás</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium text-cgi-surface-foreground">{user.total_sessions}</p>
                        <p className="text-xs text-cgi-muted-foreground">munkamenet</p>
                      </div>
                    </div>

                    <div className="hidden lg:block text-right text-sm">
                      {user.last_seen_at ? (
                        <div className="flex items-center gap-1 text-cgi-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(user.last_seen_at), {
                            addSuffix: true,
                            locale: hu
                          })}
                        </div>
                      ) : (
                        <span className="text-cgi-muted-foreground">Soha</span>
                      )}
                    </div>

                    <ChevronRight className="h-5 w-5 text-cgi-muted-foreground group-hover:text-cgi-surface-foreground transition-colors" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
