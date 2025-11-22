import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import type { ChartConfig } from "@/components/ui/chart";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface ItemData {
  itemId: string;
  itemName: string;
  counts: Array<{
    date: string;
    quantity: number;
  }>;
}

export const StockHealthChart = () => {
  const [itemsData, setItemsData] = useState<ItemData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchItemsData();
  }, []);

  const fetchItemsData = async () => {
    try {
      // Fetch all items for the user
      const { data: items, error: itemsError } = await supabase
        .from('inventory_items')
        .select('id, item_name')
        .order('item_name');

      if (itemsError) throw itemsError;

      if (!items || items.length === 0) {
        setItemsData([]);
        setLoading(false);
        return;
      }

      // Fetch counts for all items
      const itemsWithCounts = await Promise.all(
        items.map(async (item) => {
          const { data: counts, error: countsError } = await supabase
            .from('inventory_counts')
            .select('created_at, quantity')
            .eq('item_id', item.id)
            .order('created_at', { ascending: true });

          if (countsError) throw countsError;

          return {
            itemId: item.id,
            itemName: item.item_name,
            counts: (counts || []).map(count => ({
              date: format(new Date(count.created_at), 'MMM dd'),
              quantity: count.quantity
            }))
          };
        })
      );

      setItemsData(itemsWithCounts.filter(item => item.counts.length > 0));
    } catch (error) {
      console.error('Error fetching items data:', error);
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

  if (itemsData.length === 0) {
    return (
      <Card className="p-8 bg-gradient-to-br from-card to-accent/5 border-border/50 text-center">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Stock History</h3>
          <p className="text-sm text-muted-foreground mt-2">
            No stock data available yet. Take photos to start tracking your inventory.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:gap-6 sm:grid-cols-2">
      {itemsData.map((item) => {
        const chartConfig = {
          quantity: {
            label: "Quantity",
            color: "hsl(var(--primary))",
          },
        } satisfies ChartConfig;

        return (
          <Card 
            key={item.itemId} 
            className="p-6 bg-gradient-to-br from-card to-accent/5 border-border/50 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-foreground">{item.itemName}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Stock history • {item.counts.length} data point{item.counts.length !== 1 ? 's' : ''}
              </p>
            </div>
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={item.counts} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id={`gradient-${item.itemId}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    style={{ fontSize: '10px', fontWeight: 500 }}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    style={{ fontSize: '10px', fontWeight: 500 }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area 
                    type="monotone" 
                    dataKey="quantity" 
                    stroke="hsl(var(--primary))" 
                    fill={`url(#gradient-${item.itemId})`}
                    strokeWidth={2.5}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </Card>
        );
      })}
    </div>
  );
};