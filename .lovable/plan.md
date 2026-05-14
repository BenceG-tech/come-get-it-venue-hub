
# Terv — Login UX, Google auth, és stratégiai válasz

## 1. Login screen újragondolása

Egyetértek: a 4 egyforma szerepkör-csempe pre-loginnál vagy security-rés (bárki bárminek mondhatja magát), vagy felesleges UX-elem (a szerver úgyis a profilból dönt). A jelenlegi kódban (`signInWithEmailPassword`) a szerepkör tényleg a `profiles.is_admin` + `venue_memberships` alapján dől el — vagyis a választó **most is csak demó/mock módban él**. Supabase módban a kiválasztott role-t a backend simán felülírja.

**Javasolt megoldás**

- **Login screen** = csak logo + email + jelszó + "Bejelentkezés Google-lel" gomb + "Elfelejtett jelszó". Tiszta, premium, Neon Fidelity-konzisztens (fekete háttér, cyan glow CTA — most a login még nem ezt használja, ez egy következő lépés).
- A 4 demó-szerepkör csempét levesszük az élesnek szánt nézetből. Mock módra (`runtimeConfig.useSupabase === false`) marad egy diszkrét "Demo belépés" szekció a kártya alján egy `<details>` mögött — fejlesztéshez és investor demo-hoz hasznos, de nem ez az első benyomás.
- **Post-login szerepkör-váltó**: ha a usernek több kalapja van (pl. `is_admin === true` ÉS `venue_memberships`-ben `venue_owner`), akkor a sidebar tetején a már létező role-dropdown jelenik meg. Ha csak egy szerepköre van, automatikusan oda visz. Ezt a `sessionManager.previewRole` mechanizmus már félig támogatja — csak a feltételt kell `isAdmin && hasVenueMemberships`-ra kötni, és a Login képernyőről eltávolítani a választót.

## 2. Google bejelentkezés

Supabase oldalon (Dashboard → Authentication → Providers → Google) a usernek kell:
1. Google Cloud Console → új OAuth Client ID (Web application).
2. Authorized redirect URI-nek beilleszteni a Supabase-ben látható callback URL-t (`https://nrxfiblssxwzeziomlvc.supabase.co/auth/v1/callback`).
3. Authorized JavaScript origins: `https://comegetit-admin.hu`, `https://come-get-it-venue-hub.lovable.app`, és a preview URL.
4. Client ID + secret beillesztése a Supabase Google provider felületén.
5. Supabase Auth → URL Configuration → Site URL: `https://comegetit-admin.hu`, Redirect URLs lista bővítve a preview + custom domain URL-ekkel.

Kódoldalon:
- Új helper `signInWithGoogle()` az `src/auth/supabaseAuth.ts`-ben: `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/dashboard' } })`.
- `onAuthStateChange` listener a `main.tsx`-ben (vagy egy új `AuthBootstrap` komponensben), hogy OAuth-redirect után a Supabase session → `sessionManager` bridge automatikusan felépüljön (a meglévő profile + memberships fetch logikát kiemeljük egy `hydrateSessionFromSupabaseUser(user)` függvénybe, és az `onAuthStateChange` `SIGNED_IN` eseményén meghívjuk).
- Login screenre egy "Folytatás Google-lel" gomb a Neon Fidelity stílusban.

**Fontos**: az admin felülethez csak az tud belépni Google-lel, akinek a `profiles.is_admin = true` vagy van `venue_memberships` rekordja. Ha egy random Google-user belép, a `handle_new_user` trigger létrehozza a profilját `is_admin=false` értékkel és nincs membershipje → a `RouteGuard` /dashboard-ra dobja, de tartalmat nem lát. Ezt érdemes egy "Nincs jogosultságod ehhez a felülethez, kérj hozzáférést" képernyővel kezelni a néma redirect helyett.

## 3. Stratégiai válasz a gondolataidra (master doksi fényében)

Ezeket nem a kódba építjük, csak a tervezéshez — a doksi szerint Phase 0 (waitlist + alapító partner pipeline) és Phase 1 (BP soft launch, 50 venue, 5000 user, 2026 Q3) most a fókusz.

**A 90 napos prioritás kérdése.** Egyetértek a chicken-and-egg analízissel, és a doksi explicit megerősíti: Phase 1 célja **50 alapító venue Budapesten**, az 5 000 user csak ennek a következménye. Tehát: **partner-side bootstrap először**, user-side waitlist párhuzamos de másodlagos. A doksi 9. szekciója is jelzi, hogy Phase 1 zárás után jön a BD hire — addig founder-led venue acquisition.

