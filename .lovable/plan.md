## Probléma

Az előző javításnál minden mobil lépést `placement: 'center'`-re kényszerítettem, így a tooltip a képernyő közepén lebeg, és nem mutat rá a tényleges elemre (spotlight sem látszik a sidebar nav elemeknél, mert mobilon a sidebar alapból összecsukva van).

## Megoldás

### 1. `src/components/tours/OnboardingTour.tsx`
- **Vissza a step által megadott `placement`-re** (ne legyen globális center override).
- A tooltip mérete maradjon fix `mobileWidth`, így nem csúszik ki.
- `floaterProps.placement: 'auto'` mobilon is, hogy a Joyride a viewport-on belülre tegye a tooltipet a target köré.
- **Sidebar lépéseknél a sidebart ki kell nyitni mobilon**, mielőtt a target spotlight-olódna. Ezt step-szintű `data-tour` cél köré írt egyszerű megoldással: ha `target` `[data-tour^="nav-"]` vagy `sidebar-header` és `isMobile`, akkor a `callback` `EVENTS.STEP_BEFORE` eseményénél a `<aside data-mobile-sidebar>` kinyitása (a `Sidebar.tsx` jelenlegi mobil drawer state-je trigger-elhető `window` esemény vagy egy `useTour` mellé tett kis kontextus-flag-en keresztül).
  - Egyszerűbb és kevésbé invazív alternatíva: a Sidebar komponensbe egy `useEffect` ami figyel egy `window.dispatchEvent(new CustomEvent('cgi:open-mobile-sidebar'))` eseményt és kinyitja a drawert. A tour callback `STEP_BEFORE`-nál dispatch-eli ezt, ha a step targetje sidebar-on belüli.
- **STEP_AFTER-nél** a sidebart bezárjuk hasonlóan (`cgi:close-mobile-sidebar`), hogy a következő nem-sidebar lépés ne legyen takarva.

### 2. `src/components/Sidebar.tsx`
- Window event listener hozzáadása: `cgi:open-mobile-sidebar` → mobil drawer megnyitása, `cgi:close-mobile-sidebar` → bezárás. Csak akkor reagál, ha `isMobile`.

### 3. `tourSteps.ts` (nincs változás)
- Megtartjuk az eredeti `placement: 'right'` értékeket; mobilon az `auto` floater placement úgyis átteszi a tooltipet (pl. lent/fent), a spotlight viszont a tényleges nav elemre fog mutatni.

## Eredmény

- A welcome lépés (target: sidebar-header) — sidebar kinyit → tooltip a header alatt jelenik meg.
- A nav lépések — sidebar nyitva marad amíg nav step-ek mennek, a spotlight a megfelelő nav itemre kerül.
- Az utolsó (role-switcher / help-button) lépéseknél a sidebart bezárjuk vagy nyitva hagyjuk, attól függően hogy a target hol van — egyszerűsített logika: amíg a target `[data-tour="nav-*"]` vagy `sidebar-header` vagy `help-button`, a sidebar nyitva van; egyébként zárjuk.

## Érintett fájlok
- `src/components/tours/OnboardingTour.tsx` (placement reset + sidebar nyitás eseménnyel)
- `src/components/Sidebar.tsx` (window event listener a drawer-hez)