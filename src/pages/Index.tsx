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
import { PredictionsTimeline } from "@/components/PredictionsTimeline";
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-5xl px-4 py-3 sm:px-6 sm:py-5">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              Inventory Sentinel
            </h1>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-xs sm:text-sm">
              <LogOut className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Sign Out</span>
              <span className="sm:hidden">Out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-5xl px-4 py-4 sm:px-6 sm:py-8">
        {/* Top Alert */}
        <section className="mb-4 sm:mb-6">
          <StockAlert />
        </section>

        {/* Dashboard Grid */}
        <section className="mb-4 sm:mb-6 grid gap-3 sm:gap-4 sm:grid-cols-2">
          <StockHealthChart />
          <PredictionsTimeline />
        </section>

        {/* Photo Capture */}
        <section className="mb-4 sm:mb-6">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3 sm:mb-4">
            Capture Photo
          </h3>
          <QuickActions 
            onCameraCapture={handleCameraCapture}
          />
        </section>

        {/* Agent Chat & Orders */}
        <section className="mb-4 sm:mb-6 grid gap-3 sm:gap-4 sm:grid-cols-2">
          <AgentChatbox />
          <OrdersSection />
        </section>

        {/* Photo Archive Section */}
        <section className="mb-4 sm:mb-6">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3 sm:mb-4">
            Photo Archive
          </h3>
          <PhotoArchive refreshTrigger={refreshPhotos} />
        </section>
      </main>

      {/* Camera Dialog */}
      <CameraCapture
        open={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
      />
    </div>
  );
};

export default Index;
