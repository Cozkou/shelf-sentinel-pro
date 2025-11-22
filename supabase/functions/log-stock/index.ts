import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StockLogRequest {
  itemName: string;
  quantity: number;
  userId: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { itemName, quantity, userId }: StockLogRequest = await req.json();

    console.log('Logging stock:', { itemName, quantity, userId });

    // Validate input
    if (!itemName || quantity === undefined || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: itemName, quantity, userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find or create the inventory item
    let { data: existingItem, error: findError } = await supabase
      .from('inventory_items')
      .select('id')
      .eq('item_name', itemName)
      .eq('user_id', userId)
      .single();

    if (findError && findError.code !== 'PGRST116') {
      console.error('Error finding item:', findError);
      throw findError;
    }

    let itemId: string;

    if (existingItem) {
      itemId = existingItem.id;
      console.log('Found existing item:', itemId);
    } else {
      // Create new item
      const { data: newItem, error: createError } = await supabase
        .from('inventory_items')
        .insert({
          item_name: itemName,
          user_id: userId,
        })
        .select('id')
        .single();

      if (createError) {
        console.error('Error creating item:', createError);
        throw createError;
      }

      itemId = newItem.id;
      console.log('Created new item:', itemId);
    }

    // Create a dummy photo entry (required for inventory_counts foreign key)
    const { data: photoData, error: photoError } = await supabase
      .from('inventory_photos')
      .insert({
        user_id: userId,
        storage_path: `manual-log-${Date.now()}`,
        description: `Manual stock log via API for ${itemName}`,
      })
      .select('id')
      .single();

    if (photoError) {
      console.error('Error creating photo entry:', photoError);
      throw photoError;
    }

    // Log the inventory count
    const { data: countData, error: countError } = await supabase
      .from('inventory_counts')
      .insert({
        item_id: itemId,
        photo_id: photoData.id,
        quantity: quantity,
      })
      .select()
      .single();

    if (countError) {
      console.error('Error logging count:', countError);
      throw countError;
    }

    console.log('Successfully logged stock:', countData);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully logged ${quantity} units of ${itemName}`,
        data: {
          itemId,
          quantity,
          timestamp: new Date().toISOString(),
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in log-stock function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
