/**
 * Runtime configuration.
 * This deployment always uses the live Supabase backend.
 */
export const runtimeConfig = {
  useSupabase: true as const,
  useLegacyPublicListLayout: true, // compact venue list layout in admin
};
