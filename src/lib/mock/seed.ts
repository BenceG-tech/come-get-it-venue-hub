
import { Venue, Brand, BrandCampaign, Redemption, Transaction, Reward } from '@/lib/types';
import { dataProvider } from '@/lib/dataProvider/localStorageProvider';

const SEED_KEY = 'cgi_admin_v1:seeded';

export async function seedData() {
  // Check if already seeded
  if (localStorage.getItem(SEED_KEY)) {
    return;
  }

  console.log('Seeding mock data...');

  // Seed venues
  const venues: Venue[] = [
    {
      id: 'venue-1',
      name: 'Trendy Bar & Lounge',
      address: '1234 Váci út, Budapest, 1052',
      description: 'Trendy cocktail bar a belvárosban',
      tags: ['cocktail', 'downtown', 'premium'],
      plan: 'premium',
      is_paused: false,
      drinks: [
        {
          id: 'drink-1',
          drinkName: 'Mojito',
          category: 'cocktail',
          abv: 12,
          is_sponsored: false,
          is_free_drink: true
        },
        {
          id: 'drink-2',
          drinkName: 'Whiskey Sour',
          category: 'cocktail',
          abv: 15,
          is_sponsored: true,
          brand_id: 'brand-1',
          is_free_drink: true
        }
      ],
      freeDrinkWindows: [
        {
          id: 'window-1',
          days: [1, 2, 3, 4, 5], // Monday-Friday
          start: '14:00',
          end: '16:00',
          timezone: 'Europe/Budapest'
        },
        {
          id: 'window-2',
          days: [6, 7], // Weekend
          start: '12:00',
          end: '14:00',
          timezone: 'Europe/Budapest'
        }
      ],
      caps: {
        daily: 100,
        hourly: 25,
        perUserDaily: 2,
        onExhaust: 'show_alt_offer',
        altOfferText: '20% kedvezmény minden italból!'
      },
      api_key: 'cgi_live_abc123...',
      notifications: {
        email: true,
        push: false,
        weekly_reports: true
      }
    },
    {
      id: 'venue-2',
      name: 'Sports Pub',
      address: '5678 Kossuth Lajos utca, Budapest, 1053',
      description: 'Sport pub nagy képernyőkkel',
      tags: ['sports', 'pub', 'casual'],
      plan: 'standard',
      is_paused: false,
      drinks: [
        {
          id: 'drink-3',
          drinkName: 'Beer',
          category: 'beer',
          abv: 5,
          is_sponsored: false,
          is_free_drink: true
        }
      ],
      freeDrinkWindows: [
        {
          id: 'window-3',
          days: [1, 2, 3, 4, 5],
          start: '17:00',
          end: '19:00',
          timezone: 'Europe/Budapest'
        }
      ],
      caps: {
        daily: 50,
        onExhaust: 'close'
      },
      api_key: 'cgi_live_def456...',
      notifications: {
        email: true,
        push: true,
        weekly_reports: false
      }
    },
    {
      id: 'venue-3',
      name: 'Café Corner',
      address: '9101 Andrássy út, Budapest, 1061',
      description: 'Hangulatos kávézó',
      tags: ['coffee', 'casual', 'wifi'],
      plan: 'basic',
      is_paused: true,
      drinks: [
        {
          id: 'drink-4',
          drinkName: 'Cappuccino',
          category: 'coffee',
          abv: 0,
          is_sponsored: false,
          is_free_drink: true
        }
      ],
      freeDrinkWindows: [
        {
          id: 'window-4',
          days: [1, 2, 3, 4, 5],
          start: '08:00',
          end: '10:00',
          timezone: 'Europe/Budapest'
        }
      ],
      caps: {
        daily: 30,
        onExhaust: 'do_nothing'
      },
      api_key: 'cgi_live_ghi789...',
      notifications: {
        email: false,
        push: false,
        weekly_reports: false
      }
    }
  ];

  // Seed brands
  const brands: Brand[] = [
    {
      id: 'brand-1',
      name: 'Premium Whiskey Co.',
      logoUrl: 'https://example.com/logo1.png',
      contactName: 'John Smith',
      contactEmail: 'john@premiumwhiskey.com',
      notes: 'Premium whiskey brand partnership'
    },
    {
      id: 'brand-2',
      name: 'Craft Beer Brewery',
      logoUrl: 'https://example.com/logo2.png',
      contactName: 'Jane Doe',
      contactEmail: 'jane@craftbeer.com',
      notes: 'Local craft beer collaboration'
    }
  ];

  // Seed campaigns
  const campaigns: BrandCampaign[] = [
    {
      id: 'campaign-1',
      brand_id: 'brand-1',
      name: 'Whiskey Sour Weekend',
      productName: 'Premium Whiskey Sour',
      venue_ids: ['venue-1'],
      windows: [
        {
          id: 'campaign-window-1',
          days: [6, 7],
          start: '18:00',
          end: '20:00',
          timezone: 'Europe/Budapest'
        }
      ],
      pieceLimit: 200,
      active: true
    }
  ];

  // Seed some redemptions and transactions
  const redemptions: Redemption[] = [
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
    }
  ];

  const transactions: Transaction[] = [
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
    }
  ];

  const rewards: Reward[] = [
    {
      id: 'rew-1',
      name: 'Ingyenes Mojito',
      points_required: 500,
      valid_until: '2024-12-31',
      active: true,
      description: 'Egy ingyenes klasszikus mojito',
      venue_id: 'venue-1'
    }
  ];

  // Save to localStorage
  await dataProvider.upsertMany('venues', venues);
  await dataProvider.upsertMany('brands', brands);
  await dataProvider.upsertMany('campaigns', campaigns);
  await dataProvider.upsertMany('redemptions', redemptions);
  await dataProvider.upsertMany('transactions', transactions);
  await dataProvider.upsertMany('rewards', rewards);

  // Mark as seeded
  localStorage.setItem(SEED_KEY, 'true');
  console.log('Seeding completed!');
}
