import { supabase } from "@/integrations/supabase/client";
import type { DataProvider } from "./index";
import { normalizeBusinessHours } from "@/lib/businessHours";

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
  "opening_hours", // added to support business_hours -> opening_hours mapping
  "coordinates",
  "caps",
  "notifications",
]);

function pickVenueColumns(payload: any) {
  const out: any = {};
  // Map UI "business_hours" to DB "opening_hours" if present
  if (payload && payload.business_hours && !payload.opening_hours) {
    out.opening_hours = payload.business_hours;
  }
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

async function fetchVenueDrinks(venueId: string) {
  const { data: drinks, error: drinksErr } = await supabase
    .from("venue_drinks")
    .select("*")
    .eq("venue_id", venueId)
    .order("created_at", { ascending: true });
  if (drinksErr) {
    logSbError("fetchVenueDrinks", drinksErr);
    throw drinksErr;
  }
  // Map to UI format
  return (drinks || []).map((d: any) => ({
    id: d.id,
    venue_id: d.venue_id,
    drinkName: d.drink_name,
    category: d.category,
    is_free_drink: d.is_free_drink,
    is_sponsored: d.is_sponsored,
    brand_id: d.brand_id,
    description: d.description,
    ingredients: d.ingredients,
    image_url: d.image_url,
    serving_style: d.serving_style,
    abv: d.abv
  }));
}

async function fetchFreeDrinkWindows(venueId: string) {
  const { data: windows, error: windowsErr } = await supabase
    .from("free_drink_windows")
    .select("*")
    .eq("venue_id", venueId)
    .order("created_at", { ascending: true });
  if (windowsErr) {
    logSbError("fetchFreeDrinkWindows", windowsErr);
    throw windowsErr;
  }
  // Map to UI format
  return (windows || []).map((w: any) => ({
    id: w.id,
    venue_id: w.venue_id,
    drink_id: w.drink_id,
    days: w.days,
    start: w.start_time,
    end: w.end_time,
    timezone: w.timezone
  }));
}

async function replaceVenueDrinks(venueId: string, drinks: any[]) {
  console.log('[replaceVenueDrinks] Starting with venueId:', venueId, 'drinks:', drinks);
  
  // Ensure all drinks have IDs and venue_id
  const drinksToUpsert = drinks.map(d => ({
    id: d.id || crypto.randomUUID(),
    venue_id: venueId,
    drink_name: d.drinkName,
    category: d.category,
    is_free_drink: d.is_free_drink,
    is_sponsored: d.is_sponsored,
    brand_id: d.brand_id,
    description: d.description,
    ingredients: d.ingredients,
    image_url: d.image_url,
    serving_style: d.serving_style,
    abv: d.abv
  }));
  
  console.log('[replaceVenueDrinks] About to upsert drinks:', drinksToUpsert);

  // Step 1: Upsert the new drinks (will insert new or update existing)
  const { data: upsertedDrinks, error: upsertErr } = await supabase
    .from('venue_drinks')
    .upsert(drinksToUpsert, { onConflict: 'id' })
    .select();
    
  if (upsertErr) {
    logSbError("replaceVenueDrinks(upsert)", upsertErr);
    console.error('[replaceVenueDrinks] Upsert failed:', upsertErr);
    throw new Error(`Failed to save drinks: ${upsertErr.message || upsertErr}`);
  }
  
  console.log('[replaceVenueDrinks] Upsert successful, result:', upsertedDrinks);

  // Step 2: Only if upsert succeeded, remove drinks that are not in our list
  if (drinksToUpsert.length > 0) {
    const keepIds = drinksToUpsert.map(d => d.id);
    console.log('[replaceVenueDrinks] Removing drinks not in list:', keepIds);
    
    const { error: delErr } = await supabase
      .from('venue_drinks')
      .delete()
      .eq('venue_id', venueId)
      .not('id', 'in', `(${keepIds.map(id => `"${id}"`).join(',')})`);
      
    if (delErr) {
      logSbError("replaceVenueDrinks(cleanup)", delErr);
      console.warn('[replaceVenueDrinks] Cleanup failed, but data was saved:', delErr);
      // Don't throw here - the main data was saved successfully
    }
  } else {
    // If no drinks provided, remove all drinks for this venue
    console.log('[replaceVenueDrinks] No drinks provided, removing all for venue');
    const { error: delErr } = await supabase
      .from('venue_drinks')
      .delete()
      .eq('venue_id', venueId);
      
    if (delErr) {
      logSbError("replaceVenueDrinks(clear all)", delErr);
      console.error('[replaceVenueDrinks] Failed to clear all drinks:', delErr);
      throw new Error(`Failed to clear drinks: ${delErr.message || delErr}`);
    }
  }

  console.log('[replaceVenueDrinks] Completed successfully');
  return fetchVenueDrinks(venueId);
}

async function replaceFreeDrinkWindows(venueId: string, windows: any[]) {
  console.log('[replaceFreeDrinkWindows] Starting with venueId:', venueId, 'windows:', windows);
  
  // Ensure all windows have IDs and venue_id
  const windowsToUpsert = windows.map(w => ({
    id: w.id || crypto.randomUUID(),
    venue_id: venueId,
    drink_id: w.drink_id,
    days: w.days,
    start_time: w.start,
    end_time: w.end,
    timezone: w.timezone
  }));
  
  console.log('[replaceFreeDrinkWindows] About to upsert windows:', windowsToUpsert);

  // Step 1: Upsert the new windows (will insert new or update existing)
  const { data: upsertedWindows, error: upsertErr } = await supabase
    .from('free_drink_windows')
    .upsert(windowsToUpsert, { onConflict: 'id' })
    .select();
    
  if (upsertErr) {
    logSbError("replaceFreeDrinkWindows(upsert)", upsertErr);
    console.error('[replaceFreeDrinkWindows] Upsert failed:', upsertErr);
    throw new Error(`Failed to save drink windows: ${upsertErr.message || upsertErr}`);
  }
  
  console.log('[replaceFreeDrinkWindows] Upsert successful, result:', upsertedWindows);

  // Step 2: Only if upsert succeeded, remove windows that are not in our list
  if (windowsToUpsert.length > 0) {
    const keepIds = windowsToUpsert.map(w => w.id);
    console.log('[replaceFreeDrinkWindows] Removing windows not in list:', keepIds);
    
    const { error: delErr } = await supabase
      .from('free_drink_windows')
      .delete()
      .eq('venue_id', venueId)
      .not('id', 'in', `(${keepIds.map(id => `"${id}"`).join(',')})`);
      
    if (delErr) {
      logSbError("replaceFreeDrinkWindows(cleanup)", delErr);
      console.warn('[replaceFreeDrinkWindows] Cleanup failed, but data was saved:', delErr);
      // Don't throw here - the main data was saved successfully
    }
  } else {
    // If no windows provided, remove all windows for this venue
    console.log('[replaceFreeDrinkWindows] No windows provided, removing all for venue');
    const { error: delErr } = await supabase
      .from('free_drink_windows')
      .delete()
      .eq('venue_id', venueId);
      
    if (delErr) {
      logSbError("replaceFreeDrinkWindows(clear all)", delErr);
      console.error('[replaceFreeDrinkWindows] Failed to clear all windows:', delErr);
      throw new Error(`Failed to clear windows: ${delErr.message || delErr}`);
    }
  }

  console.log('[replaceFreeDrinkWindows] Completed successfully');
  return fetchFreeDrinkWindows(venueId);
}

export const supabaseProvider: DataProvider & {
  getCount?: (resource: string, filters?: ListFilters) => Promise<number>;
  getPublicVenues?: (filters?: ListFilters) => Promise<any[]>;
  getPublicVenue?: (id: string) => Promise<any>;
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
        website_url, image_url, hero_image_url, is_paused, created_at, tags,
        participates_in_points, distance, google_maps_url, category, price_tier, rating
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

  // New method for fetching a single public venue
  async getPublicVenue(id: string): Promise<any> {
    console.log("[supabaseProvider] getPublicVenue", id);
    
    try {
      // Use edge function for public venue access
      const { data, error } = await supabase.functions.invoke('get-public-venue', {
        body: { id }
      });

      if (error) {
        console.warn("Edge function failed, using fallback:", error);
        // Fallback to direct database query
        const { data: venue, error: venueError } = await supabase
          .from('venues')
          .select(`
            id, name, address, description, plan, phone_number, 
            website_url, image_url, hero_image_url, is_paused, 
            created_at, tags, opening_hours, participates_in_points, distance,
            google_maps_url, category, price_tier, rating, coordinates
          `)
          .eq('id', id)
          .eq('is_paused', false)
          .single();

        if (venueError) {
          logSbError("getPublicVenue fallback", venueError);
          throw venueError;
        }

        // Fetch all related data to match edge function response
        const images = await fetchVenueImages(id);
        const drinks = await fetchVenueDrinks(id);
        const freeDrinkWindows = await fetchFreeDrinkWindows(id);
        
        // Map opening_hours to business_hours for UI compatibility and normalize
        const business_hours = normalizeBusinessHours(venue?.opening_hours);
        console.log('📡 [supabaseProvider] getPublicVenue fallback result:', {
          opening_hours: venue?.opening_hours,
          business_hours,
          venue_name: venue?.name
        });
        
        return { ...venue, images, drinks, freeDrinkWindows, business_hours };
      }

      // Map opening_hours to business_hours for UI compatibility and normalize
      const business_hours = normalizeBusinessHours(data?.opening_hours);
      console.log('📡 [supabaseProvider] getPublicVenue edge function result:', {
        opening_hours: data?.opening_hours,
        business_hours,
        venue_name: data?.name
      });
      return { ...data, business_hours };
    } catch (err) {
      logSbError("getPublicVenue", err);
      throw err;
    }
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

      // Attach images, drinks, and free drink windows
      const images = await fetchVenueImages(id);
      const drinks = await fetchVenueDrinks(id);
      const freeDrinkWindows = await fetchFreeDrinkWindows(id);

      // Map DB opening_hours -> UI business_hours and normalize
      const business_hours = normalizeBusinessHours((row as any)?.opening_hours);

      const enriched = { ...(row as any), images, drinks, freeDrinkWindows, business_hours };
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

      // Extract images, drinks, and windows from payload; store only supported columns in venues
      const images = Array.isArray(payload.images) ? payload.images : undefined;
      const drinks = Array.isArray(payload.drinks) ? payload.drinks : undefined;
      const freeDrinkWindows = Array.isArray(payload.freeDrinkWindows) ? payload.freeDrinkWindows : undefined;

      // Ensure opening_hours is set from business_hours for DB
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

      const venueId = (row as any).id;

      // If images provided, insert them into venue_images
      if (images && images.length > 0) {
        await replaceVenueImages(venueId, images);
      }

      // If drinks provided, insert them into venue_drinks
      if (drinks && drinks.length > 0) {
        await replaceVenueDrinks(venueId, drinks);
      }

      // If windows provided, insert them into free_drink_windows
      if (freeDrinkWindows && freeDrinkWindows.length > 0) {
        await replaceFreeDrinkWindows(venueId, freeDrinkWindows);
      }

      // Return venue with all related data
      const finalImages = await fetchVenueImages(venueId);
      const finalDrinks = await fetchVenueDrinks(venueId);
      const finalWindows = await fetchFreeDrinkWindows(venueId);
      const business_hours = (row as any)?.opening_hours ?? insertPayload?.opening_hours ?? undefined;
      
      const enriched = { ...(row as any), images: finalImages, drinks: finalDrinks, freeDrinkWindows: finalWindows, business_hours };
      return enriched as T;
    }

    const { data: rows, error } = await supabase
      .from(resource)
      .insert((data as any))
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
      const drinks = Array.isArray(payload.drinks) ? payload.drinks : undefined;
      const freeDrinkWindows = Array.isArray(payload.freeDrinkWindows) ? payload.freeDrinkWindows : undefined;

      // Ensure opening_hours is set from business_hours for DB
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

      // If drinks provided, sync them in venue_drinks
      if (drinks) {
        await replaceVenueDrinks(id, drinks);
      }

      // If windows provided, sync them in free_drink_windows
      if (freeDrinkWindows) {
        await replaceFreeDrinkWindows(id, freeDrinkWindows);
      }

      // Return updated venue with all related data
      const finalImages = await fetchVenueImages(id);
      const finalDrinks = await fetchVenueDrinks(id);
      const finalWindows = await fetchFreeDrinkWindows(id);
      const business_hours = (row as any)?.opening_hours ?? updatePayload?.opening_hours ?? undefined;
      
      const enriched = { ...(row as any), images: finalImages, drinks: finalDrinks, freeDrinkWindows: finalWindows, business_hours };
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
