
import { supabase } from "@/integrations/supabase/client";
import type { DataProvider } from "./index";

type ListFilters = {
  // filtering
  venue_id?: string;
  date?: string;
  search?: string; // ilike on name/address
  // sorting
  orderBy?: string;
  orderDir?: "asc" | "desc";
  // pagination
  limit?: number;
  offset?: number;
};

export const supabaseProvider: DataProvider & {
  getCount?: (resource: string, filters?: ListFilters) => Promise<number>;
} = {
  async getList<T>(resource: string, filters?: ListFilters): Promise<T[]> {
    console.log("[supabaseProvider] getList", resource, filters);
    
    // Base select
    let query = supabase.from(resource).select("*");

    // Filters
    if (filters) {
      if (filters.venue_id) {
        query = query.eq("venue_id", filters.venue_id);
      }
      if (filters.date) {
        query = query.eq("date", filters.date);
      }
      if (filters.search && filters.search.trim().length > 0) {
        const term = filters.search.trim();
        // Search across name and address
        // PostgREST 'or' filter uses format: or=col.ilike.*term*,col2.ilike.*term*
        query = query.or(`name.ilike.%${term}%,address.ilike.%${term}%`);
      }
      // Sorting (default created_at desc if available)
      const orderBy = filters.orderBy || "created_at";
      const ascending = (filters.orderDir || "desc") === "asc";
      // Not all tables have created_at; if it doesn't exist, PostgREST ignores order
      query = query.order(orderBy, { ascending, nullsFirst: false });

      // Pagination via range
      const limit = typeof filters.limit === "number" ? filters.limit : undefined;
      const offset = typeof filters.offset === "number" ? filters.offset : undefined;
      if (typeof limit === "number") {
        const from = typeof offset === "number" ? offset : 0;
        const to = from + limit - 1;
        query = query.range(from, to);
      }
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data as T[]) ?? [];
  },

  async getOne<T>(resource: string, id: string): Promise<T> {
    console.log("[supabaseProvider] getOne", resource, id);
    const { data, error } = await supabase
      .from(resource)
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data as T;
  },

  async create<T>(resource: string, data: Partial<T>): Promise<T> {
    console.log("[supabaseProvider] create", resource, data);
    const { data: rows, error } = await supabase
      .from(resource)
      .insert(data as any)
      .select()
      .single();
    if (error) throw error;
    return rows as T;
  },

  async update<T>(resource: string, id: string, data: Partial<T>): Promise<T> {
    console.log("[supabaseProvider] update", resource, id, data);
    const { data: row, error } = await supabase
      .from(resource)
      .update(data as any)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return row as T;
  },

  async remove(resource: string, id: string): Promise<void> {
    console.log("[supabaseProvider] remove", resource, id);
    const { error } = await supabase.from(resource).delete().eq("id", id);
    if (error) throw error;
  },

  async upsertMany<T>(resource: string, data: T[]): Promise<T[]> {
    console.log("[supabaseProvider] upsertMany", resource, data?.length);
    const { data: rows, error } = await supabase.from(resource).upsert(data as any).select();
    if (error) throw error;
    return (rows as T[]) ?? [];
  },

  // Optional method for count (not part of DataProvider interface)
  async getCount(resource: string, filters?: ListFilters): Promise<number> {
    console.log("[supabaseProvider] getCount", resource, filters);
    let query = supabase.from(resource).select("*", { count: "exact", head: true });

    if (filters) {
      if (filters.venue_id) {
        query = query.eq("venue_id", filters.venue_id);
      }
      if (filters.date) {
        query = query.eq("date", filters.date);
      }
      if (filters.search && filters.search.trim().length > 0) {
        const term = filters.search.trim();
        query = query.or(`name.ilike.%${term}%,address.ilike.%${term}%`);
      }
    }

    const { count, error } = await query;
    if (error) throw error;
    return count ?? 0;
  },
};
