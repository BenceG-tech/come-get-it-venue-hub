export const TIME_ZONE = 'Europe/Budapest';
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const DEFAULT_QUIET_HOURS = { enabled: true, start: '22:00', end: '08:00' };
export const DEFAULT_LIMITS = { max_per_day: 2, per_user_hours: 6 };
export type RecommendationKind = 'welcome' | 'reactivation' | 'points' | 'discovery';
export const RECOMMENDATION_KINDS: RecommendationKind[] = ['points', 'welcome', 'reactivation', 'discovery'];
export const DRINK_SEGMENTS = {
  all: { label: 'Minden ellenőrzött felhasználó', categories: [] as string[], title: 'Mutasd a helyeket', body: 'Keress egy jó helyet a térképen, és nézd meg a partnerhelyek adatlapját.' },
  mixed: { label: 'Más-más ital csoportonként', categories: [] as string[], title: 'Italcsoportok', body: 'Korábbi beváltások alapján külön üzenet minden csoportnak.' },
  beer: { label: 'Korábban sört beváltók', categories: ['beer'], title: 'Sörös helyet keresel?', body: 'Nézz körül a partnerhelyek között, és keresd meg a hozzád illő helyet az appban.' },
  coffee: { label: 'Korábban kávét beváltók', categories: ['coffee'], title: 'Hol kávéznál legközelebb?', body: 'Fedezd fel a partnerhelyeket a térképen, és nézd meg a kínálatukat az appban.' },
  wine: { label: 'Korábban bort beváltók', categories: ['wine'], title: 'Egy jó hely borozáshoz?', body: 'Nézd meg a partnerhelyek adatlapját, és találd meg a következő helyet az appban.' },
  cocktail: { label: 'Korábban koktélt beváltók', categories: ['cocktail'], title: 'Koktélos helyet keresel?', body: 'Böngészd a partnerhelyeket, és nézd meg a kínálatukat az appban.' },
  non_alcoholic: { label: 'Korábban alkoholmentes italt beváltók', categories: ['non-alcoholic', 'soft'], title: 'Frissítő programot keresel?', body: 'Nézz körül a partnerhelyek között, és fedezd fel a kínálatukat az appban.' },
} as const;
export type DrinkSegment = keyof typeof DRINK_SEGMENTS;
export type AudienceScope = { scopedUserId?: string; drinkSegment?: DrinkSegment; segmentUserIds?: Set<string> };
export function validDrinkSegment(value: unknown): value is DrinkSegment {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(DRINK_SEGMENTS, value);
}
export type ProfileEvidence = { id: string; created_at: string; last_seen_at: string | null; is_admin?: boolean; balance?: number };
export type Recommendation = {
  id: string; type: RecommendationKind; priority: 'medium' | 'low';
  title_hu: string; body_hu: string; reasoning: string; audience_label: string;
  recipient_count: number; user_ids: string[]; scheduled_at: string; deep_link: string;
  source: 'ai_ranked' | 'rule'; evidence_checked_at: string;
  sendable: boolean; empty_reason: string | null; eligible_count: number; priority_order: number;
  scope: 'user' | 'campaign'; drink_segment: DrinkSegment;
};

export function budapestParts(date: Date) {
  return Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date).map(p => [p.type, p.value]));
}

export function localInput(iso: string) {
  const p = budapestParts(new Date(iso));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

// Reject nonexistent DST times rather than silently scheduling a different hour.
export function budapestInputToIso(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error('Adj meg érvényes budapesti időpontot.');
  const base = Date.parse(`${value}:00Z`);
  for (const offset of [2, 1]) {
    const candidate = new Date(base - offset * 3600000);
    if (Number.isFinite(candidate.getTime()) && localInput(candidate.toISOString()) === value) return candidate.toISOString();
  }
  throw new Error('Ez az időpont az óraátállítás miatt nem létezik. Válassz másikat.');
}

export function isQuietTime(date: Date, quiet: { enabled?: boolean; start?: string; end?: string } = DEFAULT_QUIET_HOURS) {
  if (quiet.enabled === false) return false;
  const start = quiet.start || '22:00', end = quiet.end || '08:00';
  if (![start, end].every(v => /^([01]\d|2[0-3]):[0-5]\d$/.test(v))) throw new Error('Érvénytelen csendes időszak.');
  const p = budapestParts(date), time = `${p.hour}:${p.minute}`;
  return start === end || (start < end ? time >= start && time < end : time >= start || time < end);
}

export function recommendedTime(now: Date, kind: RecommendationKind) {
  const desired = kind === 'points' ? '12:30' : '17:30';
  const p = budapestParts(now);
  let day = `${p.year}-${p.month}-${p.day}`;
  let candidate = budapestInputToIso(`${day}T${desired}`);
  if (Date.parse(candidate) <= now.getTime() + 15 * 60000) {
    day = new Date(Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day) + 1)).toISOString().slice(0, 10);
    candidate = budapestInputToIso(`${day}T${desired}`);
  }
  return candidate;
}

