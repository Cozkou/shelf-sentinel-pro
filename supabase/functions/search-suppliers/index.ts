import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProductItem {
  product_name: string;
  price: number;
  currency: string;
  unit: string;
  availability: string;
}

interface SupplierResult {
  supplier_name: string;
  website: string;
  location: string;
  contact_email?: string;
  contact_phone?: string;
  products: ProductItem[];
  notes?: string;
}

interface BestDealRecommendation {
  supplier_name: string;
  website: string;
  contact_phone?: string;
  location: string;
  product_name: string;
  price: number;
  currency: string;
  unit: string;
  availability: string;
  reasoning: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productName } = await req.json();

    if (!productName) {
      throw new Error('Product name is required');
    }

    const VALYU_API_KEY = Deno.env.get('VALYU_API_KEY');
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    
    if (!VALYU_API_KEY || !OPENAI_API_KEY) {
      throw new Error('API keys not configured');
    }

    const logs: Array<{ step: string; output: any; timestamp: string }> = [];

    // Step A: Search for suppliers
    console.log(`[Step A] Searching for ${productName} suppliers...`);
    logs.push({
      step: 'Step A: Initial Search',
      output: `Searching for ${productName} wholesale suppliers in UK...`,
      timestamp: new Date().toISOString()
    });

    const searchResponse = await fetch('https://api.valyu.ai/v1/answer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': VALYU_API_KEY,
      },
      body: JSON.stringify({
        query: `${productName} wholesale suppliers UK with contact information phone numbers`,
        search_type: 'web',
        max_num_results: 8,
        response_length: 'short',
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!searchResponse.ok) {
      throw new Error(`Valyu API error: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();

    // Step 1: Extract supplier data with GPT
    console.log('[Step 1] Extracting supplier data with GPT...');
    const step1Response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a data extraction specialist. Extract and structure supplier information from search results into clean JSON format.

IMPORTANT: Look for phone numbers in the content. Common UK formats:
- +44 1234 567890
- 0800 123 4567
- 01234 567890
- (01234) 567890

Extract the following for each supplier:
- supplier_name: Company name
- website: Full URL
- location: "United Kingdom"
- contact_email: Email if found
- contact_phone: UK phone number if found
- products: Array of products with:
  - product_name: Specific product name (be specific, include brand/model)
  - price: Numeric price only (extract from text like "£10.42" → 10.42)
  - currency: "GBP"
  - unit: Description of unit (e.g., "pack of 50", "pack of 10", "each")
  - availability: "In Stock" or "Contact for pricing"
- notes: Any important additional info

Return as JSON object with "suppliers" array. No markdown.`
          },
          {
            role: 'user',
            content: `Extract ALL supplier data from these search results:\n\n${JSON.stringify(searchData, null, 2)}`
          }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      }),
    });

    if (!step1Response.ok) {
      throw new Error(`OpenAI API error: ${step1Response.status}`);
    }

    const step1Data = await step1Response.json();
    const step1Content = step1Data.choices[0].message.content;
    const step1Parsed = JSON.parse(step1Content);
    const initialSuppliers = step1Parsed.suppliers || step1Parsed;

    logs.push({
      step: 'Step 1: Extract Supplier Data (GPT)',
      output: Array.isArray(initialSuppliers) ? initialSuppliers : [initialSuppliers],
      timestamp: new Date().toISOString()
    });

    console.log(`[Step 1] Extracted ${initialSuppliers.length} suppliers`);

    // Step B: Fetch contact information
    console.log('[Step B] Fetching contact information...');
    const contactSearches = await Promise.all(
      initialSuppliers.slice(0, 5).map(async (supplier: any) => {
        try {
          const contactResponse = await fetch('https://api.valyu.ai/v1/answer', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': VALYU_API_KEY,
            },
            body: JSON.stringify({
              query: `${supplier.supplier_name} UK contact phone number email address`,
              search_type: 'web',
              max_num_results: 3,
              response_length: 'short',
            }),
            signal: AbortSignal.timeout(30000),
          });

          if (contactResponse.ok) {
            return {
              supplier,
              contactData: await contactResponse.json()
            };
          }
        } catch (error) {
          console.log(`Could not fetch contact for ${supplier.supplier_name}`);
        }

        return { supplier, contactData: null };
      })
    );

    const enrichedData = {
      suppliers: contactSearches.map(item => ({
        ...item.supplier,
        contact_search: item.contactData
      }))
    };

    // Step C: Enrich contact info with GPT
    console.log('[Step C] Enriching contact information with GPT...');
    const stepCResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a data extraction specialist. Extract phone numbers and emails from contact search results and merge with existing supplier data.

