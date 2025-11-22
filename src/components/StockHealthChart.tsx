import { Card } from "@/components/ui/card";

export const StockHealthChart = () => {
  return (
    <Card className="p-4 sm:p-6">
      <h3 className="text-sm font-medium text-foreground mb-4">Stock Health</h3>
      <div className="flex items-center justify-center gap-6 sm:gap-8">
        <div className="relative w-32 h-32 sm:w-40 sm:h-40">
          <svg viewBox="0 0 100 100" className="transform -rotate-90">
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="8"
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="8"
              strokeDasharray="175 251"
              strokeLinecap="round"
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="hsl(142 76% 36%)"
              strokeWidth="8"
              strokeDasharray="75 251"
              strokeDashoffset="-175"
              strokeLinecap="round"
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="hsl(var(--destructive))"
              strokeWidth="8"
              strokeDasharray="1 251"
              strokeDashoffset="-250"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-lg sm:text-2xl font-semibold text-foreground">68</p>
              <p className="text-xs text-muted-foreground">Items</p>
            </div>
          </div>
        </div>
        <div className="space-y-2 sm:space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[hsl(142,76%,36%)]" />
            <span className="text-xs sm:text-sm text-muted-foreground">Healthy: 42</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-xs sm:text-sm text-muted-foreground">Low: 24</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-destructive" />
            <span className="text-xs sm:text-sm text-muted-foreground">Critical: 2</span>
          </div>
        </div>
      </div>
    </Card>
  );
};