export function earliestDispatchTime(now: Date) {
  const soon = new Date(Math.ceil((now.getTime() + 2 * 60000) / (5 * 60000)) * 5 * 60000);
  if (!isQuietTime(soon)) return soon.toISOString();
  const p = budapestParts(soon);
  const day = Number(p.hour) >= 22
    ? new Date(Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day) + 1)).toISOString().slice(0, 10)
    : `${p.year}-${p.month}-${p.day}`;
  return budapestInputToIso(`${day}T08:00`);
}

export function qualifies(profile: ProfileEvidence, kind: RecommendationKind, now: Date, scope: AudienceScope = {}) {
  if (!UUID.test(profile.id) || (profile.is_admin && scope.scopedUserId !== profile.id)) return false;
  if (scope.scopedUserId && scope.scopedUserId !== profile.id) return false;
  if (scope.drinkSegment && scope.drinkSegment !== 'all' && !scope.segmentUserIds?.has(profile.id)) return false;
  if (kind === 'discovery') return true;
  if (kind === 'points') return Number(profile.balance) > 0;
  const created = Date.parse(profile.created_at), lastSeen = Date.parse(profile.last_seen_at || '');
  if (kind === 'welcome') return Number.isFinite(created) && created <= now.getTime() && created >= now.getTime() - 7 * 86400000;
  if (kind === 'reactivation') return Number.isFinite(lastSeen) && lastSeen <= now.getTime() - 14 * 86400000;
  return false;
}

export function makeRecommendations(profiles: ProfileEvidence[], now: Date, scope: AudienceScope = {}): Recommendation[] {
  const segment = scope.drinkSegment || 'all', selected = DRINK_SEGMENTS[segment];
  const copy: Record<RecommendationKind, [string, string, string]> = {
    welcome: ['Fedezd fel a környéket', 'Nézz körül a térképen, és ismerd meg a partnerhelyeket.', 'Az elmúlt 7 napban csatlakozott felhasználók'],
    reactivation: ['Találj egy jó helyet', 'Nézz körül újra a Come Get Itben, és fedezd fel a partnerhelyeket.', 'Legalább 14 napja nem aktív felhasználók'],
    points: ['Nézd meg a jutalmakat', 'Nézd meg a pontegyenlegedet és a jutalmak aktuális feltételeit az appban.', 'Pozitív pontegyenlegű felhasználók'],
    discovery: [selected.title, selected.body, 'Partnerhelyek felfedezése'],
  };
  return RECOMMENDATION_KINDS.map((kind, index) => {
    const allIds = [...new Set(profiles.filter(p => qualifies(p, kind, now, scope)).map(p => p.id))];
    const ids = allIds.slice(0, 100);
    const [title, body, audience] = copy[kind];
    const label = segment === 'all' ? audience : `${selected.label} · ${audience}`;
    return { id: crypto.randomUUID(), type: kind, priority: kind === 'discovery' ? 'low' : 'medium', title_hu: title, body_hu: body,
      audience_label: label, recipient_count: ids.length, eligible_count: allIds.length, user_ids: ids,
      sendable: ids.length > 0,
      empty_reason: ids.length ? null : 'Nincs a feltételnek megfelelő, marketingértesítést engedélyező címzett. A vázlat nem küldhető.',
      reasoning: `${label}; marketingértesítéshez hozzájáruló push-eszközzel.${segment === 'all' ? '' : ' Az italcsoport az elmúlt 180 nap sikeres beváltásának kategóriája, nem megadott ízlés.'} Az időpont szerkesztési ajánlás, nem mért személyes aktivitás.`,
      scheduled_at: recommendedTime(now, kind), deep_link: kind === 'points' ? '/(tabs)/rewards' : '/(tabs)/home',
      source: 'rule', evidence_checked_at: now.toISOString(), priority_order: index + 1,
      scope: scope.scopedUserId ? 'user' : 'campaign', drink_segment: segment };
  });
}

