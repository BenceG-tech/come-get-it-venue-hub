
# Terv: Adat Érték Fokozása & TodayRedemptionStatus Integráció

## 1. RÉSZ: TodayRedemptionStatus Integráció a UserVenueAffinity-be

### Jelenlegi helyzet
A `TodayRedemptionStatus` komponens létezik és működik, de nincs integrálva a `UserVenueAffinity` komponensbe. A felhasználó helyszínek tabján nem látszik, hogy az adott helyen ma már váltott-e be ingyen italt.

### Szükséges változtatások

**1.1 get-user-stats-extended edge function bővítése**

Új mező a venue_affinity-ben:
```typescript
venue_affinity: Array<{
  // ... meglévő mezők ...
  today_redemption: {
    redeemed: boolean;
    redeemed_at?: string;
    drink_name?: string;
  } | null;
  next_window: { start: string; end: string } | null;
}>
```

Implementáció:
- Lekérdezzük a mai redemptions-t venue-nként
- Lekérdezzük a free_drink_windows táblából a következő ablakot

**1.2 UserVenueAffinity komponens módosítása**

- Import `TodayRedemptionStatus` komponenst
- Props interface bővítése a `today_redemption` és `next_window` mezőkkel
- Minden venue kártyába beillesztjük a `TodayRedemptionStatus` komponenst

---

## 2. RÉSZ: Adat Érték Fokozása - Új Funkciók

### 2.1 Prediktív Analitika Panel

Új kártya a UserDetail áttekintés tabján:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  🔮 JÖVŐBELI ELŐREJELZÉS                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  📊 KÖVETKEZŐ 30 NAP BECSLÉSE:                                              │
│  • Várható beváltások: 8-12 db                                             │
│  • Várható költés: 32.000-45.000 Ft                                        │
│  • Legvalószínűbb helyszín: Vinozza (78%)                                  │
│  • Legvalószínűbb időpont: Péntek 17:00-19:00                              │
│                                                                             │
│  🎯 OPTIMÁLIS PUSH IDŐPONT:                                                 │
│  Csütörtök 14:30 - "Emlékeztető a holnapi happy hour-ra"                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Összehasonlító Metrikák

User vs Platform átlag összehasonlítás:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  📊 ÖSSZEHASONLÍTÁS A PLATFORM ÁTLAGGAL                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Beváltások/hó:     12 db    ▲ +156% vs átlag (4.7 db)                     │
│  Költés/beváltás:   4.050 Ft ▲ +85% vs átlag (2.190 Ft)                    │
│  Látogatott helyek: 4 db     ▲ +100% vs átlag (2 db)                       │
│  ROI:               2.7x     ▼ -10% vs átlag (3.0x)                        │
│                                                                             │
│  💡 ÉRTÉKELÉS: Kiemelkedően aktív felhasználó, de alacsonyabb ROI.         │
│     Javaslat: Premium ajánlatokkal ösztönözni a magasabb költést.          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Cross-Venue Kapcsolatok Vizualizáció

Melyik helyszíneket látogató userek látogatják még:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  🔗 HELYSZÍN KAPCSOLATOK                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Ha valaki Vinozza-t látogat, nagy eséllyel megy még:                      │
│  • BuBu (67% átfedés)                                                       │
│  • A KERT Bisztró (45% átfedés)                                            │
│  • Tapas Bar (32% átfedés)                                                 │
│                                                                             │
│  Ez a user mintázata:                                                       │
│  Vinozza → BuBu → A KERT (tipikus péntek esti útvonal)                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.4 Korai Figyelmeztető Rendszer

Churn risk részletesebb lebontása:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  ⚠️ KORAI FIGYELMEZTETÉSEK                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  🟡 KÖZEPES KOCKÁZAT - Figyelj rá!                                          │
│                                                                             │
│  Miért?                                                                     │
│  • 12 napja nem volt beváltás (átlag: 5 naponta)                           │
│  • App megnyitások csökkentek 60%-kal                                      │
│  • Push értesítéseket nem nyitja meg (utolsó 3-ból 0)                      │
│                                                                             │
│  Javasolt akció:                                                            │
│  [🎁 Személyes ajánlat küldése] [📧 Email kampány]                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. RÉSZ: UX Egyszerűsítés

