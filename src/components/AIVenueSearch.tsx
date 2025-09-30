import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface VenueData {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  address: string;
}

interface AIVenueSearchProps {
  venues: VenueData[];
  onRecommendation?: (venueIds: string[]) => void;
}

interface Recommendation {
  venueId: string;
  reason: string;
}

export function AIVenueSearch({ venues, onRecommendation }: AIVenueSearchProps) {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  const handleSearch = async () => {
    if (!query.trim()) {
      toast.error("Please enter a search query");
      return;
    }

    setIsLoading(true);
    setRecommendations([]);

    try {
      // Prepare venue data (lightweight version)
      const venueData = venues.map(v => ({
        id: v.id,
        name: v.name,
        description: v.description,
        tags: v.tags,
        address: v.address,
      }));

      const { data, error } = await supabase.functions.invoke('ai-venue-recommend', {
        body: { query, venues: venueData }
      });

      if (error) throw error;

      if (data.recommendations && data.recommendations.length > 0) {
        setRecommendations(data.recommendations);
        const venueIds = data.recommendations.map((r: Recommendation) => r.venueId);
        onRecommendation?.(venueIds);
        toast.success(`Found ${data.recommendations.length} recommendations!`);
      } else {
        toast.info("No specific recommendations, showing all venues");
      }
    } catch (error: any) {
      console.error("AI recommendation error:", error);
      if (error.message?.includes('429')) {
        toast.error("Rate limit exceeded. Please try again in a moment.");
      } else if (error.message?.includes('402')) {
        toast.error("AI credits depleted. Please add credits to your workspace.");
      } else {
        toast.error("Failed to get AI recommendations");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Card className="cgi-card mb-6">
      <div className="cgi-card-header">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-cgi-primary" />
          <h3 className="cgi-card-title">AI-Powered Venue Search</h3>
        </div>
        <span className="text-xs text-cgi-muted-foreground bg-cgi-primary/10 px-2 py-1 rounded">
          FREE with Gemini ✨
        </span>
      </div>
      
      <div className="flex gap-2 mt-4">
        <Input
          placeholder="Try: 'Find a place with craft cocktails and live music'"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isLoading}
          className="flex-1"
        />
        <Button 
          onClick={handleSearch} 
          disabled={isLoading}
          className="cgi-button-primary"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Thinking...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Search
            </>
          )}
        </Button>
      </div>

      {recommendations.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-cgi-surface-foreground">
            AI Recommendations:
          </p>
          {recommendations.map((rec, idx) => {
            const venue = venues.find(v => v.id === rec.venueId);
            return (
              <div key={idx} className="text-sm p-3 bg-cgi-surface rounded-lg border border-cgi-border">
                <div className="font-medium text-cgi-primary">
                  {idx + 1}. {venue?.name || 'Unknown venue'}
                </div>
                <div className="text-cgi-muted-foreground mt-1">
                  {rec.reason}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
