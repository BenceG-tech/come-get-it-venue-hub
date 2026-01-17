import { useState } from "react";
import { ChartCard } from "@/components/ChartCard";
import { useIsMobile } from "@/hooks/use-mobile";
import AnalyticsHeatmapMobile from "@/components/AnalyticsHeatmapMobile";

interface UserAnalyticsHeatmapProps {
  heatmapData: number[][];
}

export function UserAnalyticsHeatmap({ heatmapData }: UserAnalyticsHeatmapProps) {
  const [selectedCell, setSelectedCell] = useState<{
    day: string;
    hour: number;
    value: number;
  } | null>(null);
  const isMobile = useIsMobile();

  const days = ["Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat", "Vasárnap"];
  const dayAbbr = ["H", "K", "Sze", "Cs", "P", "Szo", "V"];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getHeatmapColor = (value: number) => {
    const max = Math.max(...heatmapData.flat(), 1);
    const intensity = value / max;

    if (intensity === 0) return "hsl(var(--cgi-muted))";
    if (intensity < 0.2) return "rgba(6, 182, 212, 0.2)";
    if (intensity < 0.4) return "rgba(6, 182, 212, 0.4)";
    if (intensity < 0.6) return "rgba(6, 182, 212, 0.6)";
    if (intensity < 0.8) return "rgba(6, 182, 212, 0.8)";
    return "rgba(6, 182, 212, 1)";
  };

  const handleCellClick = (dayIndex: number, hour: number, value: number) => {
    setSelectedCell({
      day: days[dayIndex],
      hour,
      value,
    });
  };

  if (isMobile) {
    return (
      <ChartCard
        title="Aktivitási hőtérkép"
        tooltip="Mikor a legaktívabbak a felhasználók a héten."
      >
        <AnalyticsHeatmapMobile heatmapData={heatmapData} />
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title="Aktivitási hőtérkép"
      tooltip="Óránkénti és napi bontásban mutatja a felhasználói aktivitást. A sötétebb színek magasabb aktivitást jeleznek."
    >
      <div className="space-y-4">
        {/* Hour Labels */}
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            <div className="flex mb-2">
              <div className="w-12"></div>
              {hours
                .filter((_, i) => i % 3 === 0)
                .map((hour) => (
                  <div
                    key={hour}
                    className="flex-1 text-center text-xs text-cgi-muted-foreground min-w-[20px]"
                  >
                    {hour}h
                  </div>
                ))}
            </div>

            {/* Heatmap Grid */}
            <div className="space-y-1">
              {days.map((day, dayIndex) => (
                <div key={day} className="flex items-center gap-1">
                  <div className="w-12 text-xs text-cgi-muted-foreground text-right pr-2 font-medium">
                    {dayAbbr[dayIndex]}
                  </div>
                  <div className="flex gap-px flex-1">
                    {heatmapData[dayIndex]?.map((value, hourIndex) => (
                      <div
                        key={`${dayIndex}-${hourIndex}`}
                        className="h-6 flex-1 min-w-[8px] rounded-sm border border-cgi-muted/20 cursor-pointer hover:ring-2 hover:ring-cgi-primary transition-all duration-200"
                        style={{ backgroundColor: getHeatmapColor(value) }}
                        title={`${day} ${hours[hourIndex]}:00 - ${value} aktivitás`}
                        onClick={() => handleCellClick(dayIndex, hourIndex, value)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between text-xs text-cgi-muted-foreground">
          <span>Kevesebb</span>
          <div className="flex gap-1">
            {[0, 0.2, 0.4, 0.6, 0.8, 1].map((intensity) => (
              <div
                key={intensity}
                className="h-4 w-4 rounded border border-cgi-muted/20"
                style={{
                  backgroundColor:
                    intensity === 0
                      ? "hsl(var(--cgi-muted))"
                      : `rgba(6, 182, 212, ${intensity})`,
                }}
              />
            ))}
          </div>
          <span>Több</span>
        </div>

        {/* Selected Cell Info */}
        {selectedCell && (
          <div className="mt-4 p-3 bg-cgi-surface rounded-lg border border-cgi-muted">
            <div className="text-sm text-cgi-surface-foreground">
              <strong>{selectedCell.day}</strong> {selectedCell.hour}:00 -{" "}
              {selectedCell.hour + 1}:00
            </div>
            <div className="text-lg font-bold text-cgi-primary">
              {selectedCell.value} aktivitás
            </div>
          </div>
        )}
      </div>
    </ChartCard>
  );
}
