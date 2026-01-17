import { ChartCard } from "@/components/ChartCard";

interface RetentionCohort {
  cohort_week: string;
  cohort_size: number;
  week_0: number;
  week_1?: number;
  week_2?: number;
  week_3?: number;
  week_4?: number;
}

interface UserRetentionChartProps {
  cohorts: RetentionCohort[];
}

export function UserRetentionChart({ cohorts }: UserRetentionChartProps) {
  const getRetentionColor = (percentage: number) => {
    if (percentage >= 70) return "bg-green-500";
    if (percentage >= 50) return "bg-green-400";
    if (percentage >= 30) return "bg-yellow-500";
    if (percentage >= 15) return "bg-orange-500";
    return "bg-red-500";
  };

  const getRetentionTextColor = (percentage: number) => {
    if (percentage >= 70) return "text-green-400";
    if (percentage >= 50) return "text-green-300";
    if (percentage >= 30) return "text-yellow-400";
    if (percentage >= 15) return "text-orange-400";
    return "text-red-400";
  };

  const formatWeek = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("hu-HU", { month: "short", day: "numeric" });
  };

  if (cohorts.length === 0) {
    return (
      <ChartCard
        title="Felhasználó megtartás"
        tooltip="A kohortonkénti megtartási ráta mutatja, hogy a regisztrált felhasználók hány százaléka tér vissza a következő hetekben."
      >
        <div className="flex items-center justify-center h-48 text-cgi-muted-foreground">
          Nincs elegendő adat a megtartási elemzéshez
        </div>
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title="Felhasználó megtartás"
      tooltip="A kohortonkénti megtartási ráta mutatja, hogy a regisztrált felhasználók hány százaléka tér vissza a következő hetekben."
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="grid grid-cols-6 gap-2 text-xs text-cgi-muted-foreground">
          <div>Kohort</div>
          <div className="text-center">Méret</div>
          <div className="text-center">1. hét</div>
          <div className="text-center">2. hét</div>
          <div className="text-center">3. hét</div>
          <div className="text-center">4. hét</div>
        </div>

        {/* Cohort Rows */}
        {cohorts.map((cohort) => (
          <div
            key={cohort.cohort_week}
            className="grid grid-cols-6 gap-2 items-center"
          >
            <div className="text-sm text-cgi-surface-foreground font-medium">
              {formatWeek(cohort.cohort_week)}
            </div>
            <div className="text-center text-sm text-cgi-muted-foreground">
              {cohort.cohort_size}
            </div>
            {[1, 2, 3, 4].map((week) => {
              const key = `week_${week}` as keyof RetentionCohort;
              const value = cohort[key] as number | undefined;

              if (value === undefined) {
                return (
                  <div
                    key={week}
                    className="h-8 rounded bg-cgi-muted/30 flex items-center justify-center"
                  >
                    <span className="text-xs text-cgi-muted-foreground">-</span>
                  </div>
                );
              }

              return (
                <div
                  key={week}
                  className={`h-8 rounded ${getRetentionColor(value)} bg-opacity-20 flex items-center justify-center`}
                >
                  <span className={`text-sm font-medium ${getRetentionTextColor(value)}`}>
                    {value}%
                  </span>
                </div>
              );
            })}
          </div>
        ))}

        {/* Legend */}
        <div className="flex items-center gap-4 pt-2 text-xs text-cgi-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span>70%+</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-yellow-500" />
            <span>30-50%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span>&lt;15%</span>
          </div>
        </div>
      </div>
    </ChartCard>
  );
}
