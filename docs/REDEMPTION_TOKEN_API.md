# Come Get It - Redemption Token API

Ez a dokumentáció a QR-token alapú italbeváltási rendszer API-jait írja le a Rork fejlesztők számára.

## Base URL

```
https://nrxfiblssxwzeziomlvc.supabase.co/functions/v1
```

---

## 1. Token Kérés (Issue)

Új egyszer használatos beváltási token generálása.

### Endpoint

```
POST /issue-redemption-token
```

### Headers

```
Content-Type: application/json
```

### Request Body

| Mező | Típus | Kötelező | Leírás |
|------|-------|----------|--------|
| `venue_id` | UUID | ✅ | A helyszín azonosítója |
| `drink_id` | UUID | ❌ | Specifikus ital azonosítója (opcionális, ha nincs megadva, az aktív ablakban definiált ital lesz) |
| `device_fingerprint` | string | ✅ | Egyedi eszközazonosító (rate limiting-hez) |

### Példa Request

```json
{
  "venue_id": "550e8400-e29b-41d4-a716-446655440000",
  "device_fingerprint": "fp_abc123xyz789"
}
```

### Sikeres Response (200)

```json
{
  "success": true,
  "token": "CGI-ABC123-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "token_prefix": "ABC123",
  "expires_at": "2026-01-14T12:05:00.000Z",
  "expires_in_seconds": 120,
  "drink": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Peroni",
    "image_url": "https://example.com/peroni.jpg",
    "category": "beer"
  },
  "venue": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Trendy Bar"
  }
}
```

### Hibakódok

| HTTP | Kód | Leírás |
|------|-----|--------|
| 400 | `NO_ACTIVE_WINDOW` | Nincs aktív ingyen ital időablak |
| 400 | - | Nincs beállított ingyen ital a helyszínen |
| 403 | `DAILY_CAP_REACHED` | Elérte a napi beváltási limitet |
| 403 | `HOURLY_CAP_REACHED` | Elérte az óránkénti beváltási limitet |
| 404 | - | A helyszín nem található |
| 429 | `RATE_LIMITED` | Túl gyakori kérés (5 percenként max 1 token) |

### Hiba Response Példa

```json
{
  "success": false,
  "error": "No active free drink window",
  "code": "NO_ACTIVE_WINDOW"
}
```

---

## 2. Token Beváltás (Consume)

Egy token felhasználása a POS rendszerben.

### Endpoint

```
POST /consume-redemption-token
```

### Headers

```
Content-Type: application/json
Authorization: Bearer <staff_jwt>
```

**Fontos:** Ez az endpoint Staff JWT tokent igényel! A beváltást csak bejelentkezett személyzet végezheti.

### Request Body

| Mező | Típus | Kötelező | Leírás |
|------|-------|----------|--------|
| `token` | string | ✅ | A teljes token string a QR kódból |

### Példa Request

