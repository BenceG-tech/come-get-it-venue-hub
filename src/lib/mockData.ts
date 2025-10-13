import { 
  KPIData, 
  TrendData, 
  DrinkData, 
  Redemption, 
  Transaction, 
  Reward, 
  AnalyticsData,
  Venue,
  User 
} from './types';

export const mockUser: User = {
  id: 'user-1',
  email: 'admin@venue.com',
  role: 'venue_owner',
  name: 'Admin User',
  venue_ids: ['venue-1']
};

export const mockVenue: Venue = {
  id: 'venue-1',
  name: 'Trendy Bar & Lounge',
  address: '1234 Váci út, Budapest, 1052',
  description: 'Trendy cocktail bar a belvárosban',
  tags: ['cocktail', 'downtown', 'premium'],
  plan: 'premium',
  is_paused: false,
  drinks: [],
  freeDrinkWindows: [],
  caps: {
    daily: 100,
    onExhaust: 'close'
  },
  api_key: 'cgi_live_abc123...',
  notifications: {
    email: true,
    push: false,
    weekly_reports: true
  },
  phone_number: '+36 1 234 5678',
  website_url: 'https://trendybar.hu',
  images: [
    { id: 'img-1', url: 'https://picsum.photos/800/400?1', isCover: true, label: 'Front' },
    { id: 'img-2', url: 'https://picsum.photos/800/400?2', label: 'Interior' },
    { id: 'img-3', url: 'https://picsum.photos/800/400?3', label: 'Bar Area' }
  ],
  coordinates: { lat: 47.4979, lng: 19.0402 },
  business_hours: {
    byDay: {
      1: { open: '12:00', close: '23:00' },
      2: { open: '12:00', close: '23:00' },
      3: { open: '12:00', close: '23:00' },
      4: { open: '12:00', close: '23:00' },
      5: { open: '12:00', close: '23:30' },
      6: { open: '12:00', close: '23:30' },
      7: { open: '12:00', close: '22:00' },
    },
    specialDates: []
  }
};

// New Admin-specific KPI data
export const mockAdminKPIData = {
  total_redemptions: 1240,
  total_revenue: 892000,
  total_users: 456,
  active_venues: 12,
  platform_conversion_rate: 23.4
};

// New Owner-specific KPI data
export const mockOwnerKPIData = {
  daily_redemptions: 127,
  daily_revenue: 89500,
  returning_rate: 68,
  avg_basket_value: 2340,
  upsell_rate: 32,
  clv: 8900
};

// New Staff-specific KPI data
export const mockStaffKPIData = {
  today_redemptions: 47,
  active_free_drink: true,
  cap_usage: 47,
  last_redemption_time: '14:32'
};

// Admin trend data (platform-wide)
export const mockAdminTrendData: TrendData[] = [
  { date: '2024-08-17', redemptions: 950, revenue: 673000, users: 760 },
  { date: '2024-08-18', redemptions: 1080, revenue: 782000, users: 820 },
  { date: '2024-08-19', redemptions: 1340, revenue: 948000, users: 950 },
  { date: '2024-08-20', redemptions: 890, revenue: 594000, users: 670 },
  { date: '2024-08-21', redemptions: 1560, revenue: 1123000, users: 1040 },
  { date: '2024-08-22', redemptions: 1430, revenue: 987000, users: 980 },
  { date: '2024-08-23', redemptions: 1270, revenue: 895000, users: 890 }
];

// Top venues data for admin
export const mockTopVenuesData = [
  { name: 'Trendy Bar', revenue: 89500, redemptions: 127 },
  { name: 'Rooftop Lounge', revenue: 78200, redemptions: 108 },
  { name: 'Downtown Pub', revenue: 67800, redemptions: 94 },
  { name: 'Sky Bar', revenue: 56900, redemptions: 82 },
  { name: 'Garden Terrace', revenue: 45600, redemptions: 67 }
];

// Today's redemptions for staff
export const mockTodayRedemptions: Redemption[] = [
  {
    id: 'red-today-1',
    date: '2024-08-23',
    time: '14:32',
    user_id: 'usr_a1b2c3',
    drink: 'Mojito',
    value: 890,
    location: 'Bar Counter',
    user_type: 'returning',
    venue_id: 'venue-1'
  },
  {
    id: 'red-today-2',
    date: '2024-08-23',
    time: '14:28',
    user_id: 'usr_d4e5f6',
    drink: 'Whiskey Sour',
    value: 950,
    location: 'VIP Section',
    user_type: 'new',
    venue_id: 'venue-1'
  },
  {
    id: 'red-today-3',
    date: '2024-08-23',
    time: '14:15',
    user_id: 'usr_g7h8i9',
    drink: 'Negroni',
    value: 1200,
    location: 'Terrace',
    user_type: 'returning',
    venue_id: 'venue-1'
  },
  {
    id: 'red-today-4',
    date: '2024-08-23',
    time: '13:45',
    user_id: 'usr_j1k2l3',
    drink: 'Moscow Mule',
    value: 750,
    location: 'Bar Counter',
    user_type: 'new',
    venue_id: 'venue-1'
  },
  {
    id: 'red-today-5',
    date: '2024-08-23',
    time: '13:22',
    user_id: 'usr_m4n5o6',
    drink: 'Old Fashioned',
    value: 1100,
    location: 'Lounge Area',
    user_type: 'returning',
    venue_id: 'venue-1'
  }
];

