import { Camera, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";

interface QuickActionsProps {
  onCameraCapture: () => void;
}

export const QuickActions = ({ onCameraCapture }: QuickActionsProps) => {
  return (
    <Card className="group relative overflow-hidden border border-border/50 bg-gradient-to-br from-card to-accent/10 transition-all hover:shadow-lg hover:border-primary/30 cursor-pointer">
      <button 
        onClick={onCameraCapture}
        className="w-full p-5 sm:p-6 text-left"
      >
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm sm:mb-5 sm:h-14 sm:w-14">
          <Camera className="h-6 w-6" />
        </div>
        <h3 className="mb-2 text-base font-semibold text-foreground sm:text-lg">
          Capture Photo
        </h3>
        <p className="mb-3 text-xs text-muted-foreground sm:text-sm sm:mb-4">
          Take inventory snapshot with AI analysis
        </p>
        <div className="inline-flex items-center text-sm font-medium text-primary transition-transform group-hover:translate-x-1">
          Start Capture
          <ArrowRight className="ml-2 h-4 w-4" />
        </div>
      </button>
    </Card>
  );
};
