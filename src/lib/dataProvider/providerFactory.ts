import type { DataProvider } from "./index";
import { supabaseProvider } from "./supabaseProvider";

/**
 * Returns the active DataProvider.
 * This deployment always talks to Supabase — there is no mock/local provider
 * and no way to switch providers via URL params or localStorage.
 */
export function getDataProvider(): DataProvider {
  return supabaseProvider;
}