Look for UK phone numbers in formats:
- +44 1234 567890
- 0800 123 4567
- 01234 567890
- (01234) 567890
- +44 (0)1234 567890

Extract emails in format: name@domain.com

For each supplier, merge the contact information found in "contact_search" with the existing supplier data.

Return JSON object with "suppliers" array containing:
- supplier_name
- website
- location
- contact_email (extracted from contact_search)
- contact_phone (extracted from contact_search)
- products (keep existing)
- notes (keep existing)

If no phone/email found, set to null.`
          },
          {
            role: 'user',
            content: `Extract and merge contact information:\n\n${JSON.stringify(enrichedData, null, 2)}`
          }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      }),
    });

    if (!stepCResponse.ok) {
      throw new Error(`OpenAI API error: ${stepCResponse.status}`);
    }

    const stepCData = await stepCResponse.json();
    const stepCContent = stepCData.choices[0].message.content;
    const stepCParsed = JSON.parse(stepCContent);
    const finalSuppliers = stepCParsed.suppliers || stepCParsed;

    logs.push({
      step: 'Step 2: Enrich Contact Info (GPT)',
      output: Array.isArray(finalSuppliers) ? finalSuppliers : [finalSuppliers],
      timestamp: new Date().toISOString()
    });

    console.log(`[Step C] Enriched contact information`);

    // Step 2: Choose best deal with GPT
    console.log('[Step 2] Analyzing best deal with GPT...');
    const step2Response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a procurement specialist analyzing supplier offers for the best deal.

IMPORTANT PRIORITY ORDER:
1. **MUST have contact_phone** - Strongly prefer suppliers with phone numbers for easy ordering
2. Price per unit (calculate cost per item)
3. Supplier reputation (established names)
4. Product availability (In Stock)
5. Minimum order quantity
6. Value for money

SELECTION RULES:
- If a supplier has a phone number AND competitive pricing, choose them over cheaper options without phones
- Only choose a supplier without a phone if the price difference is >20% or if they're the only option
- Having contact information (phone/email) is critical for B2B ordering

Return JSON format:
{
  "supplier_name": "Company name",
  "website": "Full URL",
  "contact_phone": "Phone number (include this in your response)",
  "location": "United Kingdom",
  "product_name": "Specific product name",
  "price": numeric_price,
  "currency": "GBP",
  "unit": "pack of X or each",
  "availability": "In Stock",
  "reasoning": "2-3 sentence explanation including: 1) price per item calculation, 2) why this supplier was chosen (mention phone availability), 3) value assessment"
}

Be specific and analytical. Mention the availability of phone contact in your reasoning.`
          },
          {
            role: 'user',
            content: `Analyze these suppliers and choose the BEST deal for ${productName}. PRIORITIZE suppliers with phone numbers:\n\n${JSON.stringify(finalSuppliers, null, 2)}`
          }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      }),
    });

    if (!step2Response.ok) {
      throw new Error(`OpenAI API error: ${step2Response.status}`);
    }

    const step2Data = await step2Response.json();
    const step2Content = step2Data.choices[0].message.content;
    const bestDeal = JSON.parse(step2Content);

    logs.push({
      step: 'Step 3: Choose Best Deal (GPT)',
      output: bestDeal,
      timestamp: new Date().toISOString()
    });

    console.log('[Step 2] Best deal selected');

    return new Response(
      JSON.stringify({
        success: true,
        logs,
        bestDeal,
        allSuppliers: finalSuppliers
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in search-suppliers:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});