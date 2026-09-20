import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * CSR ("Drink for a Cause") is only operational when at least one active venue
 * has CSR enabled with a default charity. Used to hide / label the
 * Charity Impact surface instead of showing empty impact claims.
 */
export function useCsrConfigured() {
  const { data, isLoading } = useQuery({
    queryKey: ["csr-configured"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("venues")
        .select("id", { count: "exact", head: true })
        .eq("csr_enabled", true)
        .eq("is_paused", false)
        .not("default_charity_id", "is", null);

      if (error) {
        console.error("[useCsrConfigured] query failed", error.message);
        return false;
      }
      return (count ?? 0) > 0;
    },
  });

  return { isCsrConfigured: Boolean(data), isLoading };
}
