/**
 * Stock Analysis Service
 * Analyzes inventory trends, predicts stock-outs, and triggers reorder workflows
 */

import { supabase } from "@/integrations/supabase/client";

export interface StockTrend {
  item_id: string;
  item_name: string;
  current_quantity: number;
  previous_quantity: number;
  decline_percentage: number;
  days_tracked: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  risk_level: 'low' | 'medium' | 'high' | 'critical';
}

export interface ReorderLevels {
  maximum_stock: number;
  reorder_level: number;
  minimum_stock: number;
  buffer_stock: number;
  lead_time_days: number;
}

export interface PredictiveDataPoint {
  date: string;
  quantity: number;
  is_predicted: boolean;
  is_reorder_point?: boolean;
  days_until_delivery?: number;
}

export interface StockAnalysis {
  lowStockItems: StockTrend[];
  healthyStockItems: StockTrend[];
  criticalItems: StockTrend[];
  analyzed_at: string;
}

export interface StockOutPrediction {
  item_id: string;
  item_name: string;
  current_quantity: number;
  estimated_daily_usage: number;
  days_until_stock_out: number;
  estimated_stock_out_date: Date;
}

const DECLINE_THRESHOLD = 30; // 30% decline triggers reorder
const CRITICAL_THRESHOLD = 50; // 50% decline is critical

/**
 * Calculate trend between two quantities
 */
function calculateTrend(current: number, previous: number): StockTrend['trend'] {
  const change = ((current - previous) / previous) * 100;

  if (Math.abs(change) < 5) return 'stable';
  if (change > 0) return 'increasing';
  return 'decreasing';
}

/**
 * Determine risk level based on decline percentage
 */
function getRiskLevel(declinePercent: number): StockTrend['risk_level'] {
  if (declinePercent >= CRITICAL_THRESHOLD) return 'critical';
  if (declinePercent >= DECLINE_THRESHOLD) return 'high';
  if (declinePercent >= 15) return 'medium';
  return 'low';
}

/**
 * Analyze stock levels for a specific user
 * @param userId - User ID to analyze
 * @param days - Number of days to analyze (default: 7)
 * @returns Stock analysis with low stock items
 */
