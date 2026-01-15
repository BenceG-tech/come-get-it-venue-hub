# Rork Rewards API Integration Guide

## Összefoglaló

Ez a dokumentáció leírja, hogyan kell a Come Get It jutalmak (rewards) rendszerét integrálni a Rork mobilappba.

## Base URL

```
https://nrxfiblssxwzeziomlvc.supabase.co/functions/v1
```

## Endpoints

### GET /get-rewards

Visszaadja egy venue jutalmait, beleértve a globális és partner jutalmakat.

**Request:**
```typescript
const response = await supabase.functions.invoke('get-rewards', {
  body: { venue_id: 'uuid-here' }
});
```

**Response:**
```typescript
{
  success: true,
  rewards: Reward[]
}
```

## Reward Objektum Struktúra

```typescript
interface Reward {
  id: string;
  venue_id: string;
  name: string;
  description?: string;
  points_required: number;
  valid_until: string;      // "2026-12-31" (ISO date)
  active: boolean;
  image_url?: string;
  
  // Kategória és típus
  category?: 'drink' | 'food' | 'vip' | 'discount' | 'experience' | 'partner';
  is_global?: boolean;      // true = minden venue-nál látszik
  partner_id?: string;      // Ha ki van töltve, ez a jutalom a partner venue-nak szól
  partner_name?: string;    // API által bővítve, ha partner jutalom
  
  // Rendezés és limitek
  priority?: number;        // Magasabb = előrébb jelenik meg
  terms_conditions?: string; // Feltételek/apróbetűs
  max_redemptions?: number;  // Max beváltási limit
  current_redemptions?: number; // Aktuális beváltások száma
}
```

## Kategória Értékek és Ikonok

| Kategória | Érték | Emoji/Ikon | Leírás |
|-----------|-------|------------|--------|
| Ital | `drink` | 🍹 | Ingyenes vagy kedvezményes ital |
| Étel | `food` | 🍽️ | Étel jutalom |
| VIP | `vip` | ⭐ | VIP élmény, asztalfoglalás |
| Kedvezmény | `discount` | 💰 | Százalékos kedvezmény |
| Élmény | `experience` | 🎉 | Különleges élmények |
| Partner | `partner` | 🤝 | Másik venue jutalma |

## Implementáció

### 1. Supabase Provider Bővítése

```typescript
// lib/supabaseProvider.ts

async function fetchRewards(venueId: string): Promise<Reward[]> {
  const { data, error } = await supabase.functions.invoke('get-rewards', {
    body: { venue_id: venueId }
  });
  
  if (error) {
    console.error('Failed to fetch rewards:', error);
    throw error;
  }
  
  return data.rewards || [];
}
```

### 2. React Native Reward Típus

```typescript
// types/reward.ts

export type RewardCategory = 'drink' | 'food' | 'vip' | 'discount' | 'experience' | 'partner';

export interface Reward {
  id: string;
  venue_id: string;
  name: string;
  description?: string;
  points_required: number;
  valid_until: string;
  active: boolean;
  image_url?: string;
  category?: RewardCategory;
  is_global?: boolean;
  partner_id?: string;
  partner_name?: string;
  priority?: number;
  terms_conditions?: string;
  max_redemptions?: number;
  current_redemptions?: number;
}
```

### 3. Kategória Ikonok

```typescript
// utils/rewardIcons.ts

export const categoryEmojis: Record<RewardCategory, string> = {
  drink: '🍹',
  food: '🍽️',
  vip: '⭐',
  discount: '💰',
  experience: '🎉',
  partner: '🤝'
};

export const categoryLabels: Record<RewardCategory, string> = {
  drink: 'Ital',
  food: 'Étel',
  vip: 'VIP',
  discount: 'Kedvezmény',
  experience: 'Élmény',
  partner: 'Partner'
};

export function getCategoryIcon(category?: RewardCategory): string {
  return category ? categoryEmojis[category] : '🎁';
}
```

### 4. Reward Kártya Komponens

