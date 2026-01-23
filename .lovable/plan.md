
# Terv: Beváltások UX Overhaul & Kapcsolódó Navigáció Rendszer

## Probléma Összefoglaló

Az áttekintés után azonosított fő hiányosságok:

### 1. Beváltások oldalon (Redemptions.tsx)
- **Nincs látható felhasználó név** - csak csonkolt user_id látszik
- **Nincs kattintható navigáció** a felhasználó profiljára
- **Nincs helyszín link** - nem lehet rákattintani a venue-ra
- **Nincs tooltip** a táblázat fejléceken
- **Nincs kontextus** (hányadik látogatás, ROI, stb.)

### 2. Command Center Real-time Feed
- Felhasználó nevek látszanak, de **nem kattinthatóak**
- Helyszínek csak szövegként jelennek meg
- Nincs tooltip magyarázat a "PUSH READY" badge-hez

### 3. Staff Dashboard - Mai beváltások feed
- **Nincs felhasználó információ egyáltalán** - csak az ital és érték látszik
- Nem lehet rákattintani semmire

### 4. LoyaltyAlertsPanel
- Van felhasználó link (jó!), de **nincs venue link**
- Hiányzik tooltip a mérföldkő típusokhoz

### 5. UserDetail - Beváltások tab
- Nincs **venue link** a beváltásoknál
- Nincs felhasználó profil link (értelmetlen itt, de más kontextusban fontos)

### 6. Hiányzó Tooltipek
Új komponensek tooltip hiánnyal:
- `UserVenueAffinity` - venue kártyák
- `EnhancedRedemptionCard` - kontextus badge-ek
- `LoyaltyAlertsPanel` - mérföldkő típusok
- `CommandCenter` - KPI kártyák, alertek
- `UserJourneyTimeline` - milestone-ok

---

## Megoldás: Unified Entity Link Rendszer

### 1. Új Komponens: EntityLink

Univerzális kattintható link komponens entitásokhoz:

```typescript
// Használat példák:
<UserLink userId="xxx" userName="Kiss Péter" />
// Megjelenés: "Kiss Péter" kék szín, kattintható, hover effekt

<VenueLink venueId="yyy" venueName="Vinozza" />
// Megjelenés: "Vinozza" + MapPin ikon, kattintható

<DrinkLink drinkId="zzz" drinkName="Peroni" />
// Megjelenés: "Peroni" + Wine ikon, kattintható (opcionális)
```

### 2. Beváltások oldal (Redemptions.tsx) átdolgozás

**Jelenlegi állapot:**
```
Dátum | Helyszín | Ital | Felhasználó | Érték | Státusz | Műveletek
2024.01.15 | Vinozza | Peroni | 8d7f3a2b... | 1.500 Ft | Sikeres | [👁] [🚫]
```

**Új állapot:**
```
Dátum | Felhasználó | Helyszín | Ital | Kontextus | Érték | Státusz | Műveletek
2024.01.15 | 👤 Kiss Péter → | 📍 Vinozza → | 🍺 Peroni | [3. e héten] [12. összesen] | 1.500 Ft | ✅ Sikeres | [👁] [🚫]
```

**Változások:**
1. Felhasználó név lekérése (profiles tábla join)
2. Kattintható UserLink (navigál `/users/{id}`-re)
3. Kattintható VenueLink (navigál `/venues/{id}`-re)
4. Kontextus badge-ek (látogatás számláló)
5. Tooltip minden oszlop fejlécen

### 3. Command Center Real-time Feed javítás

**Jelenlegi:**
```
🍺 Kiss P. - beváltás @ Vinozza (Peroni)
    most
```

**Új:**
```
🍺 [👤 Kiss Péter →] - beváltás @ [📍 Vinozza →] (Peroni)
    most | 💰 +8.500 Ft költés | [3. e héten]
    [📤 Push küldése]
```

### 4. Staff Dashboard - Mai beváltások javítás

**Jelenlegi:**
```
Peroni                    [Új]
14:32                     1.500 Ft
```

