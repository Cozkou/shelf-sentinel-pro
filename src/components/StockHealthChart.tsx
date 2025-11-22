import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine } from "recharts";
import type { ChartConfig } from "@/components/ui/chart";
import { supabase } from "@/integrations/supabase/client";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

interface ItemStock {
  itemId: string;
  itemName: string;
  quantity: number;
}

const MAX_STOCK = 5;
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
            itemId: item.id,
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

  const handleDeleteItem = async (itemId: string, itemName: string) => {
    try {
      const { error } = await supabase
        .from('inventory_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      toast.success(`${itemName} deleted successfully`);
      fetchCurrentStock();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
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
    <Card className="p-6 bg-gradient-to-br from-card to-accent/5 border-border/50">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
        <h3 className="text-lg font-semibold text-foreground">
          Current Stock Levels
        </h3>
        <div className="flex gap-2 sm:gap-3 text-xs flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-muted-foreground font-medium">Max: {MAX_STOCK}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-500/10">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <span className="text-muted-foreground font-medium">Reorder: {REORDER_LEVEL}</span>
          </div>
        </div>
      </div>

      <ChartContainer config={chartConfig} className="h-[400px] md:h-[300px] w-full">
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
      <div className="mt-6 space-y-3">
        {itemsStock.map((item) => (
          <div key={item.itemId} className="flex items-center gap-2 p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors border border-border/30">
            <span className="font-medium text-foreground flex-1 min-w-0">{item.itemName}</span>
            {item.quantity <= REORDER_LEVEL && (
              <span className="text-[10px] font-normal bg-yellow-500/10 text-yellow-600/80 dark:text-yellow-400/70 px-1.5 py-0.5 rounded whitespace-nowrap">
                Low Stock
              </span>
            )}
            {item.quantity > REORDER_LEVEL && item.quantity < MAX_STOCK && (
              <span className="text-[10px] font-normal bg-green-500/10 text-green-600/80 dark:text-green-400/70 px-1.5 py-0.5 rounded whitespace-nowrap">
                Good
              </span>
            )}
            {item.quantity >= MAX_STOCK && (
              <span className="text-[10px] font-normal bg-blue-500/10 text-blue-600/80 dark:text-blue-400/70 px-1.5 py-0.5 rounded whitespace-nowrap">
                At Max
              </span>
            )}
            <span className="text-sm font-semibold text-foreground tabular-nums whitespace-nowrap">{item.quantity} units</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDeleteItem(item.itemId, item.itemName)}
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
};
