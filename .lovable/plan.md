## Probléma

A mobilappban (és bármely nem-admin nézetben) a helyszín megnyitásakor ez a hiba jelenik meg:

> permission denied for function is_venue_publicly_active

Ok: a `free_drink_windows` táblán van egy RLS policy (`Public can view windows of active venues`), ami a `public.is_venue_publicly_active(uuid)` függvényt hívja. A legutóbbi biztonsági migráció során az `anon` és `authenticated` szerepektől elvettük az EXECUTE jogot erre a függvényre, így a policy kiértékelése hibára fut → a helyszín részletei nem tölthetők be, nem szerkeszthetők, nem lehet képet módosítani stb.

Az újonnan felvitt helyszínek nem "hibásak", csak ez a jogosultsági hiba blokkolja őket (a régiek ugyanígy érintettek lennének, csak eddig cache-ből jöttek).

## Terv

Egyetlen migráció, ami visszaadja a szükséges EXECUTE jogot a security definer függvényre — semmi más adat/szerkezet nem változik.

```sql
GRANT EXECUTE ON FUNCTION public.is_venue_publicly_active(uuid) TO anon, authenticated;
```

Ez biztonságos:
- A függvény `SECURITY DEFINER`, `STABLE`, egyetlen boolean-t ad vissza arról, hogy egy adott venue publikusan aktív-e (`is_paused = false`).
- Nem szivárogtat érzékeny adatot, csak azt támogatja, amit a policy amúgy is engedélyez.
- A `venues` tábla RLS-ét nem módosítjuk, a rejtett (`is_paused=true`) helyszínek továbbra sem lesznek elérhetők publikusan.

## Ellenőrzés a migráció után

1. Admin (`/venues/:id`) — új helyszín megnyitása, szerkesztése, képek cseréje működik.
2. Mobilapp — látható helyszín részletei betöltődnek, hibaüzenet eltűnik.
3. Rejtett helyszín továbbra is 404-et ad a `get-public-venue` végponton.

## Mit nem csinálunk

- Nem módosítjuk a `venues` / `free_drink_windows` RLS policy-kat.
- Nem nyúlunk a `get-public-venues` / `get-public-venue` edge függvényekhez.
- Nem érintjük a legutóbbi biztonsági javításokat egyéb függvényeken.
