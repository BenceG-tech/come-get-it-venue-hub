
/**
 * Runtime configuration with production lock for data provider.
 * 
 * Production behavior:
 *  - Always uses Supabase (URL params and localStorage overrides are ignored)
 *  - Override attempts are logged as security warnings
 * 
 * Development/Staging behavior:
 *  - Flexible provider switching via:
 *    - ?provider=supabase or ?provider=mock URL parameter
 *    - localStorage.setItem('provider', 'supabase') or 'mock'  
 *    - VITE_USE_SUPABASE=true in .env
 */

const mode = typeof window !== 'undefined' ? (import.meta.env.MODE || 'development') : 'development';
const environment = typeof window !== 'undefined' ? (import.meta.env.VITE_ENVIRONMENT || mode) : 'development';
const isProduction = mode === 'production' || environment === 'production';
const forceSupabase = import.meta.env.VITE_FORCE_SUPABASE === 'true';

// In production, always use Supabase regardless of overrides
if (isProduction || forceSupabase) {
  // Check for override attempts in production and log security warning
  if (typeof window !== 'undefined' && isProduction) {
    const attemptedQueryProvider = new URLSearchParams(window.location.search).get('provider');
    const attemptedLocalProvider = localStorage.getItem('provider');
    
    if (attemptedQueryProvider && attemptedQueryProvider !== 'supabase') {
      console.warn('[SECURITY] Production override attempt via URL parameter ignored:', attemptedQueryProvider);
    }
    if (attemptedLocalProvider && attemptedLocalProvider !== 'supabase') {
      console.warn('[SECURITY] Production override attempt via localStorage ignored:', attemptedLocalProvider);
    }
  }
}

// Flexible provider selection for non-production environments
const queryProvider = !isProduction && !forceSupabase && typeof window !== 'undefined'
  ? new URLSearchParams(window.location.search).get('provider')
  : null;

const localProvider = !isProduction && !forceSupabase && typeof window !== 'undefined' 
  ? localStorage.getItem('provider') 
  : null;

const envProvider = !isProduction && !forceSupabase && typeof window !== 'undefined' && import.meta.env.VITE_USE_SUPABASE === 'true' 
  ? 'supabase' 
  : null;

// Default: production -> supabase, development -> mock
const defaultProvider = mode === 'production' ? 'supabase' : 'mock';

// Final provider resolution
let resolvedProvider: string;
if (isProduction || forceSupabase) {
  resolvedProvider = 'supabase';
} else {
  resolvedProvider = (queryProvider || localProvider || envProvider || defaultProvider).toLowerCase();
}

export const runtimeConfig = {
  useSupabase: resolvedProvider === 'supabase',
  useLegacyPublicListLayout: true, // Feature flag to restore compact venue list layout
};

// Development logs (reduced logging in production)
if (typeof window !== 'undefined') {
  if (!isProduction) {
    console.log("[runtimeConfig] mode:", mode);
    console.log("[runtimeConfig] environment:", environment);
    console.log("[runtimeConfig] resolvedProvider:", resolvedProvider);
    console.log("[runtimeConfig] useSupabase:", runtimeConfig.useSupabase);
    console.log("[runtimeConfig] isProduction:", isProduction);
    console.log("[runtimeConfig] forceSupabase:", forceSupabase);
  } else {
    console.log("[runtimeConfig] Production mode - using Supabase provider");
  }
}
