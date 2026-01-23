
# Terv: Mobil User Lista & UserQuickView TODO-k Javítása

## Összefoglaló

Két feladat van:
1. **Mobil nézet optimalizálása** - A user lista kártyás layout-tal jelenik meg mobilon, statisztikákkal az alsó sorban
2. **UserQuickView TODO-k javítása** - A "Push küldése" és "Jutalom" gombok működjenek a quick view panelből

---

## 1. Mobil User Lista Kártyás Layout

### Jelenlegi probléma

A `Users.tsx` (576-688. sorok) desktop-first layout-ot használ:
- A statisztikák (`points`, `redemptions`, `sessions`) `hidden md:flex` - mobilon NEM látszanak
- A "last seen" `hidden lg:block` - csak nagy képernyőn
- Mobilon csak az avatar, név, email és gombok jelennek meg

### Megoldás: Responsive Kártya Layout

Mobilon kártyás megjelenítés:
```text
┌────────────────────────────────────────────────┐
│ [✓] [Avatar] Kovács János            [👁] [>] │
│              kovacs@email.com                  │
│              ● Aktív                           │
├────────────────────────────────────────────────┤
│ 1,234 pont │ 45 beváltás │ 12 munkamenet      │
│ 📅 3 napja                                     │
└────────────────────────────────────────────────┘
```

### Változások a `Users.tsx`-ben

**Jelenlegi struktúra (576-688. sor):**
```tsx
<div className="flex items-center gap-4 p-4 ...">
  <Checkbox />
  <div className="flex items-center gap-4 flex-1">
    <Avatar />
    <div> {/* Név, email */} </div>
  </div>
  <div className="hidden md:flex"> {/* Stats - ELTŰNIK mobilon! */} </div>
  <div className="hidden lg:block"> {/* Last seen - ELTŰNIK! */} </div>
  <Button /> {/* QuickView */}
  <ChevronRight />
</div>
```

**Új struktúra:**
```tsx
<div className="p-4 rounded-lg ...">
  {/* Felső sor - Avatar, név, gombok */}
  <div className="flex items-center gap-3">
    <Checkbox />
    <Avatar />
    <div className="flex-1 min-w-0">
      <p>{user.name}</p>
      <p className="text-sm">{user.email}</p>
      <div className="flex items-center gap-2 mt-1">
        {getStatusBadge(user.status)}
        {/* Last seen - mobilon is */}
        <span className="text-xs text-cgi-muted-foreground md:hidden">
          {formatDistanceToNow(...)}
        </span>
      </div>
    </div>
    <Button>{/* QuickView */}</Button>
    <ChevronRight />
  </div>
  
  {/* Alsó sor - Statisztikák (csak mobilon) */}
  <div className="flex items-center justify-around mt-3 pt-3 border-t border-cgi-muted/20 md:hidden">
    <div className="text-center">
      <p className="font-medium text-cgi-secondary">{user.points_balance}</p>
      <p className="text-xs">pont</p>
    </div>
    <div className="text-center">
      <p className="font-medium">{user.total_redemptions}</p>
      <p className="text-xs">beváltás</p>
    </div>
    <div className="text-center">
      <p className="font-medium">{user.total_sessions}</p>
      <p className="text-xs">munkamenet</p>
    </div>
  </div>
</div>
```

---

## 2. UserQuickView TODO-k Javítása

### Jelenlegi probléma

A `UserQuickView.tsx` (335-356. sor) két gombja TODO-val van jelölve:
```tsx
<Button onClick={() => {
  // TODO: Implement push sending
  onOpenChange(false);
}}>
  Push küldése
</Button>

<Button onClick={() => {
  // TODO: Implement reward sending
  onOpenChange(false);
}}>
  Jutalom
</Button>
```

### Megoldás

A `UserQuickView` komponensnek saját modálokat kell kezelnie:
1. **Push küldése** → `ManualNotificationModal` megnyitása
2. **Jutalom** → Új `SingleBonusPointsModal` komponens (a bulk verzió egyszerűsítve)

### Változások a `UserQuickView.tsx`-ben

```tsx
import { ManualNotificationModal } from "./ManualNotificationModal";
import { SingleBonusPointsModal } from "./SingleBonusPointsModal";

export function UserQuickView({ userId, open, onOpenChange }: UserQuickViewProps) {
  // Új state-ek a sub-modalokhoz
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showBonusModal, setShowBonusModal] = useState(false);
  
  // ...
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* ... */}
        
        <Button onClick={() => setShowNotificationModal(true)}>
          Push küldése
        </Button>
        
        <Button onClick={() => setShowBonusModal(true)}>
          Jutalom
        </Button>
      </DialogContent>
      
      {/* Sub-modals */}
      {data && (
        <>
          <ManualNotificationModal
            userId={data.user.id}
            userName={data.user.name}
            open={showNotificationModal}
            onOpenChange={setShowNotificationModal}
          />
          <SingleBonusPointsModal
            userId={data.user.id}
            userName={data.user.name}
            open={showBonusModal}
            onOpenChange={setShowBonusModal}
          />
        </>
      )}
    </Dialog>
  );
}
```

### Új komponens: `SingleBonusPointsModal.tsx`

A `BulkBonusPointsModal` egyszerűsített változata egyetlen user-hez:

```tsx
interface SingleBonusPointsModalProps {
  userId: string;
  userName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SingleBonusPointsModal({
  userId,
  userName,
  open,
  onOpenChange,
}: SingleBonusPointsModalProps) {
  // Pont összeg és indoklás
  // send-loyalty-reward edge function hívása
  // Audit log
}
```

---

## Érintett fájlok

| Fájl | Változás |
|------|----------|
| `src/pages/Users.tsx` | Mobil kártyás layout a user listához |
| `src/components/user/UserQuickView.tsx` | Modal state-ek és gomb handlerek |
| `src/components/user/SingleBonusPointsModal.tsx` | ÚJ - egyedi bónusz pont modal |
| `src/components/user/index.ts` | Új export |

---

## Technikai részletek

### Mobil kártya CSS osztályok

```tsx
// Kártya container - különböző padding mobilon
className="p-3 md:p-4 rounded-lg ..."

// Statisztikák - mobilon alsó sorban, desktopon inline
// Mobil verzió:
className="flex items-center justify-around mt-3 pt-3 border-t border-cgi-muted/20 md:hidden"

// Desktop verzió (megtartjuk):
className="hidden md:flex items-center gap-6"
```

### Modal nesting megoldás

A React Portal-ok miatt a sub-modal-ok a QuickView Dialog-on kívül renderelődnek, így nincs z-index probléma:

```tsx
// A Dialog komponens (radix-ui) automatikusan Portal-t használ
// A sub-modal-ok a body-ba renderelődnek, nem a parent Dialog-ba
```

### SingleBonusPointsModal vs BulkBonusPointsModal

A különbség:
- `BulkBonusPointsModal`: `userIds: string[]` tömb, `bulk-send-bonus` endpoint
- `SingleBonusPointsModal`: `userId: string`, `send-loyalty-reward` endpoint

---

## Implementációs sorrend

1. **SingleBonusPointsModal** létrehozása (a BulkBonusPointsModal alapján)
2. **UserQuickView** módosítása - modal state-ek és gombok
3. **Users.tsx** - mobil kártyás layout
4. **Index.ts** - export frissítés
5. **Tesztelés** - mobil és desktop nézetben
