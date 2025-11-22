import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine, Line, ComposedChart } from "recharts";
import type { ChartConfig } from "@/components/ui/chart";
import { supabase } from "@/integrations/supabase/client";
import { generatePredictiveCurve, type ReorderLevels } from "@/lib/stock-analyzer";
import { executeSupplierSearchWorkflow } from "@/lib/workflow-orchestrator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search } from "lucide-react";

interface ItemData {
  itemId: string;
  itemName: string;
  data: Array<{
    date: string;
    quantity: number;
    is_predicted?: boolean;
    is_reorder_point?: boolean;
  }>;
  reorderLevels: ReorderLevels;
}

export const StockHealthChart = () => {
  const [itemsData, setItemsData] = useState<ItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchingSuppliers, setSearchingSuppliers] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchItemsData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchItemsData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchItemsData = async () => {
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
        setItemsData([]);
        setLoading(false);
        return;
      }

      // Fetch predictive curves for all items
      const itemsWithCurves = await Promise.all(
        items.map(async (item) => {
          const { data, reorderLevels } = await generatePredictiveCurve(
            user.id,
            item.id,
            30 // 30 days forward prediction
          );

          return {
            itemId: item.id,
            itemName: item.item_name,
            data,
            reorderLevels
          };
        })
      );

      setItemsData(itemsWithCurves.filter(item => item.data.length > 0));
    } catch (error) {
      console.error('Error fetching items data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSuppliers = async (itemId: string, itemName: string) => {
    try {
      setSearchingSuppliers(itemId);

      toast({
        title: "Searching Suppliers",
        description: `Analyzing market for ${itemName}...`,
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const result = await executeSupplierSearchWorkflow(user.id, itemId, itemName);

      if (result.success) {
        toast({
          title: "Supplier Analysis Complete",
          description: `Created draft order for ${itemName}. Check the Archive tab to review.`,
        });
      } else {
        throw new Error(result.error || 'Supplier search failed');
      }
    } catch (error) {
      console.error('Error searching suppliers:', error);
      toast({
        title: "Supplier Search Failed",
        description: error instanceof Error ? error.message : "Failed to search suppliers",
        variant: "destructive",
      });
    } finally {
      setSearchingSuppliers(null);
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
        <p className="text-sm text-muted-foreground">No inventory data yet. Start by taking a photo!</p>
      </Card>
    );
  }

  const chartConfig: ChartConfig = {
    quantity: {
      label: "Stock Level",
      color: "hsl(var(--chart-1))",
    },
  };

  return (
    <Card className="p-4 bg-gradient-to-br from-card to-accent/5 border-border/50">
      <h3 className="text-sm font-medium mb-4 text-foreground flex items-center gap-2">
        📊 Stock Level Trends & Predictions
        <span className="text-xs text-muted-foreground">(with reorder levels)</span>
      </h3>

      <div className="grid gap-6">
        {itemsData.map((item) => {
          const levels = item.reorderLevels;
          const hasData = item.data.length > 0;

          if (!hasData) return null;

          // Separate historical and predicted data
          const historicalData = item.data.filter(d => !d.is_predicted);
          const predictedData = item.data.filter(d => d.is_predicted);
          const lastHistorical = historicalData[historicalData.length - 1];

          // Combine for continuous line (add last historical point to predicted)
          const continuousData = lastHistorical
            ? [lastHistorical, ...predictedData]
            : predictedData;

          return (
            <Card key={item.itemId} className="p-4 bg-background/50 border-border/30">
              <h4 className="text-sm font-semibold mb-3 text-foreground">{item.itemName}</h4>

              <div className="mb-2 flex flex-wrap gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-red-500" />
                  <span className="text-muted-foreground">Maximum ({levels.maximum_stock})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-yellow-500" />
                  <span className="text-muted-foreground">Reorder Level ({levels.reorder_level})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-orange-500" />
                  <span className="text-muted-foreground">Minimum ({levels.minimum_stock})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-primary/20 rounded" />
                  <span className="text-muted-foreground">Historical</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 border-t-2 border-dashed border-primary" />
                  <span className="text-muted-foreground">Predicted</span>
                </div>
              </div>

              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <ResponsiveContainer>
                  <ComposedChart
                    data={item.data}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id={`gradient-${item.itemId}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id={`gradient-predicted-${item.itemId}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>

                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false}
                      domain={[0, levels.maximum_stock + 50]}
                    />

                    {/* Threshold lines */}
                    <ReferenceLine
                      y={levels.maximum_stock}
                      stroke="rgb(239, 68, 68)"
                      strokeDasharray="3 3"
                      strokeWidth={1.5}
                      label={{ value: 'Max', position: 'right', fill: 'rgb(239, 68, 68)', fontSize: 10 }}
                    />
                    <ReferenceLine
                      y={levels.reorder_level}
                      stroke="rgb(234, 179, 8)"
                      strokeDasharray="3 3"
                      strokeWidth={1.5}
                      label={{ value: 'Reorder', position: 'right', fill: 'rgb(234, 179, 8)', fontSize: 10 }}
                    />
                    <ReferenceLine
                      y={levels.minimum_stock}
                      stroke="rgb(249, 115, 22)"
                      strokeDasharray="3 3"
                      strokeWidth={1.5}
                      label={{ value: 'Min', position: 'right', fill: 'rgb(249, 115, 22)', fontSize: 10 }}
                    />

                    {/* Historical data - solid area */}
                    <Area
                      data={historicalData}
                      type="monotone"
                      dataKey="quantity"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill={`url(#gradient-${item.itemId})`}
                      name="Actual Stock"
                    />

                    {/* Predicted data - dashed line */}
                    <Line
                      data={continuousData}
                      type="monotone"
                      dataKey="quantity"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={(props: any) => {
                        const { cx, cy, payload } = props;
                        if (payload.is_reorder_point) {
                          return (
                            <circle
                              cx={cx}
                              cy={cy}
                              r={5}
                              fill="rgb(234, 179, 8)"
                              stroke="white"
                              strokeWidth={2}
                            />
                          );
                        }
                        return null;
                      }}
                      name="Predicted Stock"
                    />

                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          indicator="line"
                          formatter={(value, name, props) => {
                            const payload = props.payload;
                            return (
                              <div className="space-y-1">
                                <div className="font-medium">
                                  {payload.is_predicted ? '📈 Predicted' : '📊 Actual'}: {value} units
                                </div>
                                {payload.is_reorder_point && (
                                  <div className="text-xs text-yellow-600 font-semibold">
                                    🔔 Reorder Point - Stock Replenished
                                  </div>
                                )}
                                {payload.days_until_delivery !== undefined && (
                                  <div className="text-xs text-muted-foreground">
                                    ⏳ {payload.days_until_delivery} days until delivery
                                  </div>
                                )}
                              </div>
                            );
                          }}
                        />
                      }
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </ChartContainer>

              {/* Stock status indicator and action button */}
              <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  {historicalData.length > 0 && (
                    <>
                      {historicalData[historicalData.length - 1].quantity <= levels.reorder_level && (
                        <span className="text-xs bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 px-2 py-1 rounded">
                          ⚠️ Below Reorder Level - Action Needed
                        </span>
                      )}
                      {historicalData[historicalData.length - 1].quantity <= levels.minimum_stock && (
                        <span className="text-xs bg-red-500/20 text-red-700 dark:text-red-400 px-2 py-1 rounded">
                          🚨 Critical - Below Minimum Stock
                        </span>
                      )}
                      {historicalData[historicalData.length - 1].quantity > levels.reorder_level && (
                        <span className="text-xs bg-green-500/20 text-green-700 dark:text-green-400 px-2 py-1 rounded">
                          ✓ Healthy Stock Level
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* Search Suppliers button - shown when below reorder level */}
                {historicalData.length > 0 &&
                 historicalData[historicalData.length - 1].quantity <= levels.reorder_level && (
                  <Button
                    size="sm"
                    onClick={() => handleSearchSuppliers(item.itemId, item.itemName)}
                    disabled={searchingSuppliers === item.itemId}
                    className="text-xs h-7"
                  >
                    {searchingSuppliers === item.itemId ? (
                      <>
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="mr-1 h-3 w-3" />
                        Search Suppliers
                      </>
                    )}
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </Card>
  );
};
