/**
 * Workflow Orchestrator
 * Coordinates the complete inventory analysis → supplier search → GPT analysis → agent recommendation workflow
 */

import { supabase } from "@/integrations/supabase/client";
import { analyzeImageStructured, type StructuredAnalysisResult } from "./fal-service";
import {
  generatePredictiveCurve,
  predictStockOut,
  type PredictiveDataPoint,
  type ReorderLevels,
  type StockOutPrediction
} from "./stock-analyzer";
import { searchSuppliersForItems, type SupplierInfo } from "./valyu-service";
import {
  analyzeInventoryAndSuppliers,
  generateRecommendationSummary,
  type GPTAnalysisResult,
  type InventoryContext,
  type ExistingSupplier,
  type ValyuSupplierResult
} from "./openai-service";
import {
  createConversationalSession,
  type ConversationTranscript
} from "./elevenlabs-service";

export interface WorkflowResult {
  success: boolean;
  photoId?: string;
  orderId?: string;
  sessionId?: string;
  analysis?: StructuredAnalysisResult;
  predictions?: {
    itemId: string;
    itemName: string;
    data: PredictiveDataPoint[];
    reorderLevels: ReorderLevels;
    needsReorder: boolean;
  }[];
  gptAnalysis?: GPTAnalysisResult;
  conversationTranscript?: ConversationTranscript[];
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
    console.log('[Workflow] Step 1: Analyzing image with fal.ai...');
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

    console.log(`[Workflow] Detected ${analysis.items.length} items:`, analysis.items.map(i => `${i.name} (${i.quantity})`));

    // Step 2: Save to Supabase (photo + structured JSON)
    console.log('[Workflow] Step 2: Saving inventory snapshot to Supabase...');
    const photoRecord = await saveInventorySnapshot(userId, photoBlob, analysis);

    // Step 3: Update inventory counts
    console.log('[Workflow] Step 3: Updating inventory counts...');
    await updateInventoryCounts(photoRecord.id, analysis.items, userId);

    // Step 4: Generate predictive curves for each item
    console.log('[Workflow] Step 4: Generating predictive curves...');
    const predictions = await generatePredictionsForItems(userId, analysis.items);

    console.log('[Workflow] Step 5: Checking reorder status...');
    const itemsNeedingReorder = predictions.filter(p => p.needsReorder);

    if (itemsNeedingReorder.length === 0) {
      console.log('[Workflow] No items need reordering');
      return {
        success: true,
        photoId: photoRecord.id,
        analysis,
        predictions
      };
    }

    console.log(`[Workflow] Found ${itemsNeedingReorder.length} items needing reorder:`,
      itemsNeedingReorder.map(i => i.itemName));

    return {
      success: true,
      photoId: photoRecord.id,
      analysis,
      predictions,
      error: `${itemsNeedingReorder.length} items below reorder level. Click "Search Suppliers" to continue.`
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
 * Execute supplier search and order recommendation workflow
 * Triggered manually when user clicks "Search Suppliers" button
 * @param userId - User ID
 * @param itemId - Item ID needing reorder
 * @returns Workflow result with order and conversation
 */
export async function executeSupplierSearchWorkflow(
  userId: string,
  itemId: string,
  itemName: string
): Promise<WorkflowResult> {
  try {
    console.log('[Workflow] Starting supplier search workflow for:', itemName);

    // Step 1: Get stock-out prediction
    console.log('[Workflow] Step 1: Analyzing stock prediction...');
    const stockPrediction = await predictStockOut(userId, itemId, 30);
    const { data: predictiveCurve, reorderLevels } = await generatePredictiveCurve(userId, itemId, 30);

    // Get current quantity (latest data point)
    const currentData = predictiveCurve.find(d => !d.is_predicted);
    const currentQuantity = currentData?.quantity || 0;

    const inventoryContext: InventoryContext = {
      item_name: itemName,
      current_quantity: currentQuantity,
      reorder_level: reorderLevels.reorder_level,
      minimum_stock: reorderLevels.minimum_stock,
      days_until_stock_out: stockPrediction.days_until_stock_out,
      estimated_daily_usage: stockPrediction.estimated_daily_usage
    };

    // Step 2: Search Valyu AI for suppliers
    console.log('[Workflow] Step 2: Searching Valyu AI for suppliers...');
    const valyuResults = await searchSuppliersForItems([{ name: itemName, quantity: currentQuantity }]);
    const valyuSuppliersRaw = valyuResults[itemName] || [];
    
    // Convert SupplierInfo to ValyuSupplierResult by adding contact field
    const valyuSuppliersForItem: ValyuSupplierResult[] = valyuSuppliersRaw.map(s => ({
      ...s,
      contact: s.contact_phone || s.contact_email || 'Contact information not available'
    }));

    console.log(`[Workflow] Found ${valyuSuppliersForItem.length} suppliers from Valyu`);

    // Step 3: Get existing suppliers from Supabase
    console.log('[Workflow] Step 3: Fetching existing suppliers from Supabase...');
    const existingSuppliers = await fetchExistingSuppliers();

    console.log(`[Workflow] Found ${existingSuppliers.length} existing suppliers in database`);

    // Step 4: Analyze with GPT-4
    console.log('[Workflow] Step 4: Analyzing with GPT-4...');
    const gptAnalysis = await analyzeInventoryAndSuppliers(
      inventoryContext,
      existingSuppliers,
      valyuSuppliersForItem
    );

    console.log('[Workflow] GPT Analysis complete:', gptAnalysis.order_recommendation);

    // Step 5: Create draft order
    console.log('[Workflow] Step 5: Creating draft order...');
    const order = await createDraftOrderFromGPT(userId, gptAnalysis, itemId);

    // Step 6: Generate conversational response with ElevenLabs
    console.log('[Workflow] Step 6: Generating conversational response...');
    const recommendationText = generateRecommendationSummary(gptAnalysis);
    const { sessionId, transcript } = await createConversationalSession(
      gptAnalysis.full_reasoning,
      recommendationText
    );

    // Step 7: Save conversation to database
    console.log('[Workflow] Step 7: Saving conversation...');
    await saveConversationToDatabase(userId, order.id, sessionId, transcript, gptAnalysis);

    console.log('[Workflow] Supplier search workflow completed successfully');

    return {
      success: true,
      orderId: order.id,
      sessionId,
      gptAnalysis,
      conversationTranscript: transcript
    };

  } catch (error) {
    console.error('[Workflow] Supplier search error:', error);
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

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Save inventory_photos record
  const { data, error } = await supabase
    .from('inventory_photos')
    .insert([{
      user_id: user.id,
      storage_path: fileName,
      description: `AI analyzed - ${analysis.total_items} items detected`,
      analysis_data: {
        items: analysis.items,
        timestamp: analysis.timestamp,
        total_items: analysis.total_items,
        raw_output: analysis.raw_output
      } as any
    }])
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
        quantity: item.quantity,
        confidence_score: item.confidence
      });

    if (countError) {
      console.error(`Error inserting count for ${item.name}:`, countError);
    }
  }
}

