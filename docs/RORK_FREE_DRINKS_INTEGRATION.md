# Rork Free Drinks Integration Guide

## Áttekintés

Ez a dokumentáció a Come Get It ingyenes ital rendszerének integrációját ismerteti a Rork mobilalkalmazáshoz.

---

## 1. Napok Mező Formátum (KRITIKUS!)

### Adatbázis Formátum
A `free_drink_windows` tábla `days` mezője **ISO 8601** formátumot használ:

| Érték | Nap |
|-------|-----|
| 1 | Hétfő (Monday) |
| 2 | Kedd (Tuesday) |
| 3 | Szerda (Wednesday) |
| 4 | Csütörtök (Thursday) |
| 5 | Péntek (Friday) |
| 6 | Szombat (Saturday) |
| 7 | Vasárnap (Sunday) |

### ⚠️ JavaScript Konverzió (FONTOS!)

A JavaScript `Date.getDay()` **KÜLÖNBÖZIK** az ISO formátumtól:

```javascript
// JavaScript getDay() visszatérési értékek:
// 0 = Vasárnap, 1 = Hétfő, 2 = Kedd, ..., 6 = Szombat

// Konverziós függvény JS → ISO
function getISODay(date) {
  const jsDay = date.getDay(); // 0-6 (0 = Vasárnap)
  return jsDay === 0 ? 7 : jsDay; // 1-7 (7 = Vasárnap)
}

// Példa használat
const today = new Date();
const isoDay = getISODay(today); // 1-7 formátumban

// Ellenőrzés, hogy az adott nap benne van-e a days tömbben
const isActiveDay = freeDrinkWindow.days.includes(isoDay);
```

---

## 2. Free Drink Windows Struktúra

### API Válasz Formátum
```typescript
interface FreeDrinkWindow {
  id: string;
  venue_id: string;
  drink_id: string | null;
  days: number[];        // ISO 1-7 formátum, pl. [1, 2, 3, 4, 5] = Hétfő-Péntek
  start_time: string;    // "HH:MM" formátum, pl. "10:00"
  end_time: string;      // "HH:MM" formátum, pl. "14:00"
  timezone: string;      // pl. "Europe/Budapest"
  created_at: string;
  updated_at: string;
}
```

### Példa Adatok
```json
{
  "id": "abc123",
  "venue_id": "venue-456",
  "drink_id": "drink-789",
  "days": [1, 2, 3, 4, 5],
  "start_time": "12:00",
  "end_time": "14:00",
  "timezone": "Europe/Budapest"
}
```
Ez azt jelenti: Hétfő-Péntek 12:00-14:00 között elérhető.

---

## 3. Elérhetőség Ellenőrzése

### getAvailabilityForDrink Implementáció

```typescript
function getAvailabilityForDrink(
  drinkId: string, 
  selectedDay: number, // ISO 1-7
  freeDrinkWindows: FreeDrinkWindow[]
): { available: boolean; timeSlot: string | null } {
  // Szűrjük az adott italhoz tartozó ablakokat
  const windowsForDrink = freeDrinkWindows.filter(
    w => w.drink_id === drinkId || w.drink_id === null
  );

  // Keressük az adott naphoz tartozó ablakot
  for (const window of windowsForDrink) {
    // ISO formátum ellenőrzés (1-7)
    if (window.days?.includes(selectedDay)) {
      return {
        available: true,
        timeSlot: `${window.start_time} - ${window.end_time}`
      };
    }
    
    // Legacy fallback: dayOfWeek (0-6 formátum, 0=Vasárnap)
    if (window.dayOfWeek !== undefined) {
      const legacyIsoDay = window.dayOfWeek === 0 ? 7 : window.dayOfWeek;
      if (legacyIsoDay === selectedDay) {
        return {
          available: true,
          timeSlot: `${window.start_time} - ${window.end_time}`
        };
      }
    }
  }

  return { available: false, timeSlot: null };
}
```

### Jelenlegi Nap Ellenőrzése

```typescript
function isWindowActiveNow(window: FreeDrinkWindow): boolean {
  const now = new Date();
  
  // 1. Nap ellenőrzés (ISO formátum)
  const jsDay = now.getDay();
  const isoDay = jsDay === 0 ? 7 : jsDay;
  
  if (!window.days.includes(isoDay)) {
    return false;
  }
  
  // 2. Idő ellenőrzés
  const [startHour, startMin] = window.start_time.split(':').map(Number);
  const [endHour, endMin] = window.end_time.split(':').map(Number);
  
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}
```

