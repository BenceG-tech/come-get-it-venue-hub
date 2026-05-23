## Cél

1. A bal oldali menüben a **Helyszínek** és **Felhasználók** kerüljön közvetlenül a Dashboard után, és a menüpontok kapjanak szín szerinti csoportosítást.
2. A **Felhasználók** lista és a **felhasználó-részletes** oldal legyen gyorsabban használható, kevésbé túlzsúfolt, és átlátható.

---

## 1. Sidebar — sorrend + színkódolás

Fájl: `src/components/Sidebar.tsx`

### Új sorrend (csoportokra bontva, vizuális elválasztással)

| Csoport | Szín token | Menüpontok |
|---|---|---|
| **Fő** | `cgi-primary` (cián) | Dashboard, **Helyszínek**, **Felhasználók** |
| **Tranzakciók** | amber-400 | Beváltások, Tranzakciók, Banki Tranzakciók |
| **Marketing** | purple-400 | Jutalmak, Promóciók, Értesítések |
| **Analitika** | cgi-success (zöld) | Analitika, Adat Értékek, Jótékonysági Hatás |
| **Admin** | slate-400 | Márkák, Audit Napló, Beállítások |

A `navigation` tömböt átrendezzük, és minden elem kap egy `group: 'core' \| 'tx' \| 'marketing' \| 'analytics' \| 'admin'` és `accent: string` mezőt (HSL token-alapú szín).

Render: a `filteredNavigation` szekcióban szekciónként rendereljük az elemeket egy kis halvány csoportcímkével (pl. „FŐ", „TRANZAKCIÓK"), a `cgi-nav-item` ikon háttere pedig az adott csoport színét kapja (`bg-{accent}/15 text-{accent}`). Aktív állapotban a teljes pill az accent színt használja.

A `cgi-nav-item` osztály jelenleg a `text-cgi-primary` aktív színt használja — ezt felülírjuk inline style-lal vagy egy új CSS változóval (`--nav-accent`), hogy minden menüpont megkapja a saját accent színét anélkül, hogy 5 új Tailwind osztályt vennénk fel.

### Apró UX

- Sticky csoportcímkék (`sticky top-0 bg-cgi-surface`) elhagyva — egyszerű kis `<div class="px-3 pt-3 pb-1 text-[10px] uppercase tracking-wider text-cgi-muted-foreground">Fő</div>` választó.
- Hover ugyanaz az accent halvány formában.

---

## 2. Felhasználók lista (`src/pages/Users.tsx`)

### Problémák
- Az alapértelmezett tab az „Analitika" — a user először a táblázatokat látja, nem magát a listát.
- A keresőmező csak akkor jelenik meg, ha az „Felhasználók" tabra vált.
- A lista sorai sűrűek, sok klikkelhető célpont egymás mellett (checkbox, avatar, név, sztatok, Eye gomb, ChevronRight) — könnyű mellékattintani.

### Javítások

1. **Alapértelmezett tab = "users"**, az „Analitika" a második tab. (Aki adminol, először a felhasználót keresi, nem a kohorszot.)
2. **Sticky keresősáv** a tab-bar fölött, mindig látható (debounced search + status pillek egy sorban). Az Analitika tabnál is mutatja, így onnan is lehet keresni — ha a user gépel, automatikusan átvált a „users" tabra.
3. **Lista sor egyszerűsítése**:
   - Eltávolítjuk a redundáns „Quick view" (`Eye`) gombot — a teljes sor kattintásra megnyitja a **QuickView modalt** (gyors info), a sor jobb szélén egy „Megnyitás →" gomb visz a részletes oldalra. Így a default = gyors info, opt-in = részletes oldal — pont fordítva, mint most.
   - A checkbox csak akkor jelenik meg, ha az egér rajta van a soron, vagy ha már van kiválasztva (folyamatos `opacity-0 group-hover:opacity-100`), így a sor tisztább.
   - Mobil bottom-row sztatok pillé tömörítve: `🎯 1 240 pont · 12 beváltás · 8 munkamenet` egy sorban, max-truncate.
4. **Státusz pillek színesedjenek a sor avatar-keretén is** (zöld/szürke/kék ring) — egy pillantásra tudható ki aktív/inaktív/új.
5. **„Top 10 gyakran nézett" gyors sáv** a kereső alatt: a localStorage-ban tárolt utolsó 5 megnyitott felhasználó avatar-csíkként, hogy a visszatérő user 1 kattintással visszakerüljön.
6. **Üres állapot** ha `data.users.length === 0` és nincs filter: nagyobb illusztráció + CTA „Adjon hozzá tesztadatot".

