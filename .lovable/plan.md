
# Teljes Terv: Users Oldal Fejlesztése - Bulk Actions & Javítások

## Áttekintés

A Users oldal az admin felület egyik központi eleme. A jelenlegi állapotban hiányoznak kulcsfontosságú funkciók, és több UX/UI probléma is van. Ez a terv a Phase 1 "User Bulk Actions" feladat megvalósítását, valamint az azonosított hiányosságok és rendezetlenségek javítását tartalmazza.

---

## 1. BULK USER ACTIONS (Fő feladat)

### 1.1 Kijelölés infrastruktúra

**Új state a Users.tsx-ben:**
```typescript
const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
const [selectAll, setSelectAll] = useState(false);
```

**Checkbox minden user sorhoz:**
- Bal oldalon checkbox az Avatar előtt
- "Összes kijelölése" checkbox a lista fejlécében
- Kijelöltek száma megjelenítése: "3 felhasználó kiválasztva"

### 1.2 Bulk Actions Toolbar

**Új komponens: `UserBulkActionsToolbar.tsx`**

Megjelenik, ha `selectedUserIds.size > 0`:
```
┌─────────────────────────────────────────────────────────────────┐
│ ✓ 5 felhasználó kiválasztva                                     │
│ [Export CSV] [Tag hozzáadása ▼] [Push küldése] [Bónusz pont] [✕]│
└─────────────────────────────────────────────────────────────────┘
```

**Műveletek:**
1. **Export kiválasztottak (CSV)** - A jelenlegi `exportUsersToCSV` használata a kijelölt userekre
2. **Tag hozzáadása** - Dropdown meglévő tagekből + új tag létrehozás
3. **Push értesítés küldése** - Modál: cím + üzenet, tömeges küldés
4. **Bónusz pont küldése** - Modál: összeg + indoklás

### 1.3 Tag Management

**Backend: Edge function szükséges**

A `user_tags` tábla létezik:
```sql
user_tags (id, user_id, tag, created_by, created_at)
```

**Új edge functions:**
- `add-user-tags` - Tagek hozzáadása userhez/userekhez
- `remove-user-tag` - Tag eltávolítása
- `get-user-tags` - User tageinek lekérése
- `get-all-tags` - Összes létező tag (autocomplete-hez)

**UI komponensek:**
- `UserTagsManager.tsx` - Tag hozzáadás/törlés modal
- `UserTagBadges.tsx` - Tag badge-ek megjelenítése a user listában

### 1.4 Bulk Notification Sender

**Új komponens: `BulkNotificationModal.tsx`**

```
┌─────────────────────────────────────────────────┐
│ Push értesítés küldése (5 felhasználó)          │
├─────────────────────────────────────────────────┤
│ Cím:    [________________________________]      │
│                                                 │
│ Üzenet: [________________________________]      │
│         [________________________________]      │
│                                                 │
│ ○ Sablon használata: [Válassz sablont ▼]        │
│                                                 │
│              [Mégse]  [Küldés 5 felhasználónak] │
└─────────────────────────────────────────────────┘
```

**Backend:** `send-user-notification` edge function módosítása, hogy támogassa `user_ids: string[]` tömböt is.

### 1.5 Bulk Bonus Points

**Új komponens: `BulkBonusPointsModal.tsx`**

```
┌─────────────────────────────────────────────────┐
│ Bónusz pont küldése (5 felhasználó)             │
├─────────────────────────────────────────────────┤
│ Pont összeg: [______] (pl. 100)                 │
│                                                 │
│ Indoklás:    [________________________________] │
│              (pl. "Hűségprogram jutalom")       │
│                                                 │
│              [Mégse]  [Küldés 5 felhasználónak] │
└─────────────────────────────────────────────────┘
```

**Backend:** `send-loyalty-reward` edge function már létezik, módosítás szükséges bulk támogatáshoz.

---

## 2. HIÁNYZÓ FUNKCIÓK (Azonosított problémák)

### 2.1 Pagination hiányzik a Users listából

**Probléma:** A Users.tsx csak az első 50 usert tölti be (`limit: "50"`, `offset: "0"`), de nincs pagination UI.

**Megoldás:**
```typescript
const [page, setPage] = useState(0);
const pageSize = 50;

// Query params
offset: (page * pageSize).toString(),

// Pagination UI
<div className="flex justify-between items-center mt-4">
  <span>{page * pageSize + 1}-{Math.min((page + 1) * pageSize, total)} / {total}</span>
  <div className="flex gap-2">
    <Button onClick={() => setPage(p => p - 1)} disabled={page === 0}>Előző</Button>
    <Button onClick={() => setPage(p => p + 1)} disabled={...}>Következő</Button>
  </div>
</div>
```

### 2.2 UserQuickView TODO-k

**Probléma:** A `UserQuickView.tsx` "Push küldése" és "Jutalom" gombok csak bezárják a modalt (TODO komment).

**Megoldás:**
1. "Push küldése" → Nyissa meg a `ManualNotificationModal`-t
2. "Jutalom" → Nyissa meg a jutalom küldés modalt

### 2.3 Tag szűrés hiányzik

**Probléma:** Nincs lehetőség tagek alapján szűrni a user listát.

**Megoldás:**
- Új filter dropdown: "Tag szűrő"
- `get-users` edge function bővítése `tags` paraméterrel

### 2.4 Sorting opciók hiányoznak

**Probléma:** Csak `last_seen_at` szerint rendez, nincs UI a rendezés változtatásához.

**Megoldás:**
- Sortable column headers: Név, Pontok, Beváltások, Utolsó aktivitás
- Backend már támogatja az `order` paramétert, csak UI kell

