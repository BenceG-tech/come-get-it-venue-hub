# Rork User Points API Documentation

This document describes how to integrate user points functionality into the Rork mobile app.

## Base URL

```
https://nrxfiblssxwzeziomlvc.supabase.co/functions/v1
```

## Authentication

All endpoints require a valid Supabase JWT token in the Authorization header:

```
Authorization: Bearer <user_jwt_token>
```

---

## 1. Get User Points

Retrieve the user's current points balance and recent transactions.

### Request

```http
GET /get-user-points
Authorization: Bearer <user_jwt>
```

### Response

```json
{
  "balance": 1250,
  "lifetime_earned": 3500,
  "lifetime_spent": 2250,
  "total_spend": 125000,
  "last_transaction_at": "2026-01-15T14:30:00Z",
  "recent_transactions": [
    {
      "id": "uuid",
      "amount": 50,
      "type": "earn_purchase",
      "reference_type": "pos_transaction",
      "venue_id": "uuid",
      "venue_name": "FIRST Craft Beer & BBQ",
      "description": "50 pont - FIRST Craft Beer & BBQ",
      "created_at": "2026-01-15T14:30:00Z"
    },
    {
      "id": "uuid",
      "amount": -100,
      "type": "spend_reward",
      "reference_type": "reward",
      "venue_id": "uuid",
      "venue_name": "FIRST Craft Beer & BBQ",
      "description": "Beváltás: Ingyenes sör",
      "created_at": "2026-01-14T18:00:00Z"
    }
  ],
  "active_promotions_count": 3
}
```

### TypeScript Interface

```typescript
interface UserPoints {
  balance: number;
  lifetime_earned: number;
  lifetime_spent: number;
  total_spend: number;
  last_transaction_at: string | null;
  recent_transactions: PointTransaction[];
  active_promotions_count: number;
}

interface PointTransaction {
  id: string;
  amount: number;          // Positive = earned, Negative = spent
  type: string;            // 'earn_purchase', 'earn_visit', 'spend_reward', 'adjustment'
  reference_type?: string; // 'pos_transaction', 'reward', 'manual'
  venue_id?: string;
  venue_name?: string;
  description?: string;
  created_at: string;
}
```

---

## 2. Redeem Reward

Redeem a reward using points.

### Request

```http
POST /redeem-reward
Authorization: Bearer <user_jwt>
Content-Type: application/json

{
  "reward_id": "uuid",
  "venue_id": "uuid"  // Optional, defaults to reward's venue
}
```

### Success Response

```json
{
  "success": true,
  "redemption_code": "CGI-A1B2C3D4",
  "reward_name": "Ingyenes koktél",
  "points_spent": 500,
  "new_balance": 750,
  "message": "Reward successfully redeemed!"
}
```

### Error Responses

#### Insufficient Points (400)
```json
{
  "error": "INSUFFICIENT_POINTS",
  "message": "Not enough points. You have 250, but need 500",
  "current_balance": 250,
  "required_points": 500
}
```

#### Reward Not Found (404)
```json
{
  "error": "REWARD_NOT_FOUND",
  "message": "Reward not found"
}
```

#### Reward Expired (400)
```json
{
  "error": "REWARD_EXPIRED",
  "message": "This reward has expired"
}
```

#### Reward Limit Reached (400)
```json
{
  "error": "REWARD_LIMIT_REACHED",
  "message": "This reward has reached its maximum redemptions"
}
```

#### Reward Inactive (400)
```json
{
  "error": "REWARD_INACTIVE",
  "message": "This reward is no longer active"
}
```

---

## 3. UI Components

### Points Badge Component

Display the user's point balance prominently in the app.

```tsx
// components/UserPointsBadge.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface UserPointsBadgeProps {
  balance: number;
  compact?: boolean;
}

export function UserPointsBadge({ balance, compact }: UserPointsBadgeProps) {
  const formattedBalance = balance.toLocaleString('hu-HU');
  
  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <Text style={styles.compactIcon}>💰</Text>
        <Text style={styles.compactBalance}>{formattedBalance}</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Pontjaid</Text>
      <Text style={styles.balance}>{formattedBalance}</Text>
      <Text style={styles.unit}>pont</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  label: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
  },
  balance: {
    color: '#FFD700',
    fontSize: 32,
    fontWeight: 'bold',
  },
  unit: {
    color: '#888',
    fontSize: 14,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  compactIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  compactBalance: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
  },
});
```

### Points History Screen

