import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { NotificationTemplate } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { notificationClient } from '@/lib/notificationClient';
import { hasVerifiedNotificationAudience, notificationTargetingForSave } from '@/lib/notificationTargeting';
import { useToast } from '@/hooks/use-toast';
import { DEFAULT_LIMITS, DEFAULT_QUIET_HOURS, budapestInputToIso, isQuietTime, localInput, validateMessage } from '../../supabase/functions/_shared/notification-policy';

export function NotificationFormModal({ open, onClose, template, onSave }: { open: boolean; onClose: () => void; template: NotificationTemplate | null; onSave: () => void }) {
  const [title, setTitle] = useState(''), [body, setBody] = useState(''), [recipients, setRecipients] = useState(''), [time, setTime] = useState(''), [link, setLink] = useState('/(tabs)/home');
  const [saving, setSaving] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState('');
  const selectedIds = recipients.split(/[\s,;]+/).filter(Boolean);
  const verifiedAudience = hasVerifiedNotificationAudience(template?.targeting);
  const users = useQuery({ queryKey: ['notification-recipient-picker', recipientSearch], enabled: open && !verifiedAudience,
    queryFn: async ({ signal }) => {
      let query = supabase.from('profiles').select('id,name').eq('is_admin', false).order('name').limit(30).abortSignal(signal);
      if (recipientSearch.trim()) query = query.ilike('name', `%${recipientSearch.trim().replace(/[%_]/g, '')}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
  const { toast } = useToast();
  useEffect(() => {
    if (!open) return;
    setRecipientSearch('');
    setTitle(template?.title_hu || ''); setBody(template?.body_hu || '');
    const targeting = template?.targeting as { user_ids?: string[] } | undefined;
    setRecipients(targeting?.user_ids?.join('\n') || '');
    setTime(template?.scheduled_at ? localInput(template.scheduled_at) : '');
    setLink(template?.deep_link || '/(tabs)/home');
  }, [template, open]);
  async function save(schedule: boolean) {
    if (saving) return;
    setSaving(true);
    try {
      validateMessage(title, body, link);
      const ids = recipients.split(/[\s,;]+/).filter(Boolean);
      const targeting = notificationTargetingForSave(template?.targeting, ids, schedule);
      const date = time ? budapestInputToIso(time) : null;
      if (schedule && (!date || Date.parse(date) < Date.now() + 60000 || Date.parse(date) > Date.now() + 7 * 86400000 || isQuietTime(new Date(date)))) throw new Error('Válassz jövőbeli időpontot 7 napon belül, 08:00 és 22:00 között.');
      if (schedule) {
        const { data, error } = await supabase.functions.invoke('suggest-user-notification', { body: { action: 'readiness' } });
        if (error || !data?.ready) throw new Error('Az ütemező még nincs bekapcsolva. Piszkozatként elmentheted az üzenetet.');
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Jelentkezz be újra.');
      const record = { title_hu: title.trim(), body_hu: body.trim(), deep_link: link, targeting,
        scheduled_at: schedule ? date : null, send_mode: schedule ? 'scheduled' : 'immediate', is_active: schedule,
        quiet_hours: DEFAULT_QUIET_HOURS, frequency_limit: DEFAULT_LIMITS, category: template?.category || 'venue_status',
        priority: template?.priority || 'medium', dispatch_status: 'pending' as const, dispatch_approved_at: schedule ? new Date().toISOString() : null, ttl_hours: 24 };
      if (template) {
        const { data, error } = await notificationClient.from('notification_templates').update(record).eq('id', template.id).is('sent_at', null).is('dispatch_started_at', null).eq('dispatch_status', 'pending').select('id');
        if (error || !data?.length) throw new Error('A kampány már feldolgozás alatt áll, vagy a biztonsági migráció még nincs telepítve. Frissítsd a listát.');
      } else {
        const { error } = await notificationClient.from('notification_templates').insert({ ...record, created_by: user.id });
        if (error) throw error;
      }
      toast({ title: schedule ? 'Értesítés ütemezve' : 'Piszkozat mentve' }); onSave();
    } catch (error) { toast({ title: 'Nem sikerült menteni', description: error instanceof Error ? error.message : 'Próbáld újra.', variant: 'destructive' }); }
    finally { setSaving(false); }
  }
  return <Dialog open={open} onOpenChange={value => !value && !saving && onClose()}><DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{template ? 'Értesítés szerkesztése' : 'Saját értesítés'}</DialogTitle><DialogDescription>Először ellenőrizd az üzenetet és a címzetteket, majd mentsd vagy ütemezd.</DialogDescription></DialogHeader>
    <div className="grid gap-6 md:grid-cols-2"><div className="space-y-4"><div><Label htmlFor="notification-title">Cím</Label><Input id="notification-title" disabled={saving} maxLength={80} value={title} onChange={e => setTitle(e.target.value)} /></div><div><Label htmlFor="notification-body">Üzenet</Label><Textarea id="notification-body" disabled={saving} maxLength={240} rows={5} value={body} onChange={e => setBody(e.target.value)} /><p className="text-xs text-cgi-muted-foreground text-right">{body.length}/240 karakter</p></div><div><Label htmlFor="notification-link">Megnyitott oldal</Label><select id="notification-link" disabled={saving} className="cgi-input w-full h-10 rounded-md border px-3 bg-background" value={link} onChange={e => setLink(e.target.value)}><option value="/(tabs)/home">Helyek térképe</option><option value="/(tabs)/rewards">Jutalmak</option></select></div></div>
      <div className="space-y-4"><div><Label htmlFor="notification-recipients">Címzettek · {selectedIds.length} kiválasztva</Label><Input id="notification-recipients" disabled={saving || verifiedAudience} value={recipientSearch} onChange={e => setRecipientSearch(e.target.value)} placeholder="Keresés név alapján" /><div className="max-h-36 overflow-y-auto rounded-md border mt-2 p-2 space-y-1">{verifiedAudience ? <p className="p-1 text-sm">Ez ellenőrzött, rögzített célcsoport. Az üzenet és az időpont módosításakor a címzettek, az egyéni célzás és az italcsoport ellenőrzése megmarad. Más címzettekhez a Javaslatok lapon kérj új javaslatot.</p> : users.isPending ? <p className="text-sm">Felhasználók betöltése…</p> : users.isError ? <p role="alert" className="text-sm">Nem sikerült betölteni a címzetteket.</p> : users.data?.length ? users.data.map(user => <label key={user.id} className="flex items-center gap-2 p-1 text-sm"><input type="checkbox" checked={selectedIds.includes(user.id)} disabled={saving || (!selectedIds.includes(user.id) && selectedIds.length >= 100)} onChange={e => setRecipients((e.target.checked ? [...selectedIds, user.id] : selectedIds.filter(id => id !== user.id)).join('\n'))} />{user.name || 'Névtelen felhasználó'}</label>) : <p className="text-sm">Nincs találat.</p>}</div><p className="text-xs text-cgi-muted-foreground mt-1">Legfeljebb 100 címzett. Csak a marketingértesítéseket engedélyező eszközökre küldünk.</p></div><div><Label htmlFor="notification-schedule">Küldés időpontja · Budapest</Label><Input id="notification-schedule" disabled={saving} type="datetime-local" value={time} onChange={e => setTime(e.target.value)} /></div><p className="text-xs text-cgi-muted-foreground">Maximum 2 értesítés 24 órán belül, legalább 6 óra különbséggel. 22:00–08:00 között nincs küldés. A mentés önmagában nem küld értesítést.</p></div></div>
    <div className="rounded-xl border p-4 bg-cgi-muted/10"><p className="text-xs text-cgi-muted-foreground mb-2">COME GET IT · PUSH ELŐNÉZET</p><p className="font-semibold">{title || 'Az értesítés címe'}</p><p className="text-sm mt-1">{body || 'Az üzenet szövege itt jelenik meg.'}</p></div>
    <div className="flex justify-end gap-2"><Button variant="outline" disabled={saving} onClick={() => save(false)}>Piszkozat mentése</Button><Button disabled={saving} onClick={() => save(true)}>{saving ? 'Mentés…' : 'Jóváhagyás és ütemezés'}</Button></div>
  </DialogContent></Dialog>;
}
