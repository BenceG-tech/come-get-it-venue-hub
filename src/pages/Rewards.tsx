
import { useState, useEffect } from "react";
import { PageLayout } from "@/components/PageLayout";
import { DataTable } from "@/components/DataTable";
import { RewardFormModal } from "@/components/RewardFormModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Gift, Utensils, Star, Percent, PartyPopper, Handshake, Globe } from "lucide-react";
import { Reward, RewardCategory } from "@/lib/types";
import { supabaseProvider } from "@/lib/dataProvider/supabaseProvider";
import { useToast } from "@/hooks/use-toast";

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
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchRewards = async () => {
    try {
      setLoading(true);
      const data = await supabaseProvider.getList<Reward>('rewards', {
        orderBy: 'priority',
        orderDir: 'desc'
      });
      setRewards(data);
    } catch (error) {
      console.error('Failed to fetch rewards:', error);
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
    fetchRewards();
  }, []);

  const handleCreateReward = async (newReward: Omit<Reward, 'id'>) => {
    try {
      await supabaseProvider.create('rewards', newReward);
      toast({
        title: "Siker",
        description: "Jutalom létrehozva"
      });
      fetchRewards();
    } catch (error) {
      console.error('Failed to create reward:', error);
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
      fetchRewards();
    } catch (error) {
      console.error('Failed to update reward:', error);
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
      fetchRewards();
    } catch (error) {
      console.error('Failed to delete reward:', error);
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
      key: 'priority' as keyof Reward,
      label: 'Prioritás',
      render: (value: number | undefined) => (
        <span className="text-cgi-surface-foreground">{value ?? 0}</span>
      )
    },
    {
      key: 'valid_until' as keyof Reward,
      label: 'Érvényesség',
      render: (value: string) => (
        <span className="text-cgi-surface-foreground">
          {new Date(value).toLocaleDateString('hu-HU')}
        </span>
      )
    },
    {
      key: 'active' as keyof Reward,
      label: 'Állapot',
      render: (value: boolean) => (
        <Badge className={value ? 'cgi-badge-success' : 'cgi-badge-error'}>
          {value ? 'Aktív' : 'Inaktív'}
        </Badge>
      )
    },
    {
      key: 'id' as keyof Reward,
      label: 'Műveletek',
      render: (value: string, item: Reward) => (
        <div className="flex items-center gap-2">
          <RewardFormModal
            reward={item}
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
        <RewardFormModal onSubmit={handleCreateReward} />
      </div>

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
