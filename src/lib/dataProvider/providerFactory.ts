
import type { DataProvider } from "./index";
import { supabaseProvider } from "./supabaseProvider";
import { runtimeConfig } from "@/config/runtime";
import localStorageProvider from "./localStorageProvider";

/**
 * Returns the active DataProvider.
 * Priority:
 * 1) URL param: ?provider=supabase|local
 * 2) localStorage: provider = 'supabase' | 'local'
 * 3) runtimeConfig.useSupabase (boolean)
 */
export function getDataProvider(): DataProvider {
  // Read from URL param
  let urlProvider: string | null = null;
  try {
    const params = new URLSearchParams(window.location.search);
    urlProvider = params.get("provider");
  } catch {
    // ignore if not in browser context
  }

  // Normalize acceptable values
  const normalize = (val: string | null) =>
    val && (val.toLowerCase() === "supabase" || val.toLowerCase() === "local")
      ? val.toLowerCase()
      : null;

  const urlChoice = normalize(urlProvider);

  // If URL param provided, persist it for subsequent navigations
  if (urlChoice) {
    try {
      localStorage.setItem("provider", urlChoice);
      console.log("[providerFactory] Persisted provider from URL:", urlChoice);
    } catch {
      // ignore
    }
  }

  // Read from storage
  let storedChoice: string | null = null;
  try {
    storedChoice = normalize(localStorage.getItem("provider"));
  } catch {
    // ignore
  }

  // Derive final choice
  const finalChoice =
    urlChoice ||
    storedChoice ||
    (runtimeConfig.useSupabase ? "supabase" : "local");

  if (finalChoice === "supabase") {
    console.log("[providerFactory] Using Supabase provider");
    return supabaseProvider;
  }

  console.log("[providerFactory] Using localStorage provider (fallback)");
  return localStorageProvider;
}

