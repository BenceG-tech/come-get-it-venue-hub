## Cél
Egy egyszerű kapcsoló, amivel a helyszín aktív/inaktív állapotát tudod állítani az admin felületen. Inaktív állapotban a helyszín **nem jelenik meg a mobilapplikációban**, aktívra állítva újra láthatóvá válik.

## Jó hír: a háttér már készen van
A `venues` táblában létezik az `is_paused` mező, és a publikus végpontok (`get-public-venues`, `get-public-venue`) valamint az RLS policyk már most is kiszűrik azokat a helyszíneket, ahol `is_paused = true`. **Nem kell backend módosítás, sem migráció** — csak az admin UI-t kell bővíteni a kapcsolóval.

## Változtatások

### 1. Helyszín lista (`src/pages/Venues.tsx`)
- A jelenlegi "Aktív" / "Szünetel" badge mellé (mind a mobil lista, mind a desktop grid, mind a táblázat nézetben) kerül egy **Switch** kapcsoló, amivel egy kattintással állítható az állapot.
- Kattintáskor `supabase.from('venues').update({ is_paused: !current })`, majd toast visszajelzés magyarul: „Helyszín aktiválva" / „Helyszín inaktiválva — nem jelenik meg az appban".
- Optimista frissítés + hibakezelés visszaállítással.

### 2. Helyszín szerkesztő modal (`src/components/VenueFormModal.tsx`)
- Új mező a form tetején: **„Megjelenik a mobilappban"** címkéjű Switch (a `is_paused` invertáltja).
- Rövid leírás alatta: „Ha kikapcsolod, a helyszín eltűnik az applikációból, de az adatok megmaradnak."

### 3. Helyszín részletező oldal (`src/pages/VenueDetail.tsx` — ha van)
- Prominens státusz kártya a tetején: nagy Switch + magyarázó szöveg, hogy egyértelmű legyen az állapot.

## Fontos: mi a különbség a helyszín inaktiválás és az ital szüneteltetés között
- **Helyszín inaktív** (`venues.is_paused = true`) → az egész helyszín eltűnik az appból (mostani módosítás).
- **Ital ablak szüneteltetés** (`FreeDrinkManager`) → a helyszín látszik, de az adott ingyen ital nem elérhető (már működik).
- Ezt az admin UI-ban is világosan jelezzük a segédszövegekkel, hogy ne keveredjen össze a két funkció.

## Amit NEM érintünk
- Adatbázis séma, migrációk, edge functions, RLS.
- Rork mobilapp — automatikusan követi a változást a meglévő API-n keresztül.
- Az italok és a `free_drink_windows` logikája.
