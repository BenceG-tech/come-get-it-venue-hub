
/**
 * Runtime configuration and safe toggles without relying on VITE_* envs.
 * Switch provider with:
 *  - localStorage.setItem('provider', 'supabase') OR 'mock'
 *  - or add ?provider=supabase to the URL
 */
const queryProvider =
  typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('provider')
    : null;

const localProvider =
  typeof window !== 'undefined' ? localStorage.getItem('provider') : null;

const resolvedProvider = (queryProvider || localProvider || 'mock').toLowerCase();

export const runtimeConfig = {
  useSupabase: resolvedProvider === 'supabase',
};
