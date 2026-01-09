import { useState, useEffect } from 'react';
import { PageLayout } from '@/components/PageLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Send } from 'lucide-react';
import { NotificationFormModal } from '@/components/NotificationFormModal';
import { NotificationTemplate } from '@/lib/types';
import { getDataProvider } from '@/lib/dataProvider/providerFactory';
import { useToast } from '@/hooks/use-toast';

export default function Notifications() {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const { toast } = useToast();
  const provider = getDataProvider();

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await provider.getList<NotificationTemplate>('notification_templates');
      setTemplates(data);
    } catch (err) {
      toast({
        title: 'Hiba',
        description: 'Nem sikerült betölteni az értesítéseket',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Biztosan törli ezt az értesítést?')) return;
    
    try {
      await provider.remove('notification_templates', id);
      toast({ title: 'Törölve' });
      loadTemplates();
    } catch (err) {
      toast({ title: 'Hiba', variant: 'destructive' });
    }
  };

  const handleTestSend = async (template: NotificationTemplate) => {
    // TODO: Backend endpoint meghívása
    toast({ 
      title: 'Teszt értesítés', 
      description: `"${template.title_hu}" elküldve tesztként!` 
    });
  };

  return (
    <PageLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-cgi-surface-foreground">Értesítések</h1>
          <p className="text-cgi-muted-foreground mt-1">
            Push értesítések kezelése a fogyasztói apphoz
          </p>
        </div>
        <Button onClick={() => { setEditingTemplate(null); setModalOpen(true); }} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Új értesítés
        </Button>
      </div>

      {/* Statisztika kártyák */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-sm text-cgi-muted-foreground">Összes sablon</div>
          <div className="text-2xl font-bold text-cgi-surface-foreground">{templates.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-cgi-muted-foreground">Aktív</div>
          <div className="text-2xl font-bold text-green-600">
            {templates.filter(t => t.is_active).length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-cgi-muted-foreground">Ütemezett</div>
          <div className="text-2xl font-bold text-blue-600">
            {templates.filter(t => t.send_mode === 'scheduled').length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-cgi-muted-foreground">Automatizált</div>
          <div className="text-2xl font-bold text-purple-600">
            {templates.filter(t => t.send_mode === 'event').length}
          </div>
        </Card>
      </div>

      {/* Értesítések listája */}
      <div className="space-y-4">
        {loading ? (
          <Card className="p-8 text-center text-cgi-muted-foreground">
            Betöltés...
          </Card>
        ) : templates.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-cgi-muted-foreground mb-4">Még nincsenek értesítések</p>
            <Button onClick={() => setModalOpen(true)}>
              Első értesítés létrehozása
            </Button>
          </Card>
        ) : (
          templates.map(template => (
            <Card key={template.id} className="p-4">
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h3 className="text-lg font-semibold text-cgi-surface-foreground">{template.title_hu}</h3>
                    <Badge variant={template.is_active ? 'default' : 'secondary'}>
                      {template.is_active ? 'Aktív' : 'Inaktív'}
                    </Badge>
                    <Badge variant="outline">{template.category}</Badge>
                    {template.send_mode === 'event' && (
                      <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                        {template.event_type}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-cgi-muted-foreground mb-2">
                    {template.body_hu}
                  </p>
                  <div className="flex gap-4 text-xs text-cgi-muted-foreground flex-wrap">
                    <span>🎯 Célzás: {template.targeting.geofence?.enabled ? 'Geofence' : 'Összes'}</span>
                    <span>📱 Platform: {template.targeting.platform || 'mind'}</span>
                    <span>🔔 Limit: {template.frequency_limit.max_per_day || '∞'}/nap</span>
                  </div>
                </div>
                
                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestSend(template)}
                    className="min-h-[44px] min-w-[44px]"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setEditingTemplate(template); setModalOpen(true); }}
                    className="min-h-[44px] min-w-[44px]"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(template.id)}
                    className="min-h-[44px] min-w-[44px]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Form Modal */}
      <NotificationFormModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingTemplate(null); }}
        template={editingTemplate}
        onSave={() => { loadTemplates(); setModalOpen(false); }}
      />
    </PageLayout>
  );
}