```tsx
// components/RewardCard.tsx

import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Reward } from '../types/reward';
import { getCategoryIcon, categoryLabels } from '../utils/rewardIcons';

interface RewardCardProps {
  reward: Reward;
  userPoints: number;
  onRedeem: (reward: Reward) => void;
}

export function RewardCard({ reward, userPoints, onRedeem }: RewardCardProps) {
  const canRedeem = userPoints >= reward.points_required;
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('hu-HU');
  };

  return (
    <View style={styles.card}>
      {reward.image_url && (
        <Image source={{ uri: reward.image_url }} style={styles.image} />
      )}
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.category}>
            {getCategoryIcon(reward.category)} {categoryLabels[reward.category || 'drink']}
          </Text>
          {reward.is_global && (
            <Text style={styles.globalBadge}>🌍 Globális</Text>
          )}
        </View>
        
        <Text style={styles.name}>{reward.name}</Text>
        
        {reward.description && (
          <Text style={styles.description}>{reward.description}</Text>
        )}
        
        {reward.partner_name && (
          <Text style={styles.partner}>Partner: {reward.partner_name}</Text>
        )}
        
        <Text style={styles.points}>{reward.points_required} pont</Text>
        <Text style={styles.expiry}>Érvényes: {formatDate(reward.valid_until)}</Text>
        
        {reward.terms_conditions && (
          <Text style={styles.terms}>{reward.terms_conditions}</Text>
        )}
        
        <Pressable
          style={[styles.redeemButton, !canRedeem && styles.redeemButtonDisabled]}
          onPress={() => canRedeem && onRedeem(reward)}
          disabled={!canRedeem}
        >
          <Text style={styles.redeemButtonText}>
            {canRedeem ? 'Beváltás' : `Még ${reward.points_required - userPoints} pont kell`}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  category: {
    fontSize: 12,
    color: '#666',
  },
  globalBadge: {
    fontSize: 10,
    color: '#4a90d9',
    backgroundColor: '#e6f0fa',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  partner: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  points: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563eb',
    marginBottom: 4,
  },
  expiry: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
  },
  terms: {
    fontSize: 10,
    color: '#999',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  redeemButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  redeemButtonDisabled: {
    backgroundColor: '#ccc',
  },
  redeemButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
```

### 5. Rewards Lista a Venue Oldalon

```tsx
// Venue detail page rewards section

const [rewards, setRewards] = useState<Reward[]>([]);
const [loadingRewards, setLoadingRewards] = useState(true);

useEffect(() => {
  async function loadRewards() {
    if (!venue?.id) return;
    
    try {
      setLoadingRewards(true);
      const data = await fetchRewards(venue.id);
      setRewards(data);
    } catch (error) {
      console.error('Failed to load rewards:', error);
    } finally {
      setLoadingRewards(false);
    }
  }
  
  loadRewards();
}, [venue?.id]);

// Render
{rewards.length > 0 && (
  <View style={styles.rewardsSection}>
    <Text style={styles.sectionTitle}>Jutalmak</Text>
    {rewards.map(reward => (
      <RewardCard
        key={reward.id}
        reward={reward}
        userPoints={user?.points || 0}
        onRedeem={handleRedeemReward}
      />
    ))}
  </View>
)}

// Ha nincs jutalom
{rewards.length === 0 && !loadingRewards && (
  <Text style={styles.noRewards}>
    Jelenleg nincsenek elérhető jutalmak
  </Text>
)}
```

### 6. Kategória Szűrés (Opcionális)

```tsx
const [selectedCategory, setSelectedCategory] = useState<RewardCategory | 'all'>('all');

const filteredRewards = rewards.filter(reward => {
  if (selectedCategory === 'all') return true;
  return reward.category === selectedCategory;
});

// Category tabs
<ScrollView horizontal showsHorizontalScrollIndicator={false}>
  {['all', 'drink', 'food', 'vip', 'discount', 'experience', 'partner'].map(cat => (
    <Pressable
      key={cat}
      onPress={() => setSelectedCategory(cat as RewardCategory | 'all')}
      style={[
        styles.categoryTab,
        selectedCategory === cat && styles.categoryTabActive
      ]}
    >
      <Text>{cat === 'all' ? 'Összes' : categoryLabels[cat as RewardCategory]}</Text>
    </Pressable>
  ))}
</ScrollView>
```

