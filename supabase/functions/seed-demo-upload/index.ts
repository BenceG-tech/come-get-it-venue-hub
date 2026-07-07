// Temporary one-off edge function to upload demo venue images to Storage.
// Delete after use.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SHARED_SECRET = Deno.env.get("DOCS_ADMIN_SECRET") || "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = req.headers.get("x-admin-secret");
  if (!SHARED_SECRET || auth !== SHARED_SECRET) {
    return new Response("Unauthorized", { status: 401, headers: corsHeaders });
  }

  const { images } = await req.json() as {
    images: Array<{ key: string; base64: string }>;
  };

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const results: Record<string, string> = {};
  for (const img of images) {
    const bin = Uint8Array.from(atob(img.base64), (c) => c.charCodeAt(0));
    const path = `seed/${img.key}.png`;
    const { error } = await supabase.storage.from("venue-images").upload(path, bin, {
      contentType: "image/png",
      upsert: true,
    });
    if (error) {
      return new Response(JSON.stringify({ error: error.message, key: img.key }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data } = supabase.storage.from("venue-images").getPublicUrl(path);
    results[img.key] = data.publicUrl;
  }

  return new Response(JSON.stringify({ ok: true, urls: results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
