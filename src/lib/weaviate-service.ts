/**
 * Weaviate Vector Database Service
 * Used for semantic search of suppliers based on vector embeddings
 */

export interface SupplierVector {
  supplier_id: string;
  name: string;
  specialties: string[];
  location?: string;
  description?: string;
}

export interface SearchResult {
  supplier_id: string;
  name: string;
  specialties: string[];
  location?: string;
  description?: string;
  similarity_score: number;
}

// Weaviate configuration
const WEAVIATE_URL = import.meta.env.VITE_WEAVIATE_URL;
const WEAVIATE_API_KEY = import.meta.env.VITE_WEAVIATE_API_KEY;

const COLLECTION_NAME = 'Supplier';

/**
 * Initialize Weaviate connection and create schema if needed
 * @returns Success status
 */
export async function initializeWeaviate(): Promise<boolean> {
  try {
    console.log('[Weaviate] Initializing connection...');

    // Check if collection exists
    const response = await fetch(`${WEAVIATE_URL}/v1/schema/${COLLECTION_NAME}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${WEAVIATE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 404) {
      // Create collection schema
      console.log('[Weaviate] Creating Supplier collection...');

      const schemaResponse = await fetch(`${WEAVIATE_URL}/v1/schema`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WEAVIATE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          class: COLLECTION_NAME,
          description: 'Supplier information with vector embeddings for semantic search',
          vectorizer: 'text2vec-openai', // or text2vec-contextionary
          moduleConfig: {
            'text2vec-openai': {
              model: 'ada',
              modelVersion: '002',
              type: 'text'
            }
          },
          properties: [
            {
              name: 'supplier_id',
              dataType: ['text'],
              description: 'UUID from Supabase suppliers table'
            },
            {
              name: 'name',
              dataType: ['text'],
              description: 'Supplier company name'
            },
            {
              name: 'specialties',
              dataType: ['text[]'],
              description: 'Array of product categories/specialties'
            },
            {
              name: 'location',
              dataType: ['text'],
              description: 'Supplier location (city, state)'
            },
            {
              name: 'description',
              dataType: ['text'],
              description: 'Detailed supplier description'
            }
          ]
        }),
      });

      if (!schemaResponse.ok) {
        const error = await schemaResponse.json();
        throw new Error(`Failed to create schema: ${JSON.stringify(error)}`);
      }

      console.log('[Weaviate] Supplier collection created successfully');
    } else if (response.ok) {
      console.log('[Weaviate] Supplier collection already exists');
    } else {
      throw new Error(`Failed to check collection: ${response.statusText}`);
    }

    return true;

  } catch (error) {
    console.error('[Weaviate] Initialization error:', error);
    throw new Error(`Weaviate initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Index a supplier in Weaviate
 * @param supplier - Supplier data to index
 * @returns Weaviate object ID
 */
export async function indexSupplier(supplier: SupplierVector): Promise<string> {
  try {
    console.log('[Weaviate] Indexing supplier:', supplier.name);

    const response = await fetch(`${WEAVIATE_URL}/v1/objects`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WEAVIATE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        class: COLLECTION_NAME,
        properties: {
          supplier_id: supplier.supplier_id,
          name: supplier.name,
          specialties: supplier.specialties,
          location: supplier.location || '',
          description: supplier.description || ''
        }
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to index supplier: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    console.log('[Weaviate] Supplier indexed with ID:', data.id);

    return data.id;

  } catch (error) {
    console.error('[Weaviate] Indexing error:', error);
    throw new Error(`Failed to index supplier: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Bulk index multiple suppliers
 * @param suppliers - Array of suppliers to index
 * @returns Array of Weaviate object IDs
 */
export async function bulkIndexSuppliers(suppliers: SupplierVector[]): Promise<string[]> {
  const ids: string[] = [];

  for (const supplier of suppliers) {
    try {
      const id = await indexSupplier(supplier);
      ids.push(id);

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.error(`[Weaviate] Failed to index supplier ${supplier.name}:`, error);
    }
  }

  console.log(`[Weaviate] Indexed ${ids.length}/${suppliers.length} suppliers`);
  return ids;
}

/**
 * Semantic search for suppliers based on query
 * @param query - Natural language search query
 * @param limit - Maximum number of results
 * @param certainty - Minimum similarity threshold (0-1)
 * @returns Array of matching suppliers with similarity scores
 */
export async function searchSuppliers(
  query: string,
  limit: number = 5,
  certainty: number = 0.7
): Promise<SearchResult[]> {
  try {
    console.log('[Weaviate] Searching for:', query);

    const response = await fetch(`${WEAVIATE_URL}/v1/graphql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WEAVIATE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `{
          Get {
            ${COLLECTION_NAME}(
              nearText: {
                concepts: ["${query}"]
                certainty: ${certainty}
              }
              limit: ${limit}
            ) {
              supplier_id
              name
              specialties
              location
              description
              _additional {
                certainty
              }
            }
          }
        }`
      }),
    });

    if (!response.ok) {
      throw new Error(`Weaviate search failed: ${response.statusText}`);
    }

    const data = await response.json();
    const results = data.data?.Get?.[COLLECTION_NAME] || [];

    const searchResults: SearchResult[] = results.map((result: any) => ({
      supplier_id: result.supplier_id,
      name: result.name,
      specialties: result.specialties || [],
      location: result.location,
      description: result.description,
      similarity_score: result._additional?.certainty || 0
    }));

    console.log(`[Weaviate] Found ${searchResults.length} matching suppliers`);
    return searchResults;

  } catch (error) {
    console.error('[Weaviate] Search error:', error);
    throw new Error(`Weaviate search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Update supplier embedding in Weaviate
 * @param weaviateId - Weaviate object ID
 * @param updates - Partial supplier data to update
 * @returns Success status
 */
export async function updateSupplierEmbedding(
  weaviateId: string,
  updates: Partial<SupplierVector>
): Promise<boolean> {
  try {
    console.log('[Weaviate] Updating supplier:', weaviateId);

    const response = await fetch(`${WEAVIATE_URL}/v1/objects/${COLLECTION_NAME}/${weaviateId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${WEAVIATE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: updates
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to update: ${JSON.stringify(error)}`);
    }

    console.log('[Weaviate] Supplier updated successfully');
    return true;

  } catch (error) {
    console.error('[Weaviate] Update error:', error);
    throw new Error(`Failed to update supplier: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete supplier from Weaviate
 * @param weaviateId - Weaviate object ID
 * @returns Success status
 */
export async function deleteSupplier(weaviateId: string): Promise<boolean> {
  try {
    console.log('[Weaviate] Deleting supplier:', weaviateId);

    const response = await fetch(`${WEAVIATE_URL}/v1/objects/${COLLECTION_NAME}/${weaviateId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${WEAVIATE_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to delete: ${response.statusText}`);
    }

    console.log('[Weaviate] Supplier deleted successfully');
    return true;

  } catch (error) {
    console.error('[Weaviate] Delete error:', error);
    throw new Error(`Failed to delete supplier: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get supplier by Weaviate ID
 * @param weaviateId - Weaviate object ID
 * @returns Supplier data
 */
export async function getSupplierById(weaviateId: string): Promise<SupplierVector | null> {
  try {
    const response = await fetch(`${WEAVIATE_URL}/v1/objects/${COLLECTION_NAME}/${weaviateId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${WEAVIATE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to get supplier: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      supplier_id: data.properties.supplier_id,
      name: data.properties.name,
      specialties: data.properties.specialties || [],
      location: data.properties.location,
      description: data.properties.description
    };

  } catch (error) {
    console.error('[Weaviate] Get supplier error:', error);
    throw new Error(`Failed to get supplier: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