### 3.1 Összevont Gyorsnézet Mód

Egy kattintással teljes user összefoglaló:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  👤 KISS PÉTER - GYORSNÉZET                                    [Bezárás ✕] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  📊 ALAP                    💰 PÉNZÜGYI              🎯 STÁTUSZ             │
│  ├─ 45 napja tag           ├─ 48.500 Ft költés      ├─ 🟢 Aktív            │
│  ├─ 23 beváltás            ├─ 2.7x ROI              ├─ Heti VIP @ Vinozza  │
│  └─ 4 helyszín             └─ 12.000 Ft LTV         └─ Alacsony churn      │
│                                                                             │
│  📅 MA                                                                      │
│  ├─ Vinozza: ✅ 14:32 (Peroni)                                             │
│  ├─ BuBu: ⏳ Még nem váltott (ablak: 16:00-18:00)                          │
│  └─ A KERT: ⏳ Még nem váltott (ablak: 17:00-20:00)                         │
│                                                                             │
│  [👤 Teljes profil] [📤 Push küldése] [🎁 Jutalom] [📊 Export]             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Kontextus-érzékeny Navigáció

- Beváltásoknál: user kattintható → profil
- Profilnál: venue kattintható → venue részletek
- Venue-nál: top userek listája kattintható → profil

### 3.3 Keresés & Szűrés Javítása

Globális keresés minden listán:
- Felhasználó név, email, telefon
- Helyszín név, cím
- Beváltás dátum, ital

---

## 4. RÉSZ: Technikai Implementáció

### 4.1 Módosítandó fájlok

| Fájl | Változás |
|------|----------|
| `supabase/functions/get-user-stats-extended/index.ts` | today_redemption + next_window mezők |
| `src/components/user/UserVenueAffinity.tsx` | TodayRedemptionStatus integráció |
| `src/components/user/index.ts` | Export lista frissítés |

### 4.2 Új komponensek

| Komponens | Leírás |
|-----------|--------|
| `UserPredictions.tsx` | Jövőbeli előrejelzések panel |
| `UserComparison.tsx` | Platform átlag összehasonlítás |
| `ChurnWarningPanel.tsx` | Korai figyelmeztető rendszer |
| `UserQuickView.tsx` | Összevont gyorsnézet modal |

### 4.3 Edge function bővítések

| Funkció | Új endpoint/bővítés |
|---------|---------------------|
| `get-user-stats-extended` | today_redemption, next_window per venue |
| `get-platform-averages` | ÚJ - átlagok a összehasonlításhoz |
| `get-user-predictions` | ÚJ - ML alapú előrejelzések |

---

## 5. RÉSZ: Implementációs Prioritás

| Prioritás | Feladat | Komplexitás |
|-----------|---------|-------------|
| **P0** | TodayRedemptionStatus integráció UserVenueAffinity-be | Alacsony |
| **P0** | get-user-stats-extended bővítés (today_redemption) | Közepes |
| **P1** | Platform átlag összehasonlítás | Közepes |
| **P1** | Churn warning részletes panel | Közepes |
| **P2** | Prediktív analitika | Magas |
| **P2** | Cross-venue kapcsolatok | Magas |
| **P2** | UserQuickView modal | Közepes |

---

## 6. RÉSZ: Várható Eredmények

### Átláthatóság javulása
- Azonnal látszik a mai beváltási státusz venue-nként
- Egy helyen minden fontos információ

### Adat érték növekedés
- Platform összehasonlítás mutatja a user relatív értékét
- Prediktív metrikák segítenek a proaktív akcióban
- Cross-venue kapcsolatok új marketing lehetőségeket nyitnak

### Kezelhetőség javulása
- Gyorsnézet mód gyors áttekintéshez
- Kontextus-érzékeny navigáció mindenhol
- Egyértelmű tooltipek minden új funkcióhoz
