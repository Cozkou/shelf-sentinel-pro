/**
 * Valyu AI Service
 * API for searching suppliers, products, and pricing information
 */

export interface ValyuSearchResult {
  title: string;
  url: string;
  content: string;
  snippet?: string;
}

export interface SupplierInfo {
  name: string;
  contact_email?: string;
  contact_phone?: string;
  location?: string;
  website?: string;
  description?: string;
}

export interface PriceComparison {
  supplier: string;
  product_name: string;
  price: number;
  currency: string;
  url: string;
  availability: string;
}

// Valyu API configuration
const VALYU_API_KEY = import.meta.env.VITE_VALYU_API_KEY;
const VALYU_API_BASE = 'https://api.valyu.ai/v1';

/**
 * Search for suppliers using Valyu AI
 * @param query - Search query (e.g., "Coca Cola suppliers New York")
 * @param maxResults - Maximum number of results to return
 * @returns Array of search results
 */
export async function searchSuppliers(
  query: string,
  maxResults: number = 10
): Promise<ValyuSearchResult[]> {
  try {
    console.log('[Valyu] Searching suppliers:', query);

    const response = await fetch(`${VALYU_API_BASE}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VALYU_API_KEY}`,
      },
      body: JSON.stringify({
        query,
        max_results: maxResults,
      }),
    });

    if (!response.ok) {
      throw new Error(`Valyu API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Transform Valyu response to our format
    const results: ValyuSearchResult[] = data.results?.map((result: any) => ({
      title: result.title || '',
      url: result.url || '',
      content: result.content || '',
      snippet: result.snippet || result.content?.substring(0, 200),
    })) || [];

    console.log(`[Valyu] Found ${results.length} results`);
    return results;

  } catch (error) {
    console.error('[Valyu] Search error:', error);
    throw new Error(`Failed to search suppliers: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract supplier details from a Valyu search result
 * @param result - Search result from Valyu
 * @returns Structured supplier information
 */
export function extractSupplierInfo(result: ValyuSearchResult): SupplierInfo {
  const { title, content, url } = result;

  // Extract email using regex
  const emailMatch = content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch ? emailMatch[0] : undefined;

  // Extract phone using regex (US format)
  const phoneMatch = content.match(/(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  const phone = phoneMatch ? phoneMatch[0] : undefined;

  // Extract location (simple heuristic: look for city, state patterns)
  const locationMatch = content.match(/([A-Z][a-z]+(?:\s[A-Z][a-z]+)*,?\s[A-Z]{2})/);
  const location = locationMatch ? locationMatch[0] : undefined;

  return {
    name: title,
    contact_email: email,
    contact_phone: phone,
    location,
    website: url,
    description: content.substring(0, 500),
  };
}

/**
 * Search for product pricing from multiple suppliers
 * @param productName - Product to search for
 * @param location - Optional location filter
 * @returns Array of price comparisons
 */
export async function comparePrices(
  productName: string,
  location?: string
): Promise<PriceComparison[]> {
  try {
    const query = location
      ? `${productName} wholesale price ${location}`
      : `${productName} wholesale price`;

    const results = await searchSuppliers(query, 15);

    // Parse pricing information from results
    const priceComparisons: PriceComparison[] = [];

    for (const result of results) {
      // Extract prices using regex (matches $XX.XX or $X.XX)
      const priceMatch = result.content.match(/\$\s*(\d+(?:\.\d{2})?)/);

      if (priceMatch) {
        priceComparisons.push({
          supplier: result.title,
          product_name: productName,
          price: parseFloat(priceMatch[1]),
          currency: 'USD',
          url: result.url,
          availability: 'unknown', // Would need more sophisticated parsing
        });
      }
    }

    // Sort by price (lowest first)
    priceComparisons.sort((a, b) => a.price - b.price);

    console.log(`[Valyu] Found ${priceComparisons.length} price comparisons for ${productName}`);
    return priceComparisons;

  } catch (error) {
    console.error('[Valyu] Price comparison error:', error);
    throw new Error(`Failed to compare prices: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Find suppliers for a specific product category
 * @param category - Product category (e.g., "beverages", "snacks", "office supplies")
 * @param location - Optional location filter
 * @returns Array of supplier information
 */
export async function findSuppliersByCategory(
  category: string,
  location?: string
): Promise<SupplierInfo[]> {
  try {
    const query = location
      ? `${category} wholesale distributors ${location}`
      : `${category} wholesale distributors`;

    const results = await searchSuppliers(query, 10);

    // Extract structured supplier info from results
    const suppliers = results.map(extractSupplierInfo);

    console.log(`[Valyu] Found ${suppliers.length} suppliers for category: ${category}`);
    return suppliers;

  } catch (error) {
    console.error('[Valyu] Category search error:', error);
    throw new Error(`Failed to find suppliers: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get supplier details from a specific URL
 * @param url - Supplier website URL
 * @returns Detailed supplier information
 */
export async function getSupplierDetails(url: string): Promise<SupplierInfo> {
  try {
    console.log('[Valyu] Fetching supplier details from:', url);

    const query = `site:${new URL(url).hostname} contact information`;
    const results = await searchSuppliers(query, 3);

    if (results.length === 0) {
      throw new Error('No supplier details found');
    }

    // Use the first result and extract detailed info
    const info = extractSupplierInfo(results[0]);

    console.log('[Valyu] Extracted supplier details:', info.name);
    return info;

  } catch (error) {
    console.error('[Valyu] Supplier details error:', error);
    throw new Error(`Failed to get supplier details: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Search for products and their suppliers based on inventory analysis
 * @param items - Array of items from inventory analysis
 * @param location - Optional location for local suppliers
 * @returns Suppliers organized by product
 */
export async function searchSuppliersForItems(
  items: Array<{ name: string; quantity: number }>,
  location?: string
): Promise<Record<string, SupplierInfo[]>> {
  const suppliersByItem: Record<string, SupplierInfo[]> = {};

  for (const item of items) {
    try {
      const query = location
        ? `${item.name} wholesale supplier ${location}`
        : `${item.name} wholesale supplier`;

      const results = await searchSuppliers(query, 5);
      suppliersByItem[item.name] = results.map(extractSupplierInfo);

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));

    } catch (error) {
      console.error(`[Valyu] Error searching suppliers for ${item.name}:`, error);
      suppliersByItem[item.name] = [];
    }
  }

  return suppliersByItem;
}
