import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface GDPRExportButtonProps {
  userId: string;
  userName?: string;
}

export function GDPRExportButton({ userId, userName }: GDPRExportButtonProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData.session?.access_token) {
        throw new Error("No session");
      }

      const response = await supabase.functions.invoke("export-user-data", {
        body: null,
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (response.error) {
        throw response.error;
      }

      // Create download - need to fetch with user_id param
      const { data: { session } } = await supabase.auth.getSession();
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL || (supabase as any).supabaseUrl}/functions/v1/export-user-data?user_id=${userId}`;
      
      const exportResponse = await fetch(functionUrl, {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (!exportResponse.ok) {
        throw new Error("Export failed");
      }

      const exportData = await exportResponse.json();
      
      // Create and download JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: "application/json" 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gdpr_export_${userName?.replace(/\s+/g, '_') || userId}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "GDPR export sikeres",
        description: "A felhasználói adatok letöltése megkezdődött.",
      });

    } catch (error) {
      console.error("GDPR export error:", error);
      toast({
        title: "Hiba",
        description: "Az export nem sikerült. Próbáld újra később.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={loading}
      className="gap-2"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      GDPR Export
    </Button>
  );
}
