import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isFinalResult, isScheduled, reconcileApprovalResults, selectionAfterApproval, type ApprovalResult } from '../../src/lib/notificationRecommendationState.ts';

const selections = [{ suggestion_id: 'points', scheduled_at: '2026-10-06T10:30:00Z' }, { suggestion_id: 'welcome', scheduled_at: '2026-10-06T15:30:00Z' }];
const result = (id: string, status: ApprovalResult['status'], count = 2): ApprovalResult => ({ suggestion_id: id, status, recipient_count: count });

test('partial bulk success retains only failed drafts for retry', () => {
  const rows = reconcileApprovalResults(selections, [result('points', 'scheduled'), result('welcome', 'failed')]);
  assert.deepEqual(selectionAfterApproval(['points', 'welcome'], rows), ['welcome']);
  assert.equal(isScheduled(rows[0]), true);
  assert.equal(isFinalResult(rows[1]), false);
});

test('idempotent already-scheduled receipts finish a retry without adding another selection', () => {
  const rows = reconcileApprovalResults(selections, [result('points', 'already_scheduled'), result('welcome', 'scheduled')]);
  assert.deepEqual(selectionAfterApproval(['points', 'welcome'], rows), []);
  assert.equal(rows.every(isScheduled), true);
});

test('zero audience and overlap-only drafts are terminal until a new batch is generated', () => {
  const rows = reconcileApprovalResults(selections, [result('points', 'empty_audience', 0), result('welcome', 'overlap_excluded', 0)]);
  assert.deepEqual(selectionAfterApproval(['points', 'welcome'], rows), []);
  assert.equal(rows.some(isScheduled), false);
});

test('a missing per-draft receipt is retryable and cannot hide a confirmed sibling success', () => {
  const rows = reconcileApprovalResults(selections, [result('points', 'scheduled')]);
  assert.equal(rows[0].status, 'scheduled');
  assert.equal(rows[1].status, 'failed');
  assert.match(rows[1].error!, /ellenőrizni/);
});

test('duplicate contradictory receipts cannot announce a draft as approved', () => {
  const rows = reconcileApprovalResults(selections, [result('points', 'scheduled'), result('points', 'failed'), result('welcome', 'scheduled')]);
  assert.equal(rows[0].status, 'failed');
  assert.equal(rows[1].status, 'scheduled');
});

test('responses for another scope or batch draft never enter this selection state', () => {
  const rows = reconcileApprovalResults(selections, [result('unknown-draft', 'scheduled')]);
  assert.deepEqual(rows.map(row => row.suggestion_id), ['points', 'welcome']);
  assert.equal(rows.every(row => row.status === 'failed'), true);
});

test('malformed counts, unknown statuses and non-array responses never signal success', () => {
  for (const payload of [null, {}, [{ suggestion_id: 'points', status: 'sent', recipient_count: 2 }],
    [{ suggestion_id: 'points', status: 'scheduled', recipient_count: -1 }],
    [{ suggestion_id: 'points', status: 'scheduled', recipient_count: '2' }]]) {
    assert.equal(reconcileApprovalResults(selections, payload).every(row => row.status === 'failed'), true);
  }
});

test('single-card approval preserves other selections while a failed card becomes selected for retry', () => {
  assert.deepEqual(selectionAfterApproval(['other-draft'], [result('points', 'failed')]), ['other-draft', 'points']);
  assert.deepEqual(selectionAfterApproval(['other-draft', 'points'], [result('points', 'scheduled')]), ['other-draft']);
});

test('the next-cycle request can omit its time and still match the confirmed server time', () => {
  const rows = reconcileApprovalResults([{ suggestion_id: 'points' }], [{ ...result('points', 'scheduled'), scheduled_at: '2026-10-06T06:00:00Z', excluded_overlap_count: 7 }]);
  assert.equal(rows[0].scheduled_at, '2026-10-06T06:00:00Z');
  assert.equal(rows[0].excluded_overlap_count, 7);
});

test('an invalid receipt time is omitted instead of crashing the date input', () => {
  const rows = reconcileApprovalResults([{ suggestion_id: 'points' }], [{ ...result('points', 'already_scheduled'), scheduled_at: 'invalid-time' }]);
  assert.equal(rows[0].status, 'already_scheduled');
  assert.equal(rows[0].scheduled_at, undefined);
});
