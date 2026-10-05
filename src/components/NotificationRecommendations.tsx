import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Sparkles, RefreshCw, CalendarClock, Users, Check, AlertCircle, CheckCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { isFinalResult, isScheduled, reconcileApprovalResults, selectionAfterApproval, type ApprovalResult, type ApprovalSelection } from '@/lib/notificationRecommendationState';
import { budapestInputToIso, earliestDispatchTime, isQuietTime, localInput, DRINK_SEGMENTS, type DrinkSegment, type Recommendation } from '../../supabase/functions/_shared/notification-policy';

type VisibleRecommendation = Omit<Recommendation, 'user_ids'> & {
  sendable: boolean; empty_reason: string | null; eligible_count: number;
  priority_order: number; scope: 'user' | 'campaign';
};
type RecommendationBatch = {
  batch_id: string; suggestions: VisibleRecommendation[]; scanned_count: number;
  truncated?: boolean; checked_at?: string;
};
type BulkResponse = { results?: unknown; unique_recipient_count?: number };
type Props = { userId?: string; onScheduled?: () => void };
type ScopeProps = Props & { drinkSegment: DrinkSegment; onSegmentChange: (value: DrinkSegment) => void };
type ApprovalReview = { selections: ApprovalSelection[]; deliveryMode: 'recommended' | 'as_soon_as_possible'; earliestAt: string };

const formatTime = (iso: string) => new Intl.DateTimeFormat('hu-HU', {
  timeZone: 'Europe/Budapest', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
}).format(new Date(iso));
const resultMessage = (result: ApprovalResult) => result.error || (
  result.status === 'empty_audience' ? 'A friss ellenőrzéskor már nem volt elérhető címzett. Kérj friss javaslatokat.'
    : result.status === 'overlap_excluded' ? 'Ezek a címzettek már egy előrébb szereplő javaslathoz tartoznak. Nem ütemeztünk nekik újabb üzenetet.'
      : 'Az ütemezés nem sikerült. Ezt a javaslatot újra megpróbálhatod.'
);

async function invocationError(error: unknown, fallback: string): Promise<Error> {
  const context = (error as { context?: { json?: () => Promise<{ error?: unknown }> } })?.context;
  try {
    const response = await context?.json?.();
    if (typeof response?.error === 'string') return new Error(response.error);
  } catch { /* A transport failure has no readable server response. */ }
  return new Error(fallback);
}

