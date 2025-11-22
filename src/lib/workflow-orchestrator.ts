/**
 * Workflow Orchestrator
 * Coordinates the complete inventory analysis → supplier search → agent recommendation workflow
 */

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { analyzeImageStructured, type StructuredAnalysisResult } from "./fal-service";
import { analyzeStockLevels, type StockTrend } from "./stock-analyzer";
import { searchSuppliersForItems, comparePrices, type SupplierInfo } from "./valyu-service";
import { getAgentRecommendation, type AgentRecommendation } from "./elevenlabs-service";

export interface WorkflowResult {
  success: boolean;
  photoId?: string;
  orderId?: string;
  analysis?: StructuredAnalysisResult;
  stockAnalysis?: any;
  agentRecommendation?: AgentRecommendation;
  error?: string;
}

/**
 * Execute the complete inventory workflow
 * @param photoBlob - Image blob from camera/upload
 * @param userId - User ID
 * @returns Workflow result with order ID if created
 */
export async function executeInventoryWorkflow(
  photoBlob: Blob,
  userId: string
): Promise<WorkflowResult> {
  try {
    console.log('[Workflow] Starting inventory workflow for user:', userId);

    // Step 1: Analyze image with fal.ai (JSON output)
    console.log('[Workflow] Step 1: Analyzing image...');
    const imageFile = new File([photoBlob], 'inventory.jpg', { type: 'image/jpeg' });
    const analysis = await analyzeImageStructured(imageFile);

    if (analysis.items.length === 0) {
      console.warn('[Workflow] No items detected in image');
      return {
        success: true,
        analysis,
        error: 'No items detected in the image'
      };
    }

    console.log(`[Workflow] Detected ${analysis.items.length} items`);

    // Step 2: Save to Supabase (photo + structured JSON)
    console.log('[Workflow] Step 2: Saving inventory snapshot...');
    const photoRecord = await saveInventorySnapshot(userId, photoBlob, analysis);

    // Step 3: Update inventory counts
    console.log('[Workflow] Step 3: Updating inventory counts...');
    await updateInventoryCounts(photoRecord.id, analysis.items, userId);

    // Step 4: Analyze stock trends
    console.log('[Workflow] Step 4: Analyzing stock trends...');
    const stockAnalysis = await analyzeStockLevels(userId);

    // Step 5: Check if reorder is needed
    const needsReorder = [
      ...stockAnalysis.lowStockItems,
      ...stockAnalysis.criticalItems
    ];

    if (needsReorder.length === 0) {
      console.log('[Workflow] No items need reordering');
      return {
        success: true,
        photoId: photoRecord.id,
        analysis,
        stockAnalysis
      };
    }

    console.log(`[Workflow] Found ${needsReorder.length} items needing reorder`);

    // Step 6: Search suppliers for low stock items
    console.log('[Workflow] Step 5: Searching suppliers...');
    const supplierOptions = await searchSuppliersForItems(
      needsReorder.map(item => ({ name: item.item_name, quantity: item.current_quantity }))
    );

    // Step 7: Get agent recommendation
    console.log('[Workflow] Step 6: Getting agent recommendation...');
    const agentResponse = await getAgentRecommendation({
      stock_situation: {
        item: needsReorder[0].item_name,
        current_qty: needsReorder[0].current_quantity,
        decline_pct: needsReorder[0].decline_percentage,
      },
      suppliers: Object.values(supplierOptions).flat().map(s => ({
        name: s.name,
        contact: s.contact_email || s.contact_phone || 'N/A',
        price: 0, // Would come from price comparison
        lead_time: 3
      })),
      order_history: []
    });

    // Step 8: Create draft order
    console.log('[Workflow] Step 7: Creating draft order...');
    const order = await createDraftOrder(
      userId,
      photoRecord.id,
      agentResponse
    );

    // Step 9: Store agent conversation
    console.log('[Workflow] Step 8: Storing agent conversation...');
    await saveAgentConversation(userId, photoRecord.id, order.id, agentResponse);

    console.log('[Workflow] Workflow completed successfully');

    return {
      success: true,
      photoId: photoRecord.id,
      orderId: order.id,
      analysis,
      stockAnalysis,
      agentRecommendation: agentResponse
    };

  } catch (error) {
    console.error('[Workflow] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Save inventory snapshot to Supabase
 */
async function saveInventorySnapshot(
  userId: string,
  photoBlob: Blob,
  analysis: StructuredAnalysisResult
): Promise<any> {
  // Upload blob to Supabase Storage
  const fileName = `${userId}/${Date.now()}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from('inventory-photos')
    .upload(fileName, photoBlob);

  if (uploadError) throw uploadError;

  // Save inventory_photos record
  const insertData = {
    user_id: userId,
    storage_path: fileName,
    description: `AI analyzed - ${analysis.total_items} items detected`,
    analysis_data: {
      items: analysis.items,
      timestamp: analysis.timestamp,
      total_items: analysis.total_items,
      raw_output: analysis.raw_output
    } as unknown as Json
  };

  const { data, error } = await supabase
    .from('inventory_photos')
    .insert(insertData)
    .select()
    .single();

  if (error) throw error;

  return data;
}

/**
 * Update inventory counts in database
 */
async function updateInventoryCounts(
  photoId: string,
  items: Array<{ name: string; quantity: number; confidence: number }>,
  userId: string
): Promise<void> {
  for (const item of items) {
    // Upsert inventory_items
    const { data: itemData, error: itemError } = await supabase
      .from('inventory_items')
      .upsert({
        user_id: userId,
        item_name: item.name
      }, {
        onConflict: 'user_id,item_name'
      })
      .select()
      .single();

    if (itemError) {
      console.error(`Error upserting item ${item.name}:`, itemError);
      continue;
    }

    // Insert inventory_counts
    const { error: countError } = await supabase
      .from('inventory_counts')
      .insert({
        item_id: itemData.id,
        photo_id: photoId,
        quantity: item.quantity
      });

    if (countError) {
      console.error(`Error inserting count for ${item.name}:`, countError);
    }
  }
}

/**
 * Create draft order
 */
async function createDraftOrder(
  userId: string,
  photoId: string,
  recommendation: AgentRecommendation
): Promise<any> {
  // TODO: Create orders table in database
  console.log('Draft order would be created:', { userId, photoId, recommendation });
  return { id: 'placeholder-order-id' };
}

/**
 * Save agent conversation
 */
async function saveAgentConversation(
  userId: string,
  photoId: string,
  orderId: string,
  recommendation: AgentRecommendation
): Promise<void> {
  // TODO: Create agent_conversations table in database
  console.log('Agent conversation would be saved:', { userId, photoId, orderId, recommendation });
}
