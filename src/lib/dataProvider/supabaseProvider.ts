
import { supabase } from "@/integrations/supabase/client";
import type { DataProvider } from "./index";

export const supabaseProvider: DataProvider = {
  async getList<T>(resource: string, filters?: any): Promise<T[]> {
    console.log("[supabaseProvider] getList", resource, filters);
    
    let query = supabase.from(resource).select("*");
    
    // Apply basic filters
    if (filters) {
      if (filters.venue_id) {
        query = query.eq('venue_id', filters.venue_id);
      }
      if (filters.date) {
        query = query.eq('date', filters.date);
      }
      if (filters.search) {
        // Basic text search - can be enhanced with full-text search later
        query = query.ilike('name', `%${filters.search}%`);
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
      .insert(data)
      .select()
      .single();
    if (error) throw error;
    return rows as T;
  },

  async update<T>(resource: string, id: string, data: Partial<T>): Promise<T> {
    console.log("[supabaseProvider] update", resource, id, data);
    const { data: row, error } = await supabase
      .from(resource)
      .update(data)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return row as T;
  },

  async remove(resource: string, id: string): Promise<void> {
    console.log("[supabaseProvider] remove", resource, id);
    const { error } = await supabase
      .from(resource)
      .delete()
      .eq("id", id);
    if (error) throw error;
  },

  async upsertMany<T>(resource: string, data: T[]): Promise<T[]> {
    console.log("[supabaseProvider] upsertMany", resource, data?.length);
    const { data: rows, error } = await supabase
      .from(resource)
      .upsert(data as any)
      .select();
    if (error) throw error;
    return (rows as T[]) ?? [];
  },
};
