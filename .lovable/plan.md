# Venue Hub – „millió dolláros” adminfelület újratervezési terve

## Cél

Egy vezetői szintű, gyorsan áttekinthető adminfelület kialakítása, ahol:

- az AI nemcsak értesítésszöveget, hanem célcsoportot és küldési időpontot is javasol;
- az értékesítési folyamat egyetlen, követhető munkaterületté áll össze;
- a helyszínek állapota, ajánlatai és szerkesztése kevesebb kattintással kezelhető;
- a felhasználók kiemelt helyre kerülnek, és a fontos döntési információk azonnal láthatók;
- a jelenlegi üzleti szabályok, jogosultságok és Supabase-adatok változatlanul megmaradnak.

## Vizuális irány

A kihagyott vizuális választás miatt a meglévő márkavilág marad az alap:

- sötét, prémium CGI felület türkiz főszínnel;
- nagy adatsűrűség, de világos információs hierarchia;
- kevesebb különálló kártya, több összefüggő munkafelület;
- 8 px alatti lekerekítések, vékony elválasztók, visszafogott árnyékok;
- a színek jelentést hordoznak: türkiz = elsődleges, zöld = rendben, borostyán = figyelmet kér, piros = kockázat;
- rövid, célzott animációk állapotváltáskor; a csökkentett mozgás beállítás tiszteletben tartásával.

## 1. Navigáció és információs architektúra

### Új prioritási sorrend

```text
Ma
├── Áttekintés
└── Felhasználók

Értékesítés
├── Jelentkezők
├── Partner pipeline
└── Ajánlatok

Helyszínek
├── Helyszínek
├── QR beváltás
├── Beváltások
├── Jutalmak
├── Promóciók
├── Értesítések
└── Márkák

Növekedés
├── Tartalom
└── Importálás

Számok
└── jelenlegi analitikai oldalak

Admin
└── Audit napló, Beállítások
```

- A **Felhasználók** az Admin csoport aljáról közvetlenül az Áttekintés alá kerül.
- A **Partnerek** csoport neve **Értékesítés** lesz; a meglévő útvonalak és jogosultságok megmaradnak.
- Az aktív részletes oldalaknál az oldalsáv továbbra is a szülő menüpontot jelöli aktívnak.
- A mobilmenü megtartja ugyanezt a sorrendet, nagy érintési felületekkel.

## 2. Értesítések – AI kampánytervező

### Új kezdőnézet

Az Értesítések oldal tetején egy **AI kampánytervező** jelenik meg, nem külön rejtett funkcióként:

- rövid célmező: például „hozzuk vissza a 14 napja inaktív felhasználókat”;
- opcionális helyszín vagy kampánykorlát;
- egy kattintással 2–3 teljes javaslat;
- minden javaslat tartalmazza:
  - címet és push-szöveget;
  - célcsoportot;
  - javasolt küldési módot;
  - pontos, Europe/Budapest szerinti időpontot vagy eseményt;
  - várható elérést, ha az adat elérhető;
  - rövid indoklást és megbízhatósági jelzést.

### Jóváhagyási folyamat

- Az AI **nem küld automatikusan**.
- Műveletek: **Alkalmazás**, **Szerkesztés**, **Másik javaslat**.
- Az „Alkalmazás” kitölti a meglévő értesítési szerkesztőt: tartalom, célzás, időzítés, limitek és csendes órák.
- A szerkesztő egy összefoglaló munkalappá egyszerűsödik; a ritkábban használt beállítások lenyitható „Haladó” részbe kerülnek.
- Az időzítés mellett megjelenik: „AI javaslat”, az indok és az a múltbeli megnyitási minta, amelyre épül.

### Működési megbízhatóság

- A kampányszintű AI-javaslat szerveroldalon, admin jogosultsággal készül.
- A javaslat felhasználja a meglévő értesítési teljesítményt, aktivitási mintákat, aktív helyszíneket, italablakokat és jutalmakat; személyes adat nem kerül a modell promptjába.
- Az időpont mindenhol Europe/Budapest szerint jelenik meg és tárolódik helyesen.
- A tervezett küldés előtt érvényesül a csendes időszak és a gyakorisági korlát.
- A jelenlegi, felhasználói részletes oldalon elérhető AI-javaslat megkapja a látható „legjobb küldési idő” információt és a **Küldés most / Ütemezés** választást.
- Az eseményalapú mód csak akkor marad választható, ha tényleges feldolgozó útja igazolt; különben nem jelenítünk meg látszólag működő lehetőséget.

## 3. Értékesítés – egységes partner pipeline

A meglévő `/partner-leads` lesz a központi **Értékesítés** munkaterület; nem hozunk létre új, párhuzamos oldalt vagy táblát.

### Felső döntési sáv