**Új:**
```
🍺 Peroni                              [Új user]
👤 Kiss Péter →  📍 Vinozza          14:32
[3. ma] [Első látogatás itt!]         1.500 Ft
```

### 5. RedemptionDetailModal bővítés

A jelenlegi modal bővítése:
- Felhasználó név + kattintható link
- Helyszín kattintható link
- Látogatás kontextus (heti/havi/összes)
- Kapcsolódó költés (ha van POS adat)
- Staff név (ha elérhető)

---

## Új Komponensek

### 1. EntityLinks (src/components/ui/entity-links.tsx)

```typescript
// UserLink - Kattintható felhasználó név
interface UserLinkProps {
  userId: string;
  userName?: string;  // Ha nincs, betöltjük
  showAvatar?: boolean;
  className?: string;
}

// VenueLink - Kattintható helyszín
interface VenueLinkProps {
  venueId: string;
  venueName?: string;
  showIcon?: boolean;
  className?: string;
}

// Mindkettő: hover effekt, kék szín, cursor pointer, navigáció
```

### 2. RedemptionContextBadges (src/components/RedemptionContextBadges.tsx)

Újrahasználható komponens a beváltás kontextushoz:
- Ma hányadik
- Ezen a héten hányadik
- Ebben a hónapban hányadik
- Összesen hányadik
- Milestone badge-ek (első látogatás, visszatérő, VIP, stb.)

### 3. Hiányzó Tooltipek hozzáadása

| Komponens | Hely | Tooltip szöveg |
|-----------|------|----------------|
| UserVenueAffinity | Card header | "A felhasználó kedvenc helyszínei látogatás szám alapján rangsorolva." |
| UserVenueAffinity | Trend badge | "Az aktivitás trendje az utolsó látogatás időpontja alapján." |
| EnhancedRedemptionCard | Header | "Részletes beváltás kártya a kapcsolódó költéssel és kontextussal." |
| EnhancedRedemptionCard | ROI badge | "Return on Investment: többletköltés / free drink érték arány." |
| LoyaltyAlertsPanel | Header | "Automatikusan detektált lojalitás mérföldkövek, amelyek jutalmazásra várnak." |
| LoyaltyAlertsPanel | Milestone emoji | Tooltip a mérföldkő feltételéről |
| CommandCenter | KPI cards | Már vannak ChartCard-ban, de hiányzik az InfoTooltip |
| CommandCenter | PUSH READY badge | "A felhasználó éppen böngészi a helyszíneket - ideális pillanat push értesítésre." |
| CommandCenter | Alert severity | "Kritikus/Figyelmeztetés/Info szintű anomália magyarázata." |

---

## Backend Módosítások

### 1. Redemptions query bővítés

A `Redemptions.tsx` oldal query-jének bővítése:
```sql
SELECT 
  r.*,
  v.name as venue_name,
  p.name as user_name,  -- ÚJ
  p.avatar_url,         -- ÚJ
  vd.drink_name,
  -- Visit context (subquery vagy edge function)
  (SELECT COUNT(*) FROM redemptions WHERE user_id = r.user_id AND venue_id = r.venue_id) as visits_total,
  (SELECT COUNT(*) FROM redemptions WHERE user_id = r.user_id AND venue_id = r.venue_id AND redeemed_at >= date_trunc('week', now())) as visits_this_week
FROM redemptions r
LEFT JOIN venues v ON r.venue_id = v.id
LEFT JOIN profiles p ON r.user_id = p.id  -- ÚJ JOIN
LEFT JOIN venue_drinks vd ON r.drink_id = vd.id
```

### 2. Dashboard stats bővítés

A `get-dashboard-stats` edge function-ök bővítése, hogy a recent_redemptions tartalmazzon:
- `user_name`
- `user_id`
- `venue_id`
- `venue_name`
- `visits_context`

---

## Implementációs Lépések

### Fázis 1: Alapvető Link Komponensek (P0)
1. `EntityLinks.tsx` komponens létrehozása (UserLink, VenueLink)
2. Redemptions.tsx átdolgozás - profiles join + kattintható linkek
3. RedemptionDetailModal bővítés - linkek + kontextus

