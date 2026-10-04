export interface PushDeliveryResult {
  success?: boolean;
  status?: string;
  error?: string;
  tokens_targeted?: number;
}

export function assertPushDelivered(result: PushDeliveryResult | null | undefined) {
  if (result?.status === "sent") return result;

  if (result?.status === "no_token") {
    throw new Error(
      "Nincs aktív push-eszköz ehhez a felhasználóhoz. Nyissa meg az appot, jelentkezzen be, és engedélyezze az értesítéseket, majd próbáld újra."
    );
  }

  if (result?.status === "failed") {
    throw new Error(result.error || "A push szolgáltató nem tudta átvenni az értesítést.");
  }

  throw new Error(result?.error || "Az értesítés kézbesítése nem igazolható.");
}
