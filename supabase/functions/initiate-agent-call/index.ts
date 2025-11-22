import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    const ELEVENLABS_AGENT_ID = Deno.env.get('ELEVENLABS_AGENT_ID');

    if (!ELEVENLABS_API_KEY || !ELEVENLABS_AGENT_ID) {
      throw new Error('ElevenLabs credentials not configured');
    }

    const { supplier_info, order_details, phone_number } = await req.json();

    if (!phone_number) {
      throw new Error('Supplier phone number is required');
    }

    // Build the agent context/prompt with order details
    const agentPrompt = `You are a procurement assistant making an order call. 
    
Order Details:
- Product: ${order_details.product_name}
- Quantity Needed: ${order_details.quantity_needed} units
- Expected Price: $${order_details.price_per_unit} per unit
- Total Cost: $${order_details.total_cost}

Supplier Information:
- Name: ${supplier_info.supplier_name}
- Location: ${supplier_info.location}
- Selection Reasoning: ${supplier_info.reasoning}

Your task is to:
1. Confirm the supplier can fulfill the order
2. Verify pricing and delivery timeline
3. Place the order if terms are acceptable`;

    // Initiate outbound call via ElevenLabs Twilio integration
    const response = await fetch('https://api.elevenlabs.io/v1/twilio/outbound-call', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ELEVENLABS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_id: ELEVENLABS_AGENT_ID,
        to_phone_number: phone_number, // Must be in E.164 format (e.g., +11234567890)
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', errorText);
      throw new Error(`ElevenLabs API failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Agent call initiated:', result);

    return new Response(
      JSON.stringify({ 
        success: true, 
        session_id: result.session_id || result.id,
        message: 'Voice agent call initiated'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error initiating agent call:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
