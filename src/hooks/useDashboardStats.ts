import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AdminStats {
  total_redemptions: number;
  total_revenue: number;
  total_users: number;
  active_venues: number;
  trends: Array<{ date: string; redemptions: number; revenue: number }>;
  top_venues: Array<{ name: string; count: number; revenue: number }>;
}

export interface OwnerStats {
  daily_redemptions: number;
  daily_revenue: number;
  returning_rate: number;
  avg_basket_value: number;
  trends: Array<{ date: string; redemptions: number; revenue: number }>;
  top_drinks: Array<{ name: string; count: number; revenue: number }>;
}

export interface StaffStats {
  today_redemptions: number;
  cap_usage: number;
  daily_cap: number;
  recent_redemptions: Array<{
    id: string;
    drink: string;
    value: number;
    time: string;
    user_type?: 'new' | 'returning';
  }>;
  top_drinks: Array<{ name: string; count: number; revenue: number }>;
}

export interface BrandStats {
  total_partner_venues: number;
  active_campaigns: number | null;
  monthly_reach: number | null;
  conversion_rate: number | null;
}

type DashboardRole = 'admin' | 'owner' | 'staff' | 'brand';

type StatsResult<R extends DashboardRole> = 
  R extends 'admin' ? AdminStats :
  R extends 'owner' ? OwnerStats :
  R extends 'staff' ? StaffStats :
  R extends 'brand' ? BrandStats :
  never;

export function useDashboardStats<R extends DashboardRole>(
  role: R, 
  venueId?: string
) {
  return useQuery<StatsResult<R>>({
    queryKey: ['dashboard-stats', role, venueId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-dashboard-stats', {
        body: { role, venue_id: venueId }
      });

      if (error) {
        console.error('[useDashboardStats] request failed:', error.message ?? 'unknown error');
        throw error;
      }

      return data as StatsResult<R>;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
    retry: 2,
  });
}

// Helper function to format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('hu-HU', {
    style: 'currency',
    currency: 'HUF',
    maximumFractionDigits: 0,
  }).format(amount);
}

// Helper function to format time
export function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('hu-HU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}