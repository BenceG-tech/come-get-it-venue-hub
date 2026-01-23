import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Play, 
  ChartBar,
  Sparkles,
  Star,
  Wine,
  Gift,
  TrendingUp,
  TrendingDown,
  AlertTriangle
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { hu } from "date-fns/locale";

interface JourneyEvent {
  date: string;
  type: 'registration' | 'first_redemption' | 'milestone' | 'streak' | 'slowdown' | 'reactivation';
  title: string;
  description: string;
  icon: 'star' | 'wine' | 'gift' | 'trending-up' | 'trending-down' | 'alert';
  significance: 'high' | 'medium' | 'low';
  metadata?: Record<string, unknown>;
}

interface UserJourneyTimelineProps {
  userId: string;
  signupDate?: string;
  firstRedemptionDate?: string;
  totalRedemptions: number;
  totalVenues: number;
  activityTrend?: 'increasing' | 'stable' | 'decreasing';
  weeklyTrends?: Array<{
    week_start: string;
    redemption_count: number;
    points_earned: number;
    active_days: number;
  }>;
  redemptionHistory?: Array<{
    venue_name: string;
    drink_name: string;
    redeemed_at: string;
  }>;
}

export function UserJourneyTimeline({
  userId,
  signupDate,
  firstRedemptionDate,
  totalRedemptions,
  totalVenues,
  activityTrend,
  weeklyTrends,
  redemptionHistory
}: UserJourneyTimelineProps) {
  
  const journeyEvents = useMemo(() => {
    const events: JourneyEvent[] = [];
    
    // Registration event
    if (signupDate) {
      events.push({
        date: signupDate,
        type: 'registration',
        title: '📱 Regisztráció',
        description: 'Csatlakozott a Come Get It közösséghez',
        icon: 'star',
        significance: 'high',
      });
    }

    // First redemption
    if (firstRedemptionDate && signupDate) {
      const daysToFirst = differenceInDays(new Date(firstRedemptionDate), new Date(signupDate));
      events.push({
        date: firstRedemptionDate,
        type: 'first_redemption',
        title: '🍺 Első beváltás',
        description: daysToFirst === 0 
          ? 'Azonnal kipróbálta a szolgáltatást!' 
          : `${daysToFirst} nap után váltotta be első italát`,
        icon: 'wine',
        significance: 'high',
        metadata: { days_to_convert: daysToFirst },
      });
    }

    // Milestones based on total redemptions
    if (totalRedemptions >= 10) {
      events.push({
        date: redemptionHistory?.[Math.floor(totalRedemptions * 0.5)]?.redeemed_at || new Date().toISOString(),
        type: 'milestone',
        title: '🏆 10+ beváltás',
        description: 'Aktív felhasználóvá vált',
        icon: 'gift',
        significance: 'medium',
      });
    }

    if (totalRedemptions >= 25) {
      events.push({
        date: redemptionHistory?.[Math.floor(totalRedemptions * 0.75)]?.redeemed_at || new Date().toISOString(),
        type: 'milestone',
        title: '⭐ Power User státusz',
        description: '25+ beváltás - VIP szint elérve',
        icon: 'star',
        significance: 'high',
      });
    }

    if (totalVenues >= 5) {
      events.push({
        date: new Date().toISOString(),
        type: 'milestone',
        title: '🗺️ Felfedező',
        description: `${totalVenues} különböző helyszínt látogatott meg`,
        icon: 'star',
        significance: 'medium',
      });
    }

    // Detect slowdowns from weekly trends
    if (weeklyTrends && weeklyTrends.length >= 3) {
      const lastWeeks = weeklyTrends.slice(-3);
      const avgFirst = (lastWeeks[0]?.redemption_count || 0);
      const avgLast = (lastWeeks[2]?.redemption_count || 0);
      
      if (avgFirst > 2 && avgLast < avgFirst * 0.5) {
        events.push({
          date: lastWeeks[2]?.week_start || new Date().toISOString(),
          type: 'slowdown',
          title: '⚠️ Aktivitás csökkenés',
          description: `Az aktivitás ${Math.round((1 - avgLast / avgFirst) * 100)}%-kal csökkent`,
          icon: 'trending-down',
          significance: 'high',
        });
      }
    }

    // Sort by date
    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [signupDate, firstRedemptionDate, totalRedemptions, totalVenues, weeklyTrends, redemptionHistory]);

  const getIconComponent = (icon: JourneyEvent['icon']) => {
    switch (icon) {
      case 'star': return <Star className="h-4 w-4" />;
      case 'wine': return <Wine className="h-4 w-4" />;
      case 'gift': return <Gift className="h-4 w-4" />;
      case 'trending-up': return <TrendingUp className="h-4 w-4" />;
      case 'trending-down': return <TrendingDown className="h-4 w-4" />;
      case 'alert': return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getSignificanceColor = (significance: JourneyEvent['significance']) => {
    switch (significance) {
      case 'high': return 'bg-primary text-primary-foreground';
      case 'medium': return 'bg-blue-500 text-white';
      case 'low': return 'bg-muted text-muted-foreground';
    }
  };

  // Calculate key insights
  const insights = useMemo(() => {
    const results: string[] = [];
    
    if (signupDate && firstRedemptionDate) {
      const daysToFirst = differenceInDays(new Date(firstRedemptionDate), new Date(signupDate));
      if (daysToFirst <= 2) {
        results.push('🎯 Gyors konverziójú felhasználó - a welcome pontok hatékonyak voltak');
      } else if (daysToFirst > 7) {
        results.push('📅 Lassú konverzió - erősebb onboarding szükséges lehet');
      }
    }

    if (totalRedemptions >= 20 && totalVenues >= 3) {
      results.push('📈 Aktív és felfedező - ideális célpont új helyszín ajánlatokhoz');
    }

    if (activityTrend === 'decreasing') {
      results.push('⚠️ Csökkenő trend - reaktiváló kampány ajánlott');
    } else if (activityTrend === 'increasing') {
      results.push('🚀 Növekvő aktivitás - jó időpont VIP ajánlatokhoz');
    }

    return results;
  }, [signupDate, firstRedemptionDate, totalRedemptions, totalVenues, activityTrend]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-xl">🎬</span>
          Felhasználói Út
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Timeline */}
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
          
          {/* Events */}
          <div className="space-y-6">
            {journeyEvents.map((event, index) => (
              <div key={index} className="relative flex items-start gap-4 pl-10">
                {/* Timeline dot */}
                <div className={`absolute left-2 w-5 h-5 rounded-full flex items-center justify-center -translate-x-1/2 ${getSignificanceColor(event.significance)}`}>
                  {getIconComponent(event.icon)}
                </div>
                
                {/* Event content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{event.title}</span>
                    <Badge variant="outline" className="text-xs">
                      {format(new Date(event.date), 'yyyy. MMM d.', { locale: hu })}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {event.description}
                  </p>
                </div>
              </div>
            ))}
            
            {/* Future indicator */}
            <div className="relative flex items-start gap-4 pl-10 opacity-50">
              <div className="absolute left-2 w-5 h-5 rounded-full flex items-center justify-center -translate-x-1/2 bg-muted border-2 border-dashed border-muted-foreground">
                <span className="text-xs">?</span>
              </div>
              <div className="flex-1">
                <span className="text-sm text-muted-foreground italic">
                  Következő mérföldkő...
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Key Insights */}
        {insights.length > 0 && (
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Kulcs Következtetések
            </h4>
            <ul className="space-y-1">
              {insights.map((insight, index) => (
                <li key={index} className="text-sm text-muted-foreground">
                  {insight}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-4 flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" disabled>
            <Play className="h-4 w-4 mr-2" />
            Animált lejátszás
          </Button>
          <Button variant="outline" size="sm" disabled>
            <ChartBar className="h-4 w-4 mr-2" />
            Részletes elemzés
          </Button>
          <Button variant="outline" size="sm" disabled>
            <Sparkles className="h-4 w-4 mr-2" />
            AI ajánlások
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
