import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { sessionManager } from "@/auth/mockSession";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowLeft, 
  Camera, 
  Calendar,
  Wine,
  Clock,
  Loader2
} from "lucide-react";

interface Redemption {
  id: string;
  drink: string;
  redeemed_at: string;
  token_id: string | null;
  redemption_tokens: {
    token_prefix: string;
  }[] | null;
}

interface Venue {
  id: string;
  name: string;
}

type DateFilter = "today" | "yesterday" | "week";

export default function POSHistory() {
  const navigate = useNavigate();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [todayCount, setTodayCount] = useState(0);

  // Load user's venues
  useEffect(() => {
    const loadVenues = async () => {
      const session = sessionManager.getCurrentSession();
      if (!session) return;

      try {
        if (session.user.role === "cgi_admin") {
          const { data } = await supabase
            .from("venues")
            .select("id, name")
            .order("name");
          setVenues(data || []);
        } else {
          const { data: memberships } = await supabase
            .from("venue_memberships")
            .select("venue_id")
            .eq("profile_id", session.user.id);

          if (memberships && memberships.length > 0) {
            const venueIds = memberships.map(m => m.venue_id);
            const { data } = await supabase
              .from("venues")
              .select("id, name")
              .in("id", venueIds)
              .order("name");
            setVenues(data || []);
          }
        }
      } catch (error) {
        console.error("Error loading venues:", error);
      }
    };

    loadVenues();
  }, []);

  // Auto-select first venue
  useEffect(() => {
    if (venues.length === 1 && !selectedVenueId) {
      setSelectedVenueId(venues[0].id);
    }
  }, [venues, selectedVenueId]);

  // Load redemptions when venue or filter changes
  useEffect(() => {
    if (!selectedVenueId) return;

    const loadRedemptions = async () => {
      setIsLoading(true);

      try {
        const now = new Date();
        let startDate: Date;

        switch (dateFilter) {
          case "today":
            startDate = new Date(now);
            startDate.setHours(0, 0, 0, 0);
            break;
          case "yesterday":
            startDate = new Date(now);
            startDate.setDate(startDate.getDate() - 1);
            startDate.setHours(0, 0, 0, 0);
            break;
          case "week":
            startDate = new Date(now);
            startDate.setDate(startDate.getDate() - 7);
            startDate.setHours(0, 0, 0, 0);
            break;
        }

        let endDate: Date | null = null;
        if (dateFilter === "yesterday") {
          endDate = new Date(now);
          endDate.setDate(endDate.getDate() - 1);
          endDate.setHours(23, 59, 59, 999);
        }

        let query = supabase
          .from("redemptions")
          .select(`
            id,
            drink,
            redeemed_at,
            token_id,
            redemption_tokens (
              token_prefix
            )
          `)
          .eq("venue_id", selectedVenueId)
          .gte("redeemed_at", startDate.toISOString())
          .order("redeemed_at", { ascending: false })
          .limit(50);

        if (endDate) {
          query = query.lte("redeemed_at", endDate.toISOString());
        }

        const { data, error } = await query;

        if (error) {
          console.error("Error loading redemptions:", error);
        } else {
          setRedemptions(data || []);
        }

        // Get today's count for summary
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        
        const { count } = await supabase
          .from("redemptions")
          .select("*", { count: "exact", head: true })
          .eq("venue_id", selectedVenueId)
          .gte("redeemed_at", todayStart.toISOString());

        setTodayCount(count || 0);
      } catch (error) {
        console.error("Error:", error);
      }

      setIsLoading(false);
    };

    loadRedemptions();
  }, [selectedVenueId, dateFilter]);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("hu-HU", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString("hu-HU", {
      month: "short",
      day: "numeric",
    });
  };

  const getDateFilterLabel = (filter: DateFilter): string => {
    switch (filter) {
      case "today": return "Ma";
      case "yesterday": return "Tegnap";
      case "week": return "Utolsó 7 nap";
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate("/pos/redeem")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Beváltási Előzmények</h1>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <Select value={selectedVenueId} onValueChange={setSelectedVenueId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Válassz helyszínt..." />
            </SelectTrigger>
            <SelectContent>
              {venues.map((venue) => (
                <SelectItem key={venue.id} value={venue.id}>
                  {venue.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Ma</SelectItem>
              <SelectItem value="yesterday">Tegnap</SelectItem>
              <SelectItem value="week">Utolsó 7 nap</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary Card */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wine className="h-5 w-5 text-primary" />
                <span className="text-muted-foreground">Mai beváltások:</span>
              </div>
              <span className="text-2xl font-bold text-foreground">{todayCount}</span>
            </div>
          </CardContent>
        </Card>

        {/* Redemptions List */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {getDateFilterLabel(dateFilter)} - {redemptions.length} beváltás
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : redemptions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nincs beváltás ebben az időszakban
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="divide-y divide-border">
                  {redemptions.map((redemption) => (
                    <div 
                      key={redemption.id} 
                      className="flex items-center justify-between px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Wine className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{redemption.drink}</p>
                          {redemption.redemption_tokens?.[0]?.token_prefix && (
                            <Badge variant="outline" className="text-xs">
                              {redemption.redemption_tokens[0].token_prefix}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span className="text-sm">{formatTime(redemption.redeemed_at)}</span>
                        </div>
                        {dateFilter === "week" && (
                          <span className="text-xs text-muted-foreground">
                            {formatDate(redemption.redeemed_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Back to Scanner */}
        <Button 
          onClick={() => navigate("/pos/redeem")} 
          className="w-full"
        >
          <Camera className="h-4 w-4 mr-2" />
          Vissza a szkennerhez
        </Button>
      </div>
    </div>
  );
}
