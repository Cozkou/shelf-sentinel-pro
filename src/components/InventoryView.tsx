import { useState } from "react";
import { BarChart3, Camera } from "lucide-react";
import { StockHealthChart } from "./StockHealthChart";
import { SimplePhotoCapture } from "./SimplePhotoCapture";
import { motion } from "framer-motion";

interface InventoryViewProps {
  onPhotoSaved?: () => void;
}

export const InventoryView = ({ onPhotoSaved }: InventoryViewProps) => {
  const [activeView, setActiveView] = useState<'graph' | 'camera'>('graph');

  return (
    <div className="space-y-4">
      {/* Toggle Buttons */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex gap-2"
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setActiveView('graph')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
            activeView === 'graph'
              ? 'bg-primary text-primary-foreground shadow-lg'
              : 'bg-card text-foreground border border-border hover:bg-accent hover:text-accent-foreground'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          <span className="text-sm font-medium">Charts</span>
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setActiveView('camera')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
            activeView === 'camera'
              ? 'bg-primary text-primary-foreground shadow-lg'
              : 'bg-card text-foreground border border-border hover:bg-accent hover:text-accent-foreground'
          }`}
        >
          <Camera className="h-4 w-4" />
          <span className="text-sm font-medium">Capture</span>
        </motion.button>
      </motion.div>

      {/* Content */}
      <motion.div
        key={activeView}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
      >
        {activeView === 'graph' ? (
          <StockHealthChart />
        ) : (
          <SimplePhotoCapture onPhotoSaved={onPhotoSaved} />
        )}
      </motion.div>
    </div>
  );
};
