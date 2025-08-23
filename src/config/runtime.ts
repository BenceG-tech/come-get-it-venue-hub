
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

const resolvedProvider = (queryProvider || localProvider || envProvider || 'mock').toLowerCase();

export const runtimeConfig = {
  useSupabase: resolvedProvider === 'supabase',
};
