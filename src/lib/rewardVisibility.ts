import { Reward } from "@/lib/types";

export type RewardHiddenReason =
  | 'inactive'
  | 'expired'
  | 'cap_reached'
  | 'venue_paused'
  | 'venue_missing';

export interface RewardVisibility {
  visible: boolean;
  reason: RewardHiddenReason | null;
  label: string;
}

export interface VenueVisibilityInfo {
  id: string;
  name: string;
  is_paused?: boolean | null;
}

export const rewardHiddenReasonLabels: Record<RewardHiddenReason, string> = {
  inactive: 'Inaktív (nincs publikálva)',
  expired: 'Lejárt érvényesség',
  cap_reached: 'Elérte a max beváltást',
  venue_paused: 'A helyszín szüneteltetve',
  venue_missing: 'Nincs helyszín hozzárendelve',
};

/** End of the reward's last valid day (valid_until is a date). */
function isExpired(validUntil: string | undefined | null): boolean {
  if (!validUntil) return true;
  const end = new Date(`${validUntil.split('T')[0]}T23:59:59`);
  if (Number.isNaN(end.getTime())) return true;
  return end.getTime() < Date.now();
}

/**
 * Mirrors the live policy the Rork mobile app sees:
 * active + valid_until >= now + under max_redemptions (if capped)
 * + (global OR attached to a non-paused venue).
 */
export function getRewardVisibility(
  reward: Reward,
  venue?: VenueVisibilityInfo | null
): RewardVisibility {
  let reason: RewardHiddenReason | null = null;

  if (!reward.active) {
    reason = 'inactive';
  } else if (isExpired(reward.valid_until)) {
    reason = 'expired';
  } else if (
    reward.max_redemptions != null &&
    (reward.current_redemptions ?? 0) >= reward.max_redemptions
  ) {
    reason = 'cap_reached';
  } else if (!reward.is_global) {
    if (!reward.venue_id) {
      reason = 'venue_missing';
    } else if (!venue) {
      reason = 'venue_missing';
    } else if (venue.is_paused) {
      reason = 'venue_paused';
    }
  }

  return {
    visible: reason === null,
    reason,
    label: reason === null ? 'Látható az appban' : rewardHiddenReasonLabels[reason],
  };
}

export function countVisibleRewards(
  rewards: Reward[],
  venuesById: Record<string, VenueVisibilityInfo>
): number {
  return rewards.filter(
    (r) => getRewardVisibility(r, r.venue_id ? venuesById[r.venue_id] : null).visible
  ).length;
}
