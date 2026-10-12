# Maradjon bejelentkezve – 30 napos munkamenet

## Cél

Aki bejelentkezik a Venue Hubba (így a gataibence@ fiók is), ne kelljen naponta újra belépnie: a munkamenet 30 napig érvényes maradjon, amíg a felhasználó nem jelentkezik ki kézzel.

## Jelenlegi állapot

- A böngészőoldali kód már megfelelő: a Supabase kliens `persistSession: true` és `autoRefreshToken: true` beállítással fut, vagyis a munkamenetet elmenti és automatikusan megújítaná.
- A korlát a szerveroldali hitelesítési beállítás: a frissítő token (refresh token) élettartama határozza meg, meddig maradhat valaki belépve. Ezt kell 30 napra (2 592 000 másodperc) állítani.

## Tervezett módosítás

1. **Auth beállítás (Lovable Cloud):** a frissítő token élettartamának beállítása 30 napra a projekt hitelesítési konfigurációjában.
2. **Kódoldali ellenőrzés:** a meglévő `persistSession` / `autoRefreshToken` beállítások megtartása – kódmódosítás várhatóan nem kell.
3. **Ellenőrzés:** bejelentkezés után a munkamenet megmarad böngésző-újraindítás és oldalfrissítés után is.

## Fontos tudnivalók

- A beállítás **projektszintű**: nem lehet csak a gataibence@ fiókra korlátozni – minden bejelentkezett felhasználóra (admin, helyszíntulajdonos, staff) érvényes lesz a 30 napos munkamenet.
- A kijelentkezés gomb továbbra is azonnal megszünteti a munkamenetet.
- A jogosultság-ellenőrzés (admin/staff szerepkör) változatlanul minden betöltéskor az adatbázisból történik, így a hosszabb munkamenet nem gyengíti a hozzáférés-kezelést.

## Elfogadási feltétel

- Bejelentkezés után 30 napig (kijelentkezés nélkül) az oldal újratöltésekor a felhasználó belépve marad, és a /dashboard töltődik be a login oldal helyett.
