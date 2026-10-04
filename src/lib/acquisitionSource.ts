export interface AcquisitionSourceLabel {
  label: string;
  detail: string;
  raw: string;
}

const entryPointLabels: Record<string, string> = {
  main_signup_form: "főoldali regisztrációs űrlap",
  exit_intent_popup: "kilépés előtti felugró ablak",
  resend_welcome_button: "üdvözlő e-mail gombja",
  mobile_app: "iPhone alkalmazás",
  ios_app: "iPhone alkalmazás",
  android_app: "Android alkalmazás",
  venue_application: "partnerjelentkezési űrlap",
};

const titleCase = (value: string) =>
  value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (character) => character.toLocaleUpperCase("hu-HU"));

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseTechnicalSource(raw: string) {
  const normalized = raw.replace(/&amp;/gi, "&").trim();
  const parts = normalized.split("|").map((part) => part.trim()).filter(Boolean);
  const entryPoint = parts[0]?.toLowerCase() || "";
  const attributes = new Map<string, string>();

  for (const part of parts.slice(1)) {
    if (part.startsWith("utm:")) {
      const params = new URLSearchParams(part.slice(4));
      params.forEach((value, key) => attributes.set(key.toLowerCase(), safeDecode(value)));
      continue;
    }

    const separator = part.indexOf("=");
    if (separator > 0) {
      attributes.set(part.slice(0, separator).toLowerCase(), safeDecode(part.slice(separator + 1)));
    }
  }

  return { entryPoint, attributes };
}

function referrerChannel(referrer: string) {
  if (!referrer) return null;

  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    if (host === "l.instagram.com" || host.endsWith("instagram.com")) return "Instagram";
    if (host.endsWith("facebook.com") || host === "l.facebook.com") return "Facebook";
    if (host.endsWith("tiktok.com")) return "TikTok";
    if (host.endsWith("google.com") || host.endsWith("google.hu")) return "Google keresés";
    if (host.endsWith("lovable.dev") || host.endsWith("lovableproject.com")) return "Lovable előnézet";
    if (host.endsWith("come-get-it.app")) return "Come Get It weboldal";
    return host;
  } catch {
    return null;
  }
}

function campaignChannel(value: string) {
  switch (value.toLowerCase()) {
    case "ig":
    case "instagram":
      return "Instagram";
    case "fb":
    case "facebook":
      return "Facebook";
    case "tt":
    case "tiktok":
      return "TikTok";
    case "google":
    case "google_ads":
      return "Google";
    case "email":
    case "newsletter":
      return "E-mail kampány";
    default:
      return value ? titleCase(value) : "";
  }
}

/**
 * Converts the compact analytics string stored by the landing page/app into a
 * founder-friendly Hungarian label. The original value is retained in `raw`
 * and can be shown as a tooltip when deeper debugging is needed.
 */
export function formatAcquisitionSource(value: string | null | undefined): AcquisitionSourceLabel {
  const raw = value?.trim() || "mobile_app";
  const { entryPoint, attributes } = parseTechnicalSource(raw);
  const entryPointLabel = entryPointLabels[entryPoint] || titleCase(entryPoint || "ismeretlen forrás");
  const utmSource = attributes.get("utm_source") || "";
  const utmContent = (attributes.get("utm_content") || "").toLowerCase();
  const referrer = referrerChannel(attributes.get("ref") || "");

  if (entryPoint === "mobile_app" || entryPoint === "ios_app") {
    return { label: "iPhone alkalmazás", detail: "Közvetlen regisztráció az appban", raw };
  }

  if (entryPoint === "android_app") {
    return { label: "Android alkalmazás", detail: "Közvetlen regisztráció az appban", raw };
  }

  if (entryPoint === "resend_welcome_button") {
    return { label: "Üdvözlő e-mail", detail: "Az e-mailben lévő gombról érkezett", raw };
  }

  if (utmSource) {
    const label = campaignChannel(utmSource);
    const placement = utmContent === "link_in_bio" ? "bio link" : "kampánylink";
    return {
      label,
      detail: `${placement} → ${entryPointLabel}`,
      raw,
    };
  }

  if (referrer) {
    return {
      label: referrer,
      detail: `${referrer === "Lovable előnézet" ? "Tesztelés" : "Hivatkozás"} → ${entryPointLabel}`,
      raw,
    };
  }

  if (entryPoint === "main_signup_form") {
    return { label: "Közvetlen weboldal", detail: "Főoldali regisztrációs űrlap", raw };
  }

  if (entryPoint === "exit_intent_popup") {
    return { label: "Közvetlen weboldal", detail: "Kilépés előtti felugró ablak", raw };
  }

  if (entryPoint === "venue_application") {
    return { label: "Partnerjelentkezési oldal", detail: "Weboldali partnerűrlap", raw };
  }

  return { label: titleCase(entryPoint), detail: "Egyéb vagy korábbi forrás", raw };
}
