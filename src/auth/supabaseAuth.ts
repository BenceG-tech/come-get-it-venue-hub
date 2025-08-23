
import { supabase } from "@/integrations/supabase/client";
import { sessionManager } from "@/auth/mockSession";

/**
 * Sign in with email/password using Supabase, then map the session to the app's mock session shape
 * so the rest of the app can keep working without major refactors.
 */
export async function signInWithEmailPassword(email: string, password: string) {
  console.log("[supabaseAuth] Signing in with email/password", { email });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data?.user) {
    console.error("[supabaseAuth] signIn error", error);
    throw error ?? new Error("Login failed");
  }

  const supaUser = data.user;
  const profileId = supaUser.id;

  // Fetch profile to determine admin
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, name, is_admin")
    .eq("id", profileId)
    .single();

  if (profileError) {
    console.error("[supabaseAuth] profile fetch error", profileError);
    throw profileError;
  }

  // Fetch memberships to determine venues and role (owner/staff)
  const { data: memberships, error: membershipsError } = await supabase
    .from("venue_memberships")
    .select("venue_id, role")
    .eq("profile_id", profileId);

  if (membershipsError) {
    console.error("[supabaseAuth] memberships fetch error", membershipsError);
    throw membershipsError;
  }

  const venueIds = (memberships ?? []).map((m) => m.venue_id);
  // Determine app role: cgi_admin / venue_owner / venue_staff
  let role: "cgi_admin" | "venue_owner" | "venue_staff" = "venue_staff";
  if (profile?.is_admin) {
    role = "cgi_admin";
  } else if ((memberships ?? []).some((m) => m.role === "venue_owner")) {
    role = "venue_owner";
  } else {
    role = "venue_staff";
  }

  const user = {
    id: profileId,
    email: supaUser.email ?? "",
    role,
    name: profile?.name ?? (supaUser.email ?? "User"),
    venue_ids: venueIds,
  };

  console.log("[supabaseAuth] Derived user from Supabase", user);

  // Bridge into existing app session
  sessionManager.setCurrentSession(user);
  return user;
}

export async function signOutSupabase() {
  console.log("[supabaseAuth] Signing out");
  await supabase.auth.signOut();
  // Optionally clear the mock session bridge
  sessionManager.clear?.();
}
