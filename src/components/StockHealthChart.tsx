import { Card } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import type { ChartConfig } from "@/components/ui/chart";

const data = [
  { day: "Mon", healthy: 42, low: 24, critical: 2 },
  { day: "Tue", healthy: 40, low: 26, critical: 2 },
  { day: "Wed", healthy: 38, low: 27, critical: 3 },
  { day: "Thu", healthy: 42, low: 24, critical: 2 },
  { day: "Fri", healthy: 44, low: 22, critical: 2 },
  { day: "Sat", healthy: 43, low: 23, critical: 2 },
  { day: "Sun", healthy: 42, low: 24, critical: 2 },
];

const chartConfig = {
  healthy: {
    label: "Healthy Stock",
    color: "hsl(142, 76%, 36%)",
  },
  low: {
    label: "Low Stock",
    color: "hsl(var(--primary))",
  },
  critical: {
    label: "Critical",
    color: "hsl(var(--destructive))",
  },
} satisfies ChartConfig;

export const StockHealthChart = () => {
  return (
    <Card className="p-6 bg-gradient-to-br from-background to-muted/20 border-border/40">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Stock Health Overview</h3>
          <p className="text-sm text-muted-foreground mt-1">Weekly inventory status</p>
        </div>
      </div>
      <ChartContainer config={chartConfig} className="h-[280px] w-full">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="healthyGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="lowGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="criticalGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
          <XAxis 
            dataKey="day" 
            stroke="hsl(var(--muted-foreground))"
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
            style={{ fontSize: '12px', fontWeight: 500 }}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))"
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
            style={{ fontSize: '12px', fontWeight: 500 }}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Area 
            type="monotone" 
            dataKey="healthy" 
            stroke="hsl(142, 76%, 36%)" 
            fill="url(#healthyGradient)"
            strokeWidth={2.5}
          />
          <Area 
            type="monotone" 
            dataKey="low" 
            stroke="hsl(var(--primary))" 
            fill="url(#lowGradient)"
            strokeWidth={2.5}
          />
          <Area 
            type="monotone" 
            dataKey="critical" 
            stroke="hsl(var(--destructive))" 
            fill="url(#criticalGradient)"
            strokeWidth={2.5}
          />
        </AreaChart>
      </ChartContainer>
    </Card>
  );
};