import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const StockAlert = () => {
  return (
    <Card className="border-destructive/30 bg-gradient-to-r from-destructive/10 to-destructive/5 p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="rounded-full bg-destructive/10 p-2">
          <AlertTriangle className="h-5 w-5 text-destructive sm:h-6 sm:w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm sm:text-base font-semibold text-foreground">
            Fertilizer runs out in 2 days
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Current: 3 bags • Usage: 1.5 bags/day
          </p>
        </div>
        <Button size="sm" className="text-xs flex-shrink-0 shadow-sm">
          Approve
        </Button>
      </div>
    </Card>
  );
};
