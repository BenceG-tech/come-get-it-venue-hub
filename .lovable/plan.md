
# Terv: User Detail Oldal Hibák Javítása

## Összefoglaló

A felhasználó 5 problémát jelentett a User Detail oldalon. Az elemzés után kiderült, hogy a legtöbb probléma a **tesztadatok** és a **hiányzó funkcionalitás** kombinációjából ered.

---

## 1. PROBLÉMA: "MA: 49 beváltás" és túl magas számok

### Gyökér ok
A `seed-test-data` edge function 200 random beváltást hozott létre az elmúlt 30 napra, **NEM tartva be az 1 ital/nap/helyszín szabályt**. Például:
- Vinozza: 19 beváltás **ma** (lehetetlen valós esetben)
- Összesen: 49 beváltás **ma** 5 helyszínen (lehetetlen)

A valós rendszerben az `issue-redemption-token` function 5 perces rate limitet érvényesít, de:
- A seed adatok közvetlenül az adatbázisba kerültek
- **Hiányzik az "1 ital/nap/helyszín" ellenőrzés** az `issue-redemption-token` kódból!

### Megoldás
1. **Javítani a seed logikát**: Max 1 beváltás/nap/helyszín/user
2. **Hozzáadni a hiányzó ellenőrzést**: `issue-redemption-token`-ben check, hogy a user már beváltott-e ma ezen a helyszínen
3. **UI magyarázat**: Tooltip a "Ma:" badge-ekhez

### Érintett fájlok
- `supabase/functions/seed-test-data/index.ts`
- `supabase/functions/issue-redemption-token/index.ts`
- `src/components/user/UserRevenueImpact.tsx`

---

## 2. PROBLÉMA: "Szabályok" panel mobilnézetben levágódik

### Gyökér ok
A `SystemRulesPanel.tsx` komponens:
- Fix szélességű grid layout-ot használ (`grid-cols-3`)
- Nincs scroll-area a tartalomhoz
- A szövegek túl hosszúak mobilon

### Megoldás
1. Responsive grid: `grid-cols-1 md:grid-cols-3`
2. ScrollArea komponens a hosszú tartalomhoz
3. Mobilon drawer/sheet használata dialog helyett
4. Szövegek rövidítése kisebb képernyőn

### Érintett fájlok
- `src/components/user/SystemRulesPanel.tsx`

---

## 3. PROBLÉMA: Korai figyelmeztetés akciói nem működnek

### Gyökér ok
A `ChurnWarningPanel.tsx` három gombot tartalmaz:
- "Személyes ajánlat" → `onSendOffer` → Tab váltás DOM selector-rel
- "Email kampány" → `onSendEmail` → **NINCS definiálva** a UserDetail-ben!
- "Push értesítés" → `onSendPush` → Tab váltás DOM selector-rel

A DOM selector-es megoldás (`document.querySelector('[value="ai"]')`) törékeny és nem mindig működik.

### Megoldás
1. **State-alapú tab váltás**: `useState` a aktív tab-hoz, és setter callback átadása
2. **Email kampány implementálása**: Modál nyitása email küldéshez, vagy integrálás a notification rendszerrel
3. **Toast feedback**: Minden akció után visszajelzés

### Érintett fájlok
- `src/pages/UserDetail.tsx` - Tab state + callbacks
- `src/components/user/ChurnWarningPanel.tsx` - Props frissítés

---

## 4. PROBLÉMA: UserBehaviorStory értesítés gombok nem működnek

### Gyökér ok
Az "AI Értesítés generálása" gomb:
- Meghívja `onGenerateNotification`-t, ami tab váltást próbál
- DOM selector-es megoldás törékeny

A "Manuális értesítés" gomb:
- **NINCS `onClick` handler!** - A gomb semmit nem csinál

### Megoldás
1. "AI Értesítés generálása" → Navigáljon az AI tab-ra state-en keresztül
2. "Manuális értesítés" → Nyisson egy modált ahol lehet írni és küldeni értesítést

### Érintett fájlok
- `src/pages/UserDetail.tsx`
- `src/components/user/UserBehaviorStory.tsx`

---

## 5. PROBLÉMA: Helyszínenkénti bontás zavaros

### Gyökér ok
A jelenlegi UI "Ma: 19" badge-et mutat, ami:
- Tesztadatokkal lehetséges (seed hibája)
- Valós adatokkal **maximum 1** lehet

