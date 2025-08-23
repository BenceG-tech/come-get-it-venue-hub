
/**
 * Runtime configuration and safe toggles without relying on VITE_* envs.
 * Switch provider with:
 *  - localStorage.setItem('provider', 'supabase') OR 'mock'
 *  - or add ?provider=supabase to the URL
 *  - or set VITE_USE_SUPABASE=true in .env
 */
const queryProvider =
  typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('provider')
    : null;

const localProvider =
  typeof window !== 'undefined' ? localStorage.getItem('provider') : null;

const envProvider = 
  typeof window !== 'undefined' && import.meta.env.VITE_USE_SUPABASE === 'true' 
    ? 'supabase' 
    : null;

// Default: production -> supabase, development -> mock
const mode = typeof window !== 'undefined' ? (import.meta.env.MODE || 'development') : 'development';
const defaultProvider = mode === 'production' ? 'supabase' : 'mock';

const resolvedProvider = (queryProvider || localProvider || envProvider || defaultProvider).toLowerCase();

export const runtimeConfig = {
  useSupabase: resolvedProvider === 'supabase',
};

// Helpful logs
if (typeof window !== 'undefined') {
  console.log("[runtimeConfig] mode:", mode);
  console.log("[runtimeConfig] resolvedProvider:", resolvedProvider);
  console.log("[runtimeConfig] useSupabase:", runtimeConfig.useSupabase);
}