export const MIXED_DRINK_SEGMENTS: DrinkSegment[] = ['beer', 'wine', 'cocktail', 'non_alcoholic'];
export function makeMixedRecommendations(profiles: ProfileEvidence[], now: Date, scope: AudienceScope,
  evidence: Partial<Record<DrinkSegment, Set<string>>>): Recommendation[] {
  return MIXED_DRINK_SEGMENTS.map((segment, index) => ({
    ...makeRecommendations(profiles, now, { ...scope, drinkSegment: segment, segmentUserIds: evidence[segment] })[3],
    priority_order: index + 1,
  }));
}

export function audienceScopeFromTargeting(targeting: Record<string, unknown>): AudienceScope {
  if (targeting.scope === 'user') {
    if (typeof targeting.scoped_user_id !== 'string' || !UUID.test(targeting.scoped_user_id) ||
        !Array.isArray(targeting.user_ids) || targeting.user_ids.length !== 1 || targeting.user_ids[0] !== targeting.scoped_user_id) {
      throw new Error('Érvénytelen egyéni célzás.');
    }
  } else if ((targeting.scope && targeting.scope !== 'campaign') || targeting.scoped_user_id != null) throw new Error('Érvénytelen célzási hatókör.');
  if (targeting.drink_segment !== undefined && (!validDrinkSegment(targeting.drink_segment) || targeting.drink_segment === 'mixed')) throw new Error('Ismeretlen vagy nem konkrét italcsoport.');
  return { scopedUserId: targeting.scope === 'user' ? String(targeting.scoped_user_id) : undefined,
    drinkSegment: (targeting.drink_segment as DrinkSegment) || 'all' };
}

// No implicit broadcast: historical geofence/segment templates must never widen to all users.
export function explicitAudience(targeting: Record<string, unknown> | null): string[] {
  if (!targeting || !Array.isArray(targeting.user_ids) || !targeting.user_ids.length || targeting.user_ids.length > 100) {
    throw new Error('A küldéshez 1–100 konkrét címzett szükséges.');
  }
  const allowed = new Set(['user_ids', 'platform', 'user_segment', 'geofence', 'recommendation_kind', 'evidence_checked_at', 'scope', 'scoped_user_id', 'drink_segment']);
  if (Object.keys(targeting).some(key => !allowed.has(key))) throw new Error('Nem támogatott célzási feltétel.');
  if (targeting.platform && targeting.platform !== 'all') throw new Error('Platform szerinti célzás még nem támogatott.');
  if (targeting.user_segment && targeting.user_segment !== 'all') throw new Error('Ez a szegmens még nem támogatott.');
  const geofence = targeting.geofence as { enabled?: boolean } | undefined;
  if (geofence?.enabled) throw new Error('Helyalapú szerveroldali célzás még nem támogatott.');
  if (targeting.recommendation_kind && !RECOMMENDATION_KINDS.includes(targeting.recommendation_kind as RecommendationKind)) throw new Error('Ismeretlen javaslattípus.');
  if (!targeting.user_ids.every(id => typeof id === 'string' && UUID.test(id))) throw new Error('Érvénytelen címzett.');
  audienceScopeFromTargeting(targeting);
  return [...new Set(targeting.user_ids as string[])];
}

export function validateMessage(title: unknown, body: unknown, deepLink?: unknown) {
  if (typeof title !== 'string' || !title.trim() || title.length > 80 || typeof body !== 'string' || !body.trim() || body.length > 240) throw new Error('A cím 1–80, az üzenet 1–240 karakter lehet.');
  if (/[{}]/.test(title + body)) throw new Error('Feloldatlan változó maradt az értesítésben.');
  if (deepLink && (typeof deepLink !== 'string' || !/^\/(?:\(tabs\)\/(?:home|rewards)|map|(?:venue|reward)\/[0-9a-f-]{36})$/.test(deepLink))) throw new Error('Nem támogatott alkalmazáshivatkozás.');
}

export function validExpoToken(token: unknown): token is string {
  return typeof token === 'string' && /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/.test(token);
}
