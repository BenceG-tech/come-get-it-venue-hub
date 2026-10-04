import { describe, expect, test } from 'bun:test';
import { budapestInputToIso, explicitAudience, isQuietTime, localInput, makeRecommendations, recommendedTime, validExpoToken, validateMessage } from '../../supabase/functions/_shared/notification-policy';
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
    expect(suggestions.map(s => s.type)).toEqual(['points']);
    expect(suggestions[0].body_hu).not.toContain('beváltható');
    expect(suggestions[0].source).toBe('rule');
    expect(makeRecommendations([{ id, created_at: '2026-10-03', last_seen_at: null, is_admin: true }], new Date('2026-10-04'))).toEqual([]);
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
