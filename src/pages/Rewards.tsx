
import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { DataTable } from "@/components/DataTable";
import { RewardFormModal } from "@/components/RewardFormModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { mockRewards } from "@/lib/mockData";
import { Reward } from "@/lib/types";

export default function Rewards() {
  const [rewards, setRewards] = useState(mockRewards);

  const handleCreateReward = (newReward: Omit<Reward, 'id'>) => {
    const reward: Reward = {
      ...newReward,
      id: `rew-${Date.now()}`
    };
    setRewards(prev => [...prev, reward]);
  };

  const handleUpdateReward = (updatedReward: Omit<Reward, 'id'>, rewardId: string) => {
    setRewards(prev => prev.map(reward => 
      reward.id === rewardId 
        ? { ...updatedReward, id: rewardId }
        : reward
    ));
  };

  const handleDeleteReward = (rewardId: string) => {
    setRewards(prev => prev.filter(reward => reward.id !== rewardId));
  };

  const columns = [
    {
      key: 'name' as keyof Reward,
      label: 'Jutalom neve',
      render: (value: string) => (
        <span className="font-medium text-cgi-surface-foreground">{value}</span>
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
    <div className="cgi-page flex">
      <Sidebar />
      <main className="flex-1 lg:ml-0 min-h-screen">
        <div className="cgi-container py-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-cgi-surface-foreground mb-2">Jutalmak</h1>
              <p className="text-cgi-muted-foreground">
                A pontgyűjtési rendszer jutalmainak kezelése
              </p>
            </div>
            <RewardFormModal onSubmit={handleCreateReward} />
          </div>

          <div className="cgi-card">
            <DataTable 
              data={rewards}
              columns={columns}
              searchPlaceholder="Keresés jutalmak között..."
            />
          </div>
        </div>
      </main>
    </div>
  );
}
