## Probléma

Mobil nézetben a Joyride bemutató tooltip kicsúszik a képernyő bal szélén — a cím, a "Kihagyás" gomb és a szöveg eleje is levágódik. A jelenlegi `width: calc(100vw - 32px)` + `margin: 0 16px` kombináció + `placement: 'center'` floater pozicionálás miatt a tooltip negatív `left` koordinátán renderelődik.

## Megoldás (`src/components/tours/OnboardingTour.tsx`)

1. **Mobil tooltip méretezés újraírása**
   - `options.width` → fix érték (pl. `Math.min(window.innerWidth - 24, 360)`), nem `calc`, mert a Joyride numerikus értéket vár a pozícióhoz.
   - `tooltip.maxWidth` ugyanaz, `margin` eltávolítva (a Joyride wrapper kezeli a pozíciót, margin eltolja).
   - `tooltip.padding` mobilon `14px` a kompaktabb megjelenésért.
   - `tooltipTitle` fontSize `15px`, `tooltipContent` `13px` mobilon.

2. **Gombok mobilon**
   - `buttonNext` és `buttonSkip` kapjon `fontSize: 13px`, `padding: 8px 12px`, hogy egy sorba férjenek.
   - A "Next (Step X of Y)" felirat lokalizálva legyen magyarra (`next: 'Tovább'`) — a `(Step X of Y)` a `showProgress` natív felirata; rövidítjük: külön `locale` magyar progress nem támogatott, helyette `showProgress={!isMobile}` mobilon kikapcsolva, így csak "Tovább" gomb látszik (a lépésszám a tooltipben másképp jeleníthető meg, de mobilon a hely miatt elhagyható).

3. **Pozicionálás**
   - `floaterProps.placement` mobilon maradjon `'center'`, de adjunk hozzá `floaterProps.styles = { floater: { maxWidth: '100vw' } }`-t, és `disableScrolling: false`, hogy a viewport-on belül maradjon.
   - `disableScrollParentFix: true` hozzáadása, hogy a fixed pozicionálás ne számoljon félre.

4. **Welcome (első) lépés**
   - A `disableBeacon: true` első lépésnél (a `tourSteps.ts`-ben már így van — ellenőrizzük), `placement: 'center'` explicit mobil esetén az első lépésnél, hogy középen ne csússzon ki.

## Érintett fájlok

- `src/components/tours/OnboardingTour.tsx` — mobil stílusok és floaterProps átírása
- (opcionális) `src/components/tours/tourSteps.ts` — első lépés `placement: 'center'` megerősítése, ha hiányzik

Nincs üzleti logika változás, csak a bemutató UI mobil optimalizálása.