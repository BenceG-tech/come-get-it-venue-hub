export const OUTCOMES = ['sent', 'failed', 'unknown', 'duplicate', 'no_token', 'frequency_limited', 'ineligible', 'cancelled'] as const;
export type Progress = { cursor: number; targeted: number } & Partial<Record<typeof OUTCOMES[number], number>>;

export function resumeProgress(saved: Record<string, unknown> | null, targeted: number): Progress {
  const cursor = saved?.cursor ?? 0;
  if (!Number.isInteger(cursor) || Number(cursor) < 0 || Number(cursor) > targeted) throw new Error('Érvénytelen kampányfolytatási állapot.');
  if (saved?.targeted !== undefined && saved.targeted !== targeted) throw new Error('A feldolgozás közben megváltozott a célközönség.');
  const progress: Progress = { cursor: Number(cursor), targeted };
  for (const key of OUTCOMES) {
    const count = saved?.[key] ?? 0;
    if (!Number.isInteger(count) || Number(count) < 0) throw new Error('Érvénytelen küldési összesítő.');
    if (count) progress[key] = Number(count);
  }
  if (OUTCOMES.reduce((sum, key) => sum + (progress[key] || 0), 0) !== progress.cursor) throw new Error('Hiányos küldési összesítő.');
  return progress;
}

export function advanceProgress(progress: Progress, status: string): Progress {
  if (!OUTCOMES.includes(status as typeof OUTCOMES[number]) || progress.cursor >= progress.targeted) throw new Error('Nem rögzíthető küldési állapot.');
  return { ...progress, cursor: progress.cursor + 1, [status]: (progress[status as typeof OUTCOMES[number]] || 0) + 1 };
}

// Leave 16 seconds for one 15-second provider request and its database checkpoint.
export function hasDispatchBudget(deadline: number, now = Date.now()) { return deadline - now >= 16000; }
