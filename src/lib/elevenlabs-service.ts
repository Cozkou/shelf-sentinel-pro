/**
 * ElevenLabs Conversational AI Service
 * Handles AI agent conversations for supplier ordering
 */

import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import type { StockTrend } from './stock-analyzer';

export interface AgentContext {
  stock_situation: {
    item: string;
    current_qty: number;
    decline_pct: number;
    days_until_out?: number;
  };
  suppliers: Array<{
    name: string;
    contact: string;
    price: number;
    lead_time: number;
  }>;
  order_history: any[];
}

export interface AgentRecommendation {
  recommended_order: {
    supplier: string;
    items: Array<{ name: string; quantity: number }>;
    estimated_cost: number;
    delivery_days: number;
  };
  reasoning: string;
  call_script: string;
  approval_required: boolean;
}

// ElevenLabs configuration
const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1';

// Initialize ElevenLabs client
const elevenlabs = new ElevenLabsClient({
  apiKey: ELEVENLABS_API_KEY
});

/**
 * Get AI agent recommendation for reordering
 * @param context - Stock situation and supplier information
 * @returns Agent recommendation with order details
 */
export async function getAgentRecommendation(
  context: AgentContext
): Promise<AgentRecommendation> {
  try {
    console.log('[ElevenLabs] Getting agent recommendation...');

    // Build prompt for the agent
    const prompt = buildOrderPrompt(context);

    // TODO: Replace with actual ElevenLabs Conversational AI API call
    // For now, using a mock implementation
    const mockRecommendation: AgentRecommendation = {
      recommended_order: {
        supplier: context.suppliers[0]?.name || 'Unknown Supplier',
        items: [{
          name: context.stock_situation.item,
          quantity: Math.ceil(context.stock_situation.current_qty * 2)
        }],
        estimated_cost: (context.suppliers[0]?.price || 0) * Math.ceil(context.stock_situation.current_qty * 2),
        delivery_days: context.suppliers[0]?.lead_time || 3
      },
      reasoning: `Based on the ${context.stock_situation.decline_pct}% decline in ${context.stock_situation.item}, ` +
                 `I recommend ordering from ${context.suppliers[0]?.name} which offers the best price and lead time.`,
      call_script: `Hello, I'm calling to place an order for ${context.stock_situation.item}. ` +
                   `We need ${Math.ceil(context.stock_situation.current_qty * 2)} units. Can you confirm availability and delivery time?`,
      approval_required: true
    };

    console.log('[ElevenLabs] Generated recommendation');
    return mockRecommendation;

  } catch (error) {
    console.error('[ElevenLabs] Error getting recommendation:', error);
    throw new Error(`Failed to get agent recommendation: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Build a prompt for the ElevenLabs agent
 */
function buildOrderPrompt(context: AgentContext): string {
  return `You are a procurement assistant analyzing inventory needs.

Stock Situation:
- Item: ${context.stock_situation.item}
- Current Quantity: ${context.stock_situation.current_qty}
- Decline: ${context.stock_situation.decline_pct}%
${context.stock_situation.days_until_out ? `- Days Until Stock-Out: ${context.stock_situation.days_until_out}` : ''}

Available Suppliers:
${context.suppliers.map((s, i) => `${i + 1}. ${s.name} - $${s.price}/unit, ${s.lead_time} days delivery`).join('\n')}

Please recommend:
1. Which supplier to use and why
2. How many units to order
3. A professional call script for contacting the supplier

Format your response as JSON.`;
}

/**
 * Synthesize speech from text using ElevenLabs TTS
 * @param text - Text to convert to speech
 * @param voiceId - ElevenLabs voice ID
 * @returns Audio blob
 */
export async function synthesizeSpeech(
  text: string,
  voiceId: string = 'default'
): Promise<Blob> {
  try {
    console.log('[ElevenLabs] Synthesizing speech...');

    const response = await fetch(`${ELEVENLABS_API_BASE}/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`TTS failed: ${response.statusText}`);
    }

    const audioBlob = await response.blob();
    console.log('[ElevenLabs] Speech synthesized');

    return audioBlob;

  } catch (error) {
    console.error('[ElevenLabs] TTS error:', error);
    throw new Error(`Speech synthesis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Call supplier via LiveKit (placeholder)
 * @param phoneNumber - Supplier phone number
 * @param script - Call script
 */
export async function callSupplierViaLiveKit(
  phoneNumber: string,
  script: string
): Promise<void> {
  console.log('📞 [PLACEHOLDER] Calling supplier via LiveKit');
  console.log(`Phone: ${phoneNumber}`);
  console.log(`Script: ${script}`);
  console.log('TODO: Integrate LiveKit API when ready');

  // TODO: Implement actual LiveKit integration
  // This would involve:
  // 1. Creating a LiveKit room
  // 2. Connecting to LiveKit's telephony service
  // 3. Initiating outbound call
  // 4. Running TTS for the agent's script
  // 5. Processing supplier's response via STT
}

/**
 * Create a conversational AI agent session
 * @param context - Agent context
 * @returns Session ID
 */
export async function createAgentSession(
  context: AgentContext
): Promise<string> {
  try {
    console.log('[ElevenLabs] Creating agent session...');

    // TODO: Implement ElevenLabs Conversational AI session creation
    const sessionId = `session_${Date.now()}`;

    console.log('[ElevenLabs] Session created:', sessionId);
    return sessionId;

  } catch (error) {
    console.error('[ElevenLabs] Session creation error:', error);
    throw new Error(`Failed to create agent session: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Send message to agent in an active session
 * @param sessionId - Session ID
 * @param message - User message
 * @returns Agent response
 */
export async function sendMessageToAgent(
  sessionId: string,
  message: string
): Promise<string> {
  try {
    console.log('[ElevenLabs] Sending message to agent...');

    // TODO: Implement actual ElevenLabs Conversational AI message sending
    const mockResponse = "I've analyzed your request and prepared an order recommendation.";

    console.log('[ElevenLabs] Received response from agent');
    return mockResponse;

  } catch (error) {
    console.error('[ElevenLabs] Message sending error:', error);
    throw new Error(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate conversational response from GPT analysis
 * Converts structured analysis to natural conversation
 * @param recommendation - GPT analysis result
 * @param gptReasoning - Full reasoning from GPT
 * @returns Conversational transcript
 */
export interface ConversationTranscript {
  role: 'agent' | 'system' | 'user';
  content: string;
  timestamp: string;
  audio_url?: string;
}

export async function generateConversationalResponse(
  recommendation: string,
  voiceId: string = 'EXAVITQu4vr4xnSDxMaL' // Default professional voice
): Promise<ConversationTranscript[]> {
  try {
    console.log('[ElevenLabs] Generating conversational response...');

    const transcript: ConversationTranscript[] = [];

    // System message
    transcript.push({
      role: 'system',
      content: 'Inventory analysis complete. Initiating procurement recommendation.',
      timestamp: new Date().toISOString()
    });

    // Agent recommendation
    transcript.push({
      role: 'agent',
      content: recommendation,
      timestamp: new Date().toISOString()
    });

    // Generate audio for the recommendation (optional)
    try {
      const audio = await elevenlabs.textToSpeech.convert(voiceId, {
        text: recommendation,
        modelId: 'eleven_monolingual_v1',
      });

      // Convert audio stream to blob URL
      const chunks: Uint8Array[] = [];
      const reader = audio.getReader();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }
      
      const audioBlob = new Blob(chunks as BlobPart[], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);

      transcript[transcript.length - 1].audio_url = audioUrl;
      console.log('[ElevenLabs] Audio generated:', audioUrl);
    } catch (audioError) {
      console.warn('[ElevenLabs] Audio generation failed, continuing with text only:', audioError);
    }

    return transcript;

  } catch (error) {
    console.error('[ElevenLabs] Conversation generation error:', error);
    throw new Error(`Failed to generate conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create a full conversational agent session with context
 * @param gptAnalysis - Full reasoning from GPT
 * @param recommendation - Order recommendation text
 * @returns Session transcript
 */
export async function createConversationalSession(
  gptAnalysis: string,
  recommendation: string
): Promise<{
  sessionId: string;
  transcript: ConversationTranscript[];
}> {
  try {
    console.log('[ElevenLabs] Creating conversational session...');

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const transcript = await generateConversationalResponse(recommendation);

    console.log('[ElevenLabs] Session created successfully');

    return {
      sessionId,
      transcript
    };

  } catch (error) {
    console.error('[ElevenLabs] Session creation error:', error);
    throw new Error(`Failed to create conversational session: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
