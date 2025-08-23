
import { DataProvider } from './index';
import { sessionManager } from '@/auth/mockSession';

const NAMESPACE = 'cgi_admin_v1';

class LocalStorageProvider implements DataProvider {
  private getStorageKey(resource: string): string {
    return `${NAMESPACE}:${resource}`;
  }

  private getStorageData<T>(resource: string): T[] {
    try {
      const data = localStorage.getItem(this.getStorageKey(resource));
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error(`Error reading ${resource} from localStorage:`, error);
      return [];
    }
  }

  private setStorageData<T>(resource: string, data: T[]): void {
    try {
      localStorage.setItem(this.getStorageKey(resource), JSON.stringify(data));
    } catch (error) {
      console.error(`Error writing ${resource} to localStorage:`, error);
    }
  }

  private filterByVenueAccess<T>(data: T[]): T[] {
    const session = sessionManager.getCurrentSession();
    if (!session) return [];
    
    // CGI Admin sees all data
    if (session.user.role === 'cgi_admin') {
      return data;
    }
    
    // Owner and Staff see only their venues' data
    return data.filter((item: any) => {
      if (item.venue_id) {
        return session.venues.includes(item.venue_id);
      }
      return true; // Keep items without venue_id
    });
  }

  private filterTodayData<T>(data: T[]): T[] {
    const today = new Date().toISOString().split('T')[0];
    return data.filter((item: any) => {
      if (item.date) {
        return item.date === today;
      }
      if (item.timestamp) {
        return item.timestamp.startsWith(today);
      }
      return true;
    });
  }

  async getList<T>(resource: string, filters?: any): Promise<T[]> {
    let data = this.getStorageData<T>(resource);
    
    // Apply venue access filtering
    data = this.filterByVenueAccess(data);
    
    // Staff only sees today's data for certain resources
    const session = sessionManager.getCurrentSession();
    if (session?.user.role === 'venue_staff' && ['redemptions', 'transactions'].includes(resource)) {
      data = this.filterTodayData(data);
    }
    
    // Apply additional filters if provided
    if (filters) {
      if (filters.venue_id) {
        data = data.filter((item: any) => item.venue_id === filters.venue_id);
      }
      if (filters.search) {
        data = data.filter((item: any) => 
          JSON.stringify(item).toLowerCase().includes(filters.search.toLowerCase())
        );
      }
      if (filters.tags && filters.tags.length > 0) {
        data = data.filter((item: any) => 
          item.tags && item.tags.some((tag: string) => filters.tags.includes(tag))
        );
      }
      if (filters.date) {
        data = data.filter((item: any) => item.date === filters.date);
      }
    }
    
    return data;
  }

  async getListForCurrentUser<T>(resource: string, filters?: any): Promise<T[]> {
    // Helper method for explicit user-scoped data fetching
    return this.getList(resource, filters);
  }

  async getTodayData<T>(resource: string): Promise<T[]> {
    const data = await this.getListForCurrentUser<T>(resource);
    return this.filterTodayData<T>(data as T[]);
  }

  async getOne<T>(resource: string, id: string): Promise<T> {
    const data = await this.getListForCurrentUser<T>(resource);
    const item = data.find((item: any) => item.id === id);
    if (!item) {
      throw new Error(`${resource} with id ${id} not found`);
    }
    return item;
  }

  async create<T>(resource: string, data: Partial<T>): Promise<T> {
    const items = this.getStorageData<T>(resource);
    const newItem = {
      ...data,
      id: (data as any).id || this.generateId(),
    } as T;
    
    items.push(newItem);
    this.setStorageData(resource, items);
    return newItem;
  }

  async update<T>(resource: string, id: string, data: Partial<T>): Promise<T> {
    const items = this.getStorageData<T>(resource);
    const index = items.findIndex((item: any) => item.id === id);
    
    if (index === -1) {
      throw new Error(`${resource} with id ${id} not found`);
    }
    
    const updatedItem = { ...items[index], ...data } as T;
    items[index] = updatedItem;
    this.setStorageData(resource, items);
    return updatedItem;
  }

  async remove(resource: string, id: string): Promise<void> {
    const items = this.getStorageData(resource);
    const filteredItems = items.filter((item: any) => item.id !== id);
    this.setStorageData(resource, filteredItems);
  }

  async upsertMany<T>(resource: string, data: T[]): Promise<T[]> {
    const existingItems = this.getStorageData<T>(resource);
    const itemMap = new Map(existingItems.map((item: any) => [item.id, item]));
    
    data.forEach(item => {
      const id = (item as any).id || this.generateId();
      itemMap.set(id, { ...item, id } as T);
    });
    
    const updatedItems = Array.from(itemMap.values());
    this.setStorageData(resource, updatedItems);
    return updatedItems;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export both named and default for compatibility
export const localStorageProvider = new LocalStorageProvider();
export default localStorageProvider;
