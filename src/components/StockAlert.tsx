import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const StockAlert = () => {
  return (
    <Card className="border-destructive/50 bg-destructive/5 p-3 sm:p-4">
      <div className="flex items-start gap-2 sm:gap-3">
        <AlertTriangle className="h-4 w-4 text-destructive sm:h-5 sm:w-5 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-foreground">
            Fertilizer runs out in 2 days
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Current: 3 bags • Usage: 1.5 bags/day
          </p>
        </div>
        <Button size="sm" className="text-xs flex-shrink-0">
          Approve
        </Button>
      </div>
    </Card>
  );
};
