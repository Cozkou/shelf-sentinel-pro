import { useState } from "react";
import { BarChart3, Camera } from "lucide-react";
import { StockHealthChart } from "./StockHealthChart";
import { SimplePhotoCapture } from "./SimplePhotoCapture";

interface InventoryViewProps {
  onPhotoSaved?: () => void;
}

export const InventoryView = ({ onPhotoSaved }: InventoryViewProps) => {
  const [activeView, setActiveView] = useState<'graph' | 'camera'>('graph');

  return (
    <div className="space-y-4">
      {/* Toggle Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveView('graph')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
            activeView === 'graph'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          <span className="text-sm font-medium">Charts</span>
        </button>
        
        <button
          onClick={() => setActiveView('camera')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
            activeView === 'camera'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          <Camera className="h-4 w-4" />
          <span className="text-sm font-medium">Capture</span>
        </button>
      </div>

      {/* Content */}
      <div className="animate-fade-in">
        {activeView === 'graph' ? (
          <StockHealthChart />
        ) : (
          <SimplePhotoCapture onPhotoSaved={onPhotoSaved} />
        )}
      </div>
    </div>
  );
};