---

## 4. Napválasztó UI Implementáció

### Napok Tömbje
```typescript
const dayLabels = ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'];
// Index 0 = Hétfő (ISO 1), Index 6 = Vasárnap (ISO 7)

// Kiválasztott nap (alapértelmezés: mai nap)
const today = new Date();
const [selectedDay, setSelectedDay] = useState(() => {
  const jsDay = today.getDay();
  return jsDay === 0 ? 7 : jsDay; // ISO formátum
});
```

### Napválasztó Gomb Renderelés
```tsx
{dayLabels.map((label, index) => {
  const isoDay = index + 1; // 1-7 (H=1, V=7)
  const availability = getAvailabilityForDrink(drinkId, isoDay, freeDrinkWindows);
  const isSelected = selectedDay === isoDay;
  const isDisabled = !availability.available;

  return (
    <Pressable
      key={isoDay}
      onPress={() => !isDisabled && setSelectedDay(isoDay)}
      disabled={isDisabled}
      style={[
        styles.dayButton,
        isSelected && styles.dayButtonSelected,
        isDisabled && styles.dayButtonDisabled,
      ]}
    >
      <Text style={[
        styles.dayText,
        isSelected && styles.dayTextSelected,
        isDisabled && styles.dayTextDisabled,
      ]}>
        {label}
      </Text>
    </Pressable>
  );
})}

{/* Kiválasztott nap időablaka */}
{selectedDay && (
  <Text style={styles.timeSlot}>
    {getAvailabilityForDrink(drinkId, selectedDay, freeDrinkWindows).timeSlot || 'Nincs elérhető időablak'}
  </Text>
)}
```

---

## 5. QR Token Kérés (Redeem Flow)

### API Endpoint
```
POST https://nrxfiblssxwzeziomlvc.supabase.co/functions/v1/issue-redemption-token
```

### Request Body
```json
{
  "venue_id": "uuid-of-venue",
  "drink_id": "uuid-of-drink",       // Opcionális
  "device_fingerprint": "unique-id"  // Kötelező - eszköz azonosító
}
```

### Success Response (200)
```json
{
  "success": true,
  "token": "CGI-ABC123-randomsecret32chars",
  "token_prefix": "ABC123",
  "expires_at": "2025-01-15T14:32:00.000Z",
  "expires_in_seconds": 120,
  "drink": {
    "id": "drink-uuid",
    "name": "Espresso",
    "image_url": "https://...",
    "category": "Kávé"
  },
  "venue": {
    "id": "venue-uuid",
    "name": "Café Central"
  }
}
```

### Error Responses
| HTTP | Code | Leírás |
|------|------|--------|
| 400 | `NO_ACTIVE_WINDOW` | Nincs aktív ingyenes ital időablak |
| 403 | `DAILY_CAP_REACHED` | Napi limit elérve |
| 403 | `HOURLY_CAP_REACHED` | Óránkénti limit elérve |
| 429 | `RATE_LIMITED` | 5 percen belül már kért tokent |

### QR Kód Generálás
```typescript
// A token-t QR kóddá kell generálni
// Használj react-native-qrcode-svg vagy hasonló könyvtárat

import QRCode from 'react-native-qrcode-svg';

<QRCode
  value={tokenResponse.token}  // "CGI-ABC123-secret..."
  size={200}
/>
```

### 2 Perces Visszaszámlálás
```typescript
const [secondsLeft, setSecondsLeft] = useState(120);

useEffect(() => {
  if (secondsLeft <= 0) {
    // Token lejárt - töröld state-ből
    setToken(null);
    return;
  }
  
  const timer = setTimeout(() => {
    setSecondsLeft(prev => prev - 1);
  }, 1000);
  
  return () => clearTimeout(timer);
}, [secondsLeft]);

// Megjelenítés
<Text>{Math.floor(secondsLeft / 60)}:{(secondsLeft % 60).toString().padStart(2, '0')}</Text>
```

---

## 6. Hibakezelés

