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
    const ELEVENLABS_PHONE_ID = Deno.env.get('ELEVENLABS_PHONE_ID');
    const TEST_PHONE_NUMBER = Deno.env.get('TEST_PHONE_NUMBER');

    if (!ELEVENLABS_API_KEY || !ELEVENLABS_AGENT_ID || !ELEVENLABS_PHONE_ID) {
      throw new Error('ElevenLabs credentials not configured');
    }

    const { supplier_info, order_details, phone_number } = await req.json();

    // Use test number if configured, otherwise use supplier's number
    let phoneToCall = TEST_PHONE_NUMBER || phone_number;
    
    if (!phoneToCall) {
      throw new Error('No phone number available');
    }

    // Convert UK phone number to E.164 format if needed
    let formattedPhone = phoneToCall.replace(/\s+/g, ''); // Remove spaces
    if (formattedPhone.startsWith('0')) {
      // UK number starting with 0, convert to +44
      formattedPhone = '+44' + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith('+')) {
      // Add + if missing
      formattedPhone = '+' + formattedPhone;
    }

    console.log('Initiating call to:', formattedPhone, TEST_PHONE_NUMBER ? '(TEST NUMBER)' : '(SUPPLIER NUMBER)');

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

    // Build conversation starter message
    const conversationStarter = `Hello, I'm calling from ${supplier_info.supplier_name} regarding an order for ${order_details.quantity_needed} units of ${order_details.product_name}. Can you confirm availability and pricing?`;

    console.log('Agent Prompt:', agentPrompt);
    console.log('Conversation Starter:', conversationStarter);
    console.log('Calling ElevenLabs API with agent:', ELEVENLABS_AGENT_ID);
    console.log('Phone Number ID:', ELEVENLABS_PHONE_ID);
    console.log('To Number:', formattedPhone);

    // Initiate outbound call via ElevenLabs Twilio integration
    // 
    // IMPORTANT: The agent must be pre-configured in the ElevenLabs dashboard with:
    // 1. Appropriate instructions/prompt for procurement calls
    // 2. The agent should be assigned to the phone number (ELEVENLABS_PHONE_ID)
    // 3. The phone number must be imported from Twilio in the ElevenLabs dashboard
    //
    // The conversation_starter parameter may or may not be supported depending on API version.
    // If the API rejects it, remove it and ensure the agent is properly configured in the dashboard.
    const requestBody: any = {
      agent_id: ELEVENLABS_AGENT_ID,
      agent_phone_number_id: ELEVENLABS_PHONE_ID,
      to_number: formattedPhone,
    };

    // Try to pass conversation starter if API supports it
    // If you get an error about unsupported parameters, remove this line
    // and ensure the agent instructions are set in the ElevenLabs dashboard
    requestBody.conversation_starter = conversationStarter;
    
    // Alternative parameter names that might be supported (uncomment to try):
    // requestBody.initial_message = conversationStarter;
    // requestBody.context = agentPrompt;

    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch('https://api.elevenlabs.io/v1/convai/twilio/outbound-call', {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    console.log('ElevenLabs API response status:', response.status);
    console.log('ElevenLabs API response headers:', Object.fromEntries(response.headers.entries()));
    console.log('ElevenLabs API response body:', responseText);

    if (!response.ok) {
      console.error('ElevenLabs API error - Status:', response.status);
      console.error('ElevenLabs API error - Body:', responseText);
      
      let errorMessage = `ElevenLabs API failed: ${response.status} ${response.statusText}`;
      try {
        const errorJson = JSON.parse(responseText);
        errorMessage = errorJson.message || errorJson.error || errorMessage;
        console.error('Parsed error:', errorJson);
      } catch (e) {
        // If response is not JSON, use the text as error message
        if (responseText) {
          errorMessage = responseText;
        }
      }
      
      throw new Error(errorMessage);
    }

    let result;
    try {
      result = JSON.parse(responseText);
      console.log('ElevenLabs call response (parsed):', JSON.stringify(result, null, 2));
    } catch (e) {
      console.error('Failed to parse response as JSON:', e);
      throw new Error(`Invalid response from ElevenLabs API: ${responseText}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        call_id: result.callSid || result.conversation_id,
        message: result.message || 'Voice agent call initiated successfully'
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
