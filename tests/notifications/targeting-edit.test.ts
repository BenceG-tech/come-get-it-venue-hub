import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasVerifiedNotificationAudience, notificationTargetingForSave } from '../../src/lib/notificationTargeting.ts';
import { audienceScopeFromTargeting, qualifies } from '../../supabase/functions/_shared/notification-policy.ts';

const adminId = '00000000-0000-4000-8000-000000000001';
const secondId = '00000000-0000-4000-8000-000000000002';
const checkedAt = '2026-10-05T12:00:00Z';
const adminTarget = { user_ids: [adminId], platform: 'all', scope: 'user', scoped_user_id: adminId,
  recommendation_kind: 'discovery', drink_segment: 'all', evidence_checked_at: checkedAt };

test('time/copy edits retain a scoped admin audience and its scheduler eligibility', () => {
  const saved = notificationTargetingForSave(adminTarget, [adminId], true);
  assert.deepEqual(saved, adminTarget);
  assert.notEqual(saved.user_ids, adminTarget.user_ids);
  assert.equal(qualifies({ id: adminId, is_admin: true, created_at: checkedAt, last_seen_at: checkedAt },
    'discovery', new Date(checkedAt), audienceScopeFromTargeting(saved)), true);
});

test('a generated beer campaign retains all constraints used to recheck the audience', () => {
  const targeting = { ...adminTarget, user_ids: [secondId], scope: 'campaign', scoped_user_id: null, drink_segment: 'beer' };
  const saved = notificationTargetingForSave(targeting, [secondId], true);
  assert.deepEqual(saved, targeting);
  const profile = { id: secondId, created_at: checkedAt, last_seen_at: checkedAt };
  assert.equal(qualifies(profile, 'discovery', new Date(checkedAt), { ...audienceScopeFromTargeting(saved), segmentUserIds: new Set() }), false);
  assert.equal(qualifies(profile, 'discovery', new Date(checkedAt), { ...audienceScopeFromTargeting(saved), segmentUserIds: new Set([secondId]) }), true);
});

test('verified recipient replacement or widening fails even when saved as a draft', () => {
  for (const schedule of [true, false]) {
    for (const ids of [[], [secondId], [adminId, secondId]]) {
      assert.throws(() => notificationTargetingForSave(adminTarget, ids, schedule), /célcsoport itt nem módosítható/);
    }
  }
});

test('saving a generated campaign as a draft does not strip its metadata', () => {
  assert.deepEqual(notificationTargetingForSave(adminTarget, [adminId], false), adminTarget);
  assert.equal(hasVerifiedNotificationAudience(adminTarget), true);
});

test('a new manual message still accepts an explicit editable audience', () => {
  assert.deepEqual(notificationTargetingForSave(null, [secondId, secondId], true), { user_ids: [secondId], platform: 'all' });
  assert.equal(hasVerifiedNotificationAudience({ user_ids: [secondId], platform: 'all' }), false);
  assert.throws(() => notificationTargetingForSave(null, [], true), /konkrét címzett/);
});

test('unsupported legacy targeting is preserved and rejected instead of silently widened', () => {
  assert.throws(() => notificationTargetingForSave({ user_ids: [secondId], platform: 'ios' }, [secondId], true), /Platform szerinti/);
  assert.throws(() => notificationTargetingForSave({ user_ids: [secondId], geofence: { enabled: true } }, [secondId], true), /Helyalapú/);
});
