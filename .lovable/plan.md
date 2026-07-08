# Mobil VenueFormModal – kompakt bottom bar

## Probléma
A jelenlegi mobil form alján 3 egymásra pakolt, full-width gomb foglal ~35% képernyőt (Mentés és bezárás / Mentés / Mégse), így alig marad görgethető terület. A felső sávban már van egy „Mentés" gomb és a Sheet X-e (bezárás), így az alsó gombok nagyrészt redundánsak.

## Megoldás – csak mobilon

### 1. Alsó akciósáv teljesen új mobilon
A jelenlegi 3 stacked gomb helyett **egyetlen kompakt sor** a lap alján:

```
[ Mégse ]         [ ✓ Mentés és bezárás ]
```
- Kb. 48px magas összesen (a jelenlegi ~180px helyett).
- „Mentés" külön gombot **elhagyjuk** mobilon – a felső sarok Mentés gomb már fedi ezt a funkciót.
- A két gomb egy sorban `flex-row`, `flex-1` szélességgel, `h-10`, `text-sm`, ikonnal.
- Nincs `flex-col-reverse` mobilon.

### 2. Felső fejléc kompaktabb
- SheetHeader jelenleg `mb-2` + `pr-8` – tömörítjük `mb-1`-re és cím + Mentés egy sorban marad.
- A tab-select `h-11` helyett `h-10`, hogy még pár px-t nyerjünk.

### 3. Content padding csökkentés
- `SheetContent` jelenleg `p-4` – mobilon `px-3 pt-3 pb-2`.
- `pt-4` a tabs contentnél → `pt-3`.
- A gap-ek a form mezők között (jelenleg `space-y-4`) → `space-y-3` mobilon.

### 4. Sticky bottom bar – ne foglaljon extra helyet
- A bottom action bar `border-t` marad, de `pt-2 mt-1` (jelenleg `pt-3 mt-2`).

## Eredmény
- ~130px-el több görgethető terület mobilon.
- Egy kompakt sor a legfontosabb műveletekkel.
- A gyakori „gyors mentés" a felső sarokból marad, a „mentés és bezárás" alul.

## Érintett fájl
- `src/components/VenueFormModal.tsx` – csak a mobil ág (isMobile) és a bottom bar rendere.

## NEM változik
- Desktop nézet (marad 3 gomb az alsó sávban).
- Mentési logika, formmezők, tabok tartalma.
