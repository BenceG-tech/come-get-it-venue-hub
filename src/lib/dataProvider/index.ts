
// DataProvider interface for backend abstraction
export interface DataProvider {
  // Generic CRUD operations
  getList<T>(resource: string, filters?: any): Promise<T[]>;
  getOne<T>(resource: string, id: string): Promise<T>;
  create<T>(resource: string, data: Partial<T>): Promise<T>;
  update<T>(resource: string, id: string, data: Partial<T>): Promise<T>;
  remove(resource: string, id: string): Promise<void>;
  upsertMany<T>(resource: string, data: T[]): Promise<T[]>;
}

// Resource types
export type Resource = 
  | 'venues' 
  | 'brands' 
  | 'campaigns' 
  | 'redemptions' 
  | 'transactions' 
  | 'rewards';
