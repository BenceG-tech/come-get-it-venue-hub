
// Core data types for the Come Get It Partner Dashboard

export interface User {
  id: string;
  email: string;
  role: 'venue_owner' | 'staff';
  venue_id: string;
}

export interface Venue {
  id: string;
  name: string;
  address: string;
  tier: 'basic' | 'standard' | 'premium';
  api_key?: string;
  notifications: {
    email: boolean;
    push: boolean;
    weekly_reports: boolean;
  };
}

export interface KPIData {
  daily_redemptions: number;
  revenue_generated: number;
  active_users: number;
  points_collected: number;
}

export interface TrendData {
  date: string;
  redemptions: number;
  revenue: number;
  users: number;
}

export interface DrinkData {
  name: string;
  count: number;
  revenue: number;
}

export interface Redemption {
  id: string;
  date: string;
  time: string;
  user_id: string; // anonymized
  drink: string;
  value: number;
  location: string;
  user_type: 'new' | 'returning';
}

export interface Transaction {
  id: string;
  timestamp: string;
  amount: number;
  items: Record<string, any>;
  points: number;
}

export interface Reward {
  id: string;
  name: string;
  points_required: number;
  valid_until: string;
  active: boolean;
  description?: string;
}

export interface AnalyticsData {
  redemption_timeseries: {
    current_week: TrendData[];
    previous_week: TrendData[];
  };
  user_activity: {
    new_users: number;
    returning_users: number;
  };
  hourly_heatmap: number[][]; // 7x24 matrix (days x hours)
}

export interface FilterOptions {
  dateRange: {
    from: Date;
    to: Date;
  };
  drink?: string;
  userType?: 'new' | 'returning' | 'all';
}
