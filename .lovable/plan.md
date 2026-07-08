# Mobil UX javítás + Értesítések állapot

Két részre bontom: (A) helyszín szerkesztés mobil UX, (B) push értesítések valós működése.

---

## A) Helyszín szerkesztés – mobil UX javítások

### A1. VenueFormModal fejléc + mentés bar (mobilra)
- **Sticky felső sáv (mobil):** a `SheetHeader` mellé egy jobbra igazított **Mentés** gomb kerül, hogy ne kelljen legörgetni a nagy formon a Mentéshez.
- **Sticky alsó sáv marad**, de gomb-magasság `min-h-[48px]`, `text-base`, hüvelykujj-barát.
- **"Mentés bezárás nélkül"** viselkedés: alapból a mentés NEM zárja be a modalt, csak sikeres toast-ot mutat és lokálisan frissíti a `venue` prop-ot. Külön "Mentés és bezárás" opció a Mégse mellett (mobilon csak a Mentés marad látszik, a Mégse legördülő "X" ikon a fejlécben).
- **Optimista tab-állapot megőrzés:** mentés után NEM ugrik vissza a `basic` tabra – ott marad, ahol a user dolgozott (jelenleg minden `open` váltásnál újratöltődik a form).

### A2. Kompaktabb tab-fejléc mobilon
- A `TabsList` jelenleg 5 tabot mutat vízszintesen scrollolva ("Általános / Helyszín & Nyitva / Italok & Limitek / Képek / Integráció"). Mobilra:
  - Aktív tab neve + kis lefelé nyíl **dropdown**-ként jelenik meg (< 640px).
  - > 640px: marad a jelenlegi vízszintes lista.
- Ez sokkal kevésbé kaotikus a 402px viewport-on.

### A3. Formmezők mobil sűrűsége
- Minden `Input` és `Select` `h-11` (min. 44px), nagyobb touch target.
- `grid-cols-1 sm:grid-cols-2/3` marad (jó), de mobilon `gap-3` `gap-4` helyett a helykihasználásra.
- `Textarea` `rows={2}` → `rows={3}` mobilon, hogy ne kelljen scrollolni benne.
- A **Speciális** szekciók (Popover-ek) mobilon full-screen Sheet-ként nyílnak.

### A4. Képek tab – mobil grid + gyorsműveletek
- `grid-cols-2 sm:grid-cols-3 ...` marad, de:
  - Mobilon a **hover overlay** nem működik → a szerkesztő ikonok (⭐ főkép, ✎ szerk, 🗑 törlés, ⛶ nagyítás) **mindig láthatóak** mobilon (kis fekete ikon-sávban a kép alján).
  - "Feltöltés" és "URL" gombok mobilon full-szélességben, egymás alatt.
- Drag-and-drop kép sorrend mobilon **long-press** aktiválással (jelenleg 6px activation distance nehéz kis képen) → külön reorder mód gomb ("Sorrend átrendezése"), ami a képeket nagyobbra váltja és minden képen látszik a húzókaros ikon.

### A5. Venues lista mobil (a `/venues` oldal)
- **FAB (floating action button):** "Új helyszín" gomb jobbra alul, hüvelykujj-elérhető pozícióban (jelenleg fenti gomb, scrollozás után eltűnik).
- **Kereső + Sort/View gombok** mobilon összecsomagolva egy sorba (kereső full-width, mellette ikon-gomb menü).
- MobileVenueCard: a helyszín képére kattintás közvetlenül a **Szerkesztés Sheet-et** nyitja (jelenleg csak a `/venues/:id` detail oldalra visz, két lépés a szerkesztés). Kompromisszum: bal-oldalt tap = detail, jobb-oldalt ceruza ikon = azonnali szerkesztés.

### A6. Save UX – ne kelljen bezáródnia
- `handleSubmit` jelenleg: `setOpen(false)` mentés után. Módosítás:
  - Alap: `setOpen(false)` **kikapcsolva**, csak toast + adat-frissítés a szülő oldalon (`Venues.tsx` → `loadVenues()` a mentés után is fut).
  - Külön "Mentés és bezárás" ikon-változat, ha a user tényleg végzett.
