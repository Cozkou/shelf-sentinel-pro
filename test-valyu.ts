/**
 * Test script for Valyu API - Search for black pen suppliers in UK
 * Run with: npx tsx test-valyu.ts
 */

const VALYU_API_KEY = 'xHU5ktW9Ve3oZDzSVMLqu3V24BugS9qG7WcR3aFU';
const VALYU_API_BASE = 'https://api.valyu.ai/v1';
const OPENAI_API_KEY = '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';

interface ProductItem {
  product_name: string;
  price: number;
  currency: string;
  unit: string; // e.g., "per pack of 50", "each"
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

/**
 * Clean up raw Valyu results using GPT-4
 */
async function cleanupWithGPT(rawValyuResponse: any): Promise<SupplierResult[]> {
  try {
    console.log('\n🤖 Step 1: Extracting supplier data with GPT-4o-mini...\n');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
- contact_email: Email if found (look carefully in content)
- contact_phone: UK phone number if found (look for patterns like above)
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
            content: `Extract ALL supplier data from these search results, including phone numbers and emails:\n\n${JSON.stringify(rawValyuResponse, null, 2)}`
          }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const parsed = JSON.parse(content);

    // Handle both {suppliers: [...]} and direct array format
    const suppliers = parsed.suppliers || parsed;

    console.log('✅ Step 1 complete: Extracted supplier data\n');
    return Array.isArray(suppliers) ? suppliers : [suppliers];

  } catch (error) {
    console.error('❌ GPT cleanup error:', error);
    return [];
  }
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

/**
 * Choose the best deal using GPT-4
 */
async function chooseBestDeal(suppliers: SupplierResult[]): Promise<BestDealRecommendation | null> {
  try {
    console.log('\n🤖 Step 2: Analyzing best deal with GPT-4o-mini...\n');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
2. Price per unit (calculate cost per pen)
3. Supplier reputation (established names like BIC, Viking, Farnell)
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
  "reasoning": "2-3 sentence explanation including: 1) price per pen calculation, 2) why this supplier was chosen (mention phone availability), 3) value assessment"
}

Be specific and analytical. Mention the availability of phone contact in your reasoning.`
          },
          {
            role: 'user',
            content: `Analyze these suppliers and choose the BEST deal for black pens. PRIORITIZE suppliers with phone numbers:\n\n${JSON.stringify(suppliers, null, 2)}`
          }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const recommendation = JSON.parse(content);

    console.log('✅ Step 2 complete: Best deal selected\n');
    return recommendation;

  } catch (error) {
    console.error('❌ Best deal selection error:', error);
    return null;
  }
}

/**
 * Search for contact information for a specific supplier
 */
async function searchSupplierContact(supplierName: string, website: string): Promise<any> {
  try {
    console.log(`   🔍 Searching contact info for ${supplierName}...`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(`${VALYU_API_BASE}/answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': VALYU_API_KEY,
      },
      body: JSON.stringify({
        query: `${supplierName} UK contact phone number email address`,
        search_type: 'web',
        max_num_results: 3,
        response_length: 'short',
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.log(`   ⚠️  Could not fetch contact info for ${supplierName}`);
      return null;
    }

    const data = await response.json();
    console.log(`   ✅ Contact info retrieved for ${supplierName}`);
    return data;

  } catch (error) {
    console.log(`   ⚠️  Error fetching contact for ${supplierName}`);
    return null;
  }
}

