
import { supabase } from "@/integrations/supabase/client";
import { sessionManager } from "@/auth/mockSession";
import type { User as SupabaseUser } from "@supabase/supabase-js";

/**
 * Maps a Supabase auth user to the app's session shape (profile + memberships → role).
 * Used by both email/password sign-in and OAuth (Google) post-redirect rehydration.
 */
export async function hydrateSessionFromSupabaseUser(supaUser: SupabaseUser) {
  const profileId = supaUser.id;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, name, is_admin")
    .eq("id", profileId)
    .maybeSingle();

  if (profileError) {
    console.error("[supabaseAuth] profile fetch error", profileError);
    throw profileError;
  }

  const { data: memberships, error: membershipsError } = await supabase
    .from("venue_memberships")
    .select("venue_id, role")
    .eq("profile_id", profileId);

  if (membershipsError) {
    console.error("[supabaseAuth] memberships fetch error", membershipsError);
    throw membershipsError;
  }

  const venueIds = (memberships ?? []).map((m) => m.venue_id);
  let role: "cgi_admin" | "venue_owner" | "venue_staff" = "venue_staff";
  if (profile?.is_admin) {
    role = "cgi_admin";
  } else if ((memberships ?? []).some((m) => m.role === "venue_owner")) {
    role = "venue_owner";
  } else if (venueIds.length > 0) {
    role = "venue_staff";
  } else {
    // No profile/admin flag and no memberships → user has no admin access
    const noAccessUser = {
      id: profileId,
      email: supaUser.email ?? "",
      role: "venue_staff" as const,
      name: profile?.name ?? supaUser.email ?? "User",
      venue_ids: [] as string[],
      hasAccess: false,
    };
    console.warn("[supabaseAuth] User has no admin access", noAccessUser);
    return noAccessUser;
  }

  const user = {
    id: profileId,
    email: supaUser.email ?? "",
    role,
    name: profile?.name ?? (supaUser.email ?? "User"),
    venue_ids: venueIds,
    hasAccess: true,
  };

  console.log("[supabaseAuth] Derived user from Supabase", user);
  sessionManager.setCurrentSession(user);
  return user;
}

export async function signInWithEmailPassword(email: string, password: string) {
  console.log("[supabaseAuth] Signing in with email/password", { email });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data?.user) {
    console.error("[supabaseAuth] signIn error", error);
    throw error ?? new Error("Login failed");
  }

  return hydrateSessionFromSupabaseUser(data.user);
}

export async function signInWithGoogle() {
  console.log("[supabaseAuth] Starting Google OAuth");
  const redirectTo = `${window.location.origin}/dashboard`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
  if (error) {
    console.error("[supabaseAuth] Google OAuth error", error);
    throw error;
  }
}

export async function signOutSupabase() {
  console.log("[supabaseAuth] Signing out");
  await supabase.auth.signOut();
  sessionManager.clear?.();
}