```tsx
// screens/PointsHistoryScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { supabase } from '../lib/supabase';

export function PointsHistoryScreen() {
  const [points, setPoints] = useState<UserPoints | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPoints = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-user-points');
      if (error) throw error;
      setPoints(data);
    } catch (err) {
      console.error('Failed to fetch points:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPoints();
  }, []);

  const renderTransaction = ({ item }: { item: PointTransaction }) => {
    const isPositive = item.amount > 0;
    const formattedAmount = isPositive ? `+${item.amount}` : item.amount.toString();
    const date = new Date(item.created_at).toLocaleDateString('hu-HU', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <View style={styles.transactionItem}>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionDescription}>
            {item.description || item.type}
          </Text>
          {item.venue_name && (
            <Text style={styles.transactionVenue}>{item.venue_name}</Text>
          )}
          <Text style={styles.transactionDate}>{date}</Text>
        </View>
        <Text style={[
          styles.transactionAmount,
          isPositive ? styles.positiveAmount : styles.negativeAmount
        ]}>
          {formattedAmount}
        </Text>
      </View>
    );
  };

  if (!points) return null;

  return (
    <View style={styles.container}>
      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Egyenleg</Text>
          <Text style={styles.summaryValue}>{points.balance.toLocaleString()}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Összesen szerzett</Text>
          <Text style={[styles.summaryValue, styles.positive]}>
            {points.lifetime_earned.toLocaleString()}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Összesen elköltött</Text>
          <Text style={[styles.summaryValue, styles.negative]}>
            {points.lifetime_spent.toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Transaction List */}
      <Text style={styles.sectionTitle}>Legutóbbi tranzakciók</Text>
      <FlatList
        data={points.recent_transactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchPoints} />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>Még nincs tranzakciód</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    padding: 16,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  summaryLabel: {
    color: '#888',
    fontSize: 11,
    marginBottom: 4,
  },
  summaryValue: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
  },
  positive: {
    color: '#22c55e',
  },
  negative: {
    color: '#ef4444',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  transactionVenue: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  transactionDate: {
    color: '#666',
    fontSize: 11,
    marginTop: 4,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  positiveAmount: {
    color: '#22c55e',
  },
  negativeAmount: {
    color: '#ef4444',
  },
  emptyText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 40,
  },
});
```

### Reward Card with Points

Show whether user can afford the reward:

```tsx
// components/RewardCard.tsx
interface RewardCardProps {
  reward: Reward;
  userBalance: number;
  onRedeem: () => void;
}

export function RewardCard({ reward, userBalance, onRedeem }: RewardCardProps) {
  const canAfford = userBalance >= reward.points_required;
  const pointsNeeded = reward.points_required - userBalance;

  return (
    <View style={styles.card}>
      <Image source={{ uri: reward.image_url }} style={styles.image} />
      <View style={styles.content}>
        <Text style={styles.name}>{reward.name}</Text>
        <Text style={styles.description}>{reward.description}</Text>
        
        <View style={styles.pointsRow}>
          <Text style={styles.pointsRequired}>
            {reward.points_required.toLocaleString()} pont
          </Text>
          {canAfford ? (
            <Text style={styles.canAfford}>✓ Elérhető</Text>
          ) : (
            <Text style={styles.needMore}>
              Még {pointsNeeded.toLocaleString()} pont kell
            </Text>
          )}
        </View>
        
        <TouchableOpacity
          style={[styles.redeemButton, !canAfford && styles.disabledButton]}
          onPress={onRedeem}
          disabled={!canAfford}
        >
          <Text style={styles.redeemButtonText}>
            {canAfford ? 'Beváltás' : 'Nincs elég pont'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
```

---

## 4. Integration Example

```tsx
// hooks/useUserPoints.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useUserPoints() {
  const [points, setPoints] = useState<UserPoints | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPoints = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('get-user-points');
      if (error) throw error;
      setPoints(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  const redeemReward = useCallback(async (rewardId: string, venueId?: string) => {
    const { data, error } = await supabase.functions.invoke('redeem-reward', {
      body: { reward_id: rewardId, venue_id: venueId },
    });
    
    if (error) throw error;
    
    // Update local state with new balance
    if (data.success && points) {
      setPoints({
        ...points,
        balance: data.new_balance,
        lifetime_spent: points.lifetime_spent + data.points_spent,
      });
    }
    
    return data;
  }, [points]);

  useEffect(() => {
    fetchPoints();
  }, [fetchPoints]);

  return {
    points,
    loading,
    error,
    refetch: fetchPoints,
    redeemReward,
  };
}
```

---

## 5. Error Handling

```tsx
// utils/pointsErrors.ts
export function getPointsErrorMessage(errorCode: string): string {
  const messages: Record<string, string> = {
    INSUFFICIENT_POINTS: 'Nincs elég pontod ehhez a jutalomhoz',
    REWARD_NOT_FOUND: 'A jutalom nem található',
    REWARD_EXPIRED: 'Ez a jutalom már lejárt',
    REWARD_LIMIT_REACHED: 'Ez a jutalom elfogyott',
    REWARD_INACTIVE: 'Ez a jutalom már nem elérhető',
    POINTS_ERROR: 'Hiba történt a pontok levonásakor',
  };
  
  return messages[errorCode] || 'Ismeretlen hiba történt';
}

// Usage in component
try {
  const result = await redeemReward(rewardId, venueId);
  Alert.alert('Siker!', `Beváltási kódod: ${result.redemption_code}`);
} catch (error) {
  const message = getPointsErrorMessage(error.error);
  Alert.alert('Hiba', message);
}
```

---

## 6. Point Type Mappings

| Type | Hungarian | Description |
|------|-----------|-------------|
| `earn_purchase` | Vásárlás | Points earned from POS transactions |
| `earn_visit` | Látogatás | Points earned from venue visits |
| `spend_reward` | Beváltás | Points spent on rewards |
| `adjustment` | Korrekció | Manual adjustment by admin |
| `earn_referral` | Ajánlás | Points from referral program |
| `earn_bonus` | Bónusz | Promotional bonus points |
