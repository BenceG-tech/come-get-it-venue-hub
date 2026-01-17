
/**
 * Runtime configuration.
 * Supabase mode is now always enabled - no more mock mode.
 */
export const runtimeConfig = {
  useSupabase: true, // Always use Supabase for live data
  useLegacyPublicListLayout: true, // Feature flag to restore compact venue list layout
};

// Log confirmation
if (typeof window !== 'undefined') {
  console.log("[runtimeConfig] useSupabase:", runtimeConfig.useSupabase);
}