export async function analyzeStockLevels(
  userId: string,
  days: number = 7
): Promise<StockAnalysis> {
  try {
    console.log('[StockAnalyzer] Analyzing stock levels for user:', userId);

    // Get all inventory items for the user
    const { data: items, error: itemsError } = await supabase
      .from('inventory_items')
      .select('id, item_name')
      .eq('user_id', userId);

    if (itemsError) throw itemsError;
    if (!items || items.length === 0) {
      return {
        lowStockItems: [],
        healthyStockItems: [],
        criticalItems: [],
        analyzed_at: new Date().toISOString()
      };
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const trends: StockTrend[] = [];

    // Analyze each item
    for (const item of items) {
      // Get all counts for this item in the time range
      const { data: counts, error: countsError } = await supabase
        .from('inventory_counts')
        .select('quantity, created_at')
        .eq('item_id', item.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });

      if (countsError) {
        console.error(`[StockAnalyzer] Error fetching counts for ${item.item_name}:`, countsError);
        continue;
      }

      if (!counts || counts.length < 2) {
        // Need at least 2 data points for trend analysis
        continue;
      }

      const oldestCount = counts[0].quantity;
      const latestCount = counts[counts.length - 1].quantity;
      const declinePercent = oldestCount > 0
        ? ((oldestCount - latestCount) / oldestCount) * 100
        : 0;

      const trend: StockTrend = {
        item_id: item.id,
        item_name: item.item_name,
        current_quantity: latestCount,
        previous_quantity: oldestCount,
        decline_percentage: Math.round(declinePercent),
        days_tracked: days,
        trend: calculateTrend(latestCount, oldestCount),
        risk_level: getRiskLevel(declinePercent)
      };

      trends.push(trend);
    }

    // Categorize items
    const lowStockItems = trends.filter(t =>
      t.decline_percentage >= DECLINE_THRESHOLD &&
      t.risk_level !== 'critical'
    );

    const criticalItems = trends.filter(t =>
      t.risk_level === 'critical'
    );

    const healthyStockItems = trends.filter(t =>
      t.risk_level === 'low' || t.trend === 'increasing'
    );

    const analysis: StockAnalysis = {
      lowStockItems,
      healthyStockItems,
      criticalItems,
      analyzed_at: new Date().toISOString()
    };

    console.log('[StockAnalyzer] Analysis complete:', {
      low: lowStockItems.length,
      critical: criticalItems.length,
      healthy: healthyStockItems.length
    });

    return analysis;

  } catch (error) {
    console.error('[StockAnalyzer] Analysis error:', error);
    throw new Error(`Stock analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Predict when an item will run out of stock
 * @param userId - User ID
 * @param itemId - Item ID to predict
 * @param days - Number of days of historical data to use
 * @returns Stock-out prediction
 */
export async function predictStockOut(
  userId: string,
  itemId: string,
  days: number = 14
): Promise<StockOutPrediction | null> {
  try {
    console.log('[StockAnalyzer] Predicting stock-out for item:', itemId);

    // Get item name
    const { data: item } = await supabase
      .from('inventory_items')
      .select('item_name')
      .eq('id', itemId)
      .eq('user_id', userId)
      .single();

    if (!item) return null;

    // Get historical counts
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: counts } = await supabase
      .from('inventory_counts')
      .select('quantity, created_at')
      .eq('item_id', itemId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (!counts || counts.length < 2) return null;

    // Calculate daily usage rate (simple linear regression)
    const firstCount = counts[0].quantity;
    const lastCount = counts[counts.length - 1].quantity;
    const firstDate = new Date(counts[0].created_at);
    const lastDate = new Date(counts[counts.length - 1].created_at);

    const daysDiff = Math.max(1, (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
    const totalUsage = firstCount - lastCount;
    const dailyUsage = totalUsage / daysDiff;

    if (dailyUsage <= 0 || lastCount <= 0) {
      // Stock is not declining or already at zero
      return null;
    }

    // Predict days until stock-out
    const daysUntilStockOut = Math.ceil(lastCount / dailyUsage);
    const stockOutDate = new Date();
    stockOutDate.setDate(stockOutDate.getDate() + daysUntilStockOut);

    const prediction: StockOutPrediction = {
      item_id: itemId,
      item_name: item.item_name,
      current_quantity: lastCount,
      estimated_daily_usage: Math.round(dailyUsage * 10) / 10,
      days_until_stock_out: daysUntilStockOut,
      estimated_stock_out_date: stockOutDate
    };

    console.log('[StockAnalyzer] Prediction:', prediction);
    return prediction;

  } catch (error) {
    console.error('[StockAnalyzer] Prediction error:', error);
    return null;
  }
}

/**
 * Get items that need reordering based on analysis
 * @param userId - User ID
 * @returns Array of items needing reorder
 */
export async function getItemsNeedingReorder(
  userId: string
): Promise<StockTrend[]> {
  const analysis = await analyzeStockLevels(userId);

  // Combine low stock and critical items
  const needsReorder = [
    ...analysis.lowStockItems,
    ...analysis.criticalItems
  ];

  // Sort by risk level (critical first)
  needsReorder.sort((a, b) => {
    const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return riskOrder[a.risk_level] - riskOrder[b.risk_level];
  });

  console.log('[StockAnalyzer] Items needing reorder:', needsReorder.length);
  return needsReorder;
}

/**
 * Calculate recommended order quantity based on historical usage
 * @param userId - User ID
 * @param itemId - Item ID
 * @param days - Days of inventory to maintain
 * @returns Recommended quantity to order
 */
export async function calculateReorderQuantity(
  userId: string,
  itemId: string,
  days: number = 14
): Promise<number> {
  try {
    const prediction = await predictStockOut(userId, itemId, days);

    if (!prediction) {
      // Default to maintaining 2 weeks of inventory
      return Math.ceil(prediction?.estimated_daily_usage || 10 * days);
    }

    // Order enough to last for specified days + current shortage
    const shortage = Math.max(0, -prediction.current_quantity);
    const futureNeed = Math.ceil(prediction.estimated_daily_usage * days);

    return shortage + futureNeed;

  } catch (error) {
    console.error('[StockAnalyzer] Reorder calculation error:', error);
    return 0;
  }
}

/**
 * Calculate optimal reorder levels for an item based on historical usage
 * @param userId - User ID
 * @param itemId - Item ID
 * @param leadTimeDays - Supplier lead time in days
 * @returns Reorder levels
 */
export async function calculateReorderLevels(
  userId: string,
  itemId: string,
  leadTimeDays: number = 3
): Promise<ReorderLevels> {
  try {
    const prediction = await predictStockOut(userId, itemId, 30);

    if (!prediction) {
      // Default reorder levels if no prediction available
      return {
        maximum_stock: 600,
        reorder_level: 300,
        minimum_stock: 100,
        buffer_stock: 50,
        lead_time_days: leadTimeDays
      };
    }

    // Calculate based on daily usage rate
    const dailyUsage = prediction.estimated_daily_usage;

    // Safety stock (buffer) = lead time * daily usage * 1.5 (safety factor)
    const bufferStock = Math.ceil(leadTimeDays * dailyUsage * 1.5);

    // Minimum stock = buffer stock
    const minimumStock = bufferStock;

    // Reorder level = (lead time * daily usage) + buffer stock
    const reorderLevel = Math.ceil(leadTimeDays * dailyUsage) + bufferStock;

    // Maximum stock = reorder level + order quantity
    // Order quantity should cover ~2 weeks of usage
    const orderQuantity = Math.ceil(dailyUsage * 14);
    const maximumStock = reorderLevel + orderQuantity;

    return {
      maximum_stock: maximumStock,
      reorder_level: reorderLevel,
      minimum_stock: minimumStock,
      buffer_stock: bufferStock,
      lead_time_days: leadTimeDays
    };

  } catch (error) {
    console.error('[StockAnalyzer] Error calculating reorder levels:', error);
    return {
      maximum_stock: 600,
      reorder_level: 300,
      minimum_stock: 100,
      buffer_stock: 50,
      lead_time_days: leadTimeDays
    };
  }
}

/**
 * Generate predictive stock curve with reorder points (sawtooth pattern)
 * @param userId - User ID
 * @param itemId - Item ID
 * @param daysForward - Number of days to predict forward
 * @returns Array of historical + predicted data points
 */
export async function generatePredictiveCurve(
  userId: string,
  itemId: string,
  daysForward: number = 30
): Promise<{
  data: PredictiveDataPoint[];
  reorderLevels: ReorderLevels;
}> {
  try {
    console.log('[StockAnalyzer] Generating predictive curve for item:', itemId);

    // Get historical data (last 30 days)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const { data: counts } = await supabase
      .from('inventory_counts')
      .select('quantity, created_at')
      .eq('item_id', itemId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (!counts || counts.length === 0) {
      return {
        data: [],
        reorderLevels: {
          maximum_stock: 600,
          reorder_level: 300,
          minimum_stock: 100,
          buffer_stock: 50,
          lead_time_days: 3
        }
      };
    }

    // Get reorder levels
    const reorderLevels = await calculateReorderLevels(userId, itemId);

    // Convert historical data to data points
    const historicalData: PredictiveDataPoint[] = counts.map(count => ({
      date: new Date(count.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      }),
      quantity: count.quantity,
      is_predicted: false
    }));

    // Calculate daily usage rate
    const prediction = await predictStockOut(userId, itemId, 30);
    const dailyUsage = prediction?.estimated_daily_usage || 10;

    // Generate predictive data points
    const predictiveData: PredictiveDataPoint[] = [];
    let currentQuantity = counts[counts.length - 1].quantity;
    let currentDate = new Date(counts[counts.length - 1].created_at);

    for (let day = 1; day <= daysForward; day++) {
      currentDate.setDate(currentDate.getDate() + 1);
      currentQuantity -= dailyUsage;

      // Check if we hit reorder level
      let isReorderPoint = false;
      let daysUntilDelivery: number | undefined;

      if (currentQuantity <= reorderLevels.reorder_level && currentQuantity > reorderLevels.minimum_stock) {
        // Reorder triggered
        isReorderPoint = true;
        daysUntilDelivery = reorderLevels.lead_time_days;

        // Simulate reorder: after lead time, stock jumps to maximum
        // Add intermediate points showing decline during lead time
        for (let leadDay = 1; leadDay <= reorderLevels.lead_time_days; leadDay++) {
          currentDate.setDate(currentDate.getDate() + 1);
          currentQuantity -= dailyUsage;

          predictiveData.push({
            date: currentDate.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric'
            }),
            quantity: Math.max(reorderLevels.minimum_stock, Math.round(currentQuantity)),
            is_predicted: true,
            days_until_delivery: reorderLevels.lead_time_days - leadDay
          });

          day++; // Increment outer loop counter
        }

        // Stock replenished
        currentQuantity = reorderLevels.maximum_stock;

        predictiveData.push({
          date: currentDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          }),
          quantity: Math.round(currentQuantity),
          is_predicted: true,
          is_reorder_point: true
        });

        continue;
      }

      // Prevent going below minimum
      if (currentQuantity < reorderLevels.minimum_stock) {
        currentQuantity = reorderLevels.minimum_stock;
      }

      predictiveData.push({
        date: currentDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        }),
        quantity: Math.round(currentQuantity),
        is_predicted: true,
        is_reorder_point: isReorderPoint,
        days_until_delivery: daysUntilDelivery
      });
    }

    const allData = [...historicalData, ...predictiveData];

    console.log('[StockAnalyzer] Generated curve with', allData.length, 'points');

    return {
      data: allData,
      reorderLevels
    };

  } catch (error) {
    console.error('[StockAnalyzer] Error generating predictive curve:', error);
    return {
      data: [],
      reorderLevels: {
        maximum_stock: 600,
        reorder_level: 300,
        minimum_stock: 100,
        buffer_stock: 50,
        lead_time_days: 3
      }
    };
  }
}