```json
{
  "token": "CGI-ABC123-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

### Sikeres Response (200)

```json
{
  "success": true,
  "redemption": {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "drink_name": "Peroni",
    "drink_id": "550e8400-e29b-41d4-a716-446655440001",
    "drink_image_url": "https://example.com/peroni.jpg",
    "venue_name": "Trendy Bar",
    "venue_id": "550e8400-e29b-41d4-a716-446655440000",
    "token_prefix": "ABC123",
    "redeemed_at": "2026-01-14T12:03:30.000Z",
    "staff_id": "550e8400-e29b-41d4-a716-446655440003"
  }
}
```

### Hibakódok

| HTTP | Kód | Leírás |
|------|-----|--------|
| 400 | `INVALID_FORMAT` | Érvénytelen token formátum |
| 401 | - | Hiányzó vagy érvénytelen authorization header |
| 403 | `VENUE_UNAUTHORIZED` | A staff nem jogosult ehhez a helyszínhez |
| 404 | `NOT_FOUND` | A token nem található |
| 409 | `ALREADY_CONSUMED` | A token már fel lett használva |
| 410 | `EXPIRED` | A token lejárt |
| 410 | `INVALID_STATUS` | Érvénytelen token státusz (revoked) |

### Hiba Response Példák

```json
{
  "success": false,
  "error": "Token already consumed",
  "code": "ALREADY_CONSUMED",
  "consumed_at": "2026-01-14T12:01:00.000Z"
}
```

```json
{
  "success": false,
  "error": "Token has expired",
  "code": "EXPIRED"
}
```

---

## Token Formátum

A token formátuma:

```
CGI-{PREFIX}-{SECRET}
```

- `CGI-` - Fix prefix
- `{PREFIX}` - 6 karakter, nagybetűk és számok (megjelenítésre)
- `{SECRET}` - 32 karakter véletlenszerű string (biztonsághoz)

### Regex Validáció

```javascript
const TOKEN_REGEX = /^CGI-[A-Z0-9]{6}-[A-Za-z0-9]{32}$/;
```

---

## Biztonság

### Token Hash

A tokenek SHA-256 hash formában tárolódnak az adatbázisban. Az eredeti token soha nem kerül tárolásra.

```javascript
async function hashToken(token) {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
```

### Rate Limiting

- **Limit:** 1 token / eszköz / 5 perc
- A `device_fingerprint` alapján követjük a kéréseket
- A `token_rate_limits` tábla tárolja az előzményeket

### Lejárat

- A tokenek **2 percig** érvényesek a kiállítástól számítva
- Lejárat után `EXPIRED` státuszúvá válnak

### Venue Cap-ek

A `caps` tábla alapján limitálható:
- `daily` - Napi maximum beváltások
- `hourly` - Óránkénti maximum
- `monthly` - Havi maximum
- `per_user_daily` - Felhasználónkénti napi maximum

---

## Adatbázis Táblák

### `redemption_tokens`

| Mező | Típus | Leírás |
|------|-------|--------|
| `id` | UUID | Elsődleges kulcs |
| `token_hash` | text | SHA-256 hash |
| `token_prefix` | text | 6 karakteres prefix (megjelenítéshez) |
| `venue_id` | UUID | Helyszín |
| `drink_id` | UUID | Ital |
| `user_id` | UUID | Felhasználó (opcionális) |
| `device_fingerprint` | text | Eszközazonosító |
| `issued_at` | timestamp | Kiállítás ideje |
| `expires_at` | timestamp | Lejárat ideje |
| `consumed_at` | timestamp | Beváltás ideje |
| `consumed_by_staff_id` | UUID | Beváltó staff |
| `status` | enum | `issued`, `consumed`, `expired`, `revoked` |

### `redemptions`

| Mező | Típus | Leírás |
|------|-------|--------|
| `id` | UUID | Elsődleges kulcs |
| `venue_id` | UUID | Helyszín |
| `user_id` | UUID | Felhasználó |
| `drink` | text | Ital neve |
| `drink_id` | UUID | Ital ID |
| `value` | integer | Érték (0 ingyenes italnál) |
| `redeemed_at` | timestamp | Beváltás ideje |
| `token_id` | UUID | Token hivatkozás |
| `staff_id` | UUID | Beváltó staff |

---

## Példa Implementáció (Mobile App)

### Token Kérés

```javascript
async function requestFreeDrinkToken(venueId, deviceFingerprint) {
  const response = await fetch(
    'https://nrxfiblssxwzeziomlvc.supabase.co/functions/v1/issue-redemption-token',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        venue_id: venueId,
        device_fingerprint: deviceFingerprint,
      }),
    }
  );

  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error);
  }
  
  return {
    token: data.token,
    prefix: data.token_prefix,
    expiresAt: new Date(data.expires_at),
    drink: data.drink,
  };
}
```

### QR Kód Generálás

```javascript
import QRCode from 'qrcode';

async function generateQRCode(token) {
  const qrDataUrl = await QRCode.toDataURL(token, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 300,
  });
  return qrDataUrl;
}
```

### Lejárati Visszaszámlálás

```javascript
function TokenDisplay({ token, expiresAt }) {
  const [secondsLeft, setSecondsLeft] = useState(
    Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
      
      if (remaining === 0) {
        clearInterval(interval);
        // Token expired - prompt to get new one
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <div>
      <QRCode value={token} />
      <p>Lejár: {secondsLeft} másodperc múlva</p>
    </div>
  );
}
```

---

## Támogatás

Kérdések esetén: dev@comegetit.app
