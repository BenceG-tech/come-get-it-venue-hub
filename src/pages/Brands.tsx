import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DataTable, Column } from '@/components/DataTable';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Factory, Plus, Search, Edit, Users } from 'lucide-react';
import { RouteGuard } from '@/components/RouteGuard';
import { PageLayout } from '@/components/PageLayout';
import { Brand, BrandCampaign } from '@/lib/types';
import { getDataProvider } from '@/lib/dataProvider/providerFactory';

export default function Brands() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [campaigns, setCampaigns] = useState<BrandCampaign[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const dataProvider = getDataProvider();

  const [brandForm, setBrandForm] = useState({
    name: '',
    logoUrl: '',
    contactName: '',
    contactEmail: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [brandList, campaignList] = await Promise.all([
        dataProvider.getList<Brand>('brands'),
        dataProvider.getList<BrandCampaign>('campaigns')
      ]);
      setBrands(brandList);
      setCampaigns(campaignList);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredBrands = brands.filter(brand =>
    brand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (brand.contactName && brand.contactName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getActiveCampaignsCount = (brandId: string) => {
    return campaigns.filter(campaign => campaign.brand_id === brandId && campaign.active).length;
  };

  const getLastCampaignDate = (brandId: string) => {
    const brandCampaigns = campaigns.filter(campaign => campaign.brand_id === brandId);
    if (brandCampaigns.length === 0) return 'Nincs';
    
    // Mock date - in real app would be from campaign data
    return '2024-08-15';
  };

  const columns: Column<Brand>[] = [
    {
      key: 'name',
      label: 'Márka',
      priority: 'high',
      render: (_, brand) => (
        <div className="flex items-center gap-3">
          {brand.logoUrl ? (
            <img 
              src={brand.logoUrl} 
              alt={brand.name}
              className="w-8 h-8 rounded-lg object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-cgi-secondary/20 flex items-center justify-center">
              <Factory className="h-4 w-4 text-cgi-secondary" />
            </div>
          )}
          <div>
            <p className="font-medium">{brand.name}</p>
            {brand.notes && (
              <p className="text-sm text-cgi-muted-foreground truncate max-w-xs">
                {brand.notes}
              </p>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'contactName',
      label: 'Kapcsolattartó',
      priority: 'high',
      render: (_, brand) => (
        brand.contactName ? (
          <div>
            <p className="font-medium">{brand.contactName}</p>
            {brand.contactEmail && (
              <p className="text-sm text-cgi-muted-foreground">{brand.contactEmail}</p>
            )}
          </div>
        ) : (
          <span className="text-cgi-muted-foreground">Nincs megadva</span>
        )
      )
    },
    {
      key: 'id',
      label: 'Aktív kampányok',
      priority: 'medium',
      render: (_, brand) => (
        <span className="font-bold text-lg">{getActiveCampaignsCount(brand.id)}</span>
      )
    },
    {
      key: 'id',
      label: 'Utolsó aktiváció',
      priority: 'low',
      render: (_, brand) => (
        <span className="text-cgi-muted-foreground">{getLastCampaignDate(brand.id)}</span>
      )
    },
    {
      key: 'id',
      label: 'Műveletek',
      priority: 'low',
      render: (_, brand) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="cgi-button-ghost">
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="cgi-button-ghost">
            <Users className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await dataProvider.create('brands', brandForm);
      setBrandForm({
        name: '',
        logoUrl: '',
        contactName: '',
        contactEmail: '',
        notes: ''
      });
      setIsCreateModalOpen(false);
      loadData();
    } catch (error) {
      console.error('Error creating brand:', error);
    }
  };

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
                <p className="text-cgi-muted-foreground">Márkapartnerségek és kampányok kezelése</p>
              </div>
            </div>
            
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <Button className="cgi-button-primary">
                  <Plus className="h-4 w-4 mr-2" />
                  Új márka
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Új márka létrehozása</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateBrand} className="space-y-4">
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
                      <Label htmlFor="logoUrl" className="text-cgi-surface-foreground">Logó URL</Label>
                      <Input
                        id="logoUrl"
                        type="url"
                        value={brandForm.logoUrl}
                        onChange={(e) => setBrandForm(prev => ({ ...prev, logoUrl: e.target.value }))}
                        className="cgi-input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contactName" className="text-cgi-surface-foreground">Kapcsolattartó neve</Label>
                      <Input
                        id="contactName"
                        value={brandForm.contactName}
                        onChange={(e) => setBrandForm(prev => ({ ...prev, contactName: e.target.value }))}
                        className="cgi-input"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="contactEmail" className="text-cgi-surface-foreground">Kapcsolattartó email</Label>
                      <Input
                        id="contactEmail"
                        type="email"
                        value={brandForm.contactEmail}
                        onChange={(e) => setBrandForm(prev => ({ ...prev, contactEmail: e.target.value }))}
                        className="cgi-input"
                      />
                    </div>
                  </div>

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

                  <div className="flex justify-end space-x-4 pt-4 border-t border-cgi-muted">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setIsCreateModalOpen(false)}
                      className="cgi-button-ghost"
                    >
                      Mégse
                    </Button>
                    <Button type="submit" className="cgi-button-primary">
                      Létrehozás
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search */}
          <Card className="p-6 cgi-card">
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

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 cgi-card">
              <div className="flex items-center gap-3">
                <Factory className="h-8 w-8 text-cgi-secondary" />
                <div>
                  <p className="text-2xl font-bold">{brands.length}</p>
                  <p className="text-cgi-muted-foreground">Összes márka</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-6 cgi-card">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{campaigns.filter(c => c.active).length}</p>
                  <p className="text-cgi-muted-foreground">Aktív kampányok</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-6 cgi-card">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-cgi-primary" />
                <div>
                  <p className="text-2xl font-bold">{brands.filter(b => b.contactEmail).length}</p>
                  <p className="text-cgi-muted-foreground">Aktív partnerkapcsolat</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </PageLayout>
    </RouteGuard>
  );
}
