import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const StockAlert = () => {
  return (
    <div className="flex items-start gap-3">
      <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">
          Fertilizer runs out in 2 days
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          3 bags left • 1.5/day
        </p>
        <Button size="sm" variant="outline" className="mt-2 h-7 text-xs">
          Reorder
        </Button>
      </div>
    </div>
  );
};