async function searchBlackPenSuppliers(): Promise<SupplierResult[]> {
  try {
    console.log('🔍 Step A: Searching for black pen suppliers in UK...\n');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    const response = await fetch(`${VALYU_API_BASE}/answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': VALYU_API_KEY,
      },
      body: JSON.stringify({
        query: 'black pens wholesale suppliers UK with contact information phone numbers',
        search_type: 'web',
        max_num_results: 8,
        response_length: 'short',
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Valyu API error: ${response.status} ${response.statusText}\n${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Initial supplier search complete\n');
    console.log('='.repeat(80) + '\n');

    // Use GPT-4 to extract initial supplier list
    const initialSuppliers = await cleanupWithGPT(data);

    // Now search for contact info for each supplier
    console.log('\n🔍 Step B: Fetching contact information for each supplier...\n');

    const contactSearches = await Promise.all(
      initialSuppliers.slice(0, 5).map(async (supplier) => {
        const contactData = await searchSupplierContact(supplier.supplier_name, supplier.website);
        return {
          supplier,
          contactData
        };
      })
    );

    console.log('\n✅ Contact information search complete\n');
    console.log('='.repeat(80) + '\n');

    // Merge contact data with supplier data
    const enrichedData = {
      suppliers: contactSearches.map(item => ({
        ...item.supplier,
        contact_search: item.contactData
      }))
    };

    // Use GPT to extract and merge phone numbers/emails
    const finalSuppliers = await enrichContactInfo(enrichedData);

    return finalSuppliers;

  } catch (error) {
    console.error('❌ Error searching suppliers:', error);
    throw error;
  }
}

/**
 * Enrich supplier data with contact information using GPT
 */
async function enrichContactInfo(enrichedData: any): Promise<SupplierResult[]> {
  try {
    console.log('🤖 Step C: Extracting contact information with GPT-4o-mini...\n');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const parsed = JSON.parse(content);

    const suppliers = parsed.suppliers || parsed;

    console.log('✅ Step C complete: Contact information enriched\n');
    return Array.isArray(suppliers) ? suppliers : [suppliers];

  } catch (error) {
    console.error('❌ Contact enrichment error:', error);
    return enrichedData.suppliers.map((s: any) => ({
      supplier_name: s.supplier_name,
      website: s.website,
      location: s.location,
      contact_email: s.contact_email,
      contact_phone: s.contact_phone,
      products: s.products,
      notes: s.notes
    }));
  }
}

// Run the test
(async () => {
  try {
    // Step 1: Get all suppliers
    const suppliers = await searchBlackPenSuppliers();

    console.log('\n' + '='.repeat(80));
    console.log('📦 STEP 1 OUTPUT: ALL SUPPLIERS (WITH CONTACT INFO)');
    console.log('='.repeat(80) + '\n');
    console.log(JSON.stringify(suppliers, null, 2));

    console.log('\n\n📊 STEP 1 SUMMARY:\n');
    console.log(`Total suppliers found: ${suppliers.length}`);

    const totalProducts = suppliers.reduce((sum, s) => sum + s.products.length, 0);
    console.log(`Total products listed: ${totalProducts}`);

    const suppliersWithPricing = suppliers.filter(s => s.products.some(p => p.price > 0)).length;
    console.log(`Suppliers with pricing: ${suppliersWithPricing}`);

    const suppliersWithPhone = suppliers.filter(s => s.contact_phone).length;
    console.log(`Suppliers with phone: ${suppliersWithPhone}`);

    const suppliersWithEmail = suppliers.filter(s => s.contact_email).length;
    console.log(`Suppliers with email: ${suppliersWithEmail}`);

    // Show detailed breakdown
    console.log('\n📋 DETAILED BREAKDOWN:\n');
    suppliers.forEach((supplier, index) => {
      console.log(`${index + 1}. ${supplier.supplier_name}`);
      console.log(`   Website: ${supplier.website}`);
      if (supplier.contact_phone) console.log(`   Phone: ${supplier.contact_phone}`);
      if (supplier.contact_email) console.log(`   Email: ${supplier.contact_email}`);
      console.log(`   Products: ${supplier.products.length} items`);
      supplier.products.forEach(product => {
        const priceStr = product.price ? `£${product.price.toFixed(2)}` : 'Contact for pricing';
        console.log(`   - ${product.product_name}: ${priceStr} (${product.unit})`);
      });
      console.log('');
    });

    // Step 2: Choose best deal
    if (suppliers.length > 0) {
      const bestDeal = await chooseBestDeal(suppliers);

      if (bestDeal) {
        console.log('\n' + '='.repeat(80));
        console.log('🏆 STEP 2 OUTPUT: BEST DEAL RECOMMENDATION');
        console.log('='.repeat(80) + '\n');
        console.log(JSON.stringify(bestDeal, null, 2));

        console.log('\n\n💡 RECOMMENDATION DETAILS:\n');
        console.log(`Supplier: ${bestDeal.supplier_name}`);
        console.log(`Product: ${bestDeal.product_name}`);
        console.log(`Price: £${bestDeal.price.toFixed(2)} (${bestDeal.unit})`);
        console.log(`Website: ${bestDeal.website}`);
        if (bestDeal.contact_phone) console.log(`Phone: ${bestDeal.contact_phone}`);
        console.log(`\n📝 Reasoning:\n${bestDeal.reasoning}`);
      }
    }

  } catch (error) {
    console.error('Failed to complete test:', error);
    process.exit(1);
  }
})();
