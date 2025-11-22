import { Camera, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";

interface QuickActionsProps {
  onCameraCapture: () => void;
}

export const QuickActions = ({ onCameraCapture }: QuickActionsProps) => {
  return (
    <Card className="group relative overflow-hidden border border-border bg-card transition-all hover:shadow-md">
      <button 
        onClick={onCameraCapture}
        className="w-full p-4 sm:p-5 text-left"
      >
        <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-secondary sm:mb-4 sm:h-10 sm:w-10">
          <Camera className="h-4 w-4 text-foreground" />
        </div>
        <h3 className="mb-1.5 text-sm font-medium text-foreground sm:text-base">
          Capture Photo
        </h3>
        <p className="mb-2 text-xs text-muted-foreground sm:mb-3">
          Take inventory snapshot
        </p>
        <div className="inline-flex items-center text-xs font-medium text-foreground transition-transform group-hover:translate-x-1">
          Capture
          <ArrowRight className="ml-1.5 h-3 w-3" />
        </div>
      </button>
    </Card>
  );
};
