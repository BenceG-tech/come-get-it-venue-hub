# Rork Promotions API Documentation

This document describes how to display and interact with promotions in the Come Get It mobile app.

## Overview

Promotions are special offers that give users bonus points or discounts. They can be:
- **Category-based**: Extra points for specific drink/food categories (e.g., "Double points on beer this weekend")
- **Brand-sponsored**: Bonuses for purchasing specific brand products (e.g., "Jagermeister +50 bonus points")
- **Time-based**: Happy hour multipliers (e.g., "2x points 4-7pm")
- **Spending tiers**: Bonuses for reaching spend thresholds (e.g., "+100 points when you spend 10,000 Ft")
- **Combo deals**: Bonuses for purchasing combinations (e.g., "Order food + drink = +25 points")

## Base URL

```
https://nrxfiblssxwzeziomlvc.supabase.co/functions/v1
```

---

## 1. Get Active Promotions

Retrieve all currently active promotions.

### Request

```http
GET /get-promotions
Authorization: Bearer <user_jwt>
```

### Response

```json
{
  "promotions": [
    {
      "id": "uuid",
      "name": "Sör Hétvége",
      "description": "Dupla pont minden sörre hétvégén!",
      "rule_type": "category_multiplier",
      "rule_config": {
        "category": "beer",
        "multiplier": 2
      },
      "starts_at": "2026-01-18T00:00:00Z",
      "ends_at": "2026-01-19T23:59:59Z",
      "active_days": [6, 7],
      "active_hours": {
        "start": "00:00",
        "end": "23:59"
      },
      "sponsor": {
        "id": "uuid",
        "name": "Heineken",
        "logo_url": "https://..."
      },
      "venues": null
    },
    {
      "id": "uuid",
      "name": "Jagermeister Akció",
      "description": "Minden Jagermeister italra +50 bónusz pont!",
      "rule_type": "brand_bonus",
      "rule_config": {
        "brand_keywords": ["jagermeister", "jäger"],
        "bonus_points": 50
      },
      "starts_at": "2026-01-01T00:00:00Z",
      "ends_at": "2026-01-31T23:59:59Z",
      "sponsor": {
        "id": "uuid",
        "name": "Jagermeister",
        "logo_url": "https://..."
      },
      "venues": ["uuid1", "uuid2"]
    }
  ]
}
```

### TypeScript Interfaces

```typescript
interface Promotion {
  id: string;
  name: string;
  description?: string;
  rule_type: PromotionRuleType;
  rule_config: RuleConfig;
  starts_at: string;
  ends_at: string;
  active_days: number[];  // 1=Monday, 7=Sunday
  active_hours: {
    start: string;  // "HH:MM"
    end: string;    // "HH:MM"
  };
  sponsor?: {
    id: string;
    name: string;
    logo_url?: string;
  };
  venues?: string[];  // null = global, array = specific venues
}

type PromotionRuleType = 
  | 'category_multiplier'
  | 'brand_bonus'
  | 'time_bonus'
  | 'spending_tier'
  | 'combo_bonus'
  | 'first_purchase';

interface CategoryMultiplierConfig {
  category: string;
  multiplier: number;
}

interface BrandBonusConfig {
  brand_keywords: string[];
  bonus_points: number;
  discount_percent?: number;
  first_free?: boolean;
}

interface TimeBonusConfig {
  multiplier: number;
}

interface SpendingTierConfig {
  min_amount: number;
  bonus_points: number;
}

interface ComboBonusConfig {
  required_categories: string[];
  bonus_points: number;
}

type RuleConfig = 
  | CategoryMultiplierConfig
  | BrandBonusConfig
  | TimeBonusConfig
  | SpendingTierConfig
  | ComboBonusConfig;
```

---

## 2. UI Components

### Promotion Card

