import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageLayout } from '@/components/PageLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, PauseCircle, RefreshCw, CalendarClock } from 'lucide-react';
import { NotificationFormModal } from '@/components/NotificationFormModal';
import { NotificationAnalyticsDashboard } from '@/components/NotificationAnalyticsDashboard';
import { NotificationRecommendations } from '@/components/NotificationRecommendations';
import { NotificationTemplate } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type Campaign = NotificationTemplate & { sent_at?: string; dispatch_status?: string; dispatch_approved_at?: string; dispatch_started_at?: string; dispatch_summary?: { sent?: number; no_token?: number; frequency_limited?: number; unknown?: number; reason?: string }; targeting: NotificationTemplate['targeting'] & { user_ids?: string[] } };
const time = (value?: string) => value ? new Intl.DateTimeFormat('hu-HU', { timeZone: 'Europe/Budapest', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Nincs ütemezve';
function status(campaign: Campaign) {
  if (campaign.dispatch_status === 'review') return 'Ellenőrzést igényel';
  if (campaign.dispatch_status === 'processing') return 'Feldolgozás alatt';
  if (campaign.dispatch_status === 'completed' || campaign.sent_at) return 'Feldolgozva';
  if (!campaign.is_active) return campaign.scheduled_at ? 'Szüneteltetve' : 'Piszkozat';
  return campaign.send_mode === 'scheduled' ? (campaign.dispatch_approved_at ? 'Ütemezve' : 'Jóváhagyás szükséges') : 'Sablon';
}
export default function Notifications() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [pausing, setPausing] = useState<string | null>(null);
  const { toast } = useToast(), qc = useQueryClient();
  const query = useQuery({ queryKey: ['notification-campaigns'], queryFn: async () => {
    const { data, error } = await supabase.from('notification_templates').select('*').order('created_at', { ascending: false }).limit(200);
    if (error) throw error;
    return data as unknown as Campaign[];
  } });
  const refresh = () => { qc.invalidateQueries({ queryKey: ['notification-campaigns'] }); };
  const templates = query.data || [];
  async function pause(campaign: Campaign) {
    setPausing(campaign.id);
    try {
      const { data, error } = await supabase.from('notification_templates').update({ is_active: !campaign.is_active }).eq('id', campaign.id).eq('is_active', campaign.is_active).select('id');
      if (error || !data?.length) throw new Error('A kampány állapota megváltozott. Frissítsd a listát.');
      toast({ title: campaign.is_active ? 'Kampány szüneteltetve' : 'Kampány folytatása bekapcsolva', description: campaign.is_active ? 'A már átadott értesítéseket nem lehet visszavonni.' : 'A következő ellenőrzéskor a mentett állapottól folytatjuk.' }); refresh();
    } catch (error) { toast({ title: 'Nem sikerült szüneteltetni', description: error instanceof Error ? error.message : 'Próbáld újra.', variant: 'destructive' }); }
    finally { setPausing(null); }
  }
  return <PageLayout>
    <div className="flex flex-wrap justify-between items-start gap-4 mb-6"><div><h1 className="text-3xl font-bold">Értesítések</h1><p className="text-cgi-muted-foreground mt-1">Tervezés, jóváhagyás és követhető küldés egy helyen.</p></div><Button variant="outline" onClick={() => { setEditingTemplate(null); setModalOpen(true); }}><Plus className="mr-2 h-4 w-4" />Saját értesítés</Button></div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">{[
      ['Ütemezve', templates.filter(t => t.is_active && t.dispatch_approved_at && t.send_mode === 'scheduled' && !t.sent_at && (!t.dispatch_status || t.dispatch_status === 'pending')).length],
      ['Feldolgozás alatt', templates.filter(t => t.dispatch_status === 'processing').length],
      ['Ellenőrzést igényel', templates.filter(t => t.dispatch_status === 'review').length],
      ['Piszkozat', templates.filter(t => !t.is_active && !t.scheduled_at).length],
    ].map(([label, count]) => <Card key={label} className="p-4"><div className="text-sm text-cgi-muted-foreground">{label}</div><div className="text-2xl font-semibold mt-1">{query.isPending ? '–' : count}</div></Card>)}</div>
    <Tabs defaultValue="recommendations" className="space-y-6"><TabsList className="flex w-full sm:w-fit"><TabsTrigger value="recommendations">Javaslatok</TabsTrigger><TabsTrigger value="campaigns">Kampányok</TabsTrigger><TabsTrigger value="analytics">Eredmények</TabsTrigger></TabsList>
      <TabsContent value="recommendations"><NotificationRecommendations onScheduled={refresh} /></TabsContent>
      <TabsContent value="analytics"><NotificationAnalyticsDashboard /></TabsContent>
      <TabsContent value="campaigns" className="space-y-4"><div className="flex justify-between items-center"><h2 className="text-xl font-semibold">Ütemezés és előzmények</h2><Button variant="outline" size="sm" onClick={() => query.refetch()} disabled={query.isFetching}><RefreshCw className="mr-2 h-4 w-4" />Frissítés</Button></div>
        {query.isError && <Card className="p-6" role="alert">Nem sikerült betölteni a kampányokat. Próbáld újra a frissítést.</Card>}
        {query.isPending && <Card className="p-6" role="status">Kampányok betöltése…</Card>}
        {!query.isPending && !query.isError && !templates.length && <Card className="p-8 text-center text-cgi-muted-foreground">Még nincs kampány. A Javaslatok lapon egy kattintással ütemezhetsz.</Card>}
        {templates.map(campaign => <Card key={campaign.id} className="p-5"><div className="flex flex-wrap justify-between gap-4"><div className="flex-1 min-w-0"><div className="flex gap-2 flex-wrap items-center"><h3 className="font-semibold text-lg">{campaign.title_hu}</h3><Badge variant={campaign.dispatch_status === 'review' ? 'destructive' : 'secondary'}>{status(campaign)}</Badge></div><p className="text-sm text-cgi-muted-foreground mt-2">{campaign.body_hu}</p><div className="flex flex-wrap gap-4 text-xs text-cgi-muted-foreground mt-3"><span className="inline-flex items-center gap-1"><CalendarClock className="h-3 w-3" />{time(campaign.scheduled_at)} · Budapest</span><span>{campaign.targeting?.user_ids?.length ? `${campaign.targeting.user_ids.length} kiválasztott címzett` : 'Célközönség ellenőrzése szükséges'}</span></div>
          {campaign.dispatch_summary && <p className="text-sm mt-3">{campaign.dispatch_summary.reason || `Szolgáltató által átvéve: ${campaign.dispatch_summary.sent || 0} · Eszköz nélkül: ${campaign.dispatch_summary.no_token || 0} · Gyakorisági korlát miatt kihagyva: ${campaign.dispatch_summary.frequency_limited || 0} · Bizonytalan: ${campaign.dispatch_summary.unknown || 0}`}</p>}</div>
          <div className="flex gap-2 items-start">{(!campaign.dispatch_status || campaign.dispatch_status === 'pending') && !campaign.sent_at && !campaign.dispatch_started_at && <Button variant="outline" size="sm" onClick={() => { setEditingTemplate(campaign); setModalOpen(true); }}><Edit className="mr-2 h-4 w-4" />Szerkesztés</Button>}{!campaign.sent_at && campaign.dispatch_status !== 'completed' && campaign.dispatch_status !== 'review' && (campaign.is_active || (campaign.dispatch_approved_at && campaign.dispatch_status === 'pending')) && <Button variant="outline" size="sm" disabled={pausing === campaign.id} onClick={() => pause(campaign)}><PauseCircle className="mr-2 h-4 w-4" />{campaign.is_active ? 'Szüneteltetés' : 'Folytatás'}</Button>}</div></div></Card>)}
        <p className="text-xs text-cgi-muted-foreground">A 200 legutóbbi kampány. A szolgáltatói átvétel nem igazolja a telefonon történt megjelenítést.</p>
      </TabsContent>
    </Tabs>
    <NotificationFormModal open={modalOpen} onClose={() => { setModalOpen(false); setEditingTemplate(null); }} template={editingTemplate} onSave={() => { refresh(); setModalOpen(false); }} />
  </PageLayout>;
}
