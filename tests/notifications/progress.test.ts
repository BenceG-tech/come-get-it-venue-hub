import { expect, test } from 'bun:test';
import { advanceProgress, hasDispatchBudget, resumeProgress } from '../../supabase/functions/_shared/notification-progress';

test('a yielded 100-recipient campaign resumes after accepted recipients', () => {
  let progress = resumeProgress(null, 100);
  for (let i = 0; i < 12; i++) progress = advanceProgress(progress, 'sent');
  progress = advanceProgress(progress, 'no_token');
  const restored = resumeProgress(JSON.parse(JSON.stringify(progress)), 100);
  expect(restored.cursor).toBe(13);
  expect(restored.sent).toBe(12);
  expect(restored.no_token).toBe(1);
  expect(advanceProgress(restored, 'sent').cursor).toBe(14);
});
test('unknown outcomes advance once without silently becoming successful', () => {
  const progress = advanceProgress(resumeProgress(null, 1), 'unknown');
  expect(progress).toEqual({ targeted: 1, cursor: 1, unknown: 1 });
  expect(() => advanceProgress(progress, 'sent')).toThrow();
});
test('tampered or changed audiences cannot be resumed', () => {
  expect(() => resumeProgress({ cursor: 3, targeted: 100, sent: 2 }, 100)).toThrow();
  expect(() => resumeProgress({ cursor: 3, targeted: 100, sent: 3 }, 99)).toThrow();
  expect(() => resumeProgress({ cursor: -1 }, 100)).toThrow();
});
test('worker stops early enough for a provider timeout plus checkpoint', () => {
  expect(hasDispatchBudget(50000, 33999)).toBe(true);
  expect(hasDispatchBudget(50000, 34001)).toBe(false);
});