- teljes leadállomány;
- új és még nem megkeresett helyek;
- válaszra várók;
- elkészült és kiküldött ajánlatok;
- megnyert/elutasított arány;
- következő teendők száma.

A mutatók egyben gyorsszűrők is lesznek.

### Három munkanézet

- **Pipeline:** oszlopokban a jelenlegi státuszok, gyors állapotváltással.
- **Lista:** sűrű, rendezhető táblázat tömeges áttekintéshez.
- **Térkép:** területi prospektáláshoz, a kiválasztott lead adatlapjával.

### Lead részletes panel

A jobb oldali panel első képernyőjén jelenik meg:

- név, osztályzat, pontszám, státusz;
- következő ajánlott lépés;
- kapcsolatfelvételi gombok;
- ajánlat állapota és linkje;
- jegyzet és utolsó kapcsolatfelvétel.

A pilot-ajánlat, megkeresési sablonok és részletes háttéradatok külön, jól címkézett szakaszokba kerülnek. A leggyakoribb műveletek — másolás, ajánlat megnyitása, státuszváltás, jegyzet — a panel tetejéről elérhetők lesznek.

### Oldalak összekapcsolása

- Jelentkezőből közvetlenül megnyitható a kapcsolódó partnerfolyamat, ha van kapcsolat.
- Partner leadből egy kattintással nyílik az ajánlat.
- Az Ajánlatok oldalról vissza lehet lépni a kapcsolódó partnerhez.
- Az Importálás marad technikai eszköz a Növekedés alatt, de sikeres import után közvetlen hivatkozást ad az ajánlathoz és a partnerhez.

## 4. Helyszínek – gyors áttekintés és egyszerű szerkesztés

### Helyszínlista

- A jelenlegi kártya- és táblanézet megmarad.
- Minden sorból elérhető lesz egy **Gyorsnézet**, teljes oldalváltás nélkül.
- A gyorsnézet mutatja:
  - appban látható/rejtett állapot;
  - adatminőségi hiányok;
  - aktív ingyenitalok és következő időablak;
  - legfontosabb kapcsolat és cím;
  - közvetlen Szerkesztés, Beváltások és Részletek műveletek.
- A listában az üzletileg fontos mutatók kerülnek előre; a technikai adatok hátrébb.

### Új helyszín-részletes oldal

A részletes oldal egy kompakt **helyszín-vezérlőpult** lesz:

1. **Állandó fejléc:** kép, név, app-státusz, nyitva/zárva, szerkesztés, szüneteltetés.
2. **Figyelmet kér sáv:** hiányzó kép, koordináta, kapcsolat, ajánlat vagy időablak egy kattintásos javítással.
3. **Döntési összefoglaló:** aktív italok, következő időablak, limitek és legutóbbi beváltási jelzés.
4. **Négy fókuszált nézet:**
   - Áttekintés
   - Italok és ajánlatok
   - Nyitvatartás
   - Beállítások és integráció

A jelenlegi üres „Elemzések” fül kikerül, amíg nincs mögötte valós adat.

### Szerkesztési modell

- A teljes, nagy szerkesztő továbbra is elérhető, de minden fontos szakasz saját „Szerkesztés” műveletet kap, amely rögtön a megfelelő részhez visz.
- A nyitvatartásnak és a címkéknek csak egy mentési útja marad; megszűnik az azonos adat két külön helyen, eltérő módon történő szerkesztése.
- Az italok és a beváltási limitek vizuálisan külön szakaszba kerülnek.
- Mobilon és asztali nézetben azonos mentési lehetőségek lesznek.
- Az időablakok nem jelennek meg kétszer; egyetlen, érintéssel is részletezhető nézet marad.

## 5. Felhasználók – kiemelt ügyfélközpont

### Felhasználólista

- A menüben kiemelt, felső helyre kerül.
- A lista alapértelmezett nézetében közvetlenül látszik:
  - aktivitási állapot;
  - lemorzsolódási kockázat;
  - pontok;
  - beváltások;
  - utolsó aktivitás;
  - ajánlott következő művelet.
- Megmarad a Gyorsnézet és a teljes profil kettőssége.
- A Gyorsnézet és a részletes oldal ugyanazt a gyorsítótárazott lekérést használja, ezért nincs felesleges újratöltés.
- A keresés, státuszszűrés és legutóbb megnyitott felhasználók egyetlen állandó munkasávba rendeződnek.

### Új felhasználói részletes oldal

Az első képernyő csak a döntéshez szükséges információkat mutatja:

- személyazonosság és elérhetőség;
- aktivitás, érték, kockázat és pontállapot;
- „Mi történt?” rövid összefoglaló;
- „Mit tegyünk?” AI által támogatott következő lépés;
- Push küldése/ütemezése, jutalom vagy pontművelet.

Az információk négy fő nézetbe rendeződnek:

