import { Card } from "@/components/ui/card";
import { AlertTriangle, TrendingDown } from "lucide-react";

const predictions = [
  { day: "Mon", item: "Cement", status: "critical" },
  { day: "Tue", item: "Fertilizer", status: "warning" },
  { day: "Wed", item: "Wire", status: "warning" },
  { day: "Thu", item: "Paint", status: "critical" },
  { day: "Fri", item: "Screws", status: "warning" },
];

export const PredictionsTimeline = () => {
  return (
    <Card className="p-4 sm:p-6">
      <h3 className="text-sm font-medium text-foreground mb-4">Predicted Shortages</h3>
      <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
        {predictions.map((pred, i) => (
          <div
            key={i}
            className="flex-shrink-0 w-20 sm:w-24"
          >
            <div className={`rounded-lg p-2 sm:p-3 ${
              pred.status === "critical" 
                ? "bg-destructive/10 border border-destructive/30" 
                : "bg-primary/10 border border-primary/30"
            }`}>
              <p className="text-xs font-medium text-center text-foreground mb-1.5">
                {pred.day}
              </p>
              {pred.status === "critical" ? (
                <AlertTriangle className="h-4 w-4 mx-auto text-destructive mb-1" />
              ) : (
                <TrendingDown className="h-4 w-4 mx-auto text-primary mb-1" />
              )}
              <p className="text-xs text-center text-muted-foreground truncate">
                {pred.item}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
