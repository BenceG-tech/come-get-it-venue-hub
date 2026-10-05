import { describe, expect, test } from 'bun:test';
import { audienceScopeFromTargeting, budapestInputToIso, earliestDispatchTime, explicitAudience, isQuietTime, localInput, makeMixedRecommendations, makeRecommendations, qualifies, recommendedTime, validDrinkSegment, validExpoToken, validateMessage } from '../../supabase/functions/_shared/notification-policy';
const id = '00000000-0000-4000-8000-000000000001';

describe('Notification safety policy', () => {
  test('never widens empty/unsupported targeting into a broadcast', () => {
    for (const target of [null, {}, { user_ids: [] }, { user_ids: [id], geofence: { enabled: true } }, { user_ids: [id], favorites: true }, { user_ids: [id], user_segment: 'new' }, { user_ids: [id], platform: 'ios' }, { user_ids: ['bad'] }]) expect(() => explicitAudience(target)).toThrow();
    expect(explicitAudience({ user_ids: [id, id], platform: 'all' })).toEqual([id]);
  });
  test('Budapest quiet hours work in summer and winter', () => {
    expect(isQuietTime(new Date('2026-07-01T20:00:00Z'))).toBe(true);
    expect(isQuietTime(new Date('2026-12-01T20:00:00Z'))).toBe(false);
    expect(isQuietTime(new Date('2026-12-01T21:00:00Z'))).toBe(true);
    expect(isQuietTime(new Date('2026-07-01T06:00:00Z'))).toBe(false);
    expect(isQuietTime(new Date('2026-07-01T05:59:00Z'))).toBe(true);
  });
  test('schedule converts Budapest time, rejects nonexistent DST hour', () => {
    expect(budapestInputToIso('2026-07-01T17:30')).toBe('2026-07-01T15:30:00.000Z');
    expect(budapestInputToIso('2026-12-01T17:30')).toBe('2026-12-01T16:30:00.000Z');
    expect(() => budapestInputToIso('2026-03-29T02:30')).toThrow();
    expect(() => budapestInputToIso('2026-99-99T01:00')).toThrow();
  });
  test('recommended time is future and never falls in quiet hours across DST', () => {
    for (const date of ['2026-03-28T23:45:00Z', '2026-10-25T01:15:00Z', '2026-10-04T21:00:00Z']) {
      const now = new Date(date), result = recommendedTime(now, 'welcome');
      expect(Date.parse(result)).toBeGreaterThan(now.getTime() + 15 * 60000);
      expect(isQuietTime(new Date(result))).toBe(false);
      expect(localInput(result).endsWith('17:30')).toBe(true);
    }
  });
  test('spring DST does not skip a calendar day late in the evening', () => {
    expect(localInput(recommendedTime(new Date('2027-03-27T22:30:00Z'), 'welcome'))).toBe('2027-03-28T17:30');
  });
  test('no fabricated reactivation for unknown last_seen and no unearned reward claim', () => {
    const suggestions = makeRecommendations([{ id, created_at: '2020-01-01', last_seen_at: null, balance: 1 }], new Date('2026-10-04T12:00:00Z'));
    expect(suggestions.map(s => s.type)).toEqual(['points', 'welcome', 'reactivation', 'discovery']);
    expect(suggestions.filter(s => s.sendable).map(s => s.type)).toEqual(['points', 'discovery']);
    expect(suggestions[0].body_hu).not.toContain('beváltható');
    expect(suggestions[0].source).toBe('rule');
    expect(makeRecommendations([{ id, created_at: '2026-10-03', last_seen_at: null, is_admin: true }], new Date('2026-10-04')).every(s => !s.sendable)).toBe(true);
  });
  test('four useful drafts persist with an empty audience and an explicit blocking reason', () => {
    const drafts = makeRecommendations([], new Date('2026-10-05T12:00:00Z'));
    expect(drafts).toHaveLength(4);
    expect(drafts.every(s => !s.sendable && s.recipient_count === 0 && s.user_ids.length === 0 && !!s.empty_reason)).toBe(true);
    expect(drafts.map(s => s.priority_order)).toEqual([1, 2, 3, 4]);
  });
  test('admin belongs only to an exact explicit single-user scope', () => {
    const profile = { id, created_at: '2026-10-03', last_seen_at: null, is_admin: true, balance: 4 };
    const now = new Date('2026-10-05T12:00:00Z');
    expect(qualifies(profile, 'discovery', now)).toBe(false);
    expect(qualifies(profile, 'discovery', now, { scopedUserId: id })).toBe(true);
    expect(makeRecommendations([profile], now, { scopedUserId: id }).filter(s => s.sendable).map(s => s.type)).toEqual(['points', 'welcome', 'discovery']);
    for (const targeting of [
      { scope: 'user', user_ids: [id] },
      { scope: 'user', scoped_user_id: id, user_ids: [id, id] },
      { scope: 'campaign', scoped_user_id: id, user_ids: [id] },
      { scope: 'user', scoped_user_id: '00000000-0000-4000-8000-000000000002', user_ids: [id] },
      { scope: 'all-admins', user_ids: [id] },
    ]) expect(() => explicitAudience(targeting)).toThrow();
    expect(audienceScopeFromTargeting({ scope: 'user', scoped_user_id: id, user_ids: [id] }).scopedUserId).toBe(id);
  });
  test('drink segmentation requires actual history evidence, never points or inferred tastes', () => {
    const profile = { id, created_at: '2020-01-01', last_seen_at: null, balance: 100 };
    const now = new Date('2026-10-05T12:00:00Z');
    expect(makeRecommendations([profile], now, { drinkSegment: 'beer' }).every(s => !s.sendable)).toBe(true);
    const beer = makeRecommendations([profile], now, { drinkSegment: 'beer', segmentUserIds: new Set([id]) });
    expect(beer[3].sendable).toBe(true);
    expect(beer[3].audience_label).toContain('Korábban sört');
    expect(beer[3].body_hu).not.toContain('ingyen');
    expect(beer[3].deep_link).toBe('/(tabs)/home');
    expect(validDrinkSegment('beer')).toBe(true);
    expect(validDrinkSegment('toString')).toBe(false);
    expect(() => explicitAudience({ user_ids: [id], drink_segment: 'guessed-beer-lover' })).toThrow();
  });
  test('ASAP uses an eligible five-minute scheduler window and respects Budapest quiet hours', () => {
    expect(earliestDispatchTime(new Date('2026-10-05T12:00:00Z'))).toBe('2026-10-05T12:05:00.000Z');
    expect(localInput(earliestDispatchTime(new Date('2026-10-05T19:58:30Z')))).toBe('2026-10-06T08:00');
    expect(localInput(earliestDispatchTime(new Date('2027-03-27T22:30:00Z')))).toBe('2027-03-28T08:00');
  });
  test('mixed batch contains four distinct factual drink-group drafts, including empty groups', () => {
    const drafts = makeMixedRecommendations([{ id, created_at: '2020-01-01', last_seen_at: null }], new Date('2026-10-05T12:00:00Z'), {}, { beer: new Set([id]) });
    expect(drafts.map(d => d.drink_segment)).toEqual(['beer', 'wine', 'cocktail', 'non_alcoholic']);
    expect(drafts.map(d => d.sendable)).toEqual([true, false, false, false]);
    expect(new Set(drafts.map(d => d.title_hu)).size).toBe(4);
    expect(drafts.every(d => d.type === 'discovery' && !d.body_hu.includes('ingyen'))).toBe(true);
    expect(() => explicitAudience({ user_ids: [id], drink_segment: 'mixed' })).toThrow();
  });
  test('supports both Expo token formats and rejects arbitrary tokens', () => {
    expect(validExpoToken('ExponentPushToken[abc_12-x]')).toBe(true);
    expect(validExpoToken('ExpoPushToken[abc_12-x]')).toBe(true);
    expect(validExpoToken('ExponentPushTokenXYZ')).toBe(false);
    expect(validExpoToken(null)).toBe(false);
  });
  test('rejects unresolved placeholders and external deep links', () => {
    expect(() => validateMessage('Szia', 'Szia {name}!')).toThrow();
    expect(() => validateMessage('Szia', 'Üzenet', 'https://example.com')).toThrow();
    expect(() => validateMessage('Szia', 'Üzenet', 'rork://map')).toThrow();
    expect(() => validateMessage('Szia', 'Üzenet', '/(tabs)/home')).not.toThrow();
    expect(() => validateMessage('Szia', 'Üzenet', `/venue/${id}`)).not.toThrow();
  });
});
