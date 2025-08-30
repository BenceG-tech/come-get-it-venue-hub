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

function logSbError(where: string, err: any) {
  const meta = (err && (err as any).cause) || {};
  console.error("[SupabaseWeb]", where, {
    message: err?.message,
    code: (err as any)?.code || meta?.code,
    details: (err as any)?.details || meta?.details,
    hint: (err as any)?.hint || meta?.hint,
    status: (err as any)?.status || meta?.status,
  });
}

// Allowed columns for the "venues" table so we don't send unsupported fields
const VENUE_COLUMNS = new Set([
  "name",
  "address",
  "description",
  "plan",
  "is_paused",
  "phone_number",
  "website_url",
  "owner_profile_id",
  "image_url",
  "hero_image_url",
  "tags",
]);

function pickVenueColumns(payload: any) {
  const out: any = {};
  Object.keys(payload || {}).forEach((k) => {
    if (VENUE_COLUMNS.has(k)) out[k] = (payload as any)[k];
  });
  return out;
}

async function fetchVenueImages(venueId: string) {
  const { data: imgs, error: imgsErr } = await supabase
    .from("venue_images")
    .select("id, url, label, is_cover, created_at")
    .eq("venue_id", venueId)
    .order("created_at", { ascending: true });
  if (imgsErr) {
    logSbError("fetchVenueImages", imgsErr);
    throw imgsErr;
  }
  // Map to camelCase for UI
  return (imgs || []).map((i: any) => ({
    id: i.id,
    url: i.url,
    label: i.label || "",
    isCover: !!i.is_cover,
  }));
}

async function replaceVenueImages(venueId: string, images: any[]) {
  // Delete all images for this venue
  const { error: delErr } = await supabase
    .from("venue_images")
    .delete()
    .eq("venue_id", venueId);
  if (delErr) {
    logSbError("replaceVenueImages(delete)", delErr);
    throw delErr;
  }

  if (!images || images.length === 0) return [];

  const rows = images.map((img: any) => ({
    venue_id: venueId,
    url: img.url,
    label: img.label || null,
    is_cover: !!img.isCover,
  }));

  const { data: inserted, error: insErr } = await supabase
    .from("venue_images")
    .insert(rows)
    .select();
  if (insErr) {
    logSbError("replaceVenueImages(insert)", insErr);
    throw insErr;
  }

  return (inserted || []).map((i: any) => ({
    id: i.id,
    url: i.url,
    label: i.label || "",
    isCover: !!i.is_cover,
  }));
}