// Today's top drinks for staff
export const mockTodayTopDrinks: DrinkData[] = [
  { name: 'Mojito', count: 12, revenue: 10680 },
  { name: 'Whiskey Sour', count: 9, revenue: 8550 },
  { name: 'Negroni', count: 8, revenue: 9600 },
  { name: 'Moscow Mule', count: 7, revenue: 5250 },
  { name: 'Old Fashioned', count: 6, revenue: 6600 }
];

// Venue comparison data for admin
export const mockVenueComparisonData = [
  {
    id: 'venue-1',
    name: 'Trendy Bar & Lounge',
    plan: 'premium',
    monthly_revenue: 268500,
    redemptions: 3810,
    avg_basket: 2340,
    active_users: 456,
    is_active: true
  },
  {
    id: 'venue-2',
    name: 'Rooftop Lounge',
    plan: 'standard',
    monthly_revenue: 234600,
    redemptions: 3240,
    avg_basket: 2180,
    active_users: 389,
    is_active: true
  },
  {
    id: 'venue-3',
    name: 'Downtown Pub',
    plan: 'premium',
    monthly_revenue: 203400,
    redemptions: 2820,
    avg_basket: 1980,
    active_users: 324,
    is_active: true
  },
  {
    id: 'venue-4',
    name: 'Sky Bar',
    plan: 'basic',
    monthly_revenue: 170700,
    redemptions: 2460,
    avg_basket: 1750,
    active_users: 278,
    is_active: false
  },
  {
    id: 'venue-5',
    name: 'Garden Terrace',
    plan: 'standard',
    monthly_revenue: 136800,
    redemptions: 2010,
    avg_basket: 1650,
    active_users: 234,
    is_active: true
  }
];

// Comparison trend data for multiple venues
export const mockComparisonTrend = [
  { 
    date: '2024-08-17', 
    trendy_bar: 95, 
    rooftop_lounge: 87, 
    downtown_pub: 76 
  },
  { 
    date: '2024-08-18', 
    trendy_bar: 108, 
    rooftop_lounge: 92, 
    downtown_pub: 81 
  },
  { 
    date: '2024-08-19', 
    trendy_bar: 134, 
    rooftop_lounge: 118, 
    downtown_pub: 94 
  },
  { 
    date: '2024-08-20', 
    trendy_bar: 89, 
    rooftop_lounge: 76, 
    downtown_pub: 67 
  },
  { 
    date: '2024-08-21', 
    trendy_bar: 156, 
    rooftop_lounge: 139, 
    downtown_pub: 112 
  },
  { 
    date: '2024-08-22', 
    trendy_bar: 143, 
    rooftop_lounge: 128, 
    downtown_pub: 98 
  },
  { 
    date: '2024-08-23', 
    trendy_bar: 127, 
    rooftop_lounge: 112, 
    downtown_pub: 89 
  }
];

export const mockKPIData: KPIData = {
  daily_redemptions: 127,
  revenue_generated: 89500,
  active_users: 89,
  points_collected: 1420
};

export const mockTrendData: TrendData[] = [
  { date: '2024-08-17', redemptions: 95, revenue: 67300, users: 76 },
  { date: '2024-08-18', redemptions: 108, revenue: 78200, users: 82 },
  { date: '2024-08-19', redemptions: 134, revenue: 94800, users: 95 },
  { date: '2024-08-20', redemptions: 89, revenue: 59400, users: 67 },
  { date: '2024-08-21', redemptions: 156, revenue: 112300, users: 104 },
  { date: '2024-08-22', redemptions: 143, revenue: 98700, users: 98 },
  { date: '2024-08-23', redemptions: 127, revenue: 89500, users: 89 }
];

export const mockDrinkData: DrinkData[] = [
  { name: 'Mojito', count: 34, revenue: 25800 },
  { name: 'Whiskey Sour', count: 28, revenue: 22400 },
  { name: 'Negroni', count: 22, revenue: 19800 },
  { name: 'Moscow Mule', count: 19, revenue: 15200 },
  { name: 'Old Fashioned', count: 16, revenue: 14400 }
];

