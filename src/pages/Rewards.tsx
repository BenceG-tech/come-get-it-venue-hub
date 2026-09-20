
import { useState, useEffect, useMemo } from "react";
import { PageLayout } from "@/components/PageLayout";
import { DataTable } from "@/components/DataTable";
import { RewardFormModal } from "@/components/RewardFormModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Edit, Trash2, Gift, Utensils, Star, Percent, PartyPopper, Handshake, Globe, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { Reward, RewardCategory, Venue } from "@/lib/types";
import { supabaseProvider } from "@/lib/dataProvider/supabaseProvider";
import { useToast } from "@/hooks/use-toast";
import { getRewardVisibility, VenueVisibilityInfo } from "@/lib/rewardVisibility";
import { sessionManager } from "@/auth/session";

const categoryIcons: Record<RewardCategory, React.ReactNode> = {
  drink: <Gift className="h-4 w-4" />,
  food: <Utensils className="h-4 w-4" />,
  vip: <Star className="h-4 w-4" />,
  discount: <Percent className="h-4 w-4" />,
  experience: <PartyPopper className="h-4 w-4" />,
  partner: <Handshake className="h-4 w-4" />
};

const categoryLabels: Record<RewardCategory, string> = {
  drink: 'Ital',
  food: 'Étel',
  vip: 'VIP',
  discount: 'Kedvezmény',
  experience: 'Élmény',
  partner: 'Partner'
};

