import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine } from "recharts";
import type { ChartConfig } from "@/components/ui/chart";
import { supabase } from "@/integrations/supabase/client";

interface ItemStock {
  itemName: string;
  quantity: number;
}

const MAX_STOCK = 20;
const REORDER_LEVEL = 3;

export const StockHealthChart = () => {
  const [itemsStock, setItemsStock] = useState<ItemStock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCurrentStock();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchCurrentStock, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchCurrentStock = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all items for the user
      const { data: items, error: itemsError } = await supabase
        .from('inventory_items')
        .select('id, item_name')
        .eq('user_id', user.id)
        .order('item_name');

      if (itemsError) throw itemsError;

      if (!items || items.length === 0) {
        setItemsStock([]);
        setLoading(false);
        return;
      }

      // Get the most recent count for each item
      const stockData = await Promise.all(
        items.map(async (item) => {
          const { data: counts } = await supabase
            .from('inventory_counts')
            .select('quantity, created_at')
            .eq('item_id', item.id)
            .order('created_at', { ascending: false })
            .limit(1);

          const quantity = counts && counts.length > 0 ? counts[0].quantity : 0;

          return {
            itemName: item.item_name,
            quantity,
          };
        })
      );

      setItemsStock(stockData);
    } catch (error) {
      console.error('Error fetching stock data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-8 bg-gradient-to-br from-card to-accent/5 border-border/50 text-center">
        <p className="text-sm text-muted-foreground">Loading stock data...</p>
      </Card>
    );
  }

  if (itemsStock.length === 0) {
    return (
      <Card className="p-8 bg-gradient-to-br from-card to-accent/5 border-border/50 text-center">
        <p className="text-sm text-muted-foreground">No inventory data yet. Start by taking a photo!</p>
      </Card>
    );
  }

  const chartConfig: ChartConfig = {
    quantity: {
      label: "Units",
      color: "hsl(var(--chart-1))",
    },
  };

  return (
    <Card className="p-4 bg-gradient-to-br from-card to-accent/5 border-border/50">
      <h3 className="text-sm font-medium mb-4 text-foreground flex items-center gap-2">
        📊 Current Stock Levels
      </h3>

      <div className="mb-4 flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-red-500" />
          <span className="text-muted-foreground">Maximum ({MAX_STOCK} units)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-yellow-500" />
          <span className="text-muted-foreground">Reorder Level ({REORDER_LEVEL} units)</span>
        </div>
      </div>

      <ChartContainer config={chartConfig} className="h-[300px] w-full">
        <ResponsiveContainer>
          <BarChart
            data={itemsStock}
            margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
            <XAxis
              dataKey="itemName"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              domain={[0, MAX_STOCK]}
            />

            {/* Threshold lines */}
            <ReferenceLine
              y={MAX_STOCK}
              stroke="rgb(239, 68, 68)"
              strokeDasharray="3 3"
              strokeWidth={1.5}
              label={{ value: 'Max', position: 'right', fill: 'rgb(239, 68, 68)', fontSize: 10 }}
            />
            <ReferenceLine
              y={REORDER_LEVEL}
              stroke="rgb(234, 179, 8)"
              strokeDasharray="3 3"
              strokeWidth={1.5}
              label={{ value: 'Reorder', position: 'right', fill: 'rgb(234, 179, 8)', fontSize: 10 }}
            />

            <Bar
              dataKey="quantity"
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
            />

            <ChartTooltip
              content={
                <ChartTooltipContent
                  indicator="line"
                  formatter={(value) => (
                    <div className="font-medium">
                      {value} units
                    </div>
                  )}
                />
              }
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* Stock status indicators */}
      <div className="mt-4 grid gap-2">
        {itemsStock.map((item) => (
          <div key={item.itemName} className="flex items-center justify-between text-sm">
            <span className="font-medium">{item.itemName}</span>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{item.quantity} units</span>
              {item.quantity <= REORDER_LEVEL && (
                <span className="text-xs bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 px-2 py-1 rounded">
                  ⚠️ Low Stock
                </span>
              )}
              {item.quantity > REORDER_LEVEL && item.quantity < MAX_STOCK && (
                <span className="text-xs bg-green-500/20 text-green-700 dark:text-green-400 px-2 py-1 rounded">
                  ✓ Good
                </span>
              )}
              {item.quantity >= MAX_STOCK && (
                <span className="text-xs bg-blue-500/20 text-blue-700 dark:text-blue-400 px-2 py-1 rounded">
                  📦 At Max
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
