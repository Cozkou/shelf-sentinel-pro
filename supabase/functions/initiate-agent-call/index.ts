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

    if (!ELEVENLABS_API_KEY || !ELEVENLABS_AGENT_ID || !ELEVENLABS_PHONE_ID) {
      throw new Error('ElevenLabs credentials not configured');
    }

    const { customerName, orderDetails } = await req.json();

    if (!customerName || !orderDetails) {
      throw new Error('customerName and orderDetails are required');
    }

    console.log('Initiating call with customerName:', customerName, 'orderDetails:', orderDetails);
    console.log('Calling ElevenLabs API with agent:', ELEVENLABS_AGENT_ID);
    console.log('Phone Number ID:', ELEVENLABS_PHONE_ID);

    // Initiate outbound call via ElevenLabs Twilio integration
    // Pass dynamic variables in the correct ElevenLabs format
    const requestBody: any = {
      agent_id: ELEVENLABS_AGENT_ID,
      agent_phone_number_id: ELEVENLABS_PHONE_ID,
      // Pass dynamic variables using variableValues for proper injection in agent's first message
      agent: {
        variableValues: {
          customerName: customerName,
          orderDetails: orderDetails,
        }
      }
    };
    
    // Alternative parameter names that might be supported (uncomment to try):
    // requestBody.initial_message = conversationStarter;

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