export const supabaseProvider: DataProvider & {
  getCount?: (resource: string, filters?: ListFilters) => Promise<number>;
  getPublicVenues?: (filters?: ListFilters) => Promise<any[]>;
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
    if (error) {
      logSbError("getList", error);
      throw error;
    }
    return (data as T[]) ?? [];
  },

  // New method for public venue access
  async getPublicVenues(filters?: ListFilters): Promise<any[]> {
    console.log("[supabaseProvider] getPublicVenues", filters);
    
    // Use RPC call for public venue access to bypass RLS
    let query = supabase.rpc('get_public_venues', {
      search_term: filters?.search || null,
      limit_count: filters?.limit || 50
    });

    const { data, error } = await query;
    if (error) {
      // Fallback to regular query if RPC doesn't exist yet
      console.warn("RPC get_public_venues not found, using fallback");
      let fallbackQuery = supabase.from('venues').select(`
        id, name, address, description, plan, phone_number, 
        website_url, image_url, hero_image_url, is_paused, created_at, tags
      `).eq('is_paused', false);

      if (filters?.search && filters.search.trim().length > 0) {
        const term = filters.search.trim();
        fallbackQuery = fallbackQuery.or(`name.ilike.%${term}%,address.ilike.%${term}%`);
      }

      fallbackQuery = fallbackQuery.order('created_at', { ascending: false });
      
      if (filters?.limit) {
        fallbackQuery = fallbackQuery.limit(filters.limit);
      }

      const { data: fallbackData, error: fallbackError } = await fallbackQuery;
      if (fallbackError) {
        logSbError("getPublicVenues fallback", fallbackError);
        throw fallbackError;
      }
      return fallbackData ?? [];
    }
    return data ?? [];
  },

  async getOne<T>(resource: string, id: string): Promise<T> {
    console.log("[supabaseProvider] getOne", resource, id);

    if (resource === "venues") {
      const { data: row, error } = await supabase
        .from("venues")
        .select("*, tags")
        .eq("id", id)
        .single();
      if (error) {
        logSbError("getOne(venues)", error);
        throw error;
      }

      // Attach images
      const images = await fetchVenueImages(id);
      const enriched = { ...(row as any), images };
      return enriched as T;
    }

    const { data, error } = await supabase
      .from(resource)
      .select("*")
      .eq("id", id)
      .single();
    if (error) {
      logSbError("getOne", error);
      throw error;
    }
    return data as T;
  },

  async create<T>(resource: string, data: Partial<T>): Promise<T> {
    console.log("[supabaseProvider] create", resource, data);

    // Inject owner_profile_id for venues (also enforced by DB trigger)
    let payload = data as any;
    if (resource === "venues") {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user) {
        const err = authError ?? new Error("Please log in to create a venue");
        logSbError("create(auth.getUser)", err);
        throw err;
      }
      if (!payload.owner_profile_id) {
        payload = { ...payload, owner_profile_id: authData.user.id };
      }

      // Extract images from payload; store only supported columns in venues
      const images = Array.isArray(payload.images) ? payload.images : undefined;
      const insertPayload = pickVenueColumns(payload);

      const { data: row, error } = await supabase
        .from("venues")
        .insert(insertPayload as any)
        .select()
        .single();
      if (error) {
        logSbError("create(venues)", error);
        throw error;
      }

      // If images provided, insert them into venue_images
      if (images && images.length > 0) {
        await replaceVenueImages(row.id, images);
      }

      // Return venue with images
      const enriched = { ...(row as any), images: images ? await fetchVenueImages(row.id) : [] };
      return enriched as T;
    }

    const { data: rows, error } = await supabase
      .from(resource)
      .insert(payload as any)
      .select()
      .single();
    if (error) {
      logSbError("create", error);
      throw error;
    }
    return rows as T;
  },

  async update<T>(resource: string, id: string, data: Partial<T>): Promise<T> {
    console.log("[supabaseProvider] update", resource, id, data);

    if (resource === "venues") {
      const payload = data as any;
      const images = Array.isArray(payload.images) ? payload.images : undefined;
      const updatePayload = pickVenueColumns(payload);

      // Update the venue row (only supported columns)
      const { data: row, error } = await supabase
        .from("venues")
        .update(updatePayload as any)
        .eq("id", id)
        .select()
        .single();
      if (error) {
        logSbError("update(venues)", error);
        throw error;
      }

      // If images provided, sync them in venue_images
      if (images) {
        await replaceVenueImages(id, images);
      }

      // Return updated venue with images
      const finalImages = await fetchVenueImages(id);
      const enriched = { ...(row as any), images: finalImages };
      return enriched as T;
    }

    const { data: row, error } = await supabase
      .from(resource)
      .update(data as any)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      logSbError("update", error);
      throw error;
    }
    return row as T;
  },

  async remove(resource: string, id: string): Promise<void> {
    console.log("[supabaseProvider] remove", resource, id);
    const { error } = await supabase.from(resource).delete().eq("id", id);
    if (error) {
      logSbError("remove", error);
      throw error;
    }
  },

  async upsertMany<T>(resource: string, data: T[]): Promise<T[]> {
    console.log("[supabaseProvider] upsertMany", resource, data?.length);
    const { data: rows, error } = await supabase.from(resource).upsert(data as any).select();
    if (error) {
      logSbError("upsertMany", error);
      throw error;
    }
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
    if (error) {
      logSbError("getCount", error);
      throw error;
    }
    return count ?? 0;
  },
};
