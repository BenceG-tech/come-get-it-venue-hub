
import { User, Session } from '@/lib/types';

export const DEMO_USERS: User[] = [
  {
    id: 'admin-1',
    email: 'admin@comegetit.app',
    role: 'cgi_admin',
    name: 'CGI Admin',
    venue_ids: ['venue-1', 'venue-2', 'venue-3'] // all venues
  },
  {
    id: 'owner-1', 
    email: 'owner@trendybar.com',
    role: 'venue_owner',
    name: 'Trendy Bar Owner',
    venue_ids: ['venue-1'] // only their venue
  },
  {
    id: 'staff-1',
    email: 'staff@trendybar.com', 
    role: 'venue_staff',
    name: 'Bar Staff',
    venue_ids: ['venue-1'] // only their venue, read-only mostly
  }
];

class MockSessionManager {
  private currentSession: Session | null = null;
  private previewRole: 'cgi_admin' | 'venue_owner' | 'venue_staff' | null = null;
  private listeners: Set<() => void> = new Set();

  constructor() {
    // Load preview role from localStorage on initialization
    try {
      const savedPreviewRole = localStorage.getItem('cgi_admin_preview_role');
      if (savedPreviewRole && savedPreviewRole !== 'null') {
        this.previewRole = savedPreviewRole as 'cgi_admin' | 'venue_owner' | 'venue_staff';
        console.log('Loaded preview role from localStorage:', this.previewRole);
      }
    } catch (error) {
      console.error('Error loading preview role from localStorage:', error);
    }
  }

  // Add listener for role changes
  addListener(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    this.listeners.forEach(callback => callback());
  }

  getCurrentSession(): Session | null {
    if (!this.currentSession) {
      const saved = localStorage.getItem('cgi_admin_session');
      if (saved) {
        try {
          this.currentSession = JSON.parse(saved);
        } catch (error) {
          console.error('Error parsing saved session:', error);
        }
      }
    }
    return this.currentSession;
  }

  setCurrentSession(user: User): Session {
    const session: Session = {
      user,
      venues: user.venue_ids || []
    };
    
    this.currentSession = session;
    localStorage.setItem('cgi_admin_session', JSON.stringify(session));
    return session;
  }

  clearSession(): void {
    this.currentSession = null;
    this.previewRole = null;
    localStorage.removeItem('cgi_admin_session');
    localStorage.removeItem('cgi_admin_preview_role');
    this.notifyListeners();
  }

  // Add clear() method that calls clearSession() for consistency
  clear(): void {
    this.clearSession();
  }

  // Preview role methods
  setPreviewRole(role: 'cgi_admin' | 'venue_owner' | 'venue_staff' | null): void {
    const session = this.getCurrentSession();
    if (session && session.user.role === 'cgi_admin') {
      this.previewRole = role;
      
      // Persist to localStorage
      try {
        if (role) {
          localStorage.setItem('cgi_admin_preview_role', role);
          console.log('Saved preview role to localStorage:', role);
        } else {
          localStorage.removeItem('cgi_admin_preview_role');
          console.log('Removed preview role from localStorage');
        }
      } catch (error) {
        console.error('Error saving preview role to localStorage:', error);
      }
      
      // Notify listeners of the change
      this.notifyListeners();
    }
  }

  getPreviewRole(): 'cgi_admin' | 'venue_owner' | 'venue_staff' | null {
    return this.previewRole;
  }

  getEffectiveRole(): 'cgi_admin' | 'venue_owner' | 'venue_staff' | null {
    const session = this.getCurrentSession();
    if (!session) return null;
    
    // Only admins can use preview mode
    if (session.user.role === 'cgi_admin' && this.previewRole) {
      console.log('Using preview role:', this.previewRole);
      return this.previewRole;
    }
    
    console.log('Using actual role:', session.user.role);
    return session.user.role;
  }

  isInPreviewMode(): boolean {
    const session = this.getCurrentSession();
    return !!(session && session.user.role === 'cgi_admin' && this.previewRole && this.previewRole !== 'cgi_admin');
  }

  canAccessVenue(venueId: string): boolean {
    const session = this.getCurrentSession();
    if (!session) return false;
    
    if (session.user.role === 'cgi_admin') return true;
    return session.venues.includes(venueId);
  }

  canEditVenue(venueId: string): boolean {
    const session = this.getCurrentSession();
    if (!session) return false;
    
    if (session.user.role === 'venue_staff') return false;
    return this.canAccessVenue(venueId);
  }

  hasRole(role: string | string[]): boolean {
    const session = this.getCurrentSession();
    if (!session) return false;
    
    const roles = Array.isArray(role) ? role : [role];
    return roles.includes(session.user.role);
  }
}

export const sessionManager = new MockSessionManager();
