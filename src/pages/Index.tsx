import { useState, useEffect } from "react";
import { LogOut, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AuthForm } from "@/components/AuthForm";
import { PhotoArchive } from "@/components/PhotoArchive";
import { StockAlert } from "@/components/StockAlert";
import { StockHealthChart } from "@/components/StockHealthChart";
import { SimplePhotoCapture } from "@/components/SimplePhotoCapture";
import { OrdersSection } from "@/components/OrdersSection";
import { BottomNav } from "@/components/BottomNav";

const Index = () => {
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [refreshPhotos, setRefreshPhotos] = useState(0);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'charts' | 'capture' | 'archive'>('charts');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You have been logged out",
    });
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <AuthForm />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20">
      {/* Floating Oval Header */}
      <div className="fixed top-2 left-4 right-4 z-50 sm:top-3 sm:left-6 sm:right-6">
        <header className="mx-auto max-w-5xl backdrop-blur-xl bg-background/70 border border-border/50 rounded-full shadow-lg px-6 py-4 sm:px-8 sm:py-5">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-xl font-bold tracking-tight font-space-grotesk sm:text-2xl bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              MyStock
            </h1>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsAlertOpen(true)} 
                className="hover:bg-accent/50 rounded-full relative"
              >
                <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                {/* Notification dot */}
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive animate-pulse" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleSignOut} className="hover:bg-accent/50 rounded-full">
                <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>
          </div>
        </header>
      </div>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 pt-24 sm:pt-28 pb-24 sm:px-6">
        {/* Charts Tab */}
        {activeTab === 'charts' && (
          <div className="space-y-6 animate-fade-in">
            <StockHealthChart />
          </div>
        )}

        {/* Capture Tab */}
        {activeTab === 'capture' && (
          <div className="space-y-6 animate-fade-in">
            <SimplePhotoCapture onPhotoSaved={() => {
              setRefreshPhotos(prev => prev + 1);
              setActiveTab('archive');
            }} />
          </div>
        )}

        {/* Archive Tab */}
        {activeTab === 'archive' && (
          <div className="space-y-6 sm:space-y-8 animate-fade-in">
            <section>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 sm:mb-5">
                Recent Orders
              </h3>
              <OrdersSection />
            </section>
            
            <section>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 sm:mb-5">
                Photo Archive
              </h3>
              <PhotoArchive refreshTrigger={refreshPhotos} />
            </section>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Alert Notification Dialog */}
      <Dialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Bell className="h-5 w-5" />
              Stock Alerts
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <StockAlert />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