export const mockRedemptions: Redemption[] = [
  {
    id: 'red-1',
    date: '2024-08-23',
    time: '14:32',
    user_id: 'usr_a1b2c3',
    drink: 'Mojito',
    value: 890,
    location: 'Bar Counter',
    user_type: 'returning',
    venue_id: 'venue-1'
  },
  {
    id: 'red-2',
    date: '2024-08-23',
    time: '14:28',
    user_id: 'usr_d4e5f6',
    drink: 'Whiskey Sour',
    value: 950,
    location: 'VIP Section',
    user_type: 'new',
    venue_id: 'venue-1'
  },
  {
    id: 'red-3',
    date: '2024-08-23',
    time: '14:15',
    user_id: 'usr_g7h8i9',
    drink: 'Negroni',
    value: 1200,
    location: 'Terrace',
    user_type: 'returning',
    venue_id: 'venue-1'
  },
  {
    id: 'red-4',
    date: '2024-08-23',
    time: '13:45',
    user_id: 'usr_j1k2l3',
    drink: 'Moscow Mule',
    value: 750,
    location: 'Bar Counter',
    user_type: 'new',
    venue_id: 'venue-1'
  },
  {
    id: 'red-5',
    date: '2024-08-23',
    time: '13:22',
    user_id: 'usr_m4n5o6',
    drink: 'Old Fashioned',
    value: 1100,
    location: 'Lounge Area',
    user_type: 'returning',
    venue_id: 'venue-1'
  }
];

export const mockTransactions: Transaction[] = [
  {
    id: 'txn-1',
    timestamp: '2024-08-23T14:32:00Z',
    amount: 890,
    items: { mojito: 1, extra_lime: 1 },
    points: 89,
    venue_id: 'venue-1'
  },
  {
    id: 'txn-2',
    timestamp: '2024-08-23T14:28:00Z',
    amount: 950,
    items: { whiskey_sour: 1, premium_whiskey: true },
    points: 95,
    venue_id: 'venue-1'
  },
  {
    id: 'txn-3',
    timestamp: '2024-08-23T14:15:00Z',
    amount: 1200,
    items: { negroni: 1, artisan_gin: true },
    points: 120,
    venue_id: 'venue-1'
  },
  {
    id: 'txn-4',
    timestamp: '2024-08-23T13:45:00Z',
    amount: 750,
    items: { moscow_mule: 1 },
    points: 75,
    venue_id: 'venue-1'
  },
  {
    id: 'txn-5',
    timestamp: '2024-08-23T13:22:00Z',
    amount: 1100,
    items: { old_fashioned: 1, premium_bourbon: true },
    points: 110,
    venue_id: 'venue-1'
  }
];

export const mockRewards: Reward[] = [
  {
    id: 'rew-1',
    name: 'Ingyenes Mojito',
    points_required: 500,
    valid_until: '2024-12-31',
    active: true,
    description: 'Egy ingyenes klasszikus mojito',
    venue_id: 'venue-1'
  },
  {
    id: 'rew-2',
    name: '20% kedvezmény prémium italokból',
    points_required: 300,
    valid_until: '2024-11-30',
    active: true,
    description: 'Húsz százalék kedvezmény minden prémium italból',
    venue_id: 'venue-1'
  },
  {
    id: 'rew-3',
    name: 'VIP asztal foglalás',
    points_required: 1000,
    valid_until: '2024-10-31',
    active: true,
    description: 'Ingyenes VIP asztal foglalás egy estére',
    venue_id: 'venue-1'
  },
  {
    id: 'rew-4',
    name: 'Tapas tál',
    points_required: 400,
    valid_until: '2024-09-30',
    active: false,
    description: 'Válogatott tapas tál két személyre',
    venue_id: 'venue-1'
  }
];

