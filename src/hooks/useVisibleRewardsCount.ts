import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Reward } from '@/lib/types';
import { countVisibleRewards, VenueVisibilityInfo } from '@/lib/rewardVisibility';

/**
 * Number of rewards the mobile app can actually show right now,
 * computed with the same rules as the live policy.
 */
export function useVisibleRewardsCount() {
  return useQuery({
    queryKey: ['visible-rewards-count'],
    queryFn: async () => {
      const [rewardsResult, venuesResult] = await Promise.all([
        supabase.from('rewards').select('*'),
        supabase.from('venues').select('id, name, is_paused'),
      ]);

      if (rewardsResult.error) throw rewardsResult.error;

      const venuesById: Record<string, VenueVisibilityInfo> = {};
      (venuesResult.data ?? []).forEach((v: VenueVisibilityInfo) => {
        venuesById[v.id] = v;
      });

      const rewards = (rewardsResult.data ?? []) as unknown as Reward[];
      return {
        total: rewards.length,
        visible: countVisibleRewards(rewards, venuesById),
      };
    },
    staleTime: 60 * 1000,
  });
}
