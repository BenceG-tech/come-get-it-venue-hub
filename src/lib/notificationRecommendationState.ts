export type ApprovalSelection = { suggestion_id: string; scheduled_at?: string };
export type ApprovalResult = {
  suggestion_id: string;
  status: 'scheduled' | 'already_scheduled' | 'empty_audience' | 'overlap_excluded' | 'failed';
  recipient_count: number;
  excluded_overlap_count?: number;
  scheduled_at?: string;
  error?: string;
};

export function isScheduled(result?: ApprovalResult): boolean {
  return result?.status === 'scheduled' || result?.status === 'already_scheduled';
}

export function isFinalResult(result?: ApprovalResult): boolean {
  return Boolean(result && result.status !== 'failed');
}

/** A missing, duplicate or malformed receipt must never make a draft look approved. */
export function reconcileApprovalResults(selections: ApprovalSelection[], value: unknown): ApprovalResult[] {
  const rows = Array.isArray(value) ? value : [];
  return selections.map(({ suggestion_id }) => {
    const matches = rows.filter(row => row && typeof row === 'object' && row.suggestion_id === suggestion_id);
    const row = matches.length === 1 ? matches[0] : null;
    if (row && ['scheduled', 'already_scheduled', 'empty_audience', 'overlap_excluded', 'failed'].includes(row.status)
      && Number.isSafeInteger(row.recipient_count) && row.recipient_count >= 0) {
      return {
        suggestion_id, status: row.status, recipient_count: row.recipient_count,
        ...(Number.isSafeInteger(row.excluded_overlap_count) && row.excluded_overlap_count >= 0 ? { excluded_overlap_count: row.excluded_overlap_count } : {}),
        ...(typeof row.scheduled_at === 'string' && Number.isFinite(Date.parse(row.scheduled_at)) ? { scheduled_at: row.scheduled_at } : {}),
        ...(typeof row.error === 'string' ? { error: row.error } : {}),
      };
    }
    return { suggestion_id, status: 'failed', recipient_count: 0,
      error: 'Az ütemezés eredményét nem sikerült ellenőrizni. Ezt a javaslatot újra megpróbálhatod.' };
  });
}

export function selectionAfterApproval(selected: string[], results: ApprovalResult[]): string[] {
  const finished = new Set(results.filter(isFinalResult).map(row => row.suggestion_id));
  return [...new Set([...selected, ...results.filter(row => row.status === 'failed').map(row => row.suggestion_id)])]
    .filter(id => !finished.has(id));
}
