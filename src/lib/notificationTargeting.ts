import { explicitAudience } from '../../supabase/functions/_shared/notification-policy.ts';
import type { Json } from '@/integrations/supabase/types';

type Targeting = { [key: string]: Json | undefined };
const VERIFIED_FIELDS = ['recommendation_kind', 'scope', 'scoped_user_id', 'drink_segment', 'evidence_checked_at'];

export function hasVerifiedNotificationAudience(targeting: Targeting | null | undefined): boolean {
  return Boolean(targeting && VERIFIED_FIELDS.some(field => Object.prototype.hasOwnProperty.call(targeting, field)));
}

/** Editing copy or timing must never weaken the scheduler's stored recipient checks. */
export function notificationTargetingForSave(existing: Targeting | null | undefined, selectedIds: string[], schedule: boolean): Targeting {
  let targeting: Targeting;
  if (hasVerifiedNotificationAudience(existing)) {
    const originalIds = explicitAudience(existing);
    const proposed = new Set(selectedIds);
    if (proposed.size !== originalIds.length || originalIds.some(id => !proposed.has(id))) {
      throw new Error('Az ellenőrzött célcsoport itt nem módosítható. Más címzettekhez kérj új javaslatot.');
    }
    targeting = { ...existing, user_ids: [...existing.user_ids as string[]] };
  } else {
    // Preserve legacy restrictions as well: unsupported targeting must fail validation, never widen silently.
    targeting = { ...existing, user_ids: [...new Set(selectedIds)], platform: existing?.platform ?? 'all' };
  }
  if (schedule) explicitAudience(targeting);
  return targeting;
}
