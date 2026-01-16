# Rork User QR Identification API

This document describes how to implement QR code-based user identification for the Come Get It mobile app.

## Overview

Users can identify themselves at participating venues by showing a QR code from the app. The QR code contains a secure, time-limited token that the POS system scans to link purchases to the user's account.

## Base URL

```
https://nrxfiblssxwzeziomlvc.supabase.co/functions/v1
```

---

## 1. Generate User QR Token

Generate a new QR token for user identification.

### Request

```http
GET /generate-user-qr
Authorization: Bearer <user_jwt>
```

### Response

```json
{
  "token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2",
  "expires_at": "2026-01-16T12:35:00Z",
  "expires_in_seconds": 300
}
```

### Token Properties

- **Token Length**: 64 hexadecimal characters
- **TTL**: 5 minutes (300 seconds)
- **Single Use**: Token is invalidated after one use
- **Hashed Storage**: Only the hash is stored in the database for security

---

## 2. QR Code Format

The QR code should contain just the raw token string. The POS system will send this token to the validation endpoint.

### QR Data Structure

```
CGI:<token>
```

Example:
```
CGI:a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

---

## 3. UI Implementation

### QR Screen Component

```tsx
// screens/UserQRScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { supabase } from '../lib/supabase';

interface QRToken {
  token: string;
  expires_at: string;
  expires_in_seconds: number;
}