### Fázis 2: Dashboard Feed-ek (P0)
4. StaffDashboard recent_redemptions bővítés - user név + link
5. CommandCenter real-time feed - kattintható linkek
6. LoyaltyAlertsPanel - venue link hozzáadás

### Fázis 3: Kontextus Badge-ek (P1)
7. RedemptionContextBadges komponens
8. Integrálás Redemptions oldalra
9. Integrálás StaffDashboard-ra
10. Integrálás CommandCenter-be

### Fázis 4: Tooltipek (P1)
11. UserVenueAffinity tooltipek
12. EnhancedRedemptionCard tooltipek
13. LoyaltyAlertsPanel tooltipek
14. CommandCenter tooltipek
15. UserJourneyTimeline tooltipek

### Fázis 5: Finomhangolás (P2)
16. Hover preview card (opcionális) - felhasználó előnézet hover-re
17. Breadcrumb navigáció javítás
18. Back button kontextus (honnan jöttünk)

---

## UI/UX Javítások Összefoglaló

| Terület | Jelenlegi | Új |
|---------|-----------|-----|
| Beváltások tábla | User ID csonkolt | 👤 Teljes név, kattintható |
| Beváltások tábla | Venue csak szöveg | 📍 Kattintható link |
| Beváltások tábla | Nincs kontextus | [3. e héten] [VIP] badge-ek |
| Staff Dashboard | Nincs user info | Név + link + kontextus |
| Command Center | Nem kattintható | Minden entitás linkelhető |
| Modálok | Statikus szöveg | Interaktív linkek |
| Összes új komponens | Nincs tooltip | InfoTooltip mindenhol |

---

## Technikai Részletek

### EntityLinks komponens specifikáció

```typescript
// src/components/ui/entity-links.tsx

import { useNavigate } from "react-router-dom";
import { User, MapPin, Wine } from "lucide-react";
import { cn } from "@/lib/utils";
import { MobileTooltip } from "./mobile-tooltip";

interface UserLinkProps {
  userId: string;
  userName?: string;
  showAvatar?: boolean;
  avatarUrl?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  showTooltip?: boolean;
}

export function UserLink({ 
  userId, 
  userName = "Felhasználó", 
  showAvatar = false,
  avatarUrl,
  size = "md",
  className,
  showTooltip = true
}: UserLinkProps) {
  const navigate = useNavigate();
  
  const content = (
    <span
      onClick={(e) => {
        e.stopPropagation();
        navigate(`/users/${userId}`);
      }}
      className={cn(
        "inline-flex items-center gap-1.5 text-cgi-primary hover:text-cgi-primary/80",
        "cursor-pointer hover:underline transition-colors",
        size === "sm" && "text-sm",
        size === "lg" && "text-lg font-medium",
        className
      )}
    >
      <User className={cn("h-3.5 w-3.5", size === "lg" && "h-4 w-4")} />
      {userName}
    </span>
  );

  if (showTooltip) {
    return (
      <MobileTooltip content="Kattints a felhasználó profiljához">
        {content}
      </MobileTooltip>
    );
  }
  
  return content;
}

// Hasonló VenueLink és DrinkLink komponensek...
```

### Redemptions.tsx query módosítás

```typescript
// Új query profiles join-nal
const { data, error } = await supabase
  .from("redemptions")
  .select(`
    *,
    venue:venues(id, name),
    user:profiles(id, name, avatar_url),  // ÚJ
    drink_details:venue_drinks(drink_name, image_url),
    token_info:redemption_tokens(token_prefix)
  `)
  .order("redeemed_at", { ascending: false })
  .limit(200);
```

---

## Várható Eredmény

1. **Átláthatóbb beváltások**: Azonnal látszik ki váltotta be, hol és milyen kontextusban
2. **Gyorsabb navigáció**: Egy kattintással elérhető bármely kapcsolódó entitás
3. **Jobb megértés**: Tooltipek mindenhol segítik az új felhasználókat
4. **Konzisztens UX**: Egységes link stílus és viselkedés az egész appban
5. **Akcionálható adatok**: A kontextus badge-ek azonnal mutatják a VIP usereket
