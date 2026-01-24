/**
 * Centralized Recharts styling for the CGI dark theme
 * Use these styles across all chart components for consistency
 */

// Tooltip style for all charts
export const chartTooltipStyle = {
  contentStyle: {
    backgroundColor: "hsl(var(--cgi-surface))",
    border: "1px solid hsl(var(--cgi-muted))",
    borderRadius: "8px",
    color: "hsl(var(--cgi-surface-foreground))",
  },
  labelStyle: { 
    color: "hsl(var(--cgi-surface-foreground))" 
  },
  itemStyle: { 
    color: "hsl(var(--cgi-muted-foreground))" 
  },
};

// BarChart cursor (hover background) - transparent primary tint
export const barChartCursor = { 
  fill: "rgba(31, 177, 183, 0.1)" // cgi-primary at 10% opacity
};

// AreaChart/LineChart cursor - subtle dashed line
export const lineChartCursor = {
  stroke: "hsl(var(--cgi-primary))",
  strokeWidth: 1,
  strokeDasharray: "3 3"
};

// Axis styling
export const axisStyle = {
  stroke: "hsl(var(--cgi-muted-foreground))",
  fontSize: 12
};

// CartesianGrid styling
export const gridStyle = {
  strokeDasharray: "3 3",
  stroke: "hsl(var(--cgi-muted))"
};