export default function Rewards() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [venues, setVenues] = useState<VenueVisibilityInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const isAdmin = sessionManager.getRole() === 'cgi_admin';
  const myVenueIds = sessionManager.getCurrentSession()?.venues ?? [];

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rewardData, venueData] = await Promise.all([
        supabaseProvider.getList<Reward>('rewards', {
          orderBy: 'priority',
          orderDir: 'desc'
        }),
        // RLS is the backstop: owners only receive their own venues.
        supabaseProvider.getList<Venue>('venues')
      ]);

      const visibleVenues = (venueData as unknown as VenueVisibilityInfo[]).filter(
        (v) => isAdmin || myVenueIds.includes(v.id)
      );
      const allowedIds = new Set(visibleVenues.map((v) => v.id));

      setVenues(visibleVenues);
      setRewards(
        isAdmin
          ? rewardData
          : rewardData.filter((r) => r.is_global || (r.venue_id && allowedIds.has(r.venue_id)))
      );
    } catch (error) {
      console.error('Failed to fetch rewards');
      toast({
        title: "Hiba",
        description: "Nem sikerült betölteni a jutalmakat",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const venuesById = useMemo(() => {
    const map: Record<string, VenueVisibilityInfo> = {};
    venues.forEach((v) => { map[v.id] = v; });
    return map;
  }, [venues]);

  const visibleCount = useMemo(
    () => rewards.filter((r) => getRewardVisibility(r, r.venue_id ? venuesById[r.venue_id] : null).visible).length,
    [rewards, venuesById]
  );

  const handleCreateReward = async (newReward: Omit<Reward, 'id'>) => {
    try {
      await supabaseProvider.create('rewards', newReward);
      toast({
        title: "Siker",
        description: "Jutalom létrehozva (inaktívként, amíg nem publikálod)"
      });
      fetchData();
    } catch (error) {
      console.error('Failed to create reward');
      toast({
        title: "Hiba",
        description: "Nem sikerült létrehozni a jutalmat",
        variant: "destructive"
      });
    }
  };

  const handleUpdateReward = async (updatedReward: Omit<Reward, 'id'>, rewardId: string) => {
    try {
      await supabaseProvider.update('rewards', rewardId, updatedReward);
      toast({
        title: "Siker",
        description: "Jutalom frissítve"
      });
      fetchData();
    } catch (error) {
      console.error('Failed to update reward');
      toast({
        title: "Hiba",
        description: "Nem sikerült frissíteni a jutalmat",
        variant: "destructive"
      });
    }
  };

  const handleDeleteReward = async (rewardId: string) => {
    try {
      await supabaseProvider.remove('rewards', rewardId);
      toast({
        title: "Siker",
        description: "Jutalom törölve"
      });
      fetchData();
    } catch (error) {
      console.error('Failed to delete reward');
      toast({
        title: "Hiba",
        description: "Nem sikerült törölni a jutalmat",
        variant: "destructive"
      });
    }
  };

  const columns = [
    {
      key: 'name' as keyof Reward,
      label: 'Jutalom neve',
      render: (value: string, item: Reward) => (
        <div className="flex items-center gap-2">
          {item.is_global && (
            <span title="Globális jutalom">
              <Globe className="h-4 w-4 text-cgi-secondary" />
            </span>
          )}
          <span className="font-medium text-cgi-surface-foreground">{value}</span>
        </div>
      )
    },
    {
      key: 'venue_id' as keyof Reward,
      label: 'Helyszín',
      render: (value: string | null | undefined, item: Reward) => {
        if (item.is_global && !value) {
          return <span className="text-cgi-secondary text-sm">Minden helyszín</span>;
        }
        const venue = value ? venuesById[value] : undefined;
        if (!venue) {
          return <span className="text-cgi-muted-foreground text-sm">Nincs helyszín</span>;
        }
        return (
          <div className="flex items-center gap-2">
            <span className="text-cgi-surface-foreground text-sm">{venue.name}</span>
            <Badge className={venue.is_paused ? 'cgi-badge-error' : 'cgi-badge-success'}>
              {venue.is_paused ? 'Szüneteltetve' : 'Aktív'}
            </Badge>
          </div>
        );
      }
    },
    {
      key: 'category' as keyof Reward,
      label: 'Kategória',
      render: (value: RewardCategory | undefined) => value ? (
        <div className="flex items-center gap-1.5">
          {categoryIcons[value]}
          <span className="text-cgi-surface-foreground">{categoryLabels[value]}</span>
        </div>
      ) : (
        <span className="text-cgi-muted-foreground">-</span>
      )
    },
    {
      key: 'points_required' as keyof Reward,
      label: 'Szükséges pontok',
      render: (value: number) => (
        <div className="flex items-center gap-1">
          <span className="font-medium text-cgi-secondary">{value}</span>
          <span className="text-xs text-cgi-muted-foreground">pt</span>
        </div>
      )
    },
    {
      key: 'current_redemptions' as keyof Reward,
      label: 'Beváltás / limit',
      render: (value: number | undefined, item: Reward) => (
        <span className="text-cgi-surface-foreground text-sm">
          {value ?? 0}
          {item.max_redemptions != null ? ` / ${item.max_redemptions}` : ' / ∞'}
        </span>
      )
    },
    {
      key: 'valid_until' as keyof Reward,
      label: 'Érvényesség',
      render: (value: string) => (
        <span className="text-cgi-surface-foreground">
          {value ? new Date(value).toLocaleDateString('hu-HU') : '-'}
        </span>
      )
    },
    {
      key: 'active' as keyof Reward,
      label: 'Megjelenés az appban',
      render: (_value: boolean, item: Reward) => {
        const visibility = getRewardVisibility(item, item.venue_id ? venuesById[item.venue_id] : null);
        return (
          <Badge className={visibility.visible ? 'cgi-badge-success' : 'cgi-badge-error'}>
            <span className="flex items-center gap-1.5">
              {visibility.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              {visibility.label}
            </span>
          </Badge>
        );
      }
    },
    {
      key: 'id' as keyof Reward,
      label: 'Műveletek',
      render: (value: string, item: Reward) => (
        <div className="flex items-center gap-2">
          <RewardFormModal
            reward={item}
            venues={venues}
            onSubmit={(updatedReward) => handleUpdateReward(updatedReward, value)}
            trigger={
              <Button variant="ghost" size="sm" className="cgi-button-ghost">
                <Edit className="h-4 w-4" />
              </Button>
            }
          />
          <Button 
            variant="ghost" 
            size="sm" 
            className="cgi-button-ghost text-red-400 hover:text-red-300"
            onClick={() => handleDeleteReward(value)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <PageLayout>
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-cgi-surface-foreground mb-2">Jutalmak</h1>
          <p className="text-cgi-muted-foreground">
            A pontgyűjtési rendszer jutalmainak kezelése
          </p>
        </div>
        <RewardFormModal onSubmit={handleCreateReward} venues={venues} />
      </div>

      {!loading && (
        <div className="mb-6 space-y-4">
          <p className="text-sm text-cgi-muted-foreground">
            {visibleCount} / {rewards.length} jutalom látható most a mobilappban.
          </p>
          {rewards.length > 0 && visibleCount === 0 && (
            <Alert className="border-cgi-warning/40 bg-cgi-warning/10">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Egyetlen jutalom sem látható az appban</AlertTitle>
              <AlertDescription>
                A mobilapp csak aktív, érvényes, limit alatti jutalmakat mutat, amelyek globálisak vagy nem
                szüneteltetett helyszínhez tartoznak.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      <div className="cgi-card">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cgi-primary"></div>
          </div>
        ) : (
          <DataTable 
            data={rewards}
            columns={columns}
            searchPlaceholder="Keresés jutalmak között..."
          />
        )}
      </div>
    </PageLayout>
  );
}
