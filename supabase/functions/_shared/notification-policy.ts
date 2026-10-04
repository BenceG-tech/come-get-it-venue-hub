export const TIME_ZONE = 'Europe/Budapest';
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const DEFAULT_QUIET_HOURS = { enabled: true, start: '22:00', end: '08:00' };
export const DEFAULT_LIMITS = { max_per_day: 2, per_user_hours: 6 };
export type RecommendationKind = 'welcome' | 'reactivation' | 'points';
export type ProfileEvidence = { id: string; created_at: string; last_seen_at: string | null; is_admin?: boolean; balance?: number };
export type Recommendation = {
  id: string; type: RecommendationKind; priority: 'medium' | 'low';
  title_hu: string; body_hu: string; reasoning: string; audience_label: string;
  recipient_count: number; user_ids: string[]; scheduled_at: string; deep_link: string;
  source: 'ai_ranked' | 'rule'; evidence_checked_at: string;
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

export function qualifies(profile: ProfileEvidence, kind: RecommendationKind, now: Date) {
  if (profile.is_admin) return false;
  if (kind === 'points') return Number(profile.balance) > 0;
  if (kind === 'welcome') return Date.parse(profile.created_at) >= now.getTime() - 7 * 86400000;
  if (kind === 'reactivation') return !!profile.last_seen_at && Date.parse(profile.last_seen_at) <= now.getTime() - 14 * 86400000;
  return false;
}

export function makeRecommendations(profiles: ProfileEvidence[], now: Date): Recommendation[] {
  const copy: Record<RecommendationKind, [string, string, string]> = {
    welcome: ['Fedezd fel a környéket', 'Mutasd a helyeket! Nézz körül a térképen, és ismerd meg a partnerhelyeket.', 'Az elmúlt 7 napban csatlakozott felhasználók'],
    reactivation: ['Találj egy jó helyet', 'Nézz körül újra a Come Get Itben, és fedezd fel a partnerhelyeket.', 'Legalább 14 napja nem aktív felhasználók'],
    points: ['Nézd meg a jutalmakat', 'Nézd meg a pontegyenlegedet és a jutalmak aktuális feltételeit az appban.', 'Pozitív pontegyenlegű felhasználók'],
  };
  return (Object.keys(copy) as RecommendationKind[]).flatMap(kind => {
    const ids = profiles.filter(p => qualifies(p, kind, now)).slice(0, 100).map(p => p.id);
    if (!ids.length) return [];
    const [title, body, audience] = copy[kind];
    return [{ id: crypto.randomUUID(), type: kind, priority: 'medium' as const, title_hu: title, body_hu: body,
      audience_label: audience, recipient_count: ids.length, user_ids: ids,
      reasoning: `${audience}; marketingértesítéshez hozzájáruló push-eszközzel. Az időpont szerkesztési ajánlás, nem mért személyes aktivitás.`,
      scheduled_at: recommendedTime(now, kind), deep_link: kind === 'points' ? '/(tabs)/rewards' : '/(tabs)/home',
      source: 'rule' as const, evidence_checked_at: now.toISOString() }];
  });
}

// No implicit broadcast: historical geofence/segment templates must never widen to all users.
export function explicitAudience(targeting: Record<string, unknown> | null): string[] {
  if (!targeting || !Array.isArray(targeting.user_ids) || !targeting.user_ids.length || targeting.user_ids.length > 100) {
    throw new Error('A küldéshez 1–100 konkrét címzett szükséges.');
  }
  const allowed = new Set(['user_ids', 'platform', 'user_segment', 'geofence', 'recommendation_kind', 'evidence_checked_at']);
  if (Object.keys(targeting).some(key => !allowed.has(key))) throw new Error('Nem támogatott célzási feltétel.');
  if (targeting.platform && targeting.platform !== 'all') throw new Error('Platform szerinti célzás még nem támogatott.');
  if (targeting.user_segment && targeting.user_segment !== 'all') throw new Error('Ez a szegmens még nem támogatott.');
  const geofence = targeting.geofence as { enabled?: boolean } | undefined;
  if (geofence?.enabled) throw new Error('Helyalapú szerveroldali célzás még nem támogatott.');
  if (targeting.recommendation_kind && !['welcome', 'reactivation', 'points'].includes(String(targeting.recommendation_kind))) throw new Error('Ismeretlen javaslattípus.');
  if (!targeting.user_ids.every(id => typeof id === 'string' && UUID.test(id))) throw new Error('Érvénytelen címzett.');
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
