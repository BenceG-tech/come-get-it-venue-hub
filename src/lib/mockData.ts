
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
  venue_id: 'venue-1'
};

export const mockVenue: Venue = {
  id: 'venue-1',
  name: 'Trendy Bar & Lounge',
  address: '1234 Váci út, Budapest, 1052',
  tier: 'premium',
  api_key: 'cgi_live_abc123...',
  notifications: {
    email: true,
    push: false,
    weekly_reports: true
  }
};

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
    user_type: 'returning'
  },
  {
    id: 'red-2',
    date: '2024-08-23',
    time: '14:28',
    user_id: 'usr_d4e5f6',
    drink: 'Whiskey Sour',
    value: 950,
    location: 'VIP Section',
    user_type: 'new'
  },
  {
    id: 'red-3',
    date: '2024-08-23',
    time: '14:15',
    user_id: 'usr_g7h8i9',
    drink: 'Negroni',
    value: 1200,
    location: 'Terrace',
    user_type: 'returning'
  },
  {
    id: 'red-4',
    date: '2024-08-23',
    time: '13:45',
    user_id: 'usr_j1k2l3',
    drink: 'Moscow Mule',
    value: 750,
    location: 'Bar Counter',
    user_type: 'new'
  },
  {
    id: 'red-5',
    date: '2024-08-23',
    time: '13:22',
    user_id: 'usr_m4n5o6',
    drink: 'Old Fashioned',
    value: 1100,
    location: 'Lounge Area',
    user_type: 'returning'
  }
];

export const mockTransactions: Transaction[] = [
  {
    id: 'txn-1',
    timestamp: '2024-08-23T14:32:00Z',
    amount: 890,
    items: { mojito: 1, extra_lime: 1 },
    points: 89
  },
  {
    id: 'txn-2',
    timestamp: '2024-08-23T14:28:00Z',
    amount: 950,
    items: { whiskey_sour: 1, premium_whiskey: true },
    points: 95
  },
  {
    id: 'txn-3',
    timestamp: '2024-08-23T14:15:00Z',
    amount: 1200,
    items: { negroni: 1, artisan_gin: true },
    points: 120
  },
  {
    id: 'txn-4',
    timestamp: '2024-08-23T13:45:00Z',
    amount: 750,
    items: { moscow_mule: 1 },
    points: 75
  },
  {
    id: 'txn-5',
    timestamp: '2024-08-23T13:22:00Z',
    amount: 1100,
    items: { old_fashioned: 1, premium_bourbon: true },
    points: 110
  }
];

export const mockRewards: Reward[] = [
  {
    id: 'rew-1',
    name: 'Ingyenes Mojito',
    points_required: 500,
    valid_until: '2024-12-31',
    active: true,
    description: 'Egy ingyenes klasszikus mojito'
  },
  {
    id: 'rew-2',
    name: '20% kedvezmény prémium italokból',
    points_required: 300,
    valid_until: '2024-11-30',
    active: true,
    description: 'Húsz százalék kedvezmény minden prémium italból'
  },
  {
    id: 'rew-3',
    name: 'VIP asztal foglalás',
    points_required: 1000,
    valid_until: '2024-10-31',
    active: true,
    description: 'Ingyenes VIP asztal foglalás egy estére'
  },
  {
    id: 'rew-4',
    name: 'Tapas tál',
    points_required: 400,
    valid_until: '2024-09-30',
    active: false,
    description: 'Válogatott tapas tál két személyre'
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
