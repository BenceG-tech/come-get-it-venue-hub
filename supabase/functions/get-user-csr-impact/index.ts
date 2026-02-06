import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user JWT
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's CSR donations
    const { data: donations, error: donationsError } = await serviceClient
      .from("csr_donations")
      .select("amount_huf, charity_id, created_at")
      .eq("user_id", user.id);

    if (donationsError) {
      console.error("Error fetching donations:", donationsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch donation data" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const donationList = donations || [];

    // Calculate totals
    const totalDonations = donationList.reduce((sum, d) => sum + (d.amount_huf || 0), 0);
    const donationCount = donationList.length;

    // Find favorite charity (most frequent)
    let favoriteCharity: { id: string; name: string } | null = null;

    if (donationList.length > 0) {
      const charityFrequency: Record<string, number> = {};
      for (const d of donationList) {
        if (d.charity_id) {
          charityFrequency[d.charity_id] = (charityFrequency[d.charity_id] || 0) + 1;
        }
      }

      const topCharityId = Object.entries(charityFrequency).sort(
        (a, b) => b[1] - a[1]
      )[0]?.[0];

      if (topCharityId) {
        const { data: charity } = await serviceClient
          .from("charities")
          .select("id, name")
          .eq("id", topCharityId)
          .single();

        if (charity) {
          favoriteCharity = { id: charity.id, name: charity.name };
        }
      }
    }

    return new Response(
      JSON.stringify({
        total_donations_huf: totalDonations,
        donation_count: donationCount,
        favorite_charity: favoriteCharity,
        recent_donations: donationList.slice(0, 10),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("CSR impact error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
