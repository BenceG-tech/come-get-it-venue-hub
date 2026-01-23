import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";

interface UserActivityHeatmapProps {
  heatmapData: number[][];
}

const dayNames = ["V", "H", "K", "Sze", "Cs", "P", "Szo"];

export function UserActivityHeatmap({ heatmapData }: UserActivityHeatmapProps) {
  const maxValue = Math.max(...heatmapData.flat(), 1);

  const getColor = (value: number) => {
    if (value === 0) return "bg-cgi-muted/30";
    const intensity = value / maxValue;
    if (intensity > 0.75) return "bg-cgi-primary";
    if (intensity > 0.5) return "bg-cgi-primary/70";
    if (intensity > 0.25) return "bg-cgi-primary/40";
    return "bg-cgi-primary/20";
  };

  // Show only key hours for cleaner display
  const keyHours = [0, 6, 12, 18, 23];

  return (
    <Card className="cgi-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-cgi-surface-foreground flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5 text-cgi-primary" />
          Aktivitási hőtérkép
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {/* Hour labels */}
          <div className="flex gap-[2px] ml-10">
            {Array.from({ length: 24 }, (_, h) => (
              <div 
                key={h} 
                className="w-3 h-4 text-[8px] text-cgi-muted-foreground flex items-center justify-center"
              >
                {keyHours.includes(h) ? h : ""}
              </div>
            ))}
          </div>

          {/* Heatmap grid */}
          {heatmapData.map((dayData, dayIndex) => (
            <div key={dayIndex} className="flex items-center gap-1">
              <span className="w-8 text-xs text-cgi-muted-foreground text-right">
                {dayNames[dayIndex]}
              </span>
              <div className="flex gap-[2px]">
                {dayData.map((value, hourIndex) => (
                  <div
                    key={hourIndex}
                    className={`w-3 h-3 rounded-sm ${getColor(value)} transition-colors hover:ring-1 hover:ring-cgi-primary`}
                    title={`${dayNames[dayIndex]} ${hourIndex}:00 - ${value} aktivitás`}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Legend */}
          <div className="flex items-center justify-end gap-2 mt-3 text-xs text-cgi-muted-foreground">
            <span>Kevés</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 rounded-sm bg-cgi-muted/30" />
              <div className="w-3 h-3 rounded-sm bg-cgi-primary/20" />
              <div className="w-3 h-3 rounded-sm bg-cgi-primary/40" />
              <div className="w-3 h-3 rounded-sm bg-cgi-primary/70" />
              <div className="w-3 h-3 rounded-sm bg-cgi-primary" />
            </div>
            <span>Sok</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}