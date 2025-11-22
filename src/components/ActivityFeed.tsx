import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle2, AlertCircle, Phone } from "lucide-react";

interface ActivityItem {
  id: string;
  type: 'trigger' | 'searching' | 'found' | 'calling' | 'error';
  message: string;
  timestamp: Date;
  itemName?: string;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
}

export const ActivityFeed = ({ activities }: ActivityFeedProps) => {
  if (activities.length === 0) return null;

  const getIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'trigger':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'searching':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'found':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'calling':
        return <Phone className="h-4 w-4 text-purple-500 animate-pulse" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getBgColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'trigger':
        return 'bg-yellow-500/10 border-yellow-500/20';
      case 'searching':
        return 'bg-blue-500/10 border-blue-500/20';
      case 'found':
        return 'bg-green-500/10 border-green-500/20';
      case 'calling':
        return 'bg-purple-500/10 border-purple-500/20';
      case 'error':
        return 'bg-red-500/10 border-red-500/20';
      default:
        return 'bg-muted/10 border-border/20';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          Activity Feed
        </h3>
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          <AnimatePresence mode="popLayout">
            {activities.slice().reverse().map((activity, index) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20, height: 0 }}
                animate={{ opacity: 1, x: 0, height: 'auto' }}
                exit={{ opacity: 0, x: 20, height: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className={`flex items-start gap-3 p-3 rounded-md border ${getBgColor(activity.type)} transition-all`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">
                    {activity.message}
                  </p>
                  {activity.itemName && (
                    <p className="text-xs text-muted-foreground mt-1 font-medium">
                      Product: {activity.itemName}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    {activity.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};
