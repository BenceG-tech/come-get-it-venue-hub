import { supabase } from "@/integrations/supabase/client";

// Growth tables may be missing from generated types; use an untyped client handle.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const gdb = supabase as any;

export interface LeadData {
  javaslat?: { tetel?: string; b_tetel?: string; idosav?: string; szcenario?: string; teszt?: string; miert?: string };
  italok?: string[];
  csendes?: { tol?: string; ig?: string; forgalom?: string; csucs?: string };
  nyitva?: string;
  lat?: number;
  lon?: number;
  placeId?: string;
  fb?: string;
  bemutatkozas?: string;
  jegyzet?: string;
  [k: string]: unknown;
}

export interface GrowthLead {
  id: string;
  name: string;
  venue_type: string | null;
  district: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  instagram: string | null;
  rating: number | null;
  review_count: number | null;
  grade: string | null;
  score: number | null;
  status: number;
  offer_url: string | null;
  offer_info: string | null;
  photo_url: string | null;
  data: LeadData | null;
  created_at: string;
  updated_at: string;
}

export interface GrowthOffer {
  id: string;
  lead_id: string | null;
  token: string;
  venue_name: string;
  drink: string | null;
  time_window: string | null;
  daily_cap: number | null;
  headline: string | null;
  page: Record<string, unknown> | null;
  media: unknown;
  legacy_artifact_url: string | null;
  status: string;
  sent_at: string | null;
  created_at: string;
}

export interface GrowthSignup {
  id: string;
  kind: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  venue_name: string | null;
  venue_type: string | null;
  city: string | null;
  details: Record<string, unknown> | null;
  status: string;
  note: string | null;
  lead_id: string | null;
  submitted_at: string;
}

export interface GrowthContent {
  id: string;
  title: string;
  kind: string;
  channel: string | null;
  planned_at: string | null;
  status: string;
  caption: string | null;
  storage_path: string | null;
  thumb_path: string | null;
  data: Record<string, unknown> | null;
}

export const LEAD_STATUSES = ["Új", "Megkeresve", "Válaszolt", "Tárgyalás", "Partner", "Nem aktuális"];

export const OFFER_STATUSES: Record<string, string> = {
  kesz: "Kész",
  kikuldve: "Kiküldve",
  elfogadva: "Elfogadva",
  elutasitva: "Elutasítva",
  archiv: "Archív",
};

export const SIGNUP_STATUSES: Record<string, string> = {
  uj: "Új",
  kapcsolatfelvetel: "Kapcsolatfelvétel",
  ajanlat_kuldve: "Ajánlat küldve",
  partner: "Partner",
  elutasitva: "Elutasítva",
  archiv: "Archív",
};

export const CONTENT_KINDS: Record<string, string> = {
  video: "Videó",
  kep: "Kép",
  story: "Story",
  carousel: "Karusszel",
  szoveg: "Szöveg",
};

export const CONTENT_STATUSES: Record<string, string> = {
  terv: "Terv",
  kesz: "Kész",
  utemezve: "Ütemezve",
  kint: "Kint",
};

export const CHANNELS = ["Instagram", "TikTok", "Facebook", "Story"];

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "hely";
}

export function randomSuffix(n = 6): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  const arr = crypto.getRandomValues(new Uint8Array(n));
  arr.forEach((b) => (out += chars[b % chars.length]));
  return out;
}

export function offerShareUrl(token: string) {
  return `${window.location.origin}/a/${token}`;
}

export function offerPublicFileUrl(path: string) {
  return supabase.storage.from("ajanlatok").getPublicUrl(path).data.publicUrl;
}

export function guessContentType(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    html: "text/html", htm: "text/html", json: "application/json", css: "text/css", js: "text/javascript",
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", svg: "image/svg+xml",
    mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime", mp3: "audio/mpeg", pdf: "application/pdf",
  };
  return map[ext] ?? "application/octet-stream";
}

export function outreachTemplates(lead: GrowthLead) {
  const tetel = lead.data?.javaslat?.tetel || "egy ital";
  const idosav = lead.data?.javaslat?.idosav || "a csendesebb idősávban";
  const name = lead.name;
  const email = `Tárgy: Új vendégek a ${name}-ba – ingyenes béta

Szia!

A Come Get It csapatától írok. Budapesten olyan helyeket keresünk, ahová szívesen elhoznánk új vendégeket a csendesebb órákban.

Az ötletünk a ${name} számára: ${idosav} között napi 5 db ${tetel} ajándékba az appunk felhasználóinak – így ők kipróbálják a helyet, és jó eséllyel maradnak még valamire.

Pár fontos dolog:
• A béta időszakban teljesen ingyenes a részvétel.
• Csak 18 év felettiek használhatják az appot.
• Mindig van alkoholmentes választási lehetőség is.

Ha érdekel, szívesen küldök egy rövid, személyre szabott ajánlatot, vagy beugrom egy kávéra.

Köszönöm, szép napot!
Come Get It csapat`;
  const dm = `Szia ${name}! 👋 A Come Get It-tól írunk – új vendégeket hozunk budapesti helyekre. Arra gondoltunk, hogy ${idosav} között napi 5 db ${tetel} ajándékba menne az appunk (18+) felhasználóinak, mindig alkoholmentes opcióval is. A béta alatt ingyenes. Küldhetünk egy rövid ajánlatot? 🙂`;
  const follow = `Szia!

Csak finoman rákérdeznék a pár napja küldött ajánlatunkra a ${name} kapcsán: napi 5 db ${tetel} ${idosav} között, a béta alatt ingyenesen, 18+ vendégeknek, mindig alkoholmentes választással is.

Ha most nem aktuális, az is teljesen rendben – egy rövid válasznak is nagyon örülnénk.

Köszönöm!
Come Get It csapat`;
  return [
    { label: "Email", text: email },
    { label: "Instagram DM", text: dm },
    { label: "Follow-up", text: follow },
  ];
}
