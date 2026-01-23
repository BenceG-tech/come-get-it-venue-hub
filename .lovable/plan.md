
# Terv: Globális Napi Limit (1 ingyen ital / nap / felhasználó)

## A szabály tisztázása

**Helyes szabály:** Egy felhasználó egy napon **összesen csak 1** ingyen italt válthat be - bármelyik helyszínen. Ez nem "ital vadászat", hanem az ingyen ital becsábítja a vendéget, aki aztán költ a helyszínen.

**Jelenleg hibás:** A rendszer helyszínenkénti limitet ellenőriz (1/nap/venue), ami azt jelenti, hogy valaki akár 5 helyszínen is beválthatna ingyen italt ugyanazon a napon.

---

## Végrehajtandó változások

### 1. Edge Function: `issue-redemption-token` javítása

A jelenlegi kód (196-252. sor) helyszínen belüli limitet ellenőriz. Ezt **globális** ellenőrzésre kell cserélni:

**Jelenlegi logika (hibás):**
```
eq("venue_id", venue_id)  // Csak ezen a helyszínen
gte("redeemed_at", todayStart)
```

**Új logika (helyes):**
```
eq("user_id", userId)     // GLOBÁLIS - bármelyik helyszínen
gte("redeemed_at", todayStart)
// NEM szűrünk venue_id-ra!
```

Ha a felhasználó ma már bárhol beváltott ingyen italt, a válasz:
```json
{
  "success": false,
  "error": "Ma már beváltottál ingyen italt. Próbáld újra holnap!",
  "code": "USER_GLOBAL_DAILY_LIMIT"
}
```

---

### 2. Edge Function: `seed-test-data` javítása

A jelenlegi kód (144-178. sor) helyszín+nap kombinációkat követi. Ezt **globális napi limit**-re kell cserélni:

**Jelenlegi logika (hibás):**
```typescript
const usedVenueDays = new Set<string>(); // venue_id:date
```

**Új logika (helyes):**
```typescript
const usedDays = new Set<string>(); // Csak dátumok (YYYY-MM-DD)

// Ellenőrzés: max 1 beváltás naponta összesen
if (usedDays.has(dateKey)) {
  continue; // Skip - ezen a napon már van beváltás
}
usedDays.add(dateKey);
```

**Eredmény:** 30 napos időszakra maximum ~30 beváltás generálódik (naponta legfeljebb 1).

---

### 3. Régi hibás adatok törlése + újra seedelés

**3.1 Törlés (SQL migration vagy manuális):**
```sql
-- Összes teszt beváltás törlése
DELETE FROM redemptions WHERE metadata->>'test_data' = 'true';

-- Kapcsolódó rate limit bejegyzések törlése
DELETE FROM token_rate_limits;

-- Teszt activity logok és points transactions törlése
DELETE FROM user_activity_logs 
WHERE user_id = '46b15f9d-ed46-41b0-aa6a-5aa2334c407e' 
  AND metadata->>'test_data' = 'true';

DELETE FROM points_transactions 
WHERE user_id = '46b15f9d-ed46-41b0-aa6a-5aa2334c407e';
```

**3.2 Újra seedelés:** A javított `seed-test-data` function meghívása.

---

### 4. Időzóna: Europe/Budapest

A napi limit számításához a magyar időzónát használjuk:

```typescript
// Europe/Budapest időzóna kezelése
const budapestDate = new Date(now.toLocaleString('en-US', { 
  timeZone: 'Europe/Budapest' 
}));
const todayStart = new Date(
  budapestDate.getFullYear(), 
  budapestDate.getMonth(), 
  budapestDate.getDate()
);
```

---

### 5. UI frissítések

**5.1 QuickOverviewCard:** A "Ma: X beváltás" badge logikája:
- Ha `todayStats.redemptions > 1` → warning, de a globális szabállyal ez nem fordulhat elő
- Maximum érték: 1

**5.2 UserRevenueImpact:** A "Ma: X" badge figyelmeztetés:
- `visits_today > 1` → sárga figyelmeztető ikon + tooltip
- A javított seed után ez nem fordul elő

**5.3 TodayRedemptionStatus:** Frissítés a globális limitre:
- "Ma már beváltottál ingyen italt (bármelyik helyszínen)"
- "Holnap újra próbálhatod"

---

## Érintett fájlok

| Fájl | Változás |
|------|----------|
| `supabase/functions/issue-redemption-token/index.ts` | Globális napi limit ellenőrzés |
| `supabase/functions/seed-test-data/index.ts` | Max 1 beváltás/nap összesen |
| `src/components/user/TodayRedemptionStatus.tsx` | Szöveg frissítés |
| `src/components/user/QuickOverviewCard.tsx` | Badge logika ellenőrzés |
| SQL migration | Régi adatok törlése |

---

## Technikai részletek

### Globális limit ellenőrzés pszeudokód

```typescript
// 1. Budapest időzóna szerinti mai nap kezdete
const budapestNow = new Date(now.toLocaleString('en-US', { 
  timeZone: 'Europe/Budapest' 
}));
const todayStart = new Date(
  budapestNow.getFullYear(), 
  budapestNow.getMonth(), 
  budapestNow.getDate()
);

// 2. Globális ellenőrzés - bármelyik helyszínen beváltott-e ma
const { count: globalTodayCount } = await supabase
  .from("redemptions")
  .select("*", { count: "exact", head: true })
  .eq("user_id", userId)
  .eq("status", "success")
  .gte("redeemed_at", todayStart.toISOString());

if (globalTodayCount && globalTodayCount >= 1) {
  return new Response(JSON.stringify({ 
    success: false, 
    error: "Ma már beváltottál ingyen italt. Próbáld újra holnap!",
    code: "USER_GLOBAL_DAILY_LIMIT",
    next_available: tomorrow.toISOString()
  }), { status: 403 });
}
```

### Seed data logika

```typescript
const usedDays = new Set<string>(); // Globális napi tracking

while (redemptionsToInsert.length < targetRedemptions && attempts < maxAttempts) {
  const venue = weightedRandomVenue();
  const redeemDate = generateRandomDateWithHour(daysAgo);
  const dateKey = getDateKey(redeemDate); // "2026-01-15"
  
  // GLOBÁLIS LIMIT: max 1 beváltás naponta (összesen)
  if (usedDays.has(dateKey)) {
    continue; // Skip - ezen a napon már van beváltás
  }
  
  usedDays.add(dateKey);
  redemptionsToInsert.push({ ... });
}
```

---

## Várható eredmény

1. **Valós működés:** Felhasználó naponta max 1 ingyen italt válthat be
2. **Tesztadatok:** 30 napos időszakra ~25-30 beváltás (random napokra)
3. **UI:** "Ma: 1 beváltás" maximum, nem 49
4. **Metrikák:** Reális ROI és LTV számítások