### Teljes Hibakezelő Logika
```typescript
async function requestToken(venueId: string, drinkId: string) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        venue_id: venueId,
        drink_id: drinkId,
        device_fingerprint: await getDeviceId(),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      switch (data.code) {
        case 'NO_ACTIVE_WINDOW':
          showAlert('Jelenleg nincs aktív ingyenes ital időablak.');
          break;
        case 'RATE_LIMITED':
          showAlert(`Várj ${Math.ceil(data.retry_after_seconds / 60)} percet az új token kéréséhez.`);
          break;
        case 'DAILY_CAP_REACHED':
          showAlert('A mai napi limit elfogyott. Próbáld holnap!');
          break;
        case 'HOURLY_CAP_REACHED':
          showAlert('Óránkénti limit elérve. Próbáld később!');
          break;
        default:
          showAlert(data.error || 'Ismeretlen hiba');
      }
      return null;
    }

    return data;
  } catch (error) {
    showAlert('Hálózati hiba. Ellenőrizd az internetkapcsolatot.');
    return null;
  }
}
```

---

## 7. Legacy Kompatibilitás

Ha régebbi venue-k még `dayOfWeek` (0-6) mezőt használnak:

```typescript
// Provider-ben normalizálás
function normalizeWindow(window: any): FreeDrinkWindow {
  // Ha nincs days, de van dayOfWeek, konvertáljuk
  if (!window.days && window.dayOfWeek !== undefined) {
    const isoDay = window.dayOfWeek === 0 ? 7 : window.dayOfWeek;
    return {
      ...window,
      days: [isoDay],
    };
  }
  return window;
}
```

---

## 8. Összefoglaló Checklist

- [ ] `days` mező ISO 1-7 formátumban (1=Hétfő, 7=Vasárnap)
- [ ] JavaScript `getDay()` → ISO konverzió: `jsDay === 0 ? 7 : jsDay`
- [ ] Napválasztó: mai nap legyen alapértelmezett
- [ ] Napválasztó: disabled stílus, ha nincs időablak
- [ ] Időablak megjelenítése a kiválasztott nap szerint
- [ ] QR token kérés az `issue-redemption-token` endpoint-tal
- [ ] 2 perces visszaszámláló + újragenerálás gomb
- [ ] Hibakezelés: NO_ACTIVE_WINDOW, RATE_LIMITED, CAP_REACHED
- [ ] Legacy fallback: `dayOfWeek` mező támogatása

---

## 9. Rork Prompt (Copy-Paste)

```
Téma: Ingyen ital időablakok és QR beváltás – mobilapp fejlesztési feladat

KRITIKUS JAVÍTÁS: A days mező ISO formátumot használ (1=Hétfő, 7=Vasárnap), 
NEM a JavaScript getDay() formátumot (0=Vasárnap, 6=Szombat)!

Feladatok:

1. NAPOK KONVERZIÓ JAVÍTÁSA
A JavaScript getDay() visszatérési értékét konvertálni kell ISO formátumra:
```javascript
const jsDay = new Date().getDay(); // 0-6
const isoDay = jsDay === 0 ? 7 : jsDay; // 1-7
```

2. FREDRINKWINDOWS KEZELÉSE
- A days mező most már number[] típusú, ISO 1-7 formátumban
- Ellenőrzés: `window.days.includes(isoDay)`
- Legacy fallback megtartása: `window.dayOfWeek` → konvertálás ISO-ra

3. NAPVÁLASZTÓ UI
- selectedDay alapértelmezés: mai nap ISO formátumban
- Pressable gombok minden napra
- disabled stílus és prop azoknál, ahol nincs időablak
- Kiválasztott naphoz tartozó időablak (start_time - end_time) megjelenítése

4. QR TOKEN KÉRÉS
Endpoint: https://nrxfiblssxwzeziomlvc.supabase.co/functions/v1/issue-redemption-token
Body: { venue_id, drink_id, device_fingerprint }
Válasz: { token, expires_at, expires_in_seconds, drink, venue }

- Token QR kóddá generálása (react-native-qrcode-svg)
- 2 perces visszaszámláló
- Lejáratkor token törlése state-ből + újragenerálás gomb

5. HIBAKEZELÉS
- NO_ACTIVE_WINDOW: "Nincs aktív időablak" üzenet
- RATE_LIMITED: visszaszámláló, mikor kérhet újra
- DAILY_CAP_REACHED / HOURLY_CAP_REACHED: megfelelő üzenet
- Network error: újrapróbálás gomb
```

---

## Kapcsolat

Ha kérdésed van, nézd meg a többi dokumentációt:
- `docs/REDEMPTION_TOKEN_API.md` - Token API részletes dokumentáció
- `docs/REST_ENDPOINTS.md` - Összes REST endpoint
- `docs/RORK_VENUE_LIST_API.md` - Venue lista API