```tsx
// components/PromotionCard.tsx
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

interface PromotionCardProps {
  promotion: Promotion;
}

export function PromotionCard({ promotion }: PromotionCardProps) {
  const { name, description, rule_type, rule_config, sponsor, ends_at } = promotion;
  
  // Format end date
  const endDate = new Date(ends_at);
  const daysLeft = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  
  // Get promotion badge text
  const getBadgeText = () => {
    switch (rule_type) {
      case 'category_multiplier':
        return `${(rule_config as CategoryMultiplierConfig).multiplier}x PONT`;
      case 'brand_bonus':
        return `+${(rule_config as BrandBonusConfig).bonus_points} PONT`;
      case 'time_bonus':
        return `${(rule_config as TimeBonusConfig).multiplier}x PONT`;
      case 'spending_tier':
        return `+${(rule_config as SpendingTierConfig).bonus_points} PONT`;
      case 'combo_bonus':
        return `+${(rule_config as ComboBonusConfig).bonus_points} PONT`;
      default:
        return 'BÓNUSZ';
    }
  };

  // Get promotion icon
  const getIcon = () => {
    switch (rule_type) {
      case 'category_multiplier':
        return '🍺';
      case 'brand_bonus':
        return '🏷️';
      case 'time_bonus':
        return '⏰';
      case 'spending_tier':
        return '💰';
      case 'combo_bonus':
        return '🎁';
      default:
        return '✨';
    }
  };

  return (
    <View style={styles.card}>
      {/* Sponsor Logo */}
      {sponsor?.logo_url && (
        <Image 
          source={{ uri: sponsor.logo_url }} 
          style={styles.sponsorLogo}
          resizeMode="contain"
        />
      )}
      
      {/* Badge */}
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{getBadgeText()}</Text>
      </View>
      
      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.icon}>{getIcon()}</Text>
        <Text style={styles.name}>{name}</Text>
        {description && (
          <Text style={styles.description}>{description}</Text>
        )}
        
        {/* Time remaining */}
        <View style={styles.timeContainer}>
          {daysLeft <= 3 ? (
            <Text style={styles.urgentTime}>
              Még {daysLeft} nap!
            </Text>
          ) : (
            <Text style={styles.timeLeft}>
              {endDate.toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' })}-ig
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  sponsorLogo: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    opacity: 0.8,
  },
  badge: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomRightRadius: 12,
  },
  badgeText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    marginTop: 24,
  },
  icon: {
    fontSize: 32,
    marginBottom: 8,
  },
  name: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    color: '#888',
    fontSize: 14,
    lineHeight: 20,
  },
  timeContainer: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeLeft: {
    color: '#666',
    fontSize: 12,
  },
  urgentTime: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
  },
});
```

### Active Hours Badge

```tsx
// components/ActiveHoursBadge.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ActiveHoursBadgeProps {
  activeHours: { start: string; end: string };
  activeDays: number[];
}

const DAY_NAMES = ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'];

export function ActiveHoursBadge({ activeHours, activeDays }: ActiveHoursBadgeProps) {
  const isAllDay = activeHours.start === '00:00' && activeHours.end === '23:59';
  const isAllWeek = activeDays.length === 7;

  // Check if currently active
  const now = new Date();
  const currentDay = now.getDay() === 0 ? 7 : now.getDay(); // Convert Sunday from 0 to 7
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  const isDayActive = activeDays.includes(currentDay);
  const isTimeActive = currentTime >= activeHours.start && currentTime <= activeHours.end;
  const isCurrentlyActive = isDayActive && isTimeActive;

  return (
    <View style={styles.container}>
      {/* Active indicator */}
      {isCurrentlyActive && (
        <View style={styles.activeDot} />
      )}
      
      {/* Days */}
      <View style={styles.daysContainer}>
        {[1, 2, 3, 4, 5, 6, 7].map((day) => (
          <Text
            key={day}
            style={[
              styles.dayText,
              activeDays.includes(day) && styles.activeDayText,
            ]}
          >
            {DAY_NAMES[day - 1]}
          </Text>
        ))}
      </View>
      
      {/* Hours */}
      {!isAllDay && (
        <Text style={styles.hoursText}>
          {activeHours.start} - {activeHours.end}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
    marginRight: 8,
  },
  daysContainer: {
    flexDirection: 'row',
    marginRight: 8,
  },
  dayText: {
    color: '#444',
    fontSize: 11,
    marginRight: 4,
  },
  activeDayText: {
    color: '#FFD700',
    fontWeight: '600',
  },
  hoursText: {
    color: '#888',
    fontSize: 12,
  },
});
```

### Promotions List Screen

```tsx
// screens/PromotionsScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { PromotionCard } from '../components/PromotionCard';
import { supabase } from '../lib/supabase';

export function PromotionsScreen() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPromotions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('get-promotions');
      if (error) throw error;
      setPromotions(data.promotions || []);
    } catch (err) {
      console.error('Failed to fetch promotions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromotions();
  }, []);

  // Group promotions by type
  const groupedPromotions = promotions.reduce((acc, promo) => {
    const type = promo.rule_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(promo);
    return acc;
  }, {} as Record<string, Promotion[]>);

  const getTypeTitle = (type: string): string => {
    const titles: Record<string, string> = {
      category_multiplier: '🍺 Kategória bónuszok',
      brand_bonus: '🏷️ Márka promóciók',
      time_bonus: '⏰ Happy Hour',
      spending_tier: '💰 Költési bónuszok',
      combo_bonus: '🎁 Kombinált ajánlatok',
    };
    return titles[type] || 'Promóciók';
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={Object.entries(groupedPromotions)}
        keyExtractor={([type]) => type}
        renderItem={({ item: [type, promos] }) => (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{getTypeTitle(type)}</Text>
            {promos.map((promo) => (
              <PromotionCard key={promo.id} promotion={promo} />
            ))}
          </View>
        )}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={fetchPromotions}
            tintColor="#FFD700"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>
              Jelenleg nincs aktív promóció
            </Text>
            <Text style={styles.emptySubtext}>
              Nézz vissza később!
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  listContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  emptySubtext: {
    color: '#888',
    fontSize: 14,
    marginTop: 4,
  },
});
```

