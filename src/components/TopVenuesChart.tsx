import { ChartCard } from "@/components/ChartCard";
import { MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface VenueData {
  venue_id: string;
  venue_name: string;
  redemption_count: number;
  unique_users: number;
}

interface TopVenuesChartProps {
  venues: VenueData[];
}

export function TopVenuesChart({ venues }: TopVenuesChartProps) {
  const navigate = useNavigate();
  const maxCount = Math.max(...venues.map((v) => v.redemption_count), 1);

  if (venues.length === 0) {
    return (
      <ChartCard
        title="Top helyszínek"
        tooltip="A legtöbb beváltást generáló helyszínek az elmúlt 30 napban."
      >
        <div className="flex items-center justify-center h-48 text-cgi-muted-foreground">
          Nincs beváltási adat
        </div>
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title="Top helyszínek"
      tooltip="A legtöbb beváltást generáló helyszínek az elmúlt 30 napban."
    >
      <div className="space-y-3">
        {venues.map((venue, index) => {
          const percentage = (venue.redemption_count / maxCount) * 100;

          return (
            <div
              key={venue.venue_id}
              className="group cursor-pointer"
              onClick={() => navigate(`/venues/${venue.venue_id}`)}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-cgi-muted-foreground w-5">
                    {index + 1}.
                  </span>
                  <MapPin className="h-4 w-4 text-cgi-primary" />
                  <span className="text-sm text-cgi-surface-foreground group-hover:text-cgi-primary transition-colors truncate max-w-[180px]">
                    {venue.venue_name}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-cgi-primary">
                    {venue.redemption_count}
                  </span>
                  <span className="text-xs text-cgi-muted-foreground ml-1">
                    ({venue.unique_users} fő)
                  </span>
                </div>
              </div>
              <div className="h-2 bg-cgi-muted/30 rounded-full overflow-hidden ml-7">
                <div
                  className="h-full bg-gradient-to-r from-cgi-primary to-cyan-400 rounded-full transition-all group-hover:opacity-80"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
}