/**
 * Generate predictions for all detected items
 */
async function generatePredictionsForItems(
  userId: string,
  items: Array<{ name: string; quantity: number }>
): Promise<Array<{
  itemId: string;
  itemName: string;
  data: PredictiveDataPoint[];
  reorderLevels: ReorderLevels;
  needsReorder: boolean;
}>> {
  const predictions = [];

  for (const item of items) {
    try {
      // Get item ID from database
      const { data: itemData } = await supabase
        .from('inventory_items')
        .select('id')
        .eq('user_id', userId)
        .eq('item_name', item.name)
        .single();

      if (!itemData) continue;

      // Generate predictive curve
      const { data, reorderLevels } = await generatePredictiveCurve(userId, itemData.id, 30);

      // Check if item needs reorder (current quantity below reorder level)
      const currentData = data.find(d => !d.is_predicted);
      const needsReorder = currentData ? currentData.quantity < reorderLevels.reorder_level : false;

      predictions.push({
        itemId: itemData.id,
        itemName: item.name,
        data,
        reorderLevels,
        needsReorder
      });
    } catch (error) {
      console.error(`Error generating prediction for ${item.name}:`, error);
    }
  }

  return predictions;
}

/**
 * Fetch existing suppliers from Supabase
 */
async function fetchExistingSuppliers(): Promise<ExistingSupplier[]> {
  const { data: suppliers, error } = await supabase
    .from('suppliers')
    .select(`
      id,
      name,
      contact_phone,
      contact_email,
      location
    `);

  if (error) {
    console.error('[Workflow] Error fetching suppliers:', error);
    return [];
  }

  return (suppliers || []).map(s => ({
    id: s.id,
    name: s.name,
    contact_phone: s.contact_phone,
    contact_email: s.contact_email,
    location: s.location,
    products: []
  }));
}

/**
 * Create draft order from GPT analysis
 */
async function createDraftOrderFromGPT(
  userId: string,
  gptAnalysis: GPTAnalysisResult,
  itemId: string
): Promise<any> {
  const { order_recommendation } = gptAnalysis;

  // Look up supplier ID if recommended_supplier matches existing supplier
  let supplierId = order_recommendation.supplier_id || null;

  if (!supplierId) {
    const { data: supplierData } = await supabase
      .from('suppliers')
      .select('id')
      .eq('name', order_recommendation.recommended_supplier)
      .single();

    supplierId = supplierData?.id || null;
  }

  const { data, error } = await supabase
    .from('orders')
    .insert([{
      user_id: userId,
      supplier_id: supplierId,
      items: [
        {
          item_id: itemId,
          name: order_recommendation.item_name,
          quantity: order_recommendation.recommended_quantity,
          unit_price: order_recommendation.unit_price
        }
      ],
      status: 'draft',
      total_cost: order_recommendation.total_cost
    }])
    .select()
    .single();

  if (error) throw error;

  return data;
}

/**
 * Save conversation to database
 */
async function saveConversationToDatabase(
  userId: string,
  orderId: string,
  sessionId: string,
  transcript: ConversationTranscript[],
  gptAnalysis: GPTAnalysisResult
): Promise<void> {
  const { error } = await supabase
    .from('agent_conversations')
    .insert([{
      user_id: userId,
      order_id: orderId,
      transcript: transcript as any,
      agent_reasoning: gptAnalysis.full_reasoning,
      status: 'active'
    }]);

  if (error) {
    console.error('[Workflow] Error saving conversation:', error);
    throw error;
  }
}