export const mockAnalyticsData: AnalyticsData = {
  redemption_timeseries: {
    current_week: [
      { date: '2024-08-17', redemptions: 95, revenue: 67300, users: 76 },
      { date: '2024-08-18', redemptions: 108, revenue: 78200, users: 82 },
      { date: '2024-08-19', redemptions: 134, revenue: 94800, users: 95 },
      { date: '2024-08-20', redemptions: 89, revenue: 59400, users: 67 },
      { date: '2024-08-21', redemptions: 156, revenue: 112300, users: 104 },
      { date: '2024-08-22', redemptions: 143, revenue: 98700, users: 98 },
      { date: '2024-08-23', redemptions: 127, revenue: 89500, users: 89 }
    ],
    previous_week: [
      { date: '2024-08-10', redemptions: 87, revenue: 61200, users: 71 },
      { date: '2024-08-11', redemptions: 92, revenue: 65800, users: 78 },
      { date: '2024-08-12', redemptions: 118, revenue: 83600, users: 85 },
      { date: '2024-08-13', redemptions: 76, revenue: 52400, users: 62 },
      { date: '2024-08-14', redemptions: 139, revenue: 98500, users: 94 },
      { date: '2024-08-15', redemptions: 128, revenue: 89600, users: 91 },
      { date: '2024-08-16', redemptions: 112, revenue: 79800, users: 84 }
    ]
  },
  user_activity: {
    new_users: 34,
    returning_users: 55
  },
  hourly_heatmap: [
    // Monday
    [0, 0, 0, 0, 0, 0, 0, 0, 2, 5, 8, 12, 18, 22, 15, 8, 12, 25, 32, 28, 18, 8, 3, 1],
    // Tuesday
    [0, 0, 0, 0, 0, 0, 0, 1, 3, 7, 11, 16, 24, 28, 19, 12, 16, 28, 35, 31, 21, 12, 5, 2],
    // Wednesday
    [0, 0, 0, 0, 0, 0, 0, 1, 4, 8, 13, 19, 28, 34, 25, 16, 21, 34, 42, 38, 28, 16, 8, 3],
    // Thursday
    [0, 0, 0, 0, 0, 0, 0, 2, 5, 9, 15, 22, 32, 38, 29, 19, 25, 38, 45, 41, 32, 19, 9, 4],
    // Friday
    [0, 0, 0, 0, 0, 0, 0, 2, 6, 12, 18, 26, 38, 45, 35, 24, 32, 48, 58, 52, 38, 24, 12, 6],
    // Saturday
    [0, 0, 0, 0, 0, 0, 0, 1, 4, 9, 15, 23, 35, 42, 32, 22, 29, 45, 55, 49, 35, 22, 11, 5],
    // Sunday
    [0, 0, 0, 0, 0, 0, 0, 1, 3, 6, 10, 15, 22, 26, 19, 13, 18, 28, 34, 29, 21, 13, 6, 2]
  ]
};

// Helper functions for data manipulation
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('hu-HU', {
    style: 'currency',
    currency: 'HUF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// Mock notification templates
export const mockNotificationTemplates = [
  {
    id: '1',
    title_hu: 'Ingyen sör a közelben! 🍺',
    body_hu: 'A {venue_name} kínálja! Gyere be {start_time}-ig!',
    icon: '🍺',
    deep_link: 'rork://venue/{venue_id}',
    targeting: {
      geofence: { enabled: true, radius_meters: 500 },
      user_segment: 'all' as const,
      platform: 'all' as const
    },
    send_mode: 'event' as const,
    event_type: 'free_drink_start_15m',
    frequency_limit: { per_user_hours: 6, max_per_day: 2 },
    quiet_hours: { enabled: true, start: '22:00', end: '08:00' },
    category: 'free_drink' as const,
    priority: 'high' as const,
    created_by: 'admin',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_active: true
  },
  {
    id: '2',
    title_hu: 'Utolsó 30 perc! ⏰',
    body_hu: 'Siess, még {end_time}-ig igényelheted az ingyen {drink_name}-t!',
    icon: '⏰',
    deep_link: 'rork://venue/{venue_id}',
    targeting: {
      geofence: { enabled: true, radius_meters: 1000 },
      user_segment: 'all' as const,
      platform: 'all' as const
    },
    send_mode: 'event' as const,
    event_type: 'free_drink_last_30m',
    frequency_limit: { per_user_hours: 12 },
    quiet_hours: { enabled: true, start: '22:00', end: '08:00' },
    category: 'free_drink' as const,
    priority: 'medium' as const,
    created_by: 'admin',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_active: true
  },
  {
    id: '3',
    title_hu: 'Pontjaid jóváírva! 🎉',
    body_hu: 'Gratulálunk! Pontokat kaptál a látogatásodért!',
    icon: '🎉',
    deep_link: 'rork://rewards',
    targeting: { 
      user_segment: 'all' as const,
      platform: 'all' as const
    },
    send_mode: 'event' as const,
    event_type: 'points_earned',
    frequency_limit: { per_user_hours: 24 },
    quiet_hours: { enabled: true, start: '22:00', end: '08:00' },
    category: 'points' as const,
    priority: 'low' as const,
    created_by: 'admin',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_active: true
  }
];

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('hu-HU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const formatTime = (timeString: string): string => {
  return timeString;
};

export const formatDateTime = (timestamp: string): string => {
  return new Date(timestamp).toLocaleDateString('hu-HU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};
