
// Core data types for the Come Get It Partner Dashboard

export interface User {
  id: string;
  email: string;
  role: 'cgi_admin' | 'venue_owner' | 'venue_staff';
  name: string;
  venue_ids?: string[]; // venues this user can access
}

export interface Session {
  user: User;
  venues: string[]; // venue IDs this user can access
}

export interface Venue {
  id: string;
  name: string;
  address: string;
  description?: string;
  tags: string[];
  plan: 'basic' | 'standard' | 'premium';
  is_paused: boolean;
  drinks: VenueDrink[];
  freeDrinkWindows: FreeDrinkWindow[];
  caps: RedemptionCap;
  api_key?: string;
  notifications: {
    email: boolean;
    push: boolean;
    weekly_reports: boolean;
  };
}

export interface VenueDrink {
  id: string;
  drinkName: string;
  category?: string;
  abv?: number;
  is_sponsored: boolean;
  brand_id?: string;
  is_free_drink: boolean;
}

export interface FreeDrinkWindow {
  id: string;
  days: number[]; // 1-7 (Monday-Sunday)
  start: string; // "14:00"
  end: string; // "16:00"
  timezone: string;
}

export interface RedemptionCap {
  daily?: number;
  hourly?: number;
  monthly?: number;
  perUserDaily?: number;
  onExhaust: 'close' | 'show_alt_offer' | 'do_nothing';
  altOfferText?: string;
}

export interface Brand {
  id: string;
  name: string;
  logoUrl?: string;
  contactName?: string;
  contactEmail?: string;
  notes?: string;
}

export interface BrandCampaign {
  id: string;
  brand_id: string;
  name: string;
  productName: string;
  venue_ids: string[];
  windows: FreeDrinkWindow[];
  pieceLimit?: number;
  active: boolean;
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
  venue_id: string;
}

export interface Transaction {
  id: string;
  timestamp: string;
  amount: number;
  items: Record<string, any>;
  points: number;
  venue_id: string;
}

export interface Reward {
  id: string;
  name: string;
  points_required: number;
  valid_until: string;
  active: boolean;
  description?: string;
  venue_id: string;
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

// Active free drink status
export interface ActiveFreeDrinkStatus {
  isActive: boolean;
  currentWindow?: FreeDrinkWindow;
}

// Cap usage calculation
export interface CapUsage {
  used: number;
  limit: number;
  pct: number;
}
