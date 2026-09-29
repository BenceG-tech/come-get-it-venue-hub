const tokenPattern = /^CGI-[A-Z0-9]{6}-[A-Za-z0-9]{32}$/;

/**
 * Returns the canonical single-use token from either a consumer-app QR deep
 * link or a raw token. Other schemes, hosts and malformed tokens are rejected.
 */
export function extractRedemptionToken(scannedValue: string): string | null {
  const value = scannedValue.trim();
  if (tokenPattern.test(value)) return value;

  try {
    const payload = new URL(value);
    if (payload.protocol !== "cgi:" || payload.hostname !== "redeem") return null;

    const token = payload.searchParams.get("t")?.trim() ?? "";
    return tokenPattern.test(token) ? token : null;
  } catch {
    return null;
  }
}
