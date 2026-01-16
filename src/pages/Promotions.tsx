import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DataTable, Column } from '@/components/DataTable';
import { 
  Sparkles, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Calendar,
  Clock,
  Target,
  Percent,
  TrendingUp
} from 'lucide-react';
import { RouteGuard } from '@/components/RouteGuard';
import { PageLayout } from '@/components/PageLayout';
import { PromotionFormModal } from '@/components/PromotionFormModal';
import { Promotion, Brand } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isAfter, isBefore } from 'date-fns';
import { hu } from 'date-fns/locale';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type StatusFilter = 'all' | 'active' | 'inactive' | 'expired' | 'scheduled';

const ruleTypeLabels: Record<string, string> = {
  category_multiplier: 'Kategória szorzó',
  brand_bonus: 'Márka bónusz',
  time_bonus: 'Időalapú bónusz',
  spending_tier: 'Költési szint',
  combo_bonus: 'Kombinációs bónusz',
};

const ruleTypeIcons: Record<string, any> = {
  category_multiplier: Percent,
  brand_bonus: Target,
  time_bonus: Clock,
  spending_tier: TrendingUp,
  combo_bonus: Sparkles,
};

export default function Promotions() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [promotionsRes, brandsRes] = await Promise.all([
        supabase.from('promotions').select('*').order('priority', { ascending: false }),
        supabase.from('brands').select('*').eq('is_active', true)
      ]);

      if (promotionsRes.error) throw promotionsRes.error;
      if (brandsRes.error) throw brandsRes.error;

      // Enrich promotions with brand names
      const enrichedPromotions = (promotionsRes.data || []).map(p => {
        const brand = brandsRes.data?.find(b => b.id === p.sponsor_brand_id);
        return {
          ...p,
          sponsor_brand_name: brand?.name,
          rule_config: p.rule_config as any,
          active_hours: p.active_hours as any,
        } as Promotion;
      });

      setPromotions(enrichedPromotions);
      setBrands(brandsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Hiba",
        description: "Nem sikerült betölteni a promóciókat",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPromotionStatus = (promotion: Promotion): 'active' | 'inactive' | 'expired' | 'scheduled' => {
    const now = new Date();
    const startsAt = parseISO(promotion.starts_at);
    const endsAt = parseISO(promotion.ends_at);

    if (!promotion.is_active) return 'inactive';
    if (isBefore(endsAt, now)) return 'expired';
    if (isAfter(startsAt, now)) return 'scheduled';
    return 'active';
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; label: string }> = {
      active: { className: 'bg-green-500/20 text-green-400 border-green-500/30', label: 'Aktív' },
      inactive: { className: 'bg-gray-500/20 text-gray-400 border-gray-500/30', label: 'Inaktív' },
      expired: { className: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Lejárt' },
      scheduled: { className: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: 'Ütemezett' },
    };
    const v = variants[status] || variants.inactive;
    return <Badge variant="outline" className={v.className}>{v.label}</Badge>;
  };

  const getRuleDescription = (promotion: Promotion): string => {
    const config = promotion.rule_config;
    switch (promotion.rule_type) {
      case 'category_multiplier':
        return `${(config as any).multiplier}x pont a(z) ${(config as any).category} kategóriában`;
      case 'brand_bonus':
        return `+${(config as any).bonus_points} pont ${promotion.sponsor_brand_name || 'márka'} termékekre`;
      case 'time_bonus':
        return `${(config as any).multiplier}x pont bónusz`;
      case 'spending_tier':
        return `+${(config as any).bonus_points} pont ${(config as any).min_amount} Ft felett`;
      case 'combo_bonus':
        return `+${(config as any).bonus_points} pont kombóra`;
      default:
        return 'Egyéni szabály';
    }
  };

  const filteredPromotions = promotions.filter(promotion => {
    const matchesSearch = promotion.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (promotion.description && promotion.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && getPromotionStatus(promotion) === statusFilter;
  });

  const handleDelete = async (id: string) => {
    if (!confirm('Biztosan törölni szeretné ezt a promóciót?')) return;
    
    try {
      const { error } = await supabase.from('promotions').delete().eq('id', id);
      if (error) throw error;
      
      toast({ title: "Törölve", description: "A promóció sikeresen törölve" });
      loadData();
    } catch (error) {
      console.error('Error deleting promotion:', error);
      toast({
        title: "Hiba",
        description: "Nem sikerült törölni a promóciót",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (promotion: Promotion) => {
    setEditingPromotion(promotion);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingPromotion(null);
  };

  const handleSaveSuccess = () => {
    handleModalClose();
    loadData();
  };

  const columns: Column<Promotion>[] = [
    {
      key: 'name',
      label: 'Promóció',
      priority: 'high',
      render: (_, promotion) => {
        const Icon = ruleTypeIcons[promotion.rule_type] || Sparkles;
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cgi-secondary/20 flex items-center justify-center">
              <Icon className="h-5 w-5 text-cgi-secondary" />
            </div>
            <div>
              <p className="font-medium text-cgi-surface-foreground">{promotion.name}</p>
              <p className="text-sm text-cgi-muted-foreground">
                {ruleTypeLabels[promotion.rule_type] || promotion.rule_type}
              </p>
            </div>
          </div>
        );
      }
    },
    {
      key: 'rule_config',
      label: 'Szabály',
      priority: 'high',
      render: (_, promotion) => (
        <span className="text-sm text-cgi-surface-foreground">{getRuleDescription(promotion)}</span>
      )
    },
    {
      key: 'starts_at',
      label: 'Időszak',
      priority: 'medium',
      render: (_, promotion) => (
        <div className="text-sm">
          <div className="flex items-center gap-1 text-cgi-surface-foreground">
            <Calendar className="h-3 w-3" />
            {format(parseISO(promotion.starts_at), 'yyyy.MM.dd', { locale: hu })}
          </div>
          <div className="text-cgi-muted-foreground">
            → {format(parseISO(promotion.ends_at), 'yyyy.MM.dd', { locale: hu })}
          </div>
        </div>
      )
    },
    {
      key: 'sponsor_brand_id',
      label: 'Szponzor',
      priority: 'low',
      render: (_, promotion) => (
        promotion.sponsor_brand_name ? (
          <Badge variant="outline" className="bg-cgi-secondary/10 text-cgi-secondary border-cgi-secondary/30">
            {promotion.sponsor_brand_name}
          </Badge>
        ) : (
          <span className="text-cgi-muted-foreground">-</span>
        )
      )
    },
    {
      key: 'is_active',
      label: 'Státusz',
      priority: 'high',
      render: (_, promotion) => getStatusBadge(getPromotionStatus(promotion))
    },
    {
      key: 'id',
      label: 'Műveletek',
      priority: 'low',
      render: (_, promotion) => (
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="cgi-button-ghost"
            onClick={() => handleEdit(promotion)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="cgi-button-ghost text-red-400 hover:text-red-300 hover:bg-red-500/10"
            onClick={() => handleDelete(promotion.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  const activeCount = promotions.filter(p => getPromotionStatus(p) === 'active').length;
  const sponsoredCount = promotions.filter(p => p.sponsor_brand_id).length;

  if (isLoading) {
    return (
      <RouteGuard requiredRoles={['cgi_admin']}>
        <PageLayout>
          <div className="animate-pulse">Betöltés...</div>
        </PageLayout>
      </RouteGuard>
    );
  }

  return (
    <RouteGuard requiredRoles={['cgi_admin']}>
      <PageLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-cgi-secondary" />
              <div>
                <h1 className="text-2xl font-bold text-cgi-surface-foreground">Promóciók</h1>
                <p className="text-cgi-muted-foreground">Pont szorzók és bónuszok kezelése</p>
              </div>
            </div>
            
            <Button className="cgi-button-primary" onClick={() => setIsModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Új promóció
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 cgi-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-cgi-surface-foreground">{activeCount}</p>
                  <p className="text-sm text-cgi-muted-foreground">Aktív promóció</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4 cgi-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-cgi-secondary/20 flex items-center justify-center">
                  <Target className="h-5 w-5 text-cgi-secondary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-cgi-surface-foreground">{sponsoredCount}</p>
                  <p className="text-sm text-cgi-muted-foreground">Szponzorált</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4 cgi-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-cgi-surface-foreground">{promotions.length}</p>
                  <p className="text-sm text-cgi-muted-foreground">Összes promóció</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Filters */}
          <Card className="p-4 cgi-card">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cgi-muted-foreground" />
                <Input
                  placeholder="Keresés név vagy leírás alapján..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="cgi-input pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="w-full sm:w-48 cgi-input">
                  <SelectValue placeholder="Státusz" />
                </SelectTrigger>
                <SelectContent className="bg-cgi-surface border-cgi-muted">
                  <SelectItem value="all">Mind</SelectItem>
                  <SelectItem value="active">Aktív</SelectItem>
                  <SelectItem value="inactive">Inaktív</SelectItem>
                  <SelectItem value="scheduled">Ütemezett</SelectItem>
                  <SelectItem value="expired">Lejárt</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Promotions Table */}
          <DataTable
            data={filteredPromotions}
            columns={columns}
            searchPlaceholder="Keresés..."
          />
        </div>

        <PromotionFormModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onSuccess={handleSaveSuccess}
          promotion={editingPromotion}
          brands={brands}
        />
      </PageLayout>
    </RouteGuard>
  );
}
