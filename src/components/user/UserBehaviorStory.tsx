import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BookOpen, 
  Lightbulb, 
  Target, 
  RefreshCw,
  Sparkles,
  Bell
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface UserStory {
  story: string;
  insights: string[];
  recommendation: string;
  context: {
    name: string;
    daysSinceRegistration: number;
    totalRedemptions: number;
    recentRedemptions: number;
    points: number;
  };
  generatedAt: string;
}

interface UserBehaviorStoryProps {
  userId: string;
  userName: string;
  onGenerateNotification?: () => void;
}

export function UserBehaviorStory({ userId, userName, onGenerateNotification }: UserBehaviorStoryProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: story, isLoading, error, refetch } = useQuery<UserStory>({
    queryKey: ["user-story", userId],
    queryFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-user-story?user_id=${userId}`,
        {
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            "Content-Type": "application/json"
          }
        }
      );

      if (!response.ok) {
        throw new Error("Failed to generate user story");
      }

      return response.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  if (isLoading) {
    return (
      <Card className="cgi-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-cgi-surface-foreground">
            <BookOpen className="h-5 w-5 text-cgi-primary" />
            Felhasználó történet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-6 w-28" />
          </div>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !story) {
    return (
      <Card className="cgi-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-cgi-surface-foreground">
            <BookOpen className="h-5 w-5 text-cgi-primary" />
            Felhasználó történet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-cgi-muted-foreground text-center py-4">
            Nem sikerült betölteni a felhasználó történetét
          </p>
          <Button onClick={handleRefresh} variant="outline" className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            Újrapróbálkozás
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="cgi-card border-l-4 border-l-cgi-primary">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-cgi-surface-foreground">
          <BookOpen className="h-5 w-5 text-cgi-primary" />
          Felhasználó történet
        </CardTitle>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Story Text */}
        <div className="bg-cgi-muted/20 rounded-lg p-4 border border-cgi-border/50">
          <p className="text-cgi-surface-foreground leading-relaxed">
            {story.story}
          </p>
        </div>

        {/* Insights */}
        {story.insights.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-cgi-muted-foreground">
              <Lightbulb className="h-4 w-4" />
              Kulcs insight-ok
            </div>
            <div className="flex flex-wrap gap-2">
              {story.insights.map((insight, index) => (
                <Badge 
                  key={index} 
                  variant="secondary"
                  className="bg-cgi-secondary/10 text-cgi-secondary border-cgi-secondary/30"
                >
                  {insight}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Recommendation */}
        {story.recommendation && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-cgi-muted-foreground">
              <Target className="h-4 w-4" />
              Javasolt akció
            </div>
            <div className="bg-cgi-primary/10 rounded-lg p-3 border border-cgi-primary/30">
              <p className="text-cgi-surface-foreground text-sm">
                {story.recommendation}
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button 
            onClick={onGenerateNotification}
            className="cgi-button-primary"
            size="sm"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            AI Értesítés generálása
          </Button>
          <Button 
            variant="outline"
            size="sm"
            className="cgi-button-outline"
          >
            <Bell className="h-4 w-4 mr-2" />
            Manuális értesítés
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