## Beváltás Flow (Jövőbeli)

A beváltás egy külön endpoint lesz (`redeem-reward`), amely:
1. Ellenőrzi a felhasználó pontjait
2. Levonja a pontokat
3. Létrehoz egy `reward_redemptions` bejegyzést
4. Növeli a `current_redemptions` számlálót
5. Visszaad egy beváltási kódot/QR-t

Ez a funkció külön implementációra kerül.

## Hibakezelés

```typescript
try {
  const rewards = await fetchRewards(venueId);
  setRewards(rewards);
} catch (error) {
  // Hálózati hiba
  if (error.message?.includes('network')) {
    showToast('Nincs internetkapcsolat');
    return;
  }
  
  // API hiba
  showToast('Nem sikerült betölteni a jutalmakat');
  console.error('Rewards fetch error:', error);
}
```

## Fontos Megjegyzések

1. **Rendezés**: A jutalmak `priority` (csökkenő) majd `points_required` (növekvő) szerint vannak rendezve
2. **Lejárt jutalmak**: A backend automatikusan kiszűri a lejárt (`valid_until < today`) jutalmakat
3. **Max limit**: Ha `max_redemptions` el van érve, a jutalom nem jelenik meg
4. **Globális jutalmak**: `is_global = true` jutalmak minden venue-nál megjelennek
5. **Partner jutalmak**: Ahol `partner_id = venue_id`, ott a jutalom látszik (másik venue jutalma)

---

## Rork Prompt (Copy-Paste)

```
Téma: Jutalmak (Rewards) rendszer integrálása a Come Get It mobilappba

Feladatok:

1) Supabase Provider bővítése
   A lib/supabaseProvider.ts fájlban add hozzá:
   
   async function fetchRewards(venueId: string) {
     const { data, error } = await supabase.functions.invoke('get-rewards', {
       body: { venue_id: venueId }
     });
     if (error) throw error;
     return data.rewards || [];
   }

2) Reward típus definiálása (types/reward.ts)
   export interface Reward {
     id: string;
     venue_id: string;
     name: string;
     description?: string;
     points_required: number;
     valid_until: string;
     active: boolean;
     image_url?: string;
     category?: 'drink' | 'food' | 'vip' | 'discount' | 'experience' | 'partner';
     is_global?: boolean;
     partner_id?: string;
     partner_name?: string;
     priority?: number;
     terms_conditions?: string;
     max_redemptions?: number;
     current_redemptions?: number;
   }

3) Rewards szekció a venue oldalon
   - Listázd a venue jutalmait a fetchRewards(venueId) hívással
   - Rendezd priority szerint (DESC), majd points_required szerint (ASC)
   - Kategória alapján szűrhető legyen (tabokkal vagy filterrel)
   - Mutasd: kép, név, pontok, lejárat, kategória ikon

4) Reward kártya komponens
   - Kép (ha van)
   - Kategória emoji + label
   - Globális badge (ha is_global)
   - Partner név (ha partner jutalom)
   - Pontok és lejárat
   - Feltételek (terms_conditions)
   - Beváltás gomb (disabled ha nincs elég pont)

5) Kategória ikonok:
   drink: '🍹', food: '🍽️', vip: '⭐', 
   discount: '💰', experience: '🎉', partner: '🤝'

6) Üres állapot
   Ha nincs jutalom: "Jelenleg nincsenek elérhető jutalmak"

7) API Endpoint
   Base URL: https://nrxfiblssxwzeziomlvc.supabase.co/functions/v1
   POST /get-rewards
   Body: { venue_id: "uuid" }
   Response: { success: true, rewards: Reward[] }
```
