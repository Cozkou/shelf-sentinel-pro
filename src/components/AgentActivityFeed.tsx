import { Card } from "@/components/ui/card";
import { Bot, Phone, ShoppingCart, TrendingUp } from "lucide-react";

const activities = [
  {
    icon: TrendingUp,
    text: "Agent predicted cement shortage",
    time: "2 min ago",
  },
  {
    icon: ShoppingCart,
    text: "Agent drafted order for 20 bags",
    time: "5 min ago",
  },
  {
    icon: Phone,
    text: "Agent called supplier (LiveKit)",
    time: "12 min ago",
  },
  {
    icon: Bot,
    text: "Daily analysis completed",
    time: "1 hour ago",
  },
];

export const AgentActivityFeed = () => {
  return (
    <Card className="p-4 sm:p-6">
      <h3 className="text-sm font-medium text-foreground mb-4">Agent Activity</h3>
      <div className="space-y-3">
        {activities.map((activity, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="rounded-lg bg-secondary p-1.5 flex-shrink-0">
              <activity.icon className="h-3.5 w-3.5 text-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-foreground">{activity.text}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{activity.time}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
