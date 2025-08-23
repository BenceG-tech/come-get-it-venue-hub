
import type { DataProvider } from "./index";
import { supabaseProvider } from "./supabaseProvider";
import { runtimeConfig } from "@/config/runtime";
import localStorageProvider from "./localStorageProvider";

/**
 * Returns the active DataProvider.
 * Default: mock/localStorage.
 * Switch to Supabase by setting localStorage.setItem('provider', 'supabase') or ?provider=supabase.
 */
export function getDataProvider(): DataProvider {
  if (runtimeConfig.useSupabase) {
    console.log("[providerFactory] Using Supabase provider");
    return supabaseProvider;
  }
  console.log("[providerFactory] Using localStorage provider (fallback)");
  return localStorageProvider;
}
