
// Core data types for the Come Get It Partner Dashboard

export interface User {
  id: string;
  email: string;
  role: 'cgi_admin' | 'venue_owner' | 'venue_staff' | 'brand_admin';
  name: string;
  venue_ids?: string[]; // venues this user can access
}

export interface Session {
  user: User;
  venues: string[]; // venue IDs this user can access
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface DayHours {
  open: string | null;   // "10:00" | null (closed)
  close: string | null;  // "23:00" | null
}

export interface BusinessHours {
  // 1..7 (Monday=1) → daily hours
  byDay: Record<number, DayHours>;
  specialDates?: Array<{ date: string; open: string | null; close: string | null }>; // "2025-08-20"
}

export interface VenueImage {
  id: string;
  url: string;
  label?: string;
  isCover?: boolean;
}

export interface VenueDrink {
  id: string;
  venue_id: string;
  drinkName: string;
  category?: string;
  abv?: number;
  is_sponsored: boolean;
  brand_id?: string;
  is_free_drink: boolean;
  // NEW detailed fields
  description?: string;
  ingredients?: string[];               // ["Whisky", "Lemonade", "Lemon"]
  preparation_instructions?: string;    // "Mix, serve over ice..."
  image_url?: string;
  serving_style?: string;               // "over ice", "neat", etc.
  created_at?: string;
  updated_at?: string;
}

export interface FreeDrinkWindow {
  id: string;
  venue_id: string;
  drink_id?: string; // Now optional - can be venue-wide or drink-specific
  days: number[]; // 1-7 (Monday-Sunday)
  start: string; // "14:00"
  end: string; // "16:00"
  timezone: string;
  created_at?: string;
  updated_at?: string;
}

export interface RedemptionCap {
  daily?: number;
  hourly?: number;
  monthly?: number;
  perUserDaily?: number;
  onExhaust: 'close' | 'show_alt_offer' | 'do_nothing';
  altOfferText?: string;
}

interface VenueNotifications {
  email: boolean;
  push: boolean;
  weekly_reports: boolean;
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
  notifications: VenueNotifications;

  // NEW fields
  business_hours?: BusinessHours;
  phone_number?: string;
  website_url?: string;
  images?: VenueImage[];
  coordinates?: Coordinates;            // for maps

  // Added for mobile/consumer compatibility
  image_url?: string;       // card/list image
  hero_image_url?: string;  // detail header image

  // Salt Edge merchant matching rules
  merchant_match_rules?: {
    names: string[];
    mcc: string[];
    ibans: string[];
    terminals: string[];
    contains: string[];
  };
  points_rules?: {
    per_huf: number;
    min_amount_huf: number;
  };
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

export type RewardCategory = 'drink' | 'food' | 'vip' | 'discount' | 'experience' | 'partner';

export interface Reward {
  id: string;
  name: string;
  points_required: number;
  valid_until: string;
  active: boolean;
  description?: string;
  venue_id: string;
  image_url?: string;
  
  // New unified fields
  category?: RewardCategory;
  is_global?: boolean;
  partner_id?: string;
  partner_name?: string;  // Enriched from partner venue
  priority?: number;
  terms_conditions?: string;
  max_redemptions?: number;
  current_redemptions?: number;
  created_at?: string;
  updated_at?: string;
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

// Notification Template
export interface NotificationTemplate {
  id: string;
  title_hu: string;
  title_en?: string;
  body_hu: string;
  body_en?: string;
  icon?: string;
  image_url?: string;
  deep_link?: string; // rork://venue/{id} | rork://map | rork://inbox
  
  // Targeting (JSON fields - csak UI state, backend majd feldolgozza)
  targeting: {
    geofence?: {
      enabled: boolean;
      radius_meters: number;
      venue_ids?: string[];
      min_dwell_minutes?: number;
    };
    favorites?: boolean;
    past_visitors?: {
      enabled: boolean;
      days: number;
    };
    city?: string[];
    language?: 'hu' | 'en';
    platform?: 'ios' | 'android' | 'all';
    user_segment?: 'new' | 'returning' | 'all';
  };
  
  // Timing
  send_mode: 'immediate' | 'scheduled' | 'event';
  scheduled_at?: string; // ISO timestamp
  event_type?: string; // free_drink_start_15m, points_earned, etc.
  
  // Anti-spam
  frequency_limit: {
    per_user_hours?: number; // 1 értesítés / X óra
    per_venue_minutes?: number;
    max_per_day?: number;
  };
  quiet_hours: {
    enabled: boolean;
    start?: string; // "22:00"
    end?: string;   // "08:00"
  };
  ttl_hours?: number; // értesítés lejárat
  
  // Metadata
  category: 'free_drink' | 'points' | 'reward' | 'venue_status' | 'promo';
  priority: 'critical' | 'high' | 'medium' | 'low';
  created_by: string; // user_id
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

// Notification Log (csak olvasásra - a backend tölti fel)
export interface NotificationLog {
  id: string;
  template_id: string;
  user_id: string;
  sent_at: string;
  status: 'queued' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'failed' | 'expired';
  platform: 'ios' | 'android' | 'web';
  error_message?: string;
  opened_at?: string;
  clicked_at?: string;
}

// Statistics (számított adatok)
export interface NotificationStats {
  template_id: string;
  sent_count: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  open_rate: number; // %
  click_rate: number; // %
}