function RecommendationsHeader({ busy, refresh, drinkSegment, onSegmentChange }: { busy: boolean; refresh: () => void; drinkSegment: DrinkSegment; onSegmentChange: (value: DrinkSegment) => void }) {
  return <div className="space-y-4"><div className="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h2 className="flex items-center gap-2 text-xl font-semibold"><Sparkles className="h-5 w-5 text-cgi-primary" /> Javasolt értesítések</h2>
      <p className="mt-1 max-w-2xl text-sm text-cgi-muted-foreground">Négy kész javaslat célcsoporttal és ajánlott időponttal. Válaszd ki, melyiket szeretnéd ütemezni.</p>
    </div>
    <Button variant="outline" onClick={refresh} disabled={busy}><RefreshCw className={`mr-2 h-4 w-4 ${busy ? 'animate-spin' : ''}`} />Friss javaslatok</Button>
  </div>
    <div className="max-w-xl"><label htmlFor="recommendation-drink-segment" className="mb-2 block text-sm font-medium">Célcsoport korábbi beváltás alapján</label>
      <select id="recommendation-drink-segment" value={drinkSegment} disabled={busy} onChange={event => onSegmentChange(event.target.value as DrinkSegment)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50">
        {Object.entries(DRINK_SEGMENTS).map(([value, segment]) => <option key={value} value={value}>{segment.label}</option>)}
      </select>
      <p className="mt-1 text-xs text-cgi-muted-foreground">Az ital szerinti csoport az elmúlt 180 nap sikeres beváltásaiból készül; nem a felhasználók megadott ízlését jelenti.</p>
    </div>
  </div>;
}

/** Scope and batch keys discard edited times, selections and late mutation state together. */
export function NotificationRecommendations(props: Props) {
  return <RecommendationScope key={props.userId || 'campaign'} {...props} />;
}

function RecommendationScope(props: Props) {
  const [drinkSegment, setDrinkSegment] = useState<DrinkSegment>('all');
  return <RecommendationsForScope key={drinkSegment} {...props} drinkSegment={drinkSegment} onSegmentChange={setDrinkSegment} />;
}

function RecommendationsForScope({ userId, onScheduled, drinkSegment, onSegmentChange }: ScopeProps) {
  const query = useQuery<RecommendationBatch>({
    queryKey: ['notification-recommendations', userId || 'campaign', drinkSegment],
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.functions.invoke('suggest-user-notification', {
        body: { user_id: userId, drink_segment: drinkSegment }, signal, timeout: 30_000,
      });
      if (error) throw await invocationError(error, 'A javaslatok nem tölthetők be. Próbáld újra.');
      if (data?.error) throw new Error(data.error);
      if (!data?.batch_id || !Array.isArray(data.suggestions) || data.suggestions.length !== 4) {
        throw new Error('A négy javaslat nem érkezett meg hiánytalanul. Kérj friss javaslatokat.');
      }
      return data;
    }, staleTime: 15 * 60_000, refetchOnWindowFocus: false, refetchOnReconnect: false, retry: false,
  });
  if (query.data) return <RecommendationCards key={query.data.batch_id} batch={query.data}
    fetching={query.isFetching} queryError={query.error?.message} refresh={() => { void query.refetch(); }} onScheduled={onScheduled} drinkSegment={drinkSegment} onSegmentChange={onSegmentChange} />;
  return <section className="space-y-4" aria-label="Javasolt értesítések">
    <RecommendationsHeader busy={query.isFetching} refresh={() => { void query.refetch(); }} drinkSegment={drinkSegment} onSegmentChange={onSegmentChange} />
    {query.isError ? <Card className="border-destructive/30 p-5" role="alert"><AlertCircle className="mr-2 inline h-4 w-4" />{query.error.message}</Card>
      : <><p className="text-sm text-cgi-muted-foreground" role="status">Ellenőrizzük a célcsoportokat és előkészítjük a négy javaslatot…</p>
        <div className="grid gap-4 md:grid-cols-2">{[1, 2, 3, 4].map(id => <Card key={id} className="min-h-72 animate-pulse bg-cgi-muted/10 p-5" aria-hidden="true"><div className="h-5 w-28 rounded bg-cgi-muted/30" /><div className="mt-6 h-24 rounded-xl bg-cgi-muted/20" /></Card>)}</div></>}
  </section>;
}