export function UserQRScreen() {
  const [qrToken, setQrToken] = useState<QRToken | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const generateToken = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase.functions.invoke('generate-user-qr');
      
      if (error) throw error;
      
      setQrToken(data);
      setTimeLeft(data.expires_in_seconds);
    } catch (err) {
      setError('Nem sikerült generálni a QR kódot');
      console.error('QR generation error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Generate token on mount
  useEffect(() => {
    generateToken();
  }, [generateToken]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Auto-regenerate when expired
          generateToken();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, generateToken]);

  // Format time remaining
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading && !qrToken) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingText}>QR kód generálása...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={generateToken}>
          <Text style={styles.retryButtonText}>Újra próbálom</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Azonosító QR kód</Text>
      <Text style={styles.subtitle}>
        Mutasd meg ezt a kódot a pincérnek a fizetésnél
      </Text>

      {/* QR Code */}
      <View style={styles.qrContainer}>
        {qrToken && (
          <QRCode
            value={`CGI:${qrToken.token}`}
            size={250}
            backgroundColor="#1a1a1a"
            color="#ffffff"
          />
        )}
      </View>

      {/* Timer */}
      <View style={styles.timerContainer}>
        <Text style={styles.timerLabel}>Érvényes még</Text>
        <Text style={[
          styles.timerValue,
          timeLeft < 60 && styles.timerWarning
        ]}>
          {formatTime(timeLeft)}
        </Text>
      </View>

      {/* Refresh Button */}
      <TouchableOpacity
        style={styles.refreshButton}
        onPress={generateToken}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#000" />
        ) : (
          <Text style={styles.refreshButtonText}>Új kód generálása</Text>
        )}
      </TouchableOpacity>

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instructionTitle}>Hogyan működik?</Text>
        <Text style={styles.instructionText}>
          1. Mutasd meg a QR kódot a fizetésnél{'\n'}
          2. A pincér beolvassa a kódot{'\n'}
          3. A pontok automatikusan jóváíródnak
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  qrContainer: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  timerLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
  },
  timerValue: {
    color: '#FFD700',
    fontSize: 32,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  timerWarning: {
    color: '#ef4444',
  },
  refreshButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  refreshButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  instructions: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    width: '100%',
  },
  instructionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  instructionText: {
    color: '#888',
    fontSize: 14,
    lineHeight: 22,
  },
  loadingText: {
    color: '#888',
    marginTop: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

### Header QR Button

Add a quick access button to the home screen header:

```tsx
// components/HeaderQRButton.tsx
import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { QrCode } from 'lucide-react-native';

export function HeaderQRButton() {
  const navigation = useNavigation();

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={() => navigation.navigate('UserQR')}
    >
      <QrCode size={24} color="#FFD700" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 8,
  },
});
```

### Navigation Setup

```tsx
// navigation/MainNavigator.tsx
import { UserQRScreen } from '../screens/UserQRScreen';

// In your stack navigator
<Stack.Screen
  name="UserQR"
  component={UserQRScreen}
  options={{
    title: 'Azonosítás',
    headerStyle: { backgroundColor: '#0a0a0a' },
    headerTintColor: '#fff',
  }}
/>
```

---

## 4. QR Token Hook

```tsx
// hooks/useQRToken.ts
import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface QRToken {
  token: string;
  expires_at: string;
  expires_in_seconds: number;
}

export function useQRToken() {
  const [qrToken, setQrToken] = useState<QRToken | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateToken = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: apiError } = await supabase.functions.invoke('generate-user-qr');

      if (apiError) throw apiError;

      setQrToken(data);
      return data;
    } catch (err) {
      const message = 'Nem sikerült generálni a QR kódot';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const isExpired = useCallback(() => {
    if (!qrToken) return true;
    return new Date(qrToken.expires_at) < new Date();
  }, [qrToken]);

  const getTimeRemaining = useCallback(() => {
    if (!qrToken) return 0;
    const remaining = Math.max(
      0,
      Math.floor((new Date(qrToken.expires_at).getTime() - Date.now()) / 1000)
    );
    return remaining;
  }, [qrToken]);

  return {
    qrToken,
    loading,
    error,
    generateToken,
    isExpired,
    getTimeRemaining,
  };
}
```

---

## 5. Security Considerations

### Token Security

1. **Short TTL**: Tokens expire after 5 minutes
2. **Single Use**: Each token can only be validated once
3. **Hashed Storage**: Only SHA-256 hashes are stored in the database
4. **No Sensitive Data**: Tokens don't contain any user information

### Best Practices

```tsx
// Auto-refresh before expiry
useEffect(() => {
  if (!qrToken) return;
  
  const timeToExpiry = getTimeRemaining();
  
  // Refresh 30 seconds before expiry
  if (timeToExpiry <= 30) {
    generateToken();
  }
}, [qrToken, getTimeRemaining, generateToken]);

// Handle app coming to foreground
useEffect(() => {
  const subscription = AppState.addEventListener('change', (state) => {
    if (state === 'active' && isExpired()) {
      generateToken();
    }
  });

  return () => subscription?.remove();
}, [isExpired, generateToken]);
```

---

## 6. Error States

| Error | Hungarian Message | Action |
|-------|-------------------|--------|
| Network error | Nincs internetkapcsolat | Retry button |
| Auth error | Kérlek, jelentkezz be újra | Navigate to login |
| Server error | Szerver hiba, próbáld újra | Retry button |
| Token expired | A kód lejárt | Auto-regenerate |

---

## 7. Accessibility

```tsx
<View
  accessible
  accessibilityLabel="QR kód a fizetéshez"
  accessibilityHint={`Érvényes még ${formatTime(timeLeft)}`}
>
  <QRCode value={`CGI:${qrToken.token}`} size={250} />
</View>

<TouchableOpacity
  accessible
  accessibilityRole="button"
  accessibilityLabel="Új QR kód generálása"
  onPress={generateToken}
>
  <Text>Új kód generálása</Text>
</TouchableOpacity>
```

---

## 8. Testing

### Mock Token for Development

```tsx
// __mocks__/qrToken.ts
export const mockQRToken = {
  token: 'test_token_12345678901234567890123456789012345678901234567890123456',
  expires_at: new Date(Date.now() + 300000).toISOString(),
  expires_in_seconds: 300,
};

// Use in development
if (__DEV__) {
  // Add test button to generate with mock data
}
```

### POS Simulator

For testing the full flow, you can call the validation endpoint manually:

```bash
curl -X POST https://nrxfiblssxwzeziomlvc.supabase.co/functions/v1/validate-user-qr \
  -H "Authorization: Bearer <service_role_key>" \
  -H "Content-Type: application/json" \
  -d '{"token": "<token_from_qr>"}'
```
