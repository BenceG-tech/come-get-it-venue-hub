import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Sparkles, RefreshCw, CalendarClock, Users, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { budapestInputToIso, localInput, type Recommendation } from '../../supabase/functions/_shared/notification-policy';

type VisibleRecommendation = Omit<Recommendation, 'user_ids'>;
type Response = { batch_id?: string; suggestions: VisibleRecommendation[]; scanned_count: number; truncated?: boolean; empty_reason?: string };

export function NotificationRecommendations({ userId, onScheduled }: { userId?: string; onScheduled?: () => void }) {
  const { toast } = useToast();
  const [times, setTimes] = useState<Record<string, string>>({});
  const [scheduled, setScheduled] = useState<string[]>([]);
  const query = useQuery<Response>({
    queryKey: ['notification-recommendations', userId || 'campaign'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('suggest-user-notification', { body: { user_id: userId } });
      if (error || data?.error) throw new Error(data?.error || 'A javaslatok nem tölthetők be. Próbáld újra.');
      return data;
    }, staleTime: 15 * 60000, refetchOnWindowFocus: false, retry: false,
  });
  const approve = useMutation({
    mutationFn: async (suggestion: VisibleRecommendation) => {
      const time = times[suggestion.id] ? budapestInputToIso(times[suggestion.id]) : suggestion.scheduled_at;
      const { data, error } = await supabase.functions.invoke('suggest-user-notification', { body: {
        action: 'approve', batch_id: query.data?.batch_id, suggestion_id: suggestion.id, scheduled_at: time,
      } });
      if (error || !data?.success) throw new Error(data?.error || 'Az ütemezés nem sikerült.');
      return data;
    },
    onSuccess: (data, suggestion) => {
      setScheduled(old => [...old, suggestion.id]);
      toast({ title: data.status === 'already_scheduled' ? 'Már ütemezve' : 'Értesítés ütemezve', description: 'A küldés előtt ismét ellenőrizzük a címzetteket és a gyakorisági korlátot.' });
      onScheduled?.();
    },
    onError: (error: Error) => toast({ title: 'Nem sikerült ütemezni', description: error.message, variant: 'destructive' }),
  });
  return <section className="space-y-4" aria-label="Javasolt értesítések">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="flex items-center gap-2 text-xl font-semibold"><Sparkles className="h-5 w-5 text-cgi-primary" /> Javasolt értesítések</h2>
        <p className="mt-1 text-sm text-cgi-muted-foreground">Kész üzenet, ellenőrzött célcsoport és ajánlott időpont. Válaszd ki, melyik induljon.</p></div>
      <Button variant="outline" onClick={() => query.refetch()} disabled={query.isFetching}><RefreshCw className={`mr-2 h-4 w-4 ${query.isFetching ? 'animate-spin' : ''}`} />Friss javaslatok</Button>
    </div>
    {query.isPending && <Card className="p-8 text-center" role="status">Ellenőrizzük a célcsoportokat, és előkészítjük a javaslatokat…</Card>}
    {query.isError && <Card className="p-5 border-destructive/30" role="alert"><AlertCircle className="inline mr-2 h-4 w-4" />{query.error.message}</Card>}
    {query.data && !query.data.suggestions.length && <Card className="p-8 text-center text-cgi-muted-foreground">{query.data.empty_reason || 'Jelenleg nincs megalapozott küldési javaslat.'}</Card>}
    <div className="grid gap-4 xl:grid-cols-3">
      {query.data?.suggestions.map(suggestion => <Card key={suggestion.id} className="p-5 flex flex-col gap-4">
        <div className="flex justify-between gap-2"><Badge variant="outline">{suggestion.source === 'ai_ranked' ? 'AI által rangsorolva' : 'Ellenőrzött szabályjavaslat'}</Badge>{scheduled.includes(suggestion.id) && <Badge>Ütemezve</Badge>}</div>
        <div className="rounded-xl border bg-cgi-muted/15 p-4"><div className="text-xs text-cgi-muted-foreground mb-2">COME GET IT · PUSH ELŐNÉZET</div><h3 className="font-semibold">{suggestion.title_hu}</h3><p className="text-sm mt-2">{suggestion.body_hu}</p></div>
        <div className="text-sm"><div className="font-medium flex gap-2 items-center"><Users className="h-4 w-4" />{suggestion.recipient_count} marketingértesítést engedélyező címzett</div><p className="mt-1 text-cgi-muted-foreground">{suggestion.audience_label}</p></div>
        <p className="text-xs text-cgi-muted-foreground">{suggestion.reasoning}</p>
        <div className="mt-auto"><label htmlFor={`notification-time-${suggestion.id}`} className="text-sm font-medium flex gap-2 mb-2"><CalendarClock className="h-4 w-4" />Küldés időpontja · Budapest</label>
          <Input id={`notification-time-${suggestion.id}`} type="datetime-local" value={times[suggestion.id] || localInput(suggestion.scheduled_at)} disabled={scheduled.includes(suggestion.id) || approve.isPending} onChange={event => setTimes(old => ({ ...old, [suggestion.id]: event.target.value }))} />
        </div>
        <Button disabled={approve.isPending || scheduled.includes(suggestion.id)} onClick={() => approve.mutate(suggestion)}><Check className="mr-2 h-4 w-4" />{scheduled.includes(suggestion.id) ? 'Ütemezve' : approve.isPending && approve.variables?.id === suggestion.id ? 'Ütemezés…' : 'Jóváhagyás és ütemezés'}</Button>
      </Card>)}
    </div>
    {query.data && <p className="text-xs text-cgi-muted-foreground">{query.data.scanned_count} felhasználó ellenőrizve{query.data.truncated ? ' az 500 legújabb fiókból' : ''}. Javaslatonként legfeljebb 100 címzett. Maximum 2 értesítés 24 órán belül, legalább 6 óra különbséggel; csendes időszak 22:00–08:00. Az ütemezés után is változhat a ténylegesen elérhető címzettek száma.</p>}
  </section>;
}
