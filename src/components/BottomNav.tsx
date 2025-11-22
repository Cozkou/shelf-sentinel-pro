import { BarChart3, Plus, Archive } from "lucide-react";

interface BottomNavProps {
  activeTab: 'charts' | 'capture' | 'archive';
  onTabChange: (tab: 'charts' | 'capture' | 'archive') => void;
}

export const BottomNav = ({ activeTab, onTabChange }: BottomNavProps) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-xl border-t border-border/50 px-4 py-3 sm:px-6">
      <div className="mx-auto max-w-md flex items-center justify-around">
        {/* Charts Button */}
        <button
          onClick={() => onTabChange('charts')}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
            activeTab === 'charts'
              ? 'text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <BarChart3 className="h-6 w-6" />
          <span className="text-xs font-medium">Charts</span>
        </button>

        {/* Capture Button - Elevated */}
        <button
          onClick={() => onTabChange('capture')}
          className="relative -mt-6 flex items-center justify-center h-14 w-14 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg hover:shadow-xl hover:scale-110 transition-all"
        >
          <Plus className="h-7 w-7" />
        </button>

        {/* Archive Button */}
        <button
          onClick={() => onTabChange('archive')}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
            activeTab === 'archive'
              ? 'text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Archive className="h-6 w-6" />
          <span className="text-xs font-medium">Archive</span>
        </button>
      </div>
    </nav>
  );
};
