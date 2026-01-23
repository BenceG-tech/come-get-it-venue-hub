import { Badge } from "@/components/ui/badge";
import { MobileTooltip } from "@/components/ui/mobile-tooltip";
import { CalendarDays, Calendar, Hash, Sparkles, TrendingUp, Crown, Star, Flame } from "lucide-react";

interface RedemptionContextBadgesProps {
  visitsToday?: number;
  visitsThisWeek?: number;
  visitsThisMonth?: number;
  visitsTotal?: number;
  showMilestones?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function RedemptionContextBadges({
  visitsToday,
  visitsThisWeek,
  visitsThisMonth,
  visitsTotal,
  showMilestones = true,
  size = "md",
  className,
}: RedemptionContextBadgesProps) {
  const badgeSize = size === "sm" ? "text-[10px] px-1.5 py-0" : "text-xs";
  const iconSize = size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3";

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {/* Visit Context Badges */}
      {visitsToday && visitsToday > 1 && (
        <MobileTooltip content="Ma hányadik beváltása ennek a felhasználónak ezen a helyszínen">
          <Badge variant="outline" className={`${badgeSize} text-cgi-muted-foreground`}>
            <Hash className={`${iconSize} mr-0.5`} />
            {visitsToday}. ma
          </Badge>
        </MobileTooltip>
      )}

      {visitsThisWeek && visitsThisWeek > 1 && (
        <MobileTooltip content="Ezen a héten hányadik beváltás - heti törzsvendég figyelése">
          <Badge variant="outline" className={`${badgeSize} text-cgi-muted-foreground`}>
            <CalendarDays className={`${iconSize} mr-0.5`} />
            {visitsThisWeek}. e héten
          </Badge>
        </MobileTooltip>
      )}

      {visitsThisMonth && visitsThisMonth > 1 && (
        <MobileTooltip content="Ebben a hónapban hányadik beváltás - havi VIP figyelése">
          <Badge variant="outline" className={`${badgeSize} text-cgi-muted-foreground`}>
            <Calendar className={`${iconSize} mr-0.5`} />
            {visitsThisMonth}. e hónapban
          </Badge>
        </MobileTooltip>
      )}

      {visitsTotal && (
        <MobileTooltip content="Összes beváltás ezen a helyszínen">
          <Badge className={`${badgeSize} bg-cgi-primary/20 text-cgi-primary border-cgi-primary/30`}>
            <TrendingUp className={`${iconSize} mr-0.5`} />
            {visitsTotal}. összesen
          </Badge>
        </MobileTooltip>
      )}

      {/* Milestone Badges */}
      {showMilestones && (
        <>
          {visitsTotal === 1 && (
            <MobileTooltip content="Ez a felhasználó először jár itt - kiemelt figyelem!">
              <Badge className={`${badgeSize} bg-cgi-secondary/20 text-cgi-secondary border-cgi-secondary/30`}>
                <Sparkles className={`${iconSize} mr-0.5`} />
                Első látogatás!
              </Badge>
            </MobileTooltip>
          )}

          {visitsTotal === 3 && (
            <MobileTooltip content="Visszatérő vendég - harmadszor jár itt!">
              <Badge className={`${badgeSize} bg-cgi-primary/20 text-cgi-primary border-cgi-primary/30`}>
                <TrendingUp className={`${iconSize} mr-0.5`} />
                Visszatérő
              </Badge>
            </MobileTooltip>
          )}

          {visitsThisWeek && visitsThisWeek >= 3 && (
            <MobileTooltip content="Heti törzsvendég - legalább 3x járt itt ezen a héten!">
              <Badge className={`${badgeSize} bg-amber-500/20 text-amber-400 border-amber-500/30`}>
                <Flame className={`${iconSize} mr-0.5`} />
                Heti törzsvendég
              </Badge>
            </MobileTooltip>
          )}

          {visitsThisMonth && visitsThisMonth >= 10 && (
            <MobileTooltip content="Havi VIP - legalább 10x járt itt ebben a hónapban!">
              <Badge className={`${badgeSize} bg-purple-500/20 text-purple-400 border-purple-500/30`}>
                <Star className={`${iconSize} mr-0.5`} />
                Havi VIP
              </Badge>
            </MobileTooltip>
          )}

          {visitsTotal && visitsTotal >= 50 && (
            <MobileTooltip content="Platina tag - legalább 50 beváltás összesen!">
              <Badge className={`${badgeSize} bg-cgi-success/20 text-cgi-success border-cgi-success/30`}>
                <Crown className={`${iconSize} mr-0.5`} />
                Platina
              </Badge>
            </MobileTooltip>
          )}
        </>
      )}
    </div>
  );
}
