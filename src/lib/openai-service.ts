/**
 * OpenAI Service
 * GPT-4 analysis of inventory levels and supplier data
 */

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // For client-side usage (consider moving to backend)
});

export interface InventoryContext {
  item_name: string;
  current_quantity: number;
  reorder_level: number;
  minimum_stock: number;
  days_until_stock_out: number;
  estimated_daily_usage: number;
}

export interface ExistingSupplier {
  id: string;
  name: string;
  contact_phone?: string;
  contact_email?: string;
  location?: string;
  products: Array<{
    product_name: string;
    unit_price: number;
    currency: string;
    min_order_quantity: number;
    lead_time_days: number;
  }>;
}

export interface ValyuSupplierResult {
  name: string;
  contact: string;
  location?: string;
  estimated_price?: number;
}

export interface SupplierRecommendation {
  should_add_new_suppliers: boolean;
  suppliers_to_add: Array<{
    name: string;
    contact: string;
    reason: string;
  }>;
  should_update_prices: boolean;
  price_updates: Array<{
    supplier_name: string;
    product_name: string;
    current_price: number;
    suggested_price: number;
    reason: string;
  }>;
}

export interface OrderRecommendation {
  item_name: string;
  recommended_quantity: number;
  recommended_supplier: string;
  supplier_id?: string;
  unit_price: number;
  total_cost: number;
  currency: string;
  lead_time_days: number;
  reasoning: string;
}

export interface GPTAnalysisResult {
  supplier_recommendations: SupplierRecommendation;
  order_recommendation: OrderRecommendation;
  full_reasoning: string;
}

/**
 * Analyze inventory situation and supplier options using GPT-4
 * @param inventory - Current inventory context
 * @param existingSuppliers - Suppliers from Supabase
 * @param valyuResults - Suppliers from Valyu search
 * @returns Comprehensive analysis with recommendations
 */
export async function analyzeInventoryAndSuppliers(
  inventory: InventoryContext,
  existingSuppliers: ExistingSupplier[],
  valyuResults: ValyuSupplierResult[]
): Promise<GPTAnalysisResult> {
  try {
    console.log('[OpenAI] Analyzing inventory and suppliers...');

    const prompt = `You are an AI procurement analyst for an inventory management system. Analyze the following data and provide recommendations.

**CURRENT INVENTORY SITUATION:**
- Item: ${inventory.item_name}
- Current Stock: ${inventory.current_quantity} units
- Reorder Level: ${inventory.reorder_level} units
- Minimum Stock: ${inventory.minimum_stock} units
- Days Until Stock-Out: ${inventory.days_until_stock_out} days
- Estimated Daily Usage: ${inventory.estimated_daily_usage} units/day

**EXISTING SUPPLIERS (From Our Database):**
${existingSuppliers.map((s, i) => `
${i + 1}. ${s.name}
   Contact: ${s.contact_email || s.contact_phone || 'N/A'}
   Location: ${s.location || 'N/A'}
   Products:
${s.products.map(p => `   - ${p.product_name}: $${p.unit_price} ${p.currency}, MOQ: ${p.min_order_quantity}, Lead: ${p.lead_time_days} days`).join('\n')}
`).join('\n')}

**NEW SUPPLIERS (From Valyu Search):**
${valyuResults.map((s, i) => `
${i + 1}. ${s.name}
   Contact: ${s.contact}
   Location: ${s.location || 'Unknown'}
   Estimated Price: ${s.estimated_price ? `$${s.estimated_price}` : 'Unknown'}
`).join('\n')}

**YOUR TASK:**
1. Determine if we should add any new suppliers from Valyu results to our database (consider: better pricing, reliability, location)
2. Determine if we should update any prices in our database based on new market data
3. Recommend a specific order: which supplier, how much to order, at what price
4. Provide clear reasoning for your decisions

**OUTPUT FORMAT (JSON only, no additional text):**
{
  "supplier_recommendations": {
    "should_add_new_suppliers": boolean,
    "suppliers_to_add": [
      {
        "name": "Supplier Name",
        "contact": "contact info",
        "reason": "why we should add them"
      }
    ],
    "should_update_prices": boolean,
    "price_updates": [
      {
        "supplier_name": "Existing Supplier",
        "product_name": "Product Name",
        "current_price": 10.50,
        "suggested_price": 9.80,
        "reason": "market price decreased"
      }
    ]
  },
  "order_recommendation": {
    "item_name": "${inventory.item_name}",
    "recommended_quantity": 100,
    "recommended_supplier": "Best Supplier Name",
    "supplier_id": "uuid-if-existing-supplier",
    "unit_price": 10.50,
    "total_cost": 1050.00,
    "currency": "USD",
    "lead_time_days": 3,
    "reasoning": "Clear explanation of why this supplier and quantity"
  },
  "full_reasoning": "Comprehensive paragraph explaining the entire analysis and recommendations"
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert procurement analyst. Analyze inventory and supplier data, then provide structured JSON recommendations. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    console.log('[OpenAI] Raw response:', content);

    // Parse JSON response
    const result: GPTAnalysisResult = JSON.parse(content);

    // Validate structure
    if (!result.supplier_recommendations || !result.order_recommendation) {
      throw new Error('Invalid response structure from GPT');
    }

    console.log('[OpenAI] Analysis complete:', result);
    return result;

  } catch (error) {
    console.error('[OpenAI] Analysis error:', error);

    if (error instanceof Error) {
      throw new Error(`GPT analysis failed: ${error.message}`);
    }

    throw new Error('GPT analysis failed: Unknown error');
  }
}

/**
 * Generate a natural language summary of the recommendation
 * Used for conversational AI and user display
 */
export function generateRecommendationSummary(analysis: GPTAnalysisResult): string {
  const { order_recommendation, supplier_recommendations } = analysis;

  let summary = `Based on my analysis of your inventory and available suppliers, here's my recommendation:\n\n`;

  summary += `**Order Recommendation:**\n`;
  summary += `I suggest ordering ${order_recommendation.recommended_quantity} units of ${order_recommendation.item_name} from ${order_recommendation.recommended_supplier}. `;
  summary += `The total cost will be $${order_recommendation.total_cost.toFixed(2)} ${order_recommendation.currency} `;
  summary += `($${order_recommendation.unit_price.toFixed(2)} per unit), with an expected delivery in ${order_recommendation.lead_time_days} days.\n\n`;

  summary += `**Reasoning:**\n${order_recommendation.reasoning}\n\n`;

  if (supplier_recommendations.should_add_new_suppliers && supplier_recommendations.suppliers_to_add.length > 0) {
    summary += `**New Suppliers to Consider:**\n`;
    supplier_recommendations.suppliers_to_add.forEach(s => {
      summary += `- ${s.name} (${s.contact}): ${s.reason}\n`;
    });
    summary += `\n`;
  }

  if (supplier_recommendations.should_update_prices && supplier_recommendations.price_updates.length > 0) {
    summary += `**Price Updates Recommended:**\n`;
    supplier_recommendations.price_updates.forEach(p => {
      summary += `- ${p.supplier_name} - ${p.product_name}: $${p.current_price} → $${p.suggested_price} (${p.reason})\n`;
    });
    summary += `\n`;
  }

  summary += `\nWould you like to approve this order?`;

  return summary;
}
