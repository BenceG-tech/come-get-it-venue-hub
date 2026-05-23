## Mit kell javítani

A három probléma a feltöltött screenshotok és a kódbázis átnézése alapján:

### 1. Helyszín szerkesztő — „Mentés" gomb elcsúszva

`src/components/VenueFormModal.tsx` (Dialog + Sheet közös `formContent`).

Most:
```
<form class="flex flex-col h-full">
  <Tabs class="flex-1 flex flex-col min-h-0">
     ...sticky top tabs...
     <div class="flex-1 overflow-y-auto">...TabsContent...</div>
  </Tabs>
  <div class="sticky bottom-0 ...">Mégse / Mentés</div>
</form>
```

A „sticky bottom-0" sáv a `<Tabs>` után ül, de mivel a form maga nem scrollol (csak a belső div), a `sticky` nem ragad sehová. Mobilon (Sheet) és bizonyos magasságoknál a gombsor a Tabs alá rendereldik, és úgy néz ki, mintha a form közepén lebegne — pontosan ez látható a screenshoton.

Javítás: a gombsort tisztán flex-footernek kezelni (nincs sticky, hanem `flex-shrink-0` a `formContent` alján), és a `<Tabs>` legyen az egyetlen `flex-1 min-h-0` gyerek. Így a TabsContent scrollja a footer FÖLÖTT véget ér, a gombsor pedig mindig a modal alján marad — desktopon és mobilon egyaránt.

Konkrétan:
- `<form className="flex flex-col h-full min-h-0">`
- `<Tabs className="flex-1 min-h-0 flex flex-col">` változatlan
- `<div className="flex-shrink-0 border-t border-cgi-muted bg-cgi-surface pt-3 mt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">` — eltávolítjuk a `sticky bottom-0`-t
- Mobilon a Sheet `p-4` paddingjét lecsökkentjük `px-4 pt-4 pb-[max(env(safe-area-inset-bottom),1rem)]`-re, hogy iOS Safari home indicator ne takarja a gombot.

### 2. Mobil sidebar / menü

`src/components/Sidebar.tsx`.

Problémák a 2. screenshot alapján:
- A hamburger/X gomb `fixed top-4 left-4 z-50` — amikor a sidebar nyitva van, az X gomb a Come Get It logó FÖLÉ úszik (lásd screenshot 2, bal felső sarok).
- A toggle gomb ráül az oldalak címsorára (pl. Dashboard h1) szűk képernyőn.
- A „Súgó" és „Kilépés" lent kicsi és kettéosztott — mobilon kényelmetlen.

Javítás:
- A nyitvatartás idejére az X gombot **a sidebar saját headerébe** rakjuk (jobb felső sarok a sidebar fejlécében), a külső hamburger gomb csak akkor látszik, ha a sidebar zárva.
- A fixed hamburger gombot kisebbre, kompaktabbra (`h-9 w-9 rounded-full`) és helyezzük el úgy, hogy ne ütközzön a tartalommal: `top-3 left-3`. Hozzáadunk `lg:hidden` mellé `aria-label`-t.
- A `PageLayout` mobilon kapjon `pt-14` / `pl-14` paddingot, hogy az oldalak címsora ne csússzon a hamburger alá. (Csak akkor módosítjuk, ha jelenleg nem így van — gyors ellenőrzés.)
- A footer (`Súgó` / `Kilépés`) mobilon legyen full-width két sorban: `flex-col sm:flex-row` és `justify-center` ikonokkal, h-10 méretben.
- Az overlay `bg-black/50` -> `bg-black/60 backdrop-blur-sm` egységes érzet miatt.

### 3. Belépés képernyő — „súgó / segítő ablakok"

`src/pages/Login.tsx`.

Itt valószínűleg a következőkre gondolsz (kérlek erősítsd meg ha mást):
- A „Demo gyors-belépés (fejlesztői mód)" `<details>` szekció — mobilon a 2 oszlopos grid túlcsordul az `<Input>` alá.
- A natív `alert(...)` hívások („Bejelentkezés sikertelen…", „Felhasználó nem található", „Az elfelejtett jelszó funkció hamarosan elérhető lesz") — natív alert-ablak mobilon csúnya és nem brand-konform.
- A „Supabase hitelesítés aktív" pill túl kicsi tap-target.

Javítás:
- A `alert(...)` hívásokat lecseréljük `useToast()` hívásokra (vagy a meglévő `<Alert>` komponens inline megjelenítésére a kártya tetején) — ezek már mobil-optimalizáltak és a meglévő design tokeneket használják.
- A „Demo" details szekciót csak fejlesztői módban mutatjuk (már így van), és a gridet `grid-cols-2 gap-2` helyett `flex flex-wrap gap-2` szabássá tesszük, hogy 320px-en is elférjen.
- A Card maximum szélességét és paddingot mobilra finomítjuk: `p-4 sm:p-6`, és a Card scrollolható legyen ha alacsony a viewport (pl. iPhone SE landscape): a wrapper `min-h-screen` mellé `overflow-y-auto`.
- A „Elfelejtetted a jelszót?" gomb tap-target-je `py-2`-re növelve.

### Fájlok, amelyeket módosítok

- `src/components/VenueFormModal.tsx` — footer sticky elhagyása, safe-area padding
- `src/components/Sidebar.tsx` — X gomb a sidebar headerbe, fixed hamburger kompaktabb, footer mobil layout
- `src/components/PageLayout.tsx` — mobil `pt-14` ha még nincs (gyors check)
- `src/pages/Login.tsx` — `alert` → `toast`, details grid → flex-wrap, paddingok finomítása

### Kérdés mielőtt nekiállok

A „belépésnél a súgó/segítő ablakok" alatt a fenti három dolgot érted (natív `alert`-ek, demo role picker, Supabase pill), vagy konkrétan az **onboarding tour** popoverekre gondolsz (`react-joyride`), amelyek belépés UTÁN jelennek meg a dashboardon? Utóbbi külön komponens (`src/components/tours/`), és más javítást igényel.

Ha rákattintasz az „Implement plan"-re az első értelmezéssel megyek; ha az onboarding tourra gondolsz, írd vissza és a tervet azzal egészítem ki.
