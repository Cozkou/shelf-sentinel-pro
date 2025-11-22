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
      <div className="fixed top-2 left-4 right-4 z-50 sm:top-3 sm:left-6 sm:right-6">
        <header className="mx-auto max-w-5xl backdrop-blur-xl bg-background/70 border border-border/50 rounded-full shadow-lg px-6 py-4 sm:px-8 sm:py-5">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-xl font-bold tracking-tight font-space-grotesk sm:text-2xl bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              MyStock
            </h1>
            <Button variant="ghost" size="icon" onClick={handleSignOut} className="hover:bg-accent/50 rounded-full">
              <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
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