- A `useEffect` ami a `formData`-t újratölti amikor `open` váltás történik – változatlan (csak akkor fut, ha a modal újranyílik).

---

## B) Értesítések – valós push működés

### B1. Jelenlegi állapot (kód áttekintés)
- `NotificationFormModal` **csak DB-be menti** a template-et a `notification_templates` táblába.
- `send-user-notification` edge function csak **`notification_logs`-ba loggol**, valós push-t **nem küld** (van benne egy `// TODO: Integrate with actual push notification service (Firebase FCM, Expo Push, etc.)` komment).
- Ütemezett küldés (`send_mode: 'scheduled'`) mögött **nincs cron job**, ami időzítve tényleg elküldené.
- **Nincs push token tábla** – a `profiles.device_info` JSON létezik, de a Rork mobilappnak nincs jelenleg endpoint-ja, amivel a push tokent regisztrálná.

**Válasz a kérdésre:** Jelenleg **nem** – ha időzítesz magadnak egy értesítést, csak a DB-ben logolódik, **nem érkezik meg a telefonra**.

### B2. Amit meg kell csinálni (backend – ebben a repóban)
1. **Új tábla:** `push_tokens` (user_id, token, platform, device_id, updated_at) + RLS + grant-ek.
2. **Új edge function:** `register-push-token` – Rork app hívja bejelentkezés után + minden token-frissítéskor.
3. **`send-user-notification` bővítése:** tényleges **Expo Push** hívás (`https://exp.host/--/api/v2/push/send`) a user token-ekre. Expo használható Firebase server key nélkül is, mert Rork Expo alapú.
4. **`process-scheduled-notifications` edge function** + **pg_cron** (5 percenként): kiválasztja a `send_mode='scheduled'` és `scheduled_at <= now()` template-eket, targeting szerint iterál usereken, hívja a push service-t.
5. **`notification_logs.status`** updateltetése `queued → sent / failed` az Expo válasz alapján.

### B3. Amit a Rork oldalon (rork.com) kell csinálni
Külön dokumentum: `docs/RORK_PUSH_NOTIFICATIONS.md`, ami tartalmazza:
1. **`expo-notifications` telepítése** (`bun expo install expo-notifications expo-device`).
2. **Permission kérés + Expo Push Token lekérése** app indításnál.
3. **Token regisztrálás:** POST hívás a `register-push-token` edge functionre (user JWT-vel).
4. **Notification handler:** foreground értesítés kezelés, deep link a `deep_link` mezőből.
5. **iOS APNs setup** teendők (Expo dashboardon), Android alapból megy Expo-val.
6. **Teszt flow:** admin küld → user telefonon megjelenik.

---

## Technikai részletek

**Módosítandó fájlok (A):**
- `src/components/VenueFormModal.tsx` – sticky header save gomb, tab dropdown mobilon, save-without-close, kép overlay mindig látszik mobilon
- `src/pages/Venues.tsx` – FAB, ceruza ikon a kártyán mobilon
- (esetleg új) `src/components/MobileTabSelect.tsx` – reusable mobil tab-dropdown

**Módosítandó / új fájlok (B):**
- új migráció: `push_tokens` tábla + grants + RLS
- új `supabase/functions/register-push-token/index.ts`
- új `supabase/functions/process-scheduled-notifications/index.ts` + pg_cron beállítás (külön SQL, mert user-specifikus)
- meglévő `supabase/functions/send-user-notification/index.ts` – Expo Push integráció
- új `docs/RORK_PUSH_NOTIFICATIONS.md`

**Nem érintem:** meglévő RLS-eket, business logikát, `venue_drinks`, ítalok/limitek működését, integráció-kezelést.

---

## Kérdés jóváhagyás előtt
A B rész (push értesítések valós működése) nagyobb backend munka – **először csinálja meg** az A részt (mobil UX), és utána foglalkozzon a B-vel külön körben, vagy egyben menjen mindkettő?

Ha nem válaszolsz, az **A + B egyben** verziót fogom megvalósítani a jóváhagyás után.