---

## 3. Venue-Specific Promotions

When showing venue details, filter promotions for that venue:

```tsx
// In VenueDetailScreen
const venuePromotions = promotions.filter(
  (p) => p.venues === null || p.venues.includes(venueId)
);

{venuePromotions.length > 0 && (
  <View style={styles.promotionsSection}>
    <Text style={styles.sectionTitle}>Aktív promóciók</Text>
    {venuePromotions.map((promo) => (
      <PromotionCard key={promo.id} promotion={promo} compact />
    ))}
  </View>
)}
```

---

## 4. Transaction Receipt with Promotions

After a purchase, show applied promotions:

```tsx
// components/TransactionReceipt.tsx
interface TransactionReceiptProps {
  transaction: {
    total_amount: number;
    base_points: number;
    bonus_points: number;
    total_points: number;
    applied_promotions: Array<{
      name: string;
      bonus_points: number;
      type: string;
    }>;
  };
}

export function TransactionReceipt({ transaction }: TransactionReceiptProps) {
  return (
    <View style={styles.receipt}>
      <Text style={styles.totalAmount}>
        {transaction.total_amount.toLocaleString()} Ft
      </Text>
      
      <View style={styles.pointsBreakdown}>
        <View style={styles.pointsRow}>
          <Text style={styles.pointsLabel}>Alap pontok:</Text>
          <Text style={styles.pointsValue}>+{transaction.base_points}</Text>
        </View>
        
        {transaction.applied_promotions.map((promo, index) => (
          <View key={index} style={styles.pointsRow}>
            <Text style={styles.promoLabel}>
              ⭐ {promo.name}:
            </Text>
            <Text style={styles.bonusValue}>+{promo.bonus_points}</Text>
          </View>
        ))}
        
        <View style={styles.divider} />
        
        <View style={styles.pointsRow}>
          <Text style={styles.totalLabel}>Összesen:</Text>
          <Text style={styles.totalValue}>+{transaction.total_points} pont</Text>
        </View>
      </View>
    </View>
  );
}
```

---

## 5. Promotion Notifications

Show push notification when user could benefit from a promotion:

```tsx
// utils/promotionNotifications.ts
export function checkPromotionNotifications(
  promotions: Promotion[],
  userLocation?: { venueId: string }
) {
  const now = new Date();
  const currentDay = now.getDay() === 0 ? 7 : now.getDay();
  const currentHour = now.getHours();
  
  // Check for promotions starting soon
  const startingSoon = promotions.filter((p) => {
    const startsAt = new Date(p.starts_at);
    const hoursUntilStart = (startsAt.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilStart > 0 && hoursUntilStart <= 24;
  });

  // Check for happy hour starting
  const happyHourStarting = promotions.filter((p) => {
    if (p.rule_type !== 'time_bonus') return false;
    if (!p.active_days.includes(currentDay)) return false;
    
    const startHour = parseInt(p.active_hours.start.split(':')[0], 10);
    return startHour === currentHour + 1;
  });

  return {
    startingSoon,
    happyHourStarting,
  };
}
```

---

## 6. Category Icons Mapping

```tsx
// utils/categoryIcons.ts
export const CATEGORY_ICONS: Record<string, string> = {
  beer: '🍺',
  wine: '🍷',
  cocktail: '🍹',
  spirits: '🥃',
  soft_drink: '🥤',
  coffee: '☕',
  food: '🍔',
  snacks: '🍿',
  dessert: '🍰',
};

export function getCategoryIcon(category: string): string {
  return CATEGORY_ICONS[category.toLowerCase()] || '🏷️';
}
```

---

## 7. Rule Type Explanations

Use these descriptions to explain promotions to users:

```typescript
export const RULE_TYPE_EXPLANATIONS: Record<string, string> = {
  category_multiplier: 'Szorzó a megadott kategóriájú termékekre',
  brand_bonus: 'Extra pontok a megadott márka termékeiért',
  time_bonus: 'Időszakos pont szorzó',
  spending_tier: 'Bónusz pontok egy minimum költés felett',
  combo_bonus: 'Bónusz kombinált vásárlásért',
  first_purchase: 'Bónusz az első vásárlásért',
};
```
