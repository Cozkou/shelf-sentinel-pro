import { useState, useEffect } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AuthForm } from "@/components/AuthForm";
import { PhotoUpload } from "@/components/PhotoUpload";
import { PhotoArchive } from "@/components/PhotoArchive";
import { StockAlert } from "@/components/StockAlert";
import { StockHealthChart } from "@/components/StockHealthChart";
import { QuickActions } from "@/components/QuickActions";
import { AgentChatbox } from "@/components/AgentChatbox";
import { OrdersSection } from "@/components/OrdersSection";
import CameraCapture from "@/components/CameraCapture";

const Index = () => {
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [refreshPhotos, setRefreshPhotos] = useState(0);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

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

  const handleCameraCapture = () => {
    setIsCameraOpen(true);
  };


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
      <div className="fixed top-4 left-4 right-4 z-50 sm:top-6 sm:left-6 sm:right-6">
        <header className="mx-auto max-w-5xl backdrop-blur-xl bg-background/70 border border-border/50 rounded-full shadow-lg px-6 py-4 sm:px-8 sm:py-5">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              MyStock
            </h1>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-xs sm:text-sm hover:bg-accent/50 rounded-full">
              <LogOut className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Sign Out</span>
              <span className="sm:hidden">Out</span>
            </Button>
          </div>
        </header>
      </div>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 pt-24 sm:pt-28 pb-8 sm:px-6">
        {/* Top Alert */}
        <section className="mb-6 sm:mb-8">
          <StockAlert />
        </section>

        {/* Stock Charts */}
        <section className="mb-6 sm:mb-8">
          <StockHealthChart />
        </section>

        {/* Photo Capture */}
        <section className="mb-6 sm:mb-8">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 sm:mb-5">
            Quick Actions
          </h3>
          <QuickActions 
            onCameraCapture={handleCameraCapture}
          />
        </section>

        {/* Agent Chat & Orders */}
        <section className="mb-6 sm:mb-8 grid gap-4 sm:gap-6 sm:grid-cols-2">
          <AgentChatbox />
          <OrdersSection />
        </section>

        {/* Photo Archive Section */}
        <section className="mb-6 sm:mb-8">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 sm:mb-5">
            Photo Archive
          </h3>
          <PhotoArchive refreshTrigger={refreshPhotos} />
        </section>
      </main>

      {/* Camera Dialog */}
      <CameraCapture
        open={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onPhotoSaved={() => setRefreshPhotos(prev => prev + 1)}
      />
    </div>
  );
};

export default Index;