### Megoldás
1. **Badge logika javítása**: Ha `visits_today > 1`, warning ikon + tooltip
2. **Költés megjelenítése**: Tooltip vagy expandable section az ital beváltás utáni költésről
3. **POS integráció vizualizáció**: Ha van `pos_spend`, mutassuk részletesen

### Érintett fájlok
- `src/components/user/UserRevenueImpact.tsx`

---

## IMPLEMENTÁCIÓS TERV

### 1. lépés: Seed-test-data javítás
```typescript
// Új logika: max 1 beváltás/nap/helyszín/user
const usedDays = new Map<string, Set<string>>(); // venue_id -> Set<date>

for (let i = 0; i < 200; i++) {
  const venue = weightedRandomVenue();
  let date: Date;
  let attempts = 0;
  
  do {
    date = generateRandomDate(30);
    const dateKey = date.toISOString().split('T')[0];
    const venueKey = venue.id;
    
    if (!usedDays.has(venueKey)) {
      usedDays.set(venueKey, new Set());
    }
    
    if (!usedDays.get(venueKey)!.has(dateKey)) {
      usedDays.get(venueKey)!.add(dateKey);
      break;
    }
    attempts++;
  } while (attempts < 10);
  
  // ... rest of insert logic
}
```

### 2. lépés: Issue-redemption-token ellenőrzés
```typescript
// Hozzáadni a user daily limit check-et
const { count: userTodayCount } = await supabase
  .from("redemptions")
  .select("*", { count: "exact", head: true })
  .eq("user_id", userId) // Szükséges: user azonosítás
  .eq("venue_id", venue_id)
  .gte("redeemed_at", todayStart.toISOString());

if (userTodayCount && userTodayCount >= 1) {
  return new Response(
    JSON.stringify({ 
      success: false, 
      error: "Ma már beváltottál ingyen italt ezen a helyszínen",
      code: "USER_DAILY_LIMIT"
    }),
    { status: 403, headers: corsHeaders }
  );
}
```

### 3. lépés: SystemRulesPanel mobilra optimalizálás
```tsx
// Responsive grid és scroll
<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
  {/* Badges */}
</div>

// Sheet használata mobilon
const isMobile = useIsMobile();
if (isMobile) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button size="sm">Szabályok</Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[80vh]">
        <ScrollArea className="h-full">
          {/* Content */}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
```

### 4. lépés: Tab váltás state-tel
```tsx
// UserDetail.tsx
const [activeTab, setActiveTab] = useState("overview");

<Tabs value={activeTab} onValueChange={setActiveTab}>
  {/* ... */}
</Tabs>

// Callbacks átadása
<ChurnWarningPanel
  onSendOffer={() => setActiveTab("ai")}
  onSendPush={() => setActiveTab("notifications")}
  onSendEmail={() => setShowEmailModal(true)}
/>
```

### 5. lépés: Manuális értesítés modal
```tsx
// Új komponens: ManualNotificationModal.tsx
export function ManualNotificationModal({ userId, userName, open, onOpenChange }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  
  const sendMutation = useMutation({
    mutationFn: async () => {
      await supabase.functions.invoke("send-user-notification", {
        body: { user_id: userId, title, body }
      });
    }
  });
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Form */}
    </Dialog>
  );
}
```

---

## TECHNIKAI RÉSZLETEK

### Új/módosított fájlok

| Fájl | Változás |
|------|----------|
| `supabase/functions/seed-test-data/index.ts` | 1 beváltás/nap/helyszín logika |
| `supabase/functions/issue-redemption-token/index.ts` | User daily limit check |
| `src/components/user/SystemRulesPanel.tsx` | Mobile responsive + Sheet |
| `src/components/user/ChurnWarningPanel.tsx` | Props típus frissítés |
| `src/components/user/UserBehaviorStory.tsx` | onManualNotification prop |
| `src/components/user/UserRevenueImpact.tsx` | Warning badge ha visits > 1 |
| `src/pages/UserDetail.tsx` | Tab state + callbacks + modal |
| `src/components/user/ManualNotificationModal.tsx` | ÚJ komponens |

---

## PRIORITÁS

1. **P0 - Kritikus**: Tab váltás és értesítés gombok működjenek
2. **P0 - Kritikus**: SystemRulesPanel mobilon olvasható legyen
3. **P1 - Fontos**: Seed data javítás (1 beváltás/nap/helyszín)
4. **P1 - Fontos**: Issue-redemption-token user limit
5. **P2 - Közepes**: UserRevenueImpact warning badge-ek
