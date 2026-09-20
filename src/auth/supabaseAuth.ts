import { supabase } from "@/integrations/supabase/client";
import { sessionManager } from "@/auth/session";
import type { User as SupabaseUser } from "@supabase/supabase-js";

/**
 * Derives the app session from the live Supabase user:
 * profiles.is_admin + venue_memberships → role.
 * Called after every auth bootstrap / state change.
 */
export async function hydrateSessionFromSupabaseUser(supaUser: SupabaseUser) {
  const profileId = supaUser.id;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, name, is_admin")
    .eq("id", profileId)
    .maybeSingle();

  if (profileError) {
    console.error("[supabaseAuth] profile fetch failed", profileError.message);
    throw profileError;
  }

  const { data: memberships, error: membershipsError } = await supabase
    .from("venue_memberships")
    .select("venue_id, role")
    .eq("profile_id", profileId);

  if (membershipsError) {
    console.error("[supabaseAuth] memberships fetch failed", membershipsError.message);
    throw membershipsError;
  }

  const venueIds = (memberships ?? []).map((m) => m.venue_id);
  let role: "cgi_admin" | "venue_owner" | "venue_staff";

  if (profile?.is_admin) {
    role = "cgi_admin";
  } else if ((memberships ?? []).some((m) => m.role === "venue_owner")) {
    role = "venue_owner";
  } else if (venueIds.length > 0) {
    role = "venue_staff";
  } else {
    // Authenticated, but no admin flag and no venue membership.
    sessionManager.setNoAccess();
    return { hasAccess: false as const };
  }

  const user = {
    id: profileId,
    email: supaUser.email ?? "",
    role,
    name: profile?.name ?? (supaUser.email ?? "User"),
    venue_ids: venueIds,
  };

  sessionManager.setCurrentSession(user);
  return { hasAccess: true as const, user };
}

/**
 * Applies the current Supabase auth state to the in-memory session store.
 * Uses getUser() so the token is re-validated against the auth server.
 */
async function applyAuthState(hasSession: boolean) {
  if (!hasSession) {
    sessionManager.setSignedOut();
    return;
  }

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    sessionManager.setSignedOut();
    return;
  }

  try {
    await hydrateSessionFromSupabaseUser(data.user);
  } catch {
    sessionManager.setSignedOut();
  }
}

/**
 * Bootstraps auth once on app start and keeps derived state in sync.
 * Returns an unsubscribe function.
 */
export function initAuth(): () => void {
  let cancelled = false;

  supabase.auth.getSession().then(({ data }) => {
    if (!cancelled) void applyAuthState(Boolean(data.session));
  });

  const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
    if (cancelled) return;

    if (event === "SIGNED_OUT") {
      sessionManager.setSignedOut();
      return;
    }

    if (
      event === "INITIAL_SESSION" ||
      event === "SIGNED_IN" ||
      event === "TOKEN_REFRESHED" ||
      event === "USER_UPDATED" ||
      event === "PASSWORD_RECOVERY"
    ) {
      // Defer: no Supabase calls inside the callback.
      setTimeout(() => {
        if (!cancelled) void applyAuthState(Boolean(session));
      }, 0);
    }
  });

  return () => {
    cancelled = true;
    sub.subscription.unsubscribe();
  };
}

export async function signInWithEmailPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data?.user) {
    console.error("[supabaseAuth] sign-in failed", error?.message);
    throw error ?? new Error("Login failed");
  }

  return hydrateSessionFromSupabaseUser(data.user);
}

export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) {
    console.error("[supabaseAuth] password reset request failed", error.message);
    throw error;
  }
}

export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    console.error("[supabaseAuth] password update failed", error.message);
    throw error;
  }
}

export async function signOutSupabase() {
  await supabase.auth.signOut();
  sessionManager.setSignedOut();
}
