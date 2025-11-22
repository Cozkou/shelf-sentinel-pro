import { Camera, Mic, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface QuickActionsProps {
  onCameraCapture: () => void;
  onVoiceInput: () => void;
  isRecording: boolean;
}

export const QuickActions = ({ onCameraCapture, onVoiceInput, isRecording }: QuickActionsProps) => {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Card className="group relative overflow-hidden border border-border bg-card transition-all hover:shadow-md">
        <button 
          onClick={onCameraCapture}
          className="w-full p-4 sm:p-5 text-left"
        >
          <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-secondary sm:mb-4 sm:h-10 sm:w-10">
            <Camera className="h-4 w-4 text-foreground" />
          </div>
          <h3 className="mb-1.5 text-sm font-medium text-foreground sm:text-base">
            Photo Check-In
          </h3>
          <p className="mb-2 text-xs text-muted-foreground sm:mb-3">
            Daily shelf snapshots
          </p>
          <div className="inline-flex items-center text-xs font-medium text-foreground transition-transform group-hover:translate-x-1">
            Capture
            <ArrowRight className="ml-1.5 h-3 w-3" />
          </div>
        </button>
      </Card>

      <Card className="group relative overflow-hidden border border-border bg-card transition-all hover:shadow-md">
        <button 
          onClick={onVoiceInput}
          className="w-full p-4 sm:p-5 text-left"
        >
          <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-secondary sm:mb-4 sm:h-10 sm:w-10">
            <Mic className="h-4 w-4 text-foreground" />
          </div>
          <h3 className="mb-1.5 text-sm font-medium text-foreground sm:text-base">
            Voice Update
          </h3>
          <p className="mb-2 text-xs text-muted-foreground sm:mb-3">
            Quick verbal notes
          </p>
          <div className="inline-flex items-center text-xs font-medium text-foreground transition-transform group-hover:translate-x-1">
            {isRecording ? "Stop" : "Record"}
            <ArrowRight className="ml-1.5 h-3 w-3" />
          </div>
        </button>
      </Card>
    </div>
  );
};
