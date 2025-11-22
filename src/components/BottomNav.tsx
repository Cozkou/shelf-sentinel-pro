import { BarChart3, Plus, Archive } from "lucide-react";

interface BottomNavProps {
  activeTab: 'charts' | 'archive';
  onTabChange: (tab: 'charts' | 'archive') => void;
  onCaptureClick: () => void;
}

export const BottomNav = ({ activeTab, onTabChange, onCaptureClick }: BottomNavProps) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-xl border-t border-border/50 px-4 py-3 sm:px-6">
      <div className="mx-auto max-w-md flex items-center justify-around">
        {/* Charts Button */}
        <button
          onClick={() => onTabChange('charts')}
          className={`flex items-center justify-center h-12 w-12 rounded-full transition-all ${
            activeTab === 'charts'
              ? 'text-primary bg-primary/10'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <BarChart3 className="h-6 w-6" />
        </button>

        {/* Capture Button - Elevated */}
        <button
          onClick={onCaptureClick}
          className="relative -mt-6 flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg hover:shadow-xl hover:scale-110 transition-all"
        >
          <Plus className="h-8 w-8" />
        </button>

        {/* Archive Button */}
        <button
          onClick={() => onTabChange('archive')}
          className={`flex items-center justify-center h-12 w-12 rounded-full transition-all ${
            activeTab === 'archive'
              ? 'text-primary bg-primary/10'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <Archive className="h-6 w-6" />
        </button>
      </div>
    </nav>
  );
};