function RecommendationCards({ batch, fetching, queryError, refresh, onScheduled, drinkSegment, onSegmentChange }: {
  batch: RecommendationBatch; fetching: boolean; queryError?: string; refresh: () => void; onScheduled?: () => void;
  drinkSegment: DrinkSegment; onSegmentChange: (value: DrinkSegment) => void;
}) {
  const { toast } = useToast();
  const mounted = useRef(true);
  const submitting = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const [times, setTimes] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string[]>([]);
  const [results, setResults] = useState<Record<string, ApprovalResult>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deliveryMode, setDeliveryMode] = useState<ApprovalReview['deliveryMode']>('recommended');
  const [review, setReview] = useState<ApprovalReview | null>(null);
  const [summary, setSummary] = useState<{ scheduled: number; existing: number; failed: number; excluded: number; recipients?: number; uncertain?: boolean } | null>(null);

  const approve = useMutation({
    mutationFn: async ({ selections, deliveryMode: mode }: ApprovalReview) => {
      const { data, error } = await supabase.functions.invoke<BulkResponse>('suggest-user-notification', { body: {
        action: 'approve_bulk', batch_id: batch.batch_id, selections, delivery_mode: mode,
      }, timeout: 45_000 });
      if (error) throw await invocationError(error, 'Nem kaptunk választ az ütemezésről. Ellenőrizd az ütemezett értesítéseket, vagy próbáld újra a kijelölt javaslatokat.');
      return { rows: reconcileApprovalResults(selections, data?.results), recipients: data?.unique_recipient_count };
    },
    onSuccess: ({ rows, recipients }) => {
      if (!mounted.current) return;
      setResults(old => ({ ...old, ...Object.fromEntries(rows.map(row => [row.suggestion_id, row])) }));
      setErrors(old => {
        const next = { ...old };
        rows.forEach(row => { if (isScheduled(row)) delete next[row.suggestion_id]; else next[row.suggestion_id] = resultMessage(row); });
        return next;
      });
      setSelected(old => selectionAfterApproval(old, rows));
      const scheduled = rows.filter(row => row.status === 'scheduled').length;
      const existing = rows.filter(row => row.status === 'already_scheduled').length;
      const failed = rows.filter(row => row.status === 'failed').length;
      setSummary({ scheduled, existing, failed, excluded: rows.length - scheduled - existing - failed,
        recipients: Number.isSafeInteger(recipients) && recipients >= 0 ? recipients : undefined });
      setReview(null);
      if (scheduled + existing > 0) {
        toast({ title: scheduled ? `${scheduled} új javaslat ütemezve` : `${existing} korábbi jóváhagyás megtalálva`, description: failed ? `${failed} javaslatnál hiba történt. Csak ezeket kell újrapróbálnod.` : existing ? 'A korábban jóváhagyott üzenetekből nem hoztunk létre másolatot.' : 'A küldés az ütemezőn keresztül, a címzettek újbóli ellenőrzésével történik.' });
        onScheduled?.();
      }
    },
    onError: (error: Error, { selections }) => {
      if (!mounted.current) return;
      const rows: ApprovalResult[] = selections.map(({ suggestion_id }) => ({ suggestion_id, status: 'failed', recipient_count: 0, error: error.message }));
      setResults(old => ({ ...old, ...Object.fromEntries(rows.map(row => [row.suggestion_id, row])) }));
      setErrors(old => ({ ...old, ...Object.fromEntries(rows.map(row => [row.suggestion_id, resultMessage(row)])) }));
      setSelected(old => selectionAfterApproval(old, rows));
      setSummary({ scheduled: 0, existing: 0, failed: rows.length, excluded: 0, uncertain: true });
      setReview(null);
    },
    onSettled: () => { submitting.current = false; },
  });

  const busy = fetching || approve.isPending;
  const locked = busy || Boolean(queryError);
  const canSelect = (suggestion: VisibleRecommendation) => suggestion.sendable === true && suggestion.recipient_count > 0 && !isFinalResult(results[suggestion.id]);
  const selectable = batch.suggestions.filter(canSelect);
  const selectedDrafts = selectable.filter(suggestion => selected.includes(suggestion.id));
  const failedDrafts = selectable.filter(suggestion => results[suggestion.id]?.status === 'failed');

  function reviewDrafts(drafts: VisibleRecommendation[]) {
    if (locked || submitting.current || !drafts.length) return;
    const nextErrors: Record<string, string> = {};
    const selections: ApprovalSelection[] = [];
    drafts.forEach(suggestion => {
      try {
        if (deliveryMode === 'as_soon_as_possible') { selections.push({ suggestion_id: suggestion.id }); return; }
        const time = times[suggestion.id] === undefined ? suggestion.scheduled_at : budapestInputToIso(times[suggestion.id]);
        const scheduled = new Date(time);
        if (!Number.isFinite(scheduled.getTime()) || scheduled.getTime() < Date.now() + 60_000 || scheduled.getTime() > Date.now() + 7 * 86_400_000 || isQuietTime(scheduled)) {
          throw new Error('Válassz jövőbeli időpontot 7 napon belül, 08:00 és 22:00 között (Budapest).');
        }
        selections.push({ suggestion_id: suggestion.id, scheduled_at: scheduled.toISOString() });
      } catch (error) { nextErrors[suggestion.id] = error instanceof Error ? error.message : 'Az időpont nem megfelelő.'; }
    });
    setErrors(old => {
      const next = { ...old }; drafts.forEach(suggestion => { delete next[suggestion.id]; });
      return { ...next, ...nextErrors };
    });
    if (!Object.keys(nextErrors).length) setReview({ selections, deliveryMode, earliestAt: earliestDispatchTime(new Date()) });
  }

  function confirmReview() {
    if (!review?.selections.length || locked || submitting.current) return;
    if (review.deliveryMode === 'recommended' && review.selections.some(item => Date.parse(item.scheduled_at!) < Date.now() + 60_000)) {
      setErrors(old => ({ ...old, ...Object.fromEntries(review.selections.filter(item => Date.parse(item.scheduled_at!) < Date.now() + 60_000).map(item => [item.suggestion_id, 'Az időpont közben túl közel került. Válassz későbbi időpontot.'])) }));
      setReview(null);
      return;
    }
    submitting.current = true;
    approve.mutate(review);
  }

  return <section className="space-y-4" aria-label="Javasolt értesítések" aria-busy={busy}>
    <RecommendationsHeader busy={busy} refresh={refresh} drinkSegment={drinkSegment} onSegmentChange={onSegmentChange} />
    {batch.suggestions[0]?.scope === 'campaign' && <p className="rounded-lg border bg-cgi-muted/10 p-3 text-sm text-cgi-muted-foreground">A kampányokból az adminfiókok kimaradnak. Saját tesztküldést a Felhasználók → saját adatlap → Kommunikáció részen indíthatsz.</p>}
    {queryError && <Card className="border-destructive/30 p-4" role="alert"><AlertCircle className="mr-2 inline h-4 w-4" />{queryError} A korábbi javaslatok láthatók; ütemezés előtt frissítsd őket.</Card>}
    <fieldset disabled={locked} className="space-y-2">
      <legend className="mb-2 text-sm font-medium">Mikor induljanak a kijelölt értesítések?</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${deliveryMode === 'recommended' ? 'border-cgi-primary bg-cgi-primary/5' : ''}`}>
          <input type="radio" name={`delivery-${batch.batch_id}`} value="recommended" checked={deliveryMode === 'recommended'} onChange={() => setDeliveryMode('recommended')} className="mt-1 accent-cgi-primary" />
          <span><span className="block text-sm font-medium">Ajánlott időpontok</span><span className="mt-1 block text-xs text-cgi-muted-foreground">A kártyákon előkészített, egyenként módosítható időpontok.</span></span>
        </label>
        <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${deliveryMode === 'as_soon_as_possible' ? 'border-cgi-primary bg-cgi-primary/5' : ''}`}>
          <input type="radio" name={`delivery-${batch.batch_id}`} value="as_soon_as_possible" checked={deliveryMode === 'as_soon_as_possible'} onChange={() => setDeliveryMode('as_soon_as_possible')} className="mt-1 accent-cgi-primary" />
          <span><span className="block text-sm font-medium">Következő küldési kör</span><span className="mt-1 block text-xs text-cgi-muted-foreground">Ötpercenként futó ütemező, mentési ráhagyással. Csendes időben legkorábban 08:00.</span></span>
        </label>
      </div>
    </fieldset>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-cgi-muted/10 p-4">
      <div>
        <p className="font-medium">{selectedDrafts.length ? `${selectedDrafts.length} javaslat kijelölve` : `${selectable.length} javaslat ütemezhető`}</p>
        <p className="mt-1 text-xs text-cgi-muted-foreground">A csoportok átfedhetnek. Egy címzett ebben a csomagban egy üzenetet kap, a kártyák sorrendje alapján.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={locked || !selectable.length} onClick={() => setSelected(selectedDrafts.length === selectable.length ? [] : selectable.map(s => s.id))}>
          {selectedDrafts.length === selectable.length && selectable.length ? 'Kijelölés törlése' : 'Ütemezhetők kijelölése'}
        </Button>
        <Button disabled={locked || !selectedDrafts.length} onClick={() => reviewDrafts(selectedDrafts)}><CheckCheck className="mr-2 h-4 w-4" />Kijelöltek áttekintése{selectedDrafts.length ? ` (${selectedDrafts.length})` : ''}</Button>
      </div>
    </div>
    {summary && <div className={`rounded-xl border p-4 ${summary.failed ? 'border-amber-500/40 bg-amber-500/5' : 'border-emerald-500/30 bg-emerald-500/5'}`} role="status" aria-live="polite">
      <p className="font-medium">{summary.uncertain ? 'Az ütemezés eredményét még ellenőrizni kell' : `${summary.scheduled} új ütemezés`}{summary.existing ? ` · ${summary.existing} korábbi jóváhagyás` : ''}{summary.failed ? ` · ${summary.failed} ellenőrzendő` : ''}{summary.excluded ? ` · ${summary.excluded} címzettek nélkül kimaradt` : ''}</p>
      {summary.scheduled + summary.existing > 0 && summary.recipients !== undefined && <p className="mt-1 text-sm">A jóváhagyott csoportokban {summary.recipients} különböző címzett szerepel. Az új küldések előtt ismét ellenőrizzük az elérhetőséget és a korlátokat.</p>}
      {failedDrafts.length > 0 && <Button className="mt-3" variant="outline" disabled={locked} onClick={() => reviewDrafts(failedDrafts)}>Csak a sikertelenek újrapróbálása ({failedDrafts.length})</Button>}
    </div>}
    <div className="grid gap-4 md:grid-cols-2">
      {batch.suggestions.map((suggestion, index) => {
        const result = results[suggestion.id];
        const done = isScheduled(result);
        const doneLabel = result?.status === 'already_scheduled' ? 'Korábban jóváhagyva' : 'Ütemezve';
        const available = canSelect(suggestion);
        const noAudience = suggestion.recipient_count === 0 || result?.status === 'empty_audience' || result?.status === 'overlap_excluded';
        return <Card key={suggestion.id} className={`flex flex-col gap-4 p-5 ${selected.includes(suggestion.id) && available ? 'border-cgi-primary ring-1 ring-cgi-primary/20' : ''}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
              <Checkbox checked={selected.includes(suggestion.id) && available} disabled={locked || !available} aria-label={`${suggestion.title_hu} kijelölése`}
                onCheckedChange={checked => setSelected(old => checked === true ? [...new Set([...old, suggestion.id])] : old.filter(id => id !== suggestion.id))} />
              {index + 1}. javaslat
            </label>
            <Badge variant="outline">{suggestion.source === 'ai_ranked' ? 'AI által rangsorolva' : 'Szabályalapú javaslat'}</Badge>
          </div>
          <div className="rounded-xl border bg-cgi-muted/15 p-4"><div className="mb-2 text-xs text-cgi-muted-foreground">COME GET IT · PUSH ELŐNÉZET</div><h3 className="font-semibold">{suggestion.title_hu}</h3><p className="mt-2 text-sm leading-relaxed">{suggestion.body_hu}</p></div>
          <div className="text-sm">
            <p className="flex flex-wrap items-center gap-2 font-medium"><Users className="h-4 w-4" />{done ? result.recipient_count : noAudience ? 0 : suggestion.recipient_count} {done ? 'rögzített' : 'engedélyezett'} címzett{done && <Badge className="ml-auto">{doneLabel}</Badge>}</p>
            <p className="mt-1 text-cgi-muted-foreground">{suggestion.audience_label}</p>
            {suggestion.eligible_count > suggestion.recipient_count && <p className="mt-1 text-xs text-cgi-muted-foreground">A megfelelő célcsoport {suggestion.eligible_count} fős; ebből egy javaslat legfeljebb 100 címzettet tartalmaz.</p>}
          </div>
          <p className="text-xs leading-relaxed text-cgi-muted-foreground">{suggestion.reasoning}</p>
          {!suggestion.sendable && !result && <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm"><span className="font-medium">{noAudience ? 'Most nincs elérhető címzett.' : 'Most nem ütemezhető.'}</span> {suggestion.empty_reason || 'A javaslatot megtartottuk, de nem küldhető ki. Frissítéskor ismét ellenőrizzük a célcsoportot.'}</div>}
          {errors[suggestion.id] && <p id={`notification-error-${suggestion.id}`} className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">{errors[suggestion.id]}</p>}
          {done && result.excluded_overlap_count > 0 && <p className="text-xs text-cgi-muted-foreground">{result.excluded_overlap_count} átfedő címzett kimaradt ebből az üzenetből.</p>}
          <div className="mt-auto">
            <label htmlFor={`notification-time-${suggestion.id}`} className="mb-2 flex items-center gap-2 text-sm font-medium"><CalendarClock className="h-4 w-4" />{done ? 'Rögzített időpont' : deliveryMode === 'recommended' ? 'Ajánlott időpont' : 'Következő alkalmas kör'} · Budapest</label>
            {done && !result.scheduled_at ? <p className="text-sm text-cgi-muted-foreground">A pontos időpontot a mentett értesítésnél tudod ellenőrizni.</p> : !done && deliveryMode === 'as_soon_as_possible' ? <p id={`notification-time-${suggestion.id}`} className="rounded-md border bg-cgi-muted/10 px-3 py-2 text-sm">Legkorábban {formatTime(earliestDispatchTime(new Date()))}<span className="mt-1 block text-xs text-cgi-muted-foreground">Becsült időpont; a szerver jóváhagyáskor rögzíti.</span></p> : <Input id={`notification-time-${suggestion.id}`} type="datetime-local" value={done && result.scheduled_at ? localInput(result.scheduled_at) : times[suggestion.id] ?? localInput(suggestion.scheduled_at)} disabled={locked || !available}
              aria-invalid={Boolean(errors[suggestion.id])} aria-describedby={errors[suggestion.id] ? `notification-error-${suggestion.id}` : undefined}
              onChange={event => { setTimes(old => ({ ...old, [suggestion.id]: event.target.value })); setErrors(old => { const next = { ...old }; delete next[suggestion.id]; return next; }); }} />}
          </div>
          <Button variant={done ? 'outline' : 'default'} disabled={locked || !available} onClick={() => reviewDrafts([suggestion])}>
            {done ? <Check className="mr-2 h-4 w-4" /> : approve.isPending && approve.variables?.selections.some(item => item.suggestion_id === suggestion.id) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarClock className="mr-2 h-4 w-4" />}
            {done ? doneLabel : !available ? 'Most nem ütemezhető' : 'Ezt a javaslatot ütemezem'}
          </Button>
        </Card>;
      })}
    </div>
    <p className="text-xs leading-relaxed text-cgi-muted-foreground">{batch.scanned_count} felhasználó ellenőrizve{batch.truncated ? ' az 500 legújabb fiókból' : ''}. A címzettszámok kártyánként értendők, nem adhatók össze egyedi felhasználóként. Legfeljebb 2 marketingértesítés 24 órán belül, legalább 6 óra különbséggel; csendes időszak 22:00–08:00. Az AI csak a sorrendet rangsorolhatja; az üzenetek és időpontok ellenőrzött szabályokból származnak.</p>
    <Dialog open={review !== null} onOpenChange={open => { if (!open && !approve.isPending) setReview(null); }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>{review?.selections.length} javaslat jóváhagyása</DialogTitle><DialogDescription>Ellenőrizd az üzeneteket, a célcsoportokat és az időpontokat. A jóváhagyás ütemezést hoz létre.</DialogDescription></DialogHeader>
        {review?.deliveryMode === 'as_soon_as_possible' && <p className="text-sm text-cgi-muted-foreground">A következő alkalmas, ötperces küldési kört kérted. Az alábbi idő becslés; a végleges időpont a szerver jóváhagyásától és a csendes időszaktól függ.</p>}
        <div className="space-y-3">{review?.selections.map(item => {
          const suggestion = batch.suggestions.find(candidate => candidate.id === item.suggestion_id)!;
          return <div key={item.suggestion_id} className="rounded-xl border p-4"><p className="font-medium">{suggestion.title_hu}</p><p className="mt-1 text-sm text-cgi-muted-foreground">{suggestion.body_hu}</p>
            <p className="mt-3 text-sm">{suggestion.audience_label} · legfeljebb {suggestion.recipient_count} címzett</p><p className="mt-1 flex items-center gap-2 text-sm font-medium"><CalendarClock className="h-4 w-4" />{review.deliveryMode === 'recommended' ? formatTime(item.scheduled_at!) : `Legkorábban ${formatTime(review.earliestAt)}`} · Budapest</p></div>;
        })}</div>
        <p className="rounded-lg bg-cgi-muted/15 p-3 text-sm text-cgi-muted-foreground">Átfedésnél a korábban szereplő javaslat kapja a címzettet. A szerver jóváhagyáskor újra ellenőrzi a célcsoportokat; a tényleges létszám csökkenhet.</p>
        <DialogFooter><Button variant="outline" disabled={approve.isPending} onClick={() => setReview(null)}>Vissza a szerkesztéshez</Button><Button disabled={locked || !review?.selections.length} onClick={confirmReview}>{approve.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCheck className="mr-2 h-4 w-4" />}{approve.isPending ? 'Ütemezés folyamatban…' : 'Jóváhagyás és ütemezés'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </section>;
}
