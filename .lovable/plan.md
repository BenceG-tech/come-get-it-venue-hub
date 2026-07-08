## Cél

A helyszín szerkesztésén belül az **Italok & Limitek** és **Képek** részeket teljesen átrendezem mobilra, és a beváltási folyamatnál elkülönítem a valódi üzleti korlátokat a teszteléstől, hogy végig lehessen nézni a sikeres beváltási élményt.

## 1. Italok kezelése: új mobilbarát szerkezet

- A jelenlegi hosszú, zsúfolt kártyalistát lecserélem egy kompaktabb, áttekinthetőbb italkezelőre.
- Minden ital egy rövid sor/kártya lesz:
  - ital neve
  - kategória
  - „Ingyenes” státusz
  - időablak állapot: például „Ma aktív”, „Nincs időablak”, „H-P 10:00–14:00”
  - kis műveletgombok: szerkesztés, törlés
- A részletek nem nyílnak ki óriási blokkban a listán belül, hanem egy külön, fókuszált mobil szerkesztőnézetben / alsó sheetben:
  - alap adatok
  - kép
  - ingyenes ital kapcsoló
  - időablakok
  - mentés
- Az „Új ital hozzáadása” részt egyszerűsítem egy jól látható „+ Ital” gombra, ami ugyanazt a kompakt szerkesztőt nyitja.
- Az időablakoknál adok gyors preseteket:
  - „Mindennap”
  - „Hétköznap”
  - „Ma egész nap”
  - „Mostantól zárásig”
- Az ingyenes italnál alapból automatikusan létrejön egy használható időablak, hogy ne emiatt akadjon el a beváltás.

## 2. Ital képfeltöltés újragondolása

- Az ital képét nem URL inputként mutatom elsődlegesen mobilon, hanem képes feltöltő felületként:
  - ha nincs kép: nagy, érthető „Kép feltöltése” zóna
  - ha van kép: előnézet, csere, törlés
- Az URL mező másodlagos, összecsukható „haladó” opció lesz.
- Feltöltés után azonnal látható lesz az előnézet, nem kell keresgélni, hogy sikerült-e.

## 3. Helyszín képek újragondolása

- A helyszín képeknél mobilon galéria jellegű, kompakt képkezelőt készítek:
  - első kép / főkép egyértelmű jelölése
  - több kép feltöltése egyszerre
  - képcsere / törlés / főkép beállítás egyértelmű ikonokkal
  - sorrendállítás mobilon drag helyett alternatív fel/le gombokkal is, mert a drag mobilon nehézkes
- A magyarázó szövegeket rövidebbre veszem, hogy több hasznos tartalom férjen ki.

## 4. Beváltási folyamat: mi akadályoz most

A backend alapján jelenleg **nincs lokációellenőrzés** az `issue-redemption-token` vagy `consume-redemption-token` funkcióban. Ha lokáció miatt akad el, az valószínűleg a Rork mobilapp kliensoldali logikájában van.

A backend viszont most ezek miatt megállíthatja a folyamatot:

- nincs aktív ingyenes ital időablak (`NO_ACTIVE_WINDOW`)
- 5 perces tokenkérés limit (`RATE_LIMITED`)
- napi 1 ingyen ital globális limit (`USER_GLOBAL_DAILY_LIMIT`)
- helyszín napi/órás limit (`DAILY_CAP_REACHED`, `HOURLY_CAP_REACHED`)
- token lejár 2 perc után (`EXPIRED`)
- POS oldalon staff jogosultság hiányzik (`VENUE_UNAUTHORIZED`)

## 5. Beváltás tesztelhetővé tétele anélkül, hogy a produkciós szabályokat tönkretennénk

A meglévő üzleti szabály szerint a produkciós rendszerben napi 1 ingyen ital/user limit van. Emiatt nem törölném vakon a védelmeket, hanem hozzáadok egy kontrollált **teszt / preview módot**.

- `issue-redemption-token` kap egy biztonságosan korlátozott teszt módot, amivel admin/teszt környezetben átugorható:
  - aktív időablak ellenőrzés
  - rate limit
  - napi user limit
  - venue cap
- A válaszban részletesebben visszaadom, ha valami blokkol:
  - pontos `code`
  - emberi üzenet
  - mit kell módosítani az adminban vagy Rorkban
- A POS `consume-redemption-token` hibáit is érthetőbbé teszem, főleg staff jogosultság és lejárt token esetén.

## 6. Rork app teendők dokumentálása

Frissítem a Rork integrációs dokumentációt úgy, hogy egyértelmű legyen:

- a beváltás ne legyen lokációhoz kötve, ha nem akarjuk
- a lokáció csak sorrendezésre / közeli helyek mutatására legyen használva
- a `Beváltás` gomb ne tiltsa le magát csak azért, mert nincs GPS engedély
- ha a távolság szerinti rendezés aktív, GPS hiba esetén fallback legyen normál sorrendre
- a sikeres folyamat képernyői:
  1. helyszín kiválasztása
  2. ital kiválasztása / ingyen ital megjelenítése
  3. QR/token generálása
  4. POS scan
  5. sikeres beváltás visszajelzés

## 7. Ellenőrzés

- Ellenőrzöm mobil nézetben, hogy az ital- és képkezelés kisebb helyet foglal, jobban görgethető, és nem nyomja össze az alsó mentősáv.
- Ellenőrzöm, hogy az ingyenes italhoz alapértelmezett időablak létrejön, így nem akad el az admin konfiguráció miatt.
- Ellenőrzöm a beváltási backend útvonalat egy teszt tokennel:
  - token kiadás
  - token beváltás
  - sikeres response szerkezete

## Érintett részek

- `src/components/EnhancedDrinkSelector.tsx`
- `src/components/SimpleImageInput.tsx`
- `src/components/ImageUploadInput.tsx`
- `src/components/VenueFormModal.tsx`
- `supabase/functions/issue-redemption-token/index.ts`
- `supabase/functions/consume-redemption-token/index.ts`
- `docs/RORK_FREE_DRINKS_INTEGRATION.md`
- szükség esetén egy új rövid Rork troubleshooting dokumentum