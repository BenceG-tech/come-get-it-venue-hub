// Outreach texts and labels for the partner acquisition pipeline.
// Ported from the Vezérlőpult so the admin produces the same messages.

export interface LeadProposal {
  szcenario?: string;
  tetel?: string;
  b_tetel?: string;
  idosav?: string;
  keret?: string;
  miert?: string;
  teszt?: string;
}

export interface OfferRequest {
  requested_at: string;
  drink: string;
  slot: string;
  daily_cap: number;
}

export interface PartnerLead {
  id: string;
  name: string;
  venue_type: string | null;
  description: string | null;
  intro: string | null;
  address: string | null;
  district: string | null;
  opening_hours: string | null;
  drinks: string[] | null;
  website: string | null;
  instagram: string | null;
  instagram_handle: string | null;
  facebook: string | null;
  email: string | null;
  phone: string | null;
  photo_url: string | null;
  gmaps_url: string | null;
  lat: number | null;
  lon: number | null;
  rating: number | null;
  rating_count: number | null;
  grade: "A" | "B" | "C" | "D" | null;
  score: number | null;
  stage: number;
  stage_log: { stage: number; at: string }[];
  quiet_hours: { tol?: number; ig?: number } | null;
  proposal: LeadProposal;
  offer_url: string | null;
  offer_info: string | null;
  offer_request: OfferRequest | null;
  note: string | null;
  source: string | null;
  updated_at: string;
}

export const STAGES: { label: string; className: string }[] = [
  { label: "Kiválasztva", className: "text-slate-300 border-slate-500/40" },
  { label: "Üzenet kész", className: "text-slate-200 border-slate-400/40" },
  { label: "Elküldve", className: "text-cyan-300 border-cyan-500/40" },
  { label: "Követő üzenet", className: "text-blue-300 border-blue-500/40" },
  { label: "Válaszolt", className: "text-amber-300 border-amber-500/40" },
  { label: "Hívás egyeztetve", className: "text-violet-300 border-violet-500/40" },
  { label: "Partner lett", className: "text-emerald-300 border-emerald-500/40" },
  { label: "Most nem", className: "text-red-300 border-red-500/40" },
];

export const DRINK_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Javaslat szerint" },
  { value: "limonade", label: "Házi limonádé" },
  { value: "kave", label: "Kávé" },
  { value: "bor", label: "Fröccs" },
  { value: "sor", label: "Csapolt sör" },
  { value: "valasztas", label: "Ők választanak (javaslattal)" },
];

function slug(s: string) {
  return (
    String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/^@/, "")
      .replace(/[^a-z0-9._]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "hely"
  );
}

export function venueLink(lead: PartnerLead) {
  return (
    "https://come-get-it.app/vendeglatohelyek?utm_source=instagram&utm_medium=dm&utm_campaign=founding-partner&utm_content=" +
    slug(lead.instagram_handle || lead.name)
  );
}

function kerShort(k: string | null) {
  return k ? k.replace(/\s*kerület/i, ". ker.").replace(/\.\.+/g, ".") : "Budapest";
}

export function proposalSlot(proposal: LeadProposal): [number, number] {
  const m = (proposal.idosav || "").match(/(\d{1,2}):00–(\d{1,2}):00/);
  return m ? [Number(m[1]), Number(m[2])] : [14, 16];
}

