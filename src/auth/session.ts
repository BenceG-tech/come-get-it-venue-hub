import { User, Session } from '@/lib/types';

export type AppRole = 'cgi_admin' | 'venue_owner' | 'venue_staff' | 'brand_admin';
export type AuthStatus = 'loading' | 'ready';

const PREVIEW_ROLE_KEY = 'cgi_admin_preview_role';

/**
 * In-memory session store.
 *
 * The session is derived exclusively from the live Supabase session
 * (auth.getUser() + profiles.is_admin + venue_memberships) on every auth
 * bootstrap / state change. It is NEVER persisted, so it cannot be forged
 * or survive a Supabase session expiry.
 *
 * The only persisted value is the admin "preview role", a purely cosmetic UI
 * preference that never widens access: it is ignored unless the real role is
 * cgi_admin, and authorization always uses the real role.
 */
class SessionStore {
  private currentSession: Session | null = null;
  private status: AuthStatus = 'loading';
  private noAccess = false;
  private previewRole: AppRole | null = null;
  private listeners: Set<() => void> = new Set();

  constructor() {
    try {
      const saved = localStorage.getItem(PREVIEW_ROLE_KEY);
      if (saved && saved !== 'null') {
        this.previewRole = saved as AppRole;
      }
    } catch {
      // ignore unavailable storage
    }
  }

  addListener(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((callback) => callback());
  }

  // ---- bootstrap state ----

  getStatus(): AuthStatus {
    return this.status;
  }

  isBootstrapped(): boolean {
    return this.status === 'ready';
  }

  /** Authenticated Supabase user without admin/owner/staff access. */
  hasNoAccess(): boolean {
    return this.noAccess;
  }

  // ---- session ----

  getCurrentSession(): Session | null {
    return this.currentSession;
  }

  setCurrentSession(user: User): Session {
    const session: Session = {
      user,
      venues: user.venue_ids || [],
    };
    this.currentSession = session;
    this.noAccess = false;
    this.status = 'ready';
    this.notifyListeners();
    return session;
  }

  /** Authenticated but not authorized for this app. */
  setNoAccess(): void {
    this.currentSession = null;
    this.noAccess = true;
    this.status = 'ready';
    this.notifyListeners();
  }

  /** No live Supabase session (signed out / expired). */
  setSignedOut(): void {
    this.currentSession = null;
    this.noAccess = false;
    this.status = 'ready';
    this.clearPreviewRole();
    this.notifyListeners();
  }

  clearSession(): void {
    this.setSignedOut();
  }

  clear(): void {
    this.setSignedOut();
  }

  // ---- preview role (UI-only preference) ----

  private clearPreviewRole(): void {
    this.previewRole = null;
    try {
      localStorage.removeItem(PREVIEW_ROLE_KEY);
    } catch {
      // ignore
    }
  }

  setPreviewRole(role: AppRole | null): void {
    // Only a real admin may preview, and previewing never grants extra access.
    if (this.currentSession?.user.role !== 'cgi_admin') return;

    this.previewRole = role;
    try {
      if (role) localStorage.setItem(PREVIEW_ROLE_KEY, role);
      else localStorage.removeItem(PREVIEW_ROLE_KEY);
    } catch {
      // ignore
    }
    this.notifyListeners();
  }

  getPreviewRole(): AppRole | null {
    return this.previewRole;
  }

  /** Real role from the database — the only role used for authorization. */
  getRole(): AppRole | null {
    return this.currentSession?.user.role ?? null;
  }

  /** Role used for presentation only (may be an admin preview role). */
  getEffectiveRole(): AppRole | null {
    const session = this.currentSession;
    if (!session) return null;
    if (session.user.role === 'cgi_admin' && this.previewRole) return this.previewRole;
    return session.user.role;
  }

  isInPreviewMode(): boolean {
    const session = this.currentSession;
    return !!(
      session &&
      session.user.role === 'cgi_admin' &&
      this.previewRole &&
      this.previewRole !== 'cgi_admin'
    );
  }

  // ---- authorization helpers (real role only) ----

  canAccessVenue(venueId: string): boolean {
    const session = this.currentSession;
    if (!session) return false;
    if (session.user.role === 'cgi_admin') return true;
    return session.venues.includes(venueId);
  }

  canEditVenue(venueId: string): boolean {
    const session = this.currentSession;
    if (!session) return false;
    if (session.user.role === 'venue_staff') return false;
    return this.canAccessVenue(venueId);
  }

  hasRole(role: string | string[]): boolean {
    const session = this.currentSession;
    if (!session) return false;
    const roles = Array.isArray(role) ? role : [role];
    return roles.includes(session.user.role);
  }
}

export const sessionManager = new SessionStore();
