import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: adminUser }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !adminUser) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", adminUser.id)
      .single();

    if (!adminProfile?.is_admin) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { user_ids, tags } = body;

    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: "user_ids array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!Array.isArray(tags) || tags.length === 0) {
      return new Response(
        JSON.stringify({ error: "tags array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Limit to 100 users per batch
    if (user_ids.length > 100) {
      return new Response(
        JSON.stringify({ error: "Maximum 100 users per batch" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify all users exist
    const { data: users } = await supabase
      .from("profiles")
      .select("id")
      .in("id", user_ids);

    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid users found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get existing tags to avoid duplicates
    const { data: existingTags } = await supabase
      .from("user_tags")
      .select("user_id, tag")
      .in("user_id", user_ids)
      .in("tag", tags);

    const existingSet = new Set(
      (existingTags || []).map((t) => `${t.user_id}:${t.tag}`)
    );

    // Build new tags to insert
    const tagsToInsert: Array<{ user_id: string; tag: string; created_by: string }> = [];
    
    for (const user of users) {
      for (const tag of tags) {
        const key = `${user.id}:${tag}`;
        if (!existingSet.has(key)) {
          tagsToInsert.push({
            user_id: user.id,
            tag: tag.toLowerCase().trim(),
            created_by: adminUser.id,
          });
        }
      }
    }

    if (tagsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("user_tags")
        .insert(tagsToInsert);

      if (insertError) {
        console.error("Failed to insert tags:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to add tags" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log(`Added ${tagsToInsert.length} tags to ${users.length} users`);

    return new Response(
      JSON.stringify({
        success: true,
        added_count: tagsToInsert.length,
        user_count: users.length,
        tags_added: tags,
        message: `${tagsToInsert.length} tag hozzáadva ${users.length} felhasználóhoz`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error adding tags:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