export function outreachTexts(lead: PartnerLead): [string, string][] {
  const nev = lead.name;
  const j = lead.proposal || {};
  const link = venueLink(lead);
  const ker = lead.district ? " a " + kerShort(lead.district).replace(". ker.", ". kerületben") : " Budapesten";
  const sav = j.idosav || "a csendesebb óráitokban";
  const tetel = j.tetel || "egy ital";
  const miert = lead.rating
    ? "A Google-on kapott " + String(lead.rating).replace(".", ",") + " pontos értékelésetek alapján szívesen bemutatnánk a helyet az appunkban"
    : "Pont olyan helyeket keresünk, mint a " + nev;
  const teszt = j.b_tetel
    ? "\n\nJavaslatunk egy rövid összehasonlító próba: az első két héten " + tetel + ", a következő két hétben " + j.b_tetel +
      ". Így kiderül, melyik italt választják többen; az eredményeket ti is követhetitek."
    : "";
  const ajanlat =
    "Javasolt próbaidőszak · " + nev +
    "\n\nJavasolt megoldás: " + (j.szcenario || "A · Csendes óra") +
    "\nTétel: " + tetel + (j.b_tetel ? " (B-változat: " + j.b_tetel + ")" : "") +
    "\nIdősáv: " + sav +
    "\nKeret: " + (j.keret || "kezdetben napi 5 ital, igény szerint emelhető") +
    "\nMiért ez a sáv: " + (j.miert || "–") +
    (j.teszt ? "\nItalok összehasonlítása: " + j.teszt : "") +
    "\n\nA pilot 4 hét, platformdíj nélkül, bármikor szüneteltethető. A kiadott tétel költségét a hely viseli, a napi keret erejéig. Heti riport a beváltásokról. A vendégszám növekedését nem garantáljuk; a beváltások alakulását mérjük.";
  const quiet = lead.quiet_hours;
  return [
    ["E-mail · tárgy", nev + " × Come Get It · új vendégek " + sav],
    [
      "E-mail · szöveg",
      "Kedves " + nev + " csapata!\n\nGátai Bence vagyok, a Come Get It alapítója. November 2-ra tervezzük az app budapesti indulását: a felhasználók QR-kóddal váltanak be egy ingyen italt a partnerhelyeken, abban az idősávban, amit a hely választ.\n\n" +
        miert + ". Szeretnénk meghívni titeket az induló partnerprogramunkba" + ker +
        ".\n\nA javaslatunk: " + tetel + ", " + sav + ", kezdetben napi 5 itallal. Ez pont a csendesebb sáv, amikor egy új vendég jól jön." +
        teszt +
        "\n\nA pilotban nincs platformdíj és hosszú távú kötelezettség, ti döntitek el, mit, mikor és hány embernek adtok, és bármikor szüneteltethetitek. Csatolok egy rövid mintát arról, hogyan jelennétek meg nálunk.\n\nBeférne a héten egy 15 perces beszélgetés? Akár be is ugrom hozzátok.\n\nÜdv,\nGátai Bence\nCome Get It · come-get-it.app\ngataibence@gmail.com",
    ],
    [
      "Instagram DM · első üzenet",
      "Sziasztok! 👋 Bence vagyok a Come Get It-től. November 2-ra tervezzük a budapesti indulást: a vendég nálatok megmutat egy QR-kódot, a pultos beolvassa, és megkapja az ingyen italát. Hogy mit, mikor és hány embernek, azt ti döntitek el.\n\nNektek " +
        sav + " lenne a javaslatunk (" + tetel + ", napi 5 db). A pilotban nincs platformdíj. Csináltam egy gyors mintát, hogy néznétek ki nálunk 👇 Belefér egy 15 perces beszélgetés a héten?\n\n" + link,
    ],
    [
      "Follow-up · 3 nap múlva",
      "Szia! Csak hogy ne vesszen el az előző üzenet: ha " + sav.replace("hétköznap ", "") +
        " nálatok lassabb a forgalom, abban az időszakban próbálhatnánk ki az együttműködést. A jelentkezés kb. 1 perc, utána együtt beállítjuk. Ha most nem aktuális, az is teljesen rendben, köszönjük! 🙌\n\n" + link,
    ],
    [
      "Pultnál · személyes nyitómondat",
      "Szia, nem tartalak fel sokáig: egy budapesti appot indítunk, ami új vendégeket hoz a lassabb órákra. Megmutatom 30 másodpercben, hogy nézne ki nálunk a " +
        nev + " (telefonon a minta). Ha érdekes, mikor ülhetnénk le 15 percre a tulajjal?\n\nTipp: " +
        (quiet && quiet.tol != null
          ? "ugorj be " + quiet.tol + ":00 és " + quiet.ig + ":00 között, akkor a legcsendesebb."
          : "a hely csendes sávjában menj, ne csúcsidőben."),
    ],
    [
      "Telefon · rövid forgatókönyv",
      "1. Bemutatkozás (10 mp): „Gátai Bence, Come Get It, egy új budapesti app, ami új vendégeket hoz a csendesebb órákra.”\n2. Kérdés: „Nálatok mikor a leglassabb hétköznap?” (A javaslatunk: " +
        sav + ".)\n3. Ajánlat: " + tetel + ", napi 5 db, platformdíj nélkül, bármikor leállítható.\n4. Zárás: „Átküldhetek egy mintát e-mailben, és benézhetek 15 percre?”" +
        (lead.phone ? "\n\nSzám: " + lead.phone : ""),
    ],
    ["Ajánlat · összefoglaló", ajanlat],
  ];
}
