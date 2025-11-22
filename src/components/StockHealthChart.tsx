import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ChartContainer } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine, Cell } from "recharts";
import type { ChartConfig } from "@/components/ui/chart";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Phone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SupplierSearchModal } from "./SupplierSearchModal";
import { ProductDetailModal } from "./ProductDetailModal";
import { ActivityFeed } from "./ActivityFeed";
import { useToast } from "@/hooks/use-toast";

interface ItemStock {
  itemId: string;
  itemName: string;
  quantity: number;
}

interface ActivityItem {
  id: string;
  type: 'trigger' | 'searching' | 'found' | 'calling' | 'error';
  message: string;
  timestamp: Date;
  itemName?: string;
}

const MAX_STOCK = 5;
const REORDER_LEVEL = 3;

export const StockHealthChart = () => {
  const [itemsStock, setItemsStock] = useState<ItemStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchLogs, setSearchLogs] = useState<any[]>([]);
  const [bestDeal, setBestDeal] = useState<any>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItemStock | null>(null);
  const [supplierCache, setSupplierCache] = useState<Record<string, any>>({});
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [autoTriggeredItems, setAutoTriggeredItems] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const autoTriggerTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchCurrentStock();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchCurrentStock, 30000);
    return () => {
      clearInterval(interval);
      if (autoTriggerTimeoutRef.current) {
        clearTimeout(autoTriggerTimeoutRef.current);
      }
    };
  }, []);

  // Auto-trigger supplier search for low stock items
  useEffect(() => {
    if (loading || itemsStock.length === 0) return;

    // Find items that need reordering and haven't been auto-triggered yet
    const lowStockItems = itemsStock.filter(
      item => item.quantity <= REORDER_LEVEL && !autoTriggeredItems.has(item.itemId)
    );

    if (lowStockItems.length > 0) {
      // Trigger search for the first low stock item after a short delay
      autoTriggerTimeoutRef.current = setTimeout(() => {
        const item = lowStockItems[0];
        addActivity({
          id: `trigger-${item.itemId}-${Date.now()}`,
          type: 'trigger',
          message: `Stock below reorder level (${item.quantity}/${REORDER_LEVEL}). Auto-triggering supplier search...`,
          timestamp: new Date(),
          itemName: item.itemName,
        });

        // Mark as triggered
        setAutoTriggeredItems(prev => new Set(prev).add(item.itemId));

        // Trigger search automatically
        handleSearchSuppliers(item.itemName, true);
      }, 2000);
    }
  }, [itemsStock, loading]);

  const addActivity = (activity: ActivityItem) => {
    setActivities(prev => [...prev, activity]);
  };

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

      fetchCurrentStock();
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const handleSearchSuppliers = async (itemName: string, isAutoTriggered = false) => {
    // Check cache first
    if (supplierCache[itemName]) {
      setBestDeal(supplierCache[itemName]);
      if (!isAutoTriggered) {
        toast({
          title: "Cached Result",
          description: "Showing previously found supplier",
        });
      }
      return;
    }

    setSelectedProduct(itemName);
    setSearchModalOpen(true);
    setSearchLoading(true);
    setSearchLogs([]);
    setBestDeal(null);

    addActivity({
      id: `search-${itemName}-${Date.now()}`,
      type: 'searching',
      message: 'Searching for suppliers...',
      timestamp: new Date(),
      itemName,
    });

    try {
      const { data, error } = await supabase.functions.invoke('search-suppliers', {
        body: { productName: itemName }
      });

      if (error) throw error;

      if (data.success) {
        setSearchLogs(data.logs);
        setBestDeal(data.bestDeal);
        // Cache the result
        setSupplierCache(prev => ({
          ...prev,
          [itemName]: data.bestDeal
        }));

        addActivity({
          id: `found-${itemName}-${Date.now()}`,
          type: 'found',
          message: `Found best supplier: ${data.bestDeal?.supplier_name || 'Unknown'}`,
          timestamp: new Date(),
          itemName,
        });

        // Auto-trigger ElevenLabs agent if this was auto-triggered
        if (isAutoTriggered) {
          setTimeout(() => {
            initiateVoiceAgent(itemName, data.bestDeal);
          }, 1000);
        }
      } else {
        addActivity({
          id: `error-${itemName}-${Date.now()}`,
          type: 'error',
          message: data.error || 'Could not find suppliers',
          timestamp: new Date(),
          itemName,
        });
        toast({
          title: "Search Failed",
          description: data.error || "Could not find suppliers",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error searching suppliers:', error);
      addActivity({
        id: `error-${itemName}-${Date.now()}`,
        type: 'error',
        message: 'Failed to search for suppliers',
        timestamp: new Date(),
        itemName,
      });
      toast({
        title: "Error",
        description: "Failed to search for suppliers",
        variant: "destructive",
      });
    } finally {
      setSearchLoading(false);
    }
  };

  const initiateVoiceAgent = async (itemName: string, bestDeal: any) => {
    if (!bestDeal) return;

    addActivity({
      id: `calling-${itemName}-${Date.now()}`,
      type: 'calling',
      message: 'Initiating voice agent call...',
      timestamp: new Date(),
      itemName,
    });

    // TODO: Implement ElevenLabs agent initiation
    // This will use the AgentContext with supplier_info and order_details
    console.log('Initiating voice agent with:', {
      supplier_info: {
        supplier_name: bestDeal.supplier_name,
        location: bestDeal.location,
        reasoning: bestDeal.reasoning,
      },
      order_details: {
        product_name: itemName,
        quantity_needed: 10, // TODO: Calculate based on current stock
        price_per_unit: bestDeal.price_per_unit || 0,
        total_cost: bestDeal.total_cost || 0,
        supplier_name: bestDeal.supplier_name,
        location: bestDeal.location,
      }
    });

    toast({
      title: "Voice Agent Initiated",
      description: `Preparing to contact ${bestDeal.supplier_name}`,
    });
  };

  const handleItemClick = (item: ItemStock) => {
    setSelectedItem(item);
    setProductModalOpen(true);
    // Load cached supplier if available
    if (supplierCache[item.itemName]) {
      setBestDeal(supplierCache[item.itemName]);
    } else {
      setBestDeal(null);
    }
  };

  const shortenName = (name: string, maxLength: number = 12) => {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength) + '...';
  };

  const getBarColor = (quantity: number) => {
    if (quantity <= REORDER_LEVEL) return 'rgb(234, 179, 8)'; // yellow for low stock
    if (quantity >= MAX_STOCK) return 'rgb(59, 130, 246)'; // blue for max stock
    return 'rgb(34, 197, 94)'; // green for good stock
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-muted-foreground">Loading stock data...</p>
      </div>
    );
  }

  if (itemsStock.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-muted-foreground">No inventory data yet. Start by taking a photo!</p>
      </div>
    );
  }

  const chartConfig: ChartConfig = {
    quantity: {
      label: "Units",
      color: "hsl(var(--chart-1))",
    },
  };

  return (
    <div className="w-full">
      {/* Activity Feed */}
      <ActivityFeed activities={activities} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-4 md:space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 md:gap-3">
          <h3 className="text-base md:text-lg font-semibold text-foreground tracking-tight">
            Stock Levels
          </h3>
          <div className="flex gap-2 text-[10px] md:text-xs flex-wrap">
            <div className="flex items-center gap-1 px-2 py-0.5 md:px-2.5 md:py-1 rounded-md bg-red-500/10 border border-red-500/20">
              <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-red-500" />
              <span className="text-muted-foreground font-medium">Max: {MAX_STOCK}</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-0.5 md:px-2.5 md:py-1 rounded-md bg-yellow-500/10 border border-yellow-500/20">
              <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-yellow-500" />
              <span className="text-muted-foreground font-medium">Reorder: {REORDER_LEVEL}</span>
            </div>
          </div>
        </div>

      <ChartContainer config={chartConfig} className="h-[400px] md:h-[300px] w-full px-1 md:px-0 pointer-events-none">
        <ResponsiveContainer>
          <BarChart
            data={itemsStock.map(item => ({ ...item, shortName: shortenName(item.itemName) }))}
            margin={{ top: 10, right: 5, left: -25, bottom: 20 }}
          >
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis
                dataKey="shortName"
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
                radius={[4, 4, 0, 0]}
              >
                {itemsStock.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getBarColor(entry.quantity)}
                  />
                ))}
              </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* Stock status indicators */}
      <div className="space-y-2 md:space-y-3">
        <AnimatePresence mode="popLayout">
          {itemsStock.map((item, index) => (
            <motion.div
              key={item.itemId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20, height: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="flex items-center gap-1.5 md:gap-2 p-2 md:p-3 rounded-md bg-card/30 hover:bg-card/50 transition-all border border-border/30 hover:border-primary/30 cursor-pointer"
              onClick={() => handleItemClick(item)}
            >
              <span className="text-sm md:text-base font-medium text-foreground flex-1 min-w-0">{shortenName(item.itemName, 20)}</span>
              {item.quantity <= REORDER_LEVEL && (
                <div className="flex items-center gap-1.5">
                  <motion.span
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="text-[9px] md:text-[10px] font-normal bg-yellow-500/10 text-yellow-600/80 dark:text-yellow-400/70 px-1.5 py-0.5 rounded whitespace-nowrap"
                  >
                    Low Stock
                  </motion.span>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.2, delay: 0.1 }}
                    className="h-6 w-6 md:h-7 md:w-7 flex items-center justify-center rounded-full bg-green-500/20 hover:bg-green-500/30 text-green-600 dark:text-green-400 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSearchSuppliers(item.itemName);
                    }}
                  >
                    <Phone className="h-3 w-3 md:h-3.5 md:w-3.5" />
                  </motion.button>
                </div>
              )}
              {item.quantity > REORDER_LEVEL && item.quantity < MAX_STOCK && (
                <motion.span
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="text-[9px] md:text-[10px] font-normal bg-green-500/10 text-green-600/80 dark:text-green-400/70 px-1.5 py-0.5 rounded whitespace-nowrap"
                >
                  Good
                </motion.span>
              )}
              {item.quantity >= MAX_STOCK && (
                <motion.span
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="text-[9px] md:text-[10px] font-normal bg-blue-500/10 text-blue-600/80 dark:text-blue-400/70 px-1.5 py-0.5 rounded whitespace-nowrap"
                >
                  At Max
                </motion.span>
              )}
              <span className="text-xs md:text-sm font-semibold text-foreground tabular-nums whitespace-nowrap">{item.quantity} units</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteItem(item.itemId, item.itemName);
                }}
                className="h-7 w-7 md:h-8 md:w-8 text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      </motion.div>

      <SupplierSearchModal
        open={searchModalOpen}
        onOpenChange={setSearchModalOpen}
        logs={searchLogs}
        bestDeal={bestDeal}
        loading={searchLoading}
        productName={selectedProduct}
      />

      {selectedItem && (
        <ProductDetailModal
          open={productModalOpen}
          onOpenChange={setProductModalOpen}
          itemName={selectedItem.itemName}
          quantity={selectedItem.quantity}
          onDelete={() => handleDeleteItem(selectedItem.itemId, selectedItem.itemName)}
          onSearchSupplier={() => handleSearchSuppliers(selectedItem.itemName)}
          bestDeal={supplierCache[selectedItem.itemName] || null}
          searchLoading={searchLoading}
          maxStock={MAX_STOCK}
          reorderLevel={REORDER_LEVEL}
        />
      )}
    </div>
  );
};