---

## 3. UX/UI JAVÍTÁSOK

### 3.1 Felhasználó lista layout rendezetlen mobilon

**Probléma:** A user sor mobilon:
- Avatar + név + badge-ek zsúfoltak
- Statisztikák (`points`, `redemptions`, `sessions`) eltűnnek (`hidden md:flex`)
- Quick view gomb nehezen elérhető

**Megoldás:**
```
┌──────────────────────────────────────────┐
│ [Avatar] Kovács János          [👁] [>]  │
│          kovacs@email.com                │
│          ● Aktív                         │
├──────────────────────────────────────────┤
│ 1,234 pont │ 45 beváltás │ 3 napja      │
└──────────────────────────────────────────┘
```
- Kisebb kártyás layout mobilon
- Statisztikák alsó sorban, mindig láthatók

### 3.2 Keresés/szűrés állapot nem egyértelmű

**Probléma:** Ha aktív a szűrés, nem látható tisztán.

**Megoldás:**
- Active filters badge: "3 szűrő aktív"
- "Szűrők törlése" gomb
- Empty state javítás: "Nincs találat a 'xyz' keresésre az aktív felhasználók között"

### 3.3 Loading/Error state javítások

**Probléma:** Skeleton loader jó, de error state minimális.

**Megoldás:**
- Retry gomb error esetén
- Részletesebb error üzenet

---

## 4. TECHNIKAI RÉSZLETEK

### 4.1 Új fájlok

| Fájl | Leírás |
|------|--------|
| `src/components/user/UserBulkActionsToolbar.tsx` | Bulk műveletek toolbar |
| `src/components/user/BulkNotificationModal.tsx` | Tömeges push küldés |
| `src/components/user/BulkBonusPointsModal.tsx` | Tömeges pont küldés |
| `src/components/user/UserTagsManager.tsx` | Tag kezelő modal |
| `src/components/user/UserTagBadges.tsx` | Tag badge-ek |
| `supabase/functions/add-user-tags/index.ts` | Tag hozzáadás |
| `supabase/functions/get-all-tags/index.ts` | Összes tag lekérés |
| `supabase/functions/bulk-send-notification/index.ts` | Tömeges push |
| `supabase/functions/bulk-send-bonus/index.ts` | Tömeges bónusz |

### 4.2 Módosítandó fájlok

| Fájl | Változás |
|------|----------|
| `src/pages/Users.tsx` | Selection state, pagination, toolbar, sorting |
| `src/components/user/UserQuickView.tsx` | TODO-k implementálása |
| `supabase/functions/get-users/index.ts` | Tag filter, ordering params |
| `src/lib/exportUtils.ts` | Bulk export helper |
| `src/components/user/index.ts` | Új komponensek export |

### 4.3 Adatbázis

A `user_tags` tábla már létezik, RLS policy kell:
```sql
-- Admins can manage all tags
CREATE POLICY "Admins can manage user tags"
ON user_tags
FOR ALL
USING (is_admin());
```

---

## 5. IMPLEMENTÁCIÓS SORREND

### Lépés 1: Selection infrastruktúra (P0)
1. `selectedUserIds` state hozzáadása `Users.tsx`-hez
2. Checkbox komponens minden user sorhoz
3. "Összes kijelölése" checkbox
4. Kijelöltek számának megjelenítése

### Lépés 2: Bulk Actions Toolbar (P0)
1. `UserBulkActionsToolbar.tsx` létrehozása
2. Export kiválasztottak funkció
3. Toolbar megjelenítése ha van kijelölt user

### Lépés 3: Tag Management (P1)
1. `get-all-tags` és `add-user-tags` edge functions
2. `UserTagsManager.tsx` modal
3. Tag filter a user listához

### Lépés 4: Bulk Notification (P1)
1. `bulk-send-notification` edge function
2. `BulkNotificationModal.tsx`
3. Integrálás a toolbarral

### Lépés 5: Bulk Bonus Points (P1)
1. `bulk-send-bonus` edge function
2. `BulkBonusPointsModal.tsx`
3. Integrálás a toolbarral

### Lépés 6: Pagination & Sorting (P1)
1. Pagination state és UI
2. Sorting dropdown/column headers
3. `get-users` edge function bővítése

### Lépés 7: UX javítások (P2)
1. Mobile layout optimalizálás
2. Active filters badge
3. UserQuickView TODO-k fix

---

## 6. AUDIT LOGGING INTEGRÁCIÓ

Minden bulk művelet naplózandó:
```typescript
await logAuditEvent({
  action: "bulk_action",
  resourceType: "user",
  metadata: {
    action_type: "add_tags" | "send_notification" | "send_bonus",
    affected_user_ids: [...selectedUserIds],
    affected_count: selectedUserIds.size,
    details: { tags: [...], points: 100, ... }
  }
});
```

---

## 7. ÖSSZEFOGLALÓ

| Kategória | Elem | Prioritás |
|-----------|------|-----------|
| Bulk Actions | Selection infrastruktúra | P0 |
| Bulk Actions | Export kiválasztottak | P0 |
| Bulk Actions | Tag management | P1 |
| Bulk Actions | Bulk notification | P1 |
| Bulk Actions | Bulk bonus points | P1 |
| Hiányzó | Pagination | P1 |
| Hiányzó | Sorting | P2 |
| Hiányzó | Tag filter | P2 |
| UX Fix | UserQuickView TODO-k | P1 |
| UX Fix | Mobile layout | P2 |
| UX Fix | Active filters badge | P2 |

**Becsült időtartam:** 3-5 nap