**Geo-fókusz.** A doksi a "Budapest urban" célzónát említi de nem szűkít kerületre. A javaslatod (Madách / Király / Kazinczy 500 m sugarú zóna) jó, mert a GIVE + napi ingyen ital értékajánlat csak akkor működik, ha a userek napi/heti rotációval tudnak partnerek között váltani. Ezt mint **"Founding District"** sub-narratívát rá lehet húzni a Founding Partner Programra (10. doksi-szekció).

**Pilot-ajánlat (60 nap ingyen).** Konzisztens a Founding Partner Program-mal. A doksi 25-40k Ft/hó/venue-ról beszél tier-enként; egy 60 napos ingyen pilot + utána "kedvezményes feltételek" pont a Founding Partner narratívához passzol. Konkrét javaslat: első 60 nap ingyen, utána 50% kedvezmény az első évre (vs sima starter 25k → 12.5k Ft/hó).

**Brand Admin nézet nyelvi mix.** Egyetértek — most fele angol, fele magyar. A doksi szerint a brand-target Heineken / Coca-Cola / Pernod, ezek HU leányai magyarul kommunikálnak az operatív szinten. **Javaslat: minden magyar**, az angol csak akkor indokolt, ha tényleg nemzetközi brand HQ a vevő (ami Phase 2+).

**Visszatérő arány vs új/visszatérő bontás.** Egyetértek, érdemes egy második KPI-ként berakni — a doksi 6. szekció szerint a venue value-prop a "no-show 30-40%" megoldása, vagyis a baseline traffic. Az új vs visszatérő bontás pont ezt a sztorit erősíti: "X új vendég jött nálad ezen a héten az appon keresztül, akik máskülönben nem jöttek volna".

**Plusz költés oszlop a Beváltások listában.** Salt Edge integráció a doksi 11. szekciója szerint még nincs kész ("Salt Edge, RevenueCat, push notifications: nincs"), tehát ez a Phase 2 függvénye. Addig "—" placeholder + tooltip ("Salt Edge integráció után elérhető") becsületesebb, mint kihagyni.

**Staff nézet finomítás.** Egyetértek: "Mai top italok" leszedése a Staff dashboardról, a "Cap kihasználtság" radial progress bar-ral kiemelve (zöld→sárga→piros, 90%+ figyelmeztetés). Ez egy elkülönült feladat, nem része ennek a loginhoz kötött PR-nek.

## 4. Mit építünk most ebben a körben

```
Scope (egy iterációban):
├── src/auth/supabaseAuth.ts
│   ├── extract: hydrateSessionFromSupabaseUser(user)   (refactor)
│   └── add:    signInWithGoogle()
├── src/main.tsx  (vagy új AuthBootstrap komponens)
│   └── onAuthStateChange listener → hydrate → sessionManager bridge
├── src/pages/Login.tsx
│   ├── remove role-grid for Supabase mode (mock-only, <details>-ben)
│   ├── add: "Folytatás Google-lel" gomb
│   ├── add: "Elfelejtett jelszó" link (nem implementálom most, csak placeholder)
│   └── visual polish: Neon Fidelity (fekete bg, cyan glow CTA, pill button)
├── src/pages/NoAccess.tsx  (új, opcionális)
│   └── "Nincs jogosultságod" képernyő Google-userek ki nem osztott role esetére
└── src/components/Sidebar.tsx
    └── szerepkör-váltó dropdown csak ha (isAdmin && hasMemberships)
```

A Google provider-t a Supabase Dashboardon a usernek kell beállítania — ezt a szövegben végigvezetjük, nem hagyatkozunk feltételezésre, hogy már aktív.

## 5. Amit nem építünk most

- Forgot-password flow + `/reset-password` route — külön PR, jelzem a doksiban, hogy enélkül a Google login OK, de email-ből nem tud password-ot resetelni.
- Sidebar role-switcher átalakítása — ha jelzed, külön körben.
- Brand Admin nyelvi konzisztencia (magyarítás), Staff "Cap" radial bar, Owner KPI tooltip-ek — külön taskok, mert nem login-scope.
- Founding Partner Program pitch deck / 1-pager / outreach lista — ezek nem kódfeladatok, hanem dokumentum-munka. Ha akarod, külön körben tudok 1-pager PDF-et generálni `/mnt/documents/`-be a doksi alapján.