### Fájlok
- `src/pages/Users.tsx` — fenti változások
- (opcionálisan új) `src/components/user/RecentlyViewedUsersStrip.tsx` — localStorage alapú gyors sáv

---

## 3. Felhasználó részletes oldal (`src/pages/UserDetail.tsx`)

### Problémák
- **8 tab** (Áttekintés, Viselkedés, Aktivitás, Beváltások, Helyszínek, Pontok, AI Ajánlatok, Értesítések) — mobilon és desktopon is sok, mindenhol görgethető. Sok funkció duplikálódik az Áttekintés accordionjával.
- **3 kvázi-ugyanaz** komponens egymás után: `QuickOverviewCard` → `UserScorecard` → `UserOverviewSummary` mind kulcs-KPI-okat mutat különböző formátumban. Vizuálisan zavaró, hosszú scroll.
- A header (vissza gomb + Export + Szabályok) szétdobott.

### Javítások

1. **Tabok 8 → 4 csoportba**:
   | Új tab | Mit tartalmaz |
   |---|---|
   | **Áttekintés** | UserOverviewSummary (KPI), ChurnWarning (ha kell), accordion: Bevétel hatás + Platform összehasonlítás + AI előrejelzések |
   | **Aktivitás** | Viselkedés (BehaviorPatternBadges) + Aktivitás napló (recent_activity) + UserActivityHeatmap + WeeklyTrends |
   | **Beváltások** | Ingyen italok + Jutalmak + Helyszín-affinitás + Pontok flow (sub-szekciókkal vagy mini-tabokkal a kártyán belül) |
   | **Kommunikáció** | AI ajánlatok + Értesítések history + manuális push CTA |

2. **Hero egyszerűsítés**: `QuickOverviewCard` törölve (vagy egy gomb mögé rejtve), csak a `UserScorecard` marad az Áttekintés tab tetején — a `UserOverviewSummary` adja a részletet. Eggyel kevesebb redundáns blokk.

3. **Sticky user header**: a vissza gomb + avatar + név + gyors „Push küldése" / „Export" akciók egy `sticky top-0` sávban — mindig elérhető még görgetés közben is, így nem kell a tetejére visszamenni egy értesítés küldéséhez.

4. **Műveleti CTA-k a headerben**: a jelenlegi „Export" dropdown mellé „📣 Push küldése" elsődleges gomb (megnyitja a `ManualNotificationModal`-t). A „Szabályok" gomb átkerül a Súgó (?) ikon mögé tooltipbe.

5. **Mobilon a tab lista** vízszintesen scrollolható (már most is `flex-wrap` de h-auto + gap-1) — 4 tabbal már elfér egy sorban telefonon is.

6. **Breadcrumb a tetején**: `Felhasználók › [Név]` — egyértelmű kontextus, klikkelhető vissza link.

### Fájlok
- `src/pages/UserDetail.tsx` — tab-konszolidáció, sticky header, KPI dedup, breadcrumb

---

## Összegzés — mi NEM változik

- A backend (`get-users`, `get-user-stats-extended`) és a komponensek belső logikája érintetlen.
- A Supabase auth/RLS érintetlen.
- A QuickView modal, ManualNotificationModal, UserBulkActionsToolbar funkciók maradnak — csak hogyan érhetők el, az változik.

---

## Érintett fájlok összesítve

- `src/components/Sidebar.tsx` — sorrend + csoport-színek
- `src/index.css` — szükség szerint új `--nav-accent` változó támogatás a `cgi-nav-item`-hez
- `src/pages/Users.tsx` — default tab, sticky kereső, lista-sor egyszerűsítés, „Recently viewed" sáv
- `src/components/user/RecentlyViewedUsersStrip.tsx` — új, opcionális
- `src/pages/UserDetail.tsx` — 4 tab-os struktúra, sticky header, breadcrumb, KPI dedup

Ha jónak találod, megyek és lekódolom. Ha valamelyik részen mást szeretnél (pl. „a 8 tab maradjon, csak a sorrend változzon", vagy „más színpaletta kell a sidebarba"), írd meg és módosítom a tervet.