1. **Áttekintés** – összefoglaló, kockázat, kedvencek, legutóbbi események.
2. **Viselkedés** – trendek, aktivitási hőtérkép, affinitás, előrejelzések.
3. **Érték és beváltások** – költés, pontfolyam, ingyenital- és jutalombeváltások.
4. **Kommunikáció** – AI-javaslatok, időzítés, értesítési előzmények.

A jelenlegi mélyen egymásba ágyazott fülek helyett egy szintű navigáció és szakaszon belüli összecsukható blokkok lesznek. A legfontosabb figyelmeztetések minden releváns nézetből elérhetők maradnak.

## 6. Megvalósítási sorrend

### 1. alap – közös minták

- Navigáció átrendezése.
- Közös oldalfejléc, döntési mutató, figyelmeztető sáv és gyorsnézet minták kialakítása a meglévő shadcn/CGI elemekből.
- Meglévő színek szemantikus tokenekbe rendezése; a felületi fájlokban ne legyen új, nyers színérték.
- A jelenlegi fordítási hiba (`GeoJSON` típus hiánya) izolált javítása, hogy az ellenőrzések megbízhatóan fussanak.

### 2. Felhasználók

- Menüpozíció és lista prioritásainak frissítése.
- Gyorsnézet/részletes adatlekérés közösítése.
- Részletes oldal négy fő nézetre rendezése.
- AI kommunikáció és következő művelet feljebb emelése.

### 3. Helyszínek

- Helyszín gyorsnézet elkészítése.
- Részletes oldal új fejlécének, figyelmeztető sávjának és nézeteinek kialakítása.
- Duplikált szerkesztések és időablak-megjelenítés megszüntetése.
- Mobil és asztali mentési folyamat egységesítése.

### 4. Értékesítés

- Központi pipeline-fejléc és gyorsszűrők.
- Pipeline/lista/térkép nézetek egységesítése.
- Lead panel prioritási és gyorsműveleti átrendezése.
- Jelentkező–lead–ajánlat keresztlinkek kiépítése meglévő adatokból.

### 5. AI értesítések

- Kampányszintű javaslatkészítés és admin jogosultság.
- AI-javaslat kártyák és szerkesztő-előtöltés.
- Javasolt időpont, csendes órák és gyakorisági korlát ellenőrzése.
- Felhasználói részletes oldal azonnali/ütemezett választásának beépítése.
- Minden küldés továbbra is emberi jóváhagyást igényel.

### 6. Ellenőrzés

- TypeScript, production build és csak az érintett fájlok lintelése.
- Asztali és mobil ellenőrzés minden fő oldalon.
- Végponttól végpontig ellenőrzés admin munkamenettel: keresés, gyorsnézet, szerkesztés, státuszváltás, ajánlat-link, AI-javaslat alkalmazása és ütemezése.
- Jogosultsági ellenőrzés: admin, venue owner és staff nézetben sem jelenhet meg tiltott adat vagy művelet.

## Technikai korlátok és döntések

- A meglévő Supabase projekt, táblák és üzleti szabályok maradnak az adatforrások.
- Nem hozzuk vissza a megszüntetett `growth_leads`, `growth_signups` vagy `growth_offer_requests` használatát.
- Nem készül párhuzamos értékesítési adatmodell; a `partner_leads`, `growth_offers` és meglévő jelentkezői folyamat marad.
- Új adatbázis-objektum csak akkor kerülhet szóba, ha egy szükséges működés a meglévő sémával bizonyíthatóan nem oldható meg; ezt külön jóváhagyás előzné meg.
- AI nem hozhat önálló küldési döntést, nem kerülhet ki emberi jóváhagyás nélkül értesítés.
- A jelenlegi szerepkör- és útvonalvédelem nem lazul.
- A redesign nem változtatja meg a beváltási, jutalom-, helyszínaktivitási vagy partnerjogosultsági szabályokat.

## Elfogadási feltételek

- A Felhasználók legfeljebb egy kattintásra van az Áttekintéstől.
- Egy partner lead státusza, kapcsolatfelvétele és ajánlata ugyanazon munkafelületen kezelhető.
- Egy helyszín fő állapota és hiányosságai oldalváltás nélkül megtekinthetők.
- A helyszín részletes oldalon nincs üres fül és nincs ugyanazon mezőhöz két félreérthető mentési út.
- Az AI-javaslat tartalmaz üzenetet, célzást, küldési időt és indoklást.
- AI-javaslatból egy jóváhagyással kitöltött, szerkeszthető kampány készül, de automatikus küldés nem történik.
- A felhasználói részletes oldal első képernyőjén látszik a kockázat, érték, aktivitás és következő művelet.
- A fő munkafolyamatok 390 px és 1300 px szélességen is átfedés és levágott szöveg nélkül használhatók.
