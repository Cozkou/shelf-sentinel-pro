import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, Loader2, Brain, Volume2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow } from "date-fns";

interface ConversationMessage {
  role: 'agent' | 'system' | 'user';
  content: string;
  timestamp: string;
  audio_url?: string;
}

interface Conversation {
  id: string;
  order_id: string;
  transcript: ConversationMessage[];
  agent_reasoning: string;
  status: string;
  created_at: string;
}

export const AgentChatbox = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchConversations();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('conversations_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agent_conversations' },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const fetchConversations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('agent_conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      // Cast the Json type to our ConversationMessage[] type
      const typedData = (data || []).map(conv => ({
        ...conv,
        transcript: Array.isArray(conv.transcript) 
          ? (conv.transcript as unknown as ConversationMessage[]) 
          : []
      }));
      setConversations(typedData);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayAudio = (audioUrl: string) => {
    if (playingAudio === audioUrl) {
      // Stop playing
      audioRef.current?.pause();
      setPlayingAudio(null);
    } else {
      // Play new audio
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(audioUrl);
      audioRef.current.play();
      audioRef.current.onended = () => setPlayingAudio(null);
      setPlayingAudio(audioUrl);
    }
  };

  const handleSend = () => {
    if (!input.trim()) return;

    // TODO: Implement sending message to agent
    console.log('Send message to agent:', input);
    setInput("");
  };

  const getIcon = (role: string) => {
    switch (role) {
      case 'agent':
        return <Bot className="h-3 w-3" />;
      case 'system':
        return <Brain className="h-3 w-3" />;
      case 'user':
        return <Send className="h-3 w-3" />;
      default:
        return <Bot className="h-3 w-3" />;
    }
  };

  const getStyles = (role: string) => {
    switch (role) {
      case 'agent':
        return "bg-primary/10 border-primary/20";
      case 'system':
        return "bg-secondary/10 border-secondary/20";
      case 'user':
        return "bg-accent/10 border-accent/20";
      default:
        return "bg-muted border-border";
    }
  };

  // Flatten all messages from all conversations
  const allMessages: Array<ConversationMessage & { conversationId: string }> = [];
  conversations.forEach(conv => {
    conv.transcript.forEach(msg => {
      allMessages.push({ ...msg, conversationId: conv.id });
    });
  });

  // Sort by timestamp
  allMessages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (loading) {
    return (
      <Card className="p-4 sm:p-6 flex flex-col h-[400px]">
        <h3 className="text-sm font-medium text-foreground mb-4">Agent Chat</h3>
        <div className="flex items-center justify-center flex-1">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 sm:p-6 flex flex-col h-[400px]">
      <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
        <Bot className="h-4 w-4" />
        Agent Chat
        {conversations.length > 0 && (
          <span className="text-xs text-muted-foreground">
            ({allMessages.length} messages)
          </span>
        )}
      </h3>

      <ScrollArea className="flex-1 pr-4">
        {allMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <Bot className="h-12 w-12 text-muted-foreground opacity-50 mb-3" />
            <p className="text-sm text-muted-foreground">No agent conversations yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              The AI agent will appear here when analyzing orders
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {allMessages.map((message, i) => (
              <div key={`${message.conversationId}-${i}`} className="flex items-start gap-2">
                <div className={`rounded-lg p-1.5 flex-shrink-0 border ${getStyles(message.role)}`}>
                  {getIcon(message.role)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-xs font-medium text-muted-foreground mb-0.5">
                        {message.role === 'agent' ? 'AI Agent' : message.role === 'system' ? 'System' : 'You'}
                      </p>
                      <p className="text-xs sm:text-sm text-foreground whitespace-pre-wrap">
                        {message.content}
                      </p>
                    </div>
                    {message.audio_url && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => handlePlayAudio(message.audio_url!)}
                      >
                        <Volume2
                          className={`h-3 w-3 ${playingAudio === message.audio_url ? 'text-primary animate-pulse' : ''}`}
                        />
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <div className="flex gap-2 mt-4 pt-4 border-t border-border">
        <Input
          placeholder="Ask the agent..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          className="flex-1 text-sm"
          disabled
        />
        <Button onClick={handleSend} size="icon" disabled>
          <Send className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Agent messaging coming soon
      </p>
    </Card>
  );
};
