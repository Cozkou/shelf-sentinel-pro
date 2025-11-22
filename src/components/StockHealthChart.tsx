import { Card } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const data = [
  { day: "Mon", healthy: 42, low: 24, critical: 2 },
  { day: "Tue", healthy: 40, low: 26, critical: 2 },
  { day: "Wed", healthy: 38, low: 27, critical: 3 },
  { day: "Thu", healthy: 42, low: 24, critical: 2 },
  { day: "Fri", healthy: 44, low: 22, critical: 2 },
  { day: "Sat", healthy: 43, low: 23, critical: 2 },
  { day: "Sun", healthy: 42, low: 24, critical: 2 },
];

export const StockHealthChart = () => {
  return (
    <Card className="p-4 sm:p-6">
      <h3 className="text-sm font-medium text-foreground mb-4">Stock Health</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="day" 
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: '12px' }}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
          />
          <Legend 
            wrapperStyle={{
              fontSize: '12px',
              paddingTop: '10px',
            }}
          />
          <Line 
            type="monotone" 
            dataKey="healthy" 
            stroke="hsl(142, 76%, 36%)" 
            strokeWidth={2}
            name="Healthy"
          />
          <Line 
            type="monotone" 
            dataKey="low" 
            stroke="hsl(var(--primary))" 
            strokeWidth={2}
            name="Low"
          />
          <Line 
            type="monotone" 
            dataKey="critical" 
            stroke="hsl(var(--destructive))" 
            strokeWidth={2}
            name="Critical"
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};