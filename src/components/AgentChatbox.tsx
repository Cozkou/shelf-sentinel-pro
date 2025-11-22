import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, Wrench, Brain } from "lucide-react";
import { useState } from "react";

type MessageType = "tool" | "thought" | "response";

interface Message {
  type: MessageType;
  content: string;
  time: string;
}

const initialMessages: Message[] = [
  {
    type: "thought",
    content: "Analyzing current inventory levels and predicting shortages...",
    time: "2 min ago",
  },
  {
    type: "tool",
    content: "Called tool: analyze_inventory_trends()",
    time: "2 min ago",
  },
  {
    type: "response",
    content: "I've detected that cement will run out in approximately 3 days based on current usage patterns.",
    time: "2 min ago",
  },
  {
    type: "tool",
    content: "Called tool: draft_purchase_order(item: 'cement', quantity: 20)",
    time: "5 min ago",
  },
  {
    type: "response",
    content: "Purchase order drafted and ready for approval.",
    time: "5 min ago",
  },
];

export const AgentChatbox = () => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    
    const newMessage: Message = {
      type: "response",
      content: input,
      time: "Just now",
    };
    
    setMessages([...messages, newMessage]);
    setInput("");
  };

  const getIcon = (type: MessageType) => {
    switch (type) {
      case "tool":
        return <Wrench className="h-3 w-3" />;
      case "thought":
        return <Brain className="h-3 w-3" />;
      default:
        return <Bot className="h-3 w-3" />;
    }
  };

  const getStyles = (type: MessageType) => {
    switch (type) {
      case "tool":
        return "bg-primary/10 border-primary/20";
      case "thought":
        return "bg-secondary/10 border-secondary/20";
      default:
        return "bg-muted border-border";
    }
  };

  return (
    <Card className="p-4 sm:p-6 flex flex-col h-[400px]">
      <h3 className="text-sm font-medium text-foreground mb-4">Agent Chat</h3>
      
      <ScrollArea className="flex-1 pr-4">
        <div className="space-y-3">
          {messages.map((message, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className={`rounded-lg p-1.5 flex-shrink-0 border ${getStyles(message.type)}`}>
                {getIcon(message.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-foreground">{message.content}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{message.time}</p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="flex gap-2 mt-4 pt-4 border-t border-border">
        <Input
          placeholder="Ask the agent..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          className="flex-1"
        />
        <Button onClick={handleSend} size="icon">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
};