# Cél

Egy (vagy két) részletes PDF, ami minden admin felület oldalt, funkciót és működést leír + screenshotokkal illusztrál. Alkalmas arra, hogy egy AI-nak feed-eld és megértse a rendszert.

# Mit csinálunk

## 1) Screenshot gyűjtés (Playwright, headless Chromium)

Bejelentkezés `cgi_admin` szerepkörrel a preview app-ba, majd minden fő admin oldal screenshot-olása 1280x1800 viewport-tal. Ahol modal / almenü / tab van, azt is külön képen.

**Oldalak (route → funkció):**

- `/dashboard` — Admin dashboard (KPI-k, trendek, top venue-k)
- `/command-center` — Live platform status
- `/venues` — Helyszín lista + szűrők + `Új helyszín` modal + `Koordináták javítása` gomb
- `/venues/:id` — Venue részletek (tabok: alapadatok, italok, promóciók, integráció, free drink manager, image gallery, business hours)
- `/venues/comparison` — Venue összehasonlítás
- `/brands` — Márkák
- `/promotions` — Promóciók + form modal
- `/rewards` — Jutalmak + form modal
- `/redemptions` — Beváltások + szűrők + detail modal + void dialog + context badges
- `/transactions` — POS tranzakciók + matching
- `/salt-edge-transactions` — Salt Edge Open Banking flow
- `/users` — Felhasználó lista + bulk toolbar + QuickView + bulk notification/bonus modalok
- `/users/:id` — User detail tabok (Áttekintés, Aktivitás, Beváltások, Analytics, Predictions, Comparison, Timeline, Notifications, Tags, GDPR export)
- `/analytics` — Analytics dashboards (heatmap, retention, activity, trends)
- `/data-insights` — Data value insights
- `/notifications` — Notification kezelés + AI suggestion + form modal + analytics dashboard
- `/charity-impact` — CSR / Drink for a Cause
- `/audit-log` — Audit trail
- `/settings` — Beállítások
- `/pos/redeem` — Staff scanner
- `/pos/history` — POS history

**Cél: kb. 40–60 screenshot.**

## 2) Tartalom generálás (markdown → PDF)

Minden oldalhoz egy szekció, ami tartalmazza:

- **Route** és **szerepkör követelmény** (cgi_admin / venue_owner / venue_staff / brand_admin)
- **Cél / mire való** — 2–4 mondatos üzleti magyarázat
- **UI komponensek** — mit lát a felhasználó (lista, form, chart, modal)
- **Interakciók** — mit tud csinálni (create/edit/delete, szűrés, export, bulk action, stb.)
- **Backend kapcsolat** — érintett Supabase táblák és edge function-ök
- **Business rule-ok** — pl. 1 free drink/nap/user globálisan (Europe/Budapest), token hash SHA-256, 120s TTL
- **Screenshot(ok)** beágyazva

A szekciókat a `mem://index.md` memóriák tartalmával is dúsítjuk (Free Drink Windows, Loyalty System, Redemption Security, POS Module, stb. — már megvan az architektúra tudás).

## 3) PDF építés (reportlab)

Két PDF-re bontva, hogy ne legyen egy 100MB-os monstrum:

**PDF 1 — `admin_documentation_part1_core.pdf`**
Alap admin flow: Dashboard, Command Center, Venues, Brands, Promotions, Rewards, Redemptions, Transactions, POS, Settings.

**PDF 2 — `admin_documentation_part2_users_analytics.pdf`**
User & analytics: Users, User Detail, Analytics, Data Insights, Notifications, Charity Impact, Audit Log.

Mindkét PDF eleje: bevezető rész — tech stack, szerepkörök, központi business rule-ok, adatbázis architektúra vázlat.

Screenshot-ok max ~800px szélesre skálázva, JPEG q=85, hogy a PDF ~10–20 MB legyen.

## 4) QA

- Minden PDF-et `pdftoppm`-mel képekké alakítunk
- Végignézzük az összes oldalt: nincs vágott szöveg, nem hiányzik screenshot, olvasható a betűméret
- Fixálunk, újra generálunk

## 5) Kiszállítás

A két PDF-et `/mnt/documents/`-be tesszük és `<presentation-artifact>` tag-ekkel közzétesszük letöltésre.

# Nem változik

- Nincs kód változtatás az app-ban
- Nincs DB / edge function módosítás
- Csak dokumentum generálás

# Technikai részletek

- **Screenshot:** Playwright, headless Chromium, `http://localhost:8080`, injected Supabase session (cgi_admin), viewport 1280x1800, element screenshot ahol pontos részlet kell (modal, gomb)
- **PDF:** Python `reportlab` (Platypus flow), Arial, US Letter, 1" margin, H1/H2/H3 hierarchia, szekcionális page break
- **Skálázás:** Pillow-val JPEG konverzió + resize width=800px

# Kérdés mielőtt implementálom

1. **Nyelv:** magyar legyen a doksi (mint az app UI), vagy angol (AI feed-eléshez néha jobb)? Alapból **magyart** feltételezem.
2. **Kell-e** a **mobil app** (Rork consumer app) dokumentálása is, vagy **csak az admin webes felület**? Alapból csak az admin.
3. **Belefoglaljuk-e** a `docs/` mappa meglévő technikai API doksijait (REST endpoints, Rork integráció) függelékként a 2. PDF végére? Ajánlom: **igen**, mert az AI így teljes képet kap.
