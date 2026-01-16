import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DataTable, Column } from '@/components/DataTable';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Factory, Plus, Search, Edit, Users, Calendar, DollarSign, CheckCircle2, XCircle } from 'lucide-react';
import { RouteGuard } from '@/components/RouteGuard';
import { PageLayout } from '@/components/PageLayout';
import { TagInput } from '@/components/TagInput';
import { Brand } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';

const defaultBrandForm = {
  name: '',
  logo_url: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  product_categories: [] as string[],
  product_keywords: [] as string[],
  contract_start: '',
  contract_end: '',
  monthly_budget: '',
  notes: '',
  is_active: true,
};

export default function Brands() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [brandForm, setBrandForm] = useState(defaultBrandForm);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setBrands(data || []);
    } catch (error) {
      console.error('Error loading brands:', error);
      toast({
        title: "Hiba",
        description: "Nem sikerült betölteni a márkákat",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredBrands = brands.filter(brand =>
    brand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (brand.contact_name && brand.contact_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleOpenModal = (brand?: Brand) => {
    if (brand) {
      setEditingBrand(brand);
      setBrandForm({
        name: brand.name,
        logo_url: brand.logo_url || '',
        contact_name: brand.contact_name || '',
        contact_email: brand.contact_email || '',
        contact_phone: brand.contact_phone || '',
        product_categories: brand.product_categories || [],
        product_keywords: brand.product_keywords || [],
        contract_start: brand.contract_start || '',
        contract_end: brand.contract_end || '',
        monthly_budget: brand.monthly_budget?.toString() || '',
        notes: brand.notes || '',
        is_active: brand.is_active !== false,
      });
    } else {
      setEditingBrand(null);
      setBrandForm(defaultBrandForm);
    }
    setIsCreateModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
    setEditingBrand(null);
    setBrandForm(defaultBrandForm);
  };

  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        name: brandForm.name,
        logo_url: brandForm.logo_url || null,
        contact_name: brandForm.contact_name || null,
        contact_email: brandForm.contact_email || null,
        contact_phone: brandForm.contact_phone || null,
        product_categories: brandForm.product_categories.length > 0 ? brandForm.product_categories : null,
        product_keywords: brandForm.product_keywords.length > 0 ? brandForm.product_keywords : null,
        contract_start: brandForm.contract_start || null,
        contract_end: brandForm.contract_end || null,
        monthly_budget: brandForm.monthly_budget ? parseInt(brandForm.monthly_budget) : null,
        notes: brandForm.notes || null,
        is_active: brandForm.is_active,
      };

      if (editingBrand) {
        const { error } = await supabase
          .from('brands')
          .update(data)
          .eq('id', editingBrand.id);
        if (error) throw error;
        toast({ title: "Mentve", description: "A márka sikeresen frissítve" });
      } else {
        const { error } = await supabase
          .from('brands')
          .insert([data]);
        if (error) throw error;
        toast({ title: "Létrehozva", description: "Az új márka sikeresen létrehozva" });
      }

      handleCloseModal();
      loadData();
    } catch (error) {
      console.error('Error saving brand:', error);
      toast({
        title: "Hiba",
        description: "Nem sikerült menteni a márkát",
        variant: "destructive"
      });
    }
  };

  const columns: Column<Brand>[] = [
    {
      key: 'name',
      label: 'Márka',
      priority: 'high',
      render: (_, brand) => (
        <div className="flex items-center gap-3">
          {brand.logo_url ? (
            <img 
              src={brand.logo_url} 
              alt={brand.name}
              className="w-10 h-10 rounded-lg object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-cgi-secondary/20 flex items-center justify-center">
              <Factory className="h-5 w-5 text-cgi-secondary" />
            </div>
          )}
          <div>
            <p className="font-medium text-cgi-surface-foreground">{brand.name}</p>
            {brand.product_categories && brand.product_categories.length > 0 && (
              <div className="flex gap-1 mt-1">
                {brand.product_categories.slice(0, 2).map(cat => (
                  <Badge key={cat} variant="outline" className="text-xs bg-cgi-muted/30">
                    {cat}
                  </Badge>
                ))}
                {brand.product_categories.length > 2 && (
                  <span className="text-xs text-cgi-muted-foreground">
                    +{brand.product_categories.length - 2}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'contact_name',
      label: 'Kapcsolattartó',
      priority: 'high',
      render: (_, brand) => (
        brand.contact_name ? (
          <div>
            <p className="font-medium text-cgi-surface-foreground">{brand.contact_name}</p>
            {brand.contact_email && (
              <p className="text-sm text-cgi-muted-foreground">{brand.contact_email}</p>
            )}
            {brand.contact_phone && (
              <p className="text-sm text-cgi-muted-foreground">{brand.contact_phone}</p>
            )}
          </div>
        ) : (
          <span className="text-cgi-muted-foreground">Nincs megadva</span>
        )
      )
    },
    {
      key: 'contract_start',
      label: 'Szerződés',
      priority: 'medium',
      render: (_, brand) => (
        brand.contract_start || brand.contract_end ? (
          <div className="text-sm">
            <div className="flex items-center gap-1 text-cgi-surface-foreground">
              <Calendar className="h-3 w-3" />
              {brand.contract_start ? format(parseISO(brand.contract_start), 'yyyy.MM.dd') : '-'}
            </div>
            <div className="text-cgi-muted-foreground">
              → {brand.contract_end ? format(parseISO(brand.contract_end), 'yyyy.MM.dd') : 'Határozatlan'}
            </div>
          </div>
        ) : (
          <span className="text-cgi-muted-foreground">Nincs</span>
        )
      )
    },
    {
      key: 'monthly_budget',
      label: 'Költségvetés',
      priority: 'medium',
      render: (_, brand) => (
        brand.monthly_budget ? (
          <div className="text-sm">
            <div className="flex items-center gap-1 text-cgi-surface-foreground">
              <DollarSign className="h-3 w-3" />
              {new Intl.NumberFormat('hu-HU').format(brand.monthly_budget)} Ft
            </div>
            {brand.spent_this_month !== undefined && brand.spent_this_month !== null && (
              <div className="text-cgi-muted-foreground">
                Elköltve: {new Intl.NumberFormat('hu-HU').format(brand.spent_this_month)} Ft
              </div>
            )}
          </div>
        ) : (
          <span className="text-cgi-muted-foreground">-</span>
        )
      )
    },
    {
      key: 'is_active',
      label: 'Státusz',
      priority: 'low',
      render: (_, brand) => (
        brand.is_active !== false ? (
          <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Aktív
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-gray-500/20 text-gray-400 border-gray-500/30">
            <XCircle className="h-3 w-3 mr-1" />
            Inaktív
          </Badge>
        )
      )
    },
    {
      key: 'id',
      label: 'Műveletek',
      priority: 'low',
      render: (_, brand) => (
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="cgi-button-ghost"
            onClick={() => handleOpenModal(brand)}
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  const activeCount = brands.filter(b => b.is_active !== false).length;
  const totalBudget = brands.reduce((sum, b) => sum + (b.monthly_budget || 0), 0);

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
              <Factory className="h-8 w-8 text-cgi-secondary" />
              <div>
                <h1 className="text-2xl font-bold text-cgi-surface-foreground">Márkák</h1>
                <p className="text-cgi-muted-foreground">Márkapartnerségek és szerződések kezelése</p>
              </div>
            </div>
            
            <Button className="cgi-button-primary" onClick={() => handleOpenModal()}>
              <Plus className="h-4 w-4 mr-2" />
              Új márka
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 cgi-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-cgi-secondary/20 flex items-center justify-center">
                  <Factory className="h-5 w-5 text-cgi-secondary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-cgi-surface-foreground">{brands.length}</p>
                  <p className="text-sm text-cgi-muted-foreground">Összes márka</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4 cgi-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-cgi-surface-foreground">{activeCount}</p>
                  <p className="text-sm text-cgi-muted-foreground">Aktív partner</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4 cgi-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-cgi-surface-foreground">
                    {new Intl.NumberFormat('hu-HU', { notation: 'compact' }).format(totalBudget)} Ft
                  </p>
                  <p className="text-sm text-cgi-muted-foreground">Havi keret</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Search */}
          <Card className="p-4 cgi-card">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cgi-muted-foreground" />
              <Input
                placeholder="Keresés márka vagy kapcsolattartó neve alapján..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="cgi-input pl-10"
              />
            </div>
          </Card>

          {/* Brands DataTable */}
          <DataTable
            data={filteredBrands}
            columns={columns}
            searchPlaceholder="Keresés márka vagy kapcsolattartó neve alapján..."
          />
        </div>

        {/* Create/Edit Modal */}
        <Dialog open={isCreateModalOpen} onOpenChange={handleCloseModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-cgi-surface border-cgi-muted">
            <DialogHeader>
              <DialogTitle className="text-cgi-surface-foreground">
                {editingBrand ? 'Márka szerkesztése' : 'Új márka létrehozása'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveBrand} className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-cgi-surface-foreground">Márka neve *</Label>
                  <Input
                    id="name"
                    value={brandForm.name}
                    onChange={(e) => setBrandForm(prev => ({ ...prev, name: e.target.value }))}
                    className="cgi-input"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="logo_url" className="text-cgi-surface-foreground">Logó URL</Label>
                  <Input
                    id="logo_url"
                    type="url"
                    value={brandForm.logo_url}
                    onChange={(e) => setBrandForm(prev => ({ ...prev, logo_url: e.target.value }))}
                    className="cgi-input"
                  />
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-cgi-surface-foreground">Kapcsolattartó</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contact_name" className="text-cgi-surface-foreground">Név</Label>
                    <Input
                      id="contact_name"
                      value={brandForm.contact_name}
                      onChange={(e) => setBrandForm(prev => ({ ...prev, contact_name: e.target.value }))}
                      className="cgi-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact_email" className="text-cgi-surface-foreground">Email</Label>
                    <Input
                      id="contact_email"
                      type="email"
                      value={brandForm.contact_email}
                      onChange={(e) => setBrandForm(prev => ({ ...prev, contact_email: e.target.value }))}
                      className="cgi-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact_phone" className="text-cgi-surface-foreground">Telefon</Label>
                    <Input
                      id="contact_phone"
                      value={brandForm.contact_phone}
                      onChange={(e) => setBrandForm(prev => ({ ...prev, contact_phone: e.target.value }))}
                      className="cgi-input"
                    />
                  </div>
                </div>
              </div>

              {/* Product Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-cgi-surface-foreground">Termék információk</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-cgi-surface-foreground">Kategóriák</Label>
                    <TagInput
                      tags={brandForm.product_categories || []}
                      onChange={(tags) => setBrandForm(prev => ({ ...prev, product_categories: tags }))}
                      placeholder="Új kategória..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-cgi-surface-foreground">Kulcsszavak</Label>
                    <TagInput
                      tags={brandForm.product_keywords || []}
                      onChange={(tags) => setBrandForm(prev => ({ ...prev, product_keywords: tags }))}
                      placeholder="Új kulcsszó..."
                    />
                  </div>
                </div>
              </div>

              {/* Contract Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-cgi-surface-foreground">Szerződés</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contract_start" className="text-cgi-surface-foreground">Kezdés</Label>
                    <Input
                      id="contract_start"
                      type="date"
                      value={brandForm.contract_start}
                      onChange={(e) => setBrandForm(prev => ({ ...prev, contract_start: e.target.value }))}
                      className="cgi-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contract_end" className="text-cgi-surface-foreground">Vége</Label>
                    <Input
                      id="contract_end"
                      type="date"
                      value={brandForm.contract_end}
                      onChange={(e) => setBrandForm(prev => ({ ...prev, contract_end: e.target.value }))}
                      className="cgi-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="monthly_budget" className="text-cgi-surface-foreground">Havi keret (Ft)</Label>
                    <Input
                      id="monthly_budget"
                      type="number"
                      value={brandForm.monthly_budget}
                      onChange={(e) => setBrandForm(prev => ({ ...prev, monthly_budget: e.target.value }))}
                      className="cgi-input"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-cgi-surface-foreground">Megjegyzések</Label>
                <Textarea
                  id="notes"
                  value={brandForm.notes}
                  onChange={(e) => setBrandForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="cgi-input"
                  rows={3}
                />
              </div>

              {/* Status */}
              <div className="flex items-center gap-3">
                <Switch
                  checked={brandForm.is_active}
                  onCheckedChange={(v) => setBrandForm(prev => ({ ...prev, is_active: v }))}
                />
                <Label className="text-cgi-surface-foreground">Aktív partner</Label>
              </div>

              <div className="flex justify-end space-x-4 pt-4 border-t border-cgi-muted">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleCloseModal}
                  className="cgi-button-ghost"
                >
                  Mégse
                </Button>
                <Button type="submit" className="cgi-button-primary">
                  {editingBrand ? 'Mentés' : 'Létrehozás'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageLayout>
    </RouteGuard>
  );
}
