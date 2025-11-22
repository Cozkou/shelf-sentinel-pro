import { useState, useEffect } from "react";
import { Camera, Mic, TrendingUp, ArrowRight, LogOut, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AuthForm } from "@/components/AuthForm";
import { PhotoUpload } from "@/components/PhotoUpload";
import { PhotoArchive } from "@/components/PhotoArchive";

const Index = () => {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [refreshPhotos, setRefreshPhotos] = useState(0);

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

  const handleCameraCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      toast({
        title: "Camera Ready",
        description: "Snap a photo of your inventory shelf",
      });
      
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      toast({
        title: "Camera Access Denied",
        description: "Please allow camera access to capture inventory photos",
        variant: "destructive",
      });
    }
  };

  const handleVoiceInput = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsRecording(!isRecording);
      
      toast({
        title: isRecording ? "Recording Stopped" : "Recording Started",
        description: isRecording ? "Processing your voice note..." : "Speak your inventory update",
      });
      
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      toast({
        title: "Microphone Access Denied",
        description: "Please allow microphone access for voice check-ins",
        variant: "destructive",
      });
    }
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
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-12">
        {/* Hero Section */}
        <section className="mb-8 space-y-3 sm:mb-16 sm:space-y-4">
          <h2 className="text-2xl font-light tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Predictive inventory management
          </h2>
          <p className="max-w-2xl text-base font-light text-muted-foreground sm:text-lg">
            Voice-driven tracking that predicts shortages before they impact your business.
          </p>
        </section>

        {/* Action Cards */}
        <section className="mb-8 grid gap-3 sm:mb-16 sm:grid-cols-2 sm:gap-4">
          <Card className="group relative overflow-hidden border border-border bg-card transition-all hover:shadow-md">
            <button 
              onClick={handleCameraCapture}
              className="w-full p-5 text-left sm:p-8"
            >
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-secondary sm:mb-6 sm:h-12 sm:w-12">
                <Camera className="h-4 w-4 text-foreground sm:h-5 sm:w-5" />
              </div>
              <h3 className="mb-2 text-lg font-medium text-foreground sm:text-xl">
                Photo Check-In
              </h3>
              <p className="mb-3 text-xs text-muted-foreground sm:mb-4 sm:text-sm">
                Daily shelf snapshots for automated tracking
              </p>
              <div className="inline-flex items-center text-xs font-medium text-foreground transition-transform group-hover:translate-x-1 sm:text-sm">
                Start Capture
                <ArrowRight className="ml-1.5 h-3 w-3 sm:ml-2 sm:h-4 sm:w-4" />
              </div>
            </button>
          </Card>

          <Card className="group relative overflow-hidden border border-border bg-card transition-all hover:shadow-md">
            <button 
              onClick={handleVoiceInput}
              className="w-full p-5 text-left sm:p-8"
            >
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-secondary sm:mb-6 sm:h-12 sm:w-12">
                <Mic className="h-4 w-4 text-foreground sm:h-5 sm:w-5" />
              </div>
              <h3 className="mb-2 text-lg font-medium text-foreground sm:text-xl">
                Voice Update
              </h3>
              <p className="mb-3 text-xs text-muted-foreground sm:mb-4 sm:text-sm">
                Quick verbal inventory notes and adjustments
              </p>
              <div className="inline-flex items-center text-xs font-medium text-foreground transition-transform group-hover:translate-x-1 sm:text-sm">
                {isRecording ? "Stop Recording" : "Start Recording"}
                <ArrowRight className="ml-1.5 h-3 w-3 sm:ml-2 sm:h-4 sm:w-4" />
              </div>
            </button>
          </Card>
        </section>

        {/* Features Section */}
        <section className="mb-8 sm:mb-16">
          <div className="mb-4 flex items-center gap-2 sm:mb-8 sm:gap-3">
            <TrendingUp className="h-4 w-4 text-muted-foreground sm:h-5 sm:w-5" />
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground sm:text-sm">
              Intelligence Layer
            </h3>
          </div>

          <div className="grid gap-6 sm:grid-cols-3 sm:gap-8">
            <div className="space-y-1.5 sm:space-y-2">
              <div className="text-xl font-light text-foreground sm:text-2xl">01</div>
              <h4 className="text-sm font-medium text-foreground sm:text-base">Pattern Recognition</h4>
              <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                Agent analyzes daily check-ins to build accurate usage curves
              </p>
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <div className="text-xl font-light text-foreground sm:text-2xl">02</div>
              <h4 className="text-sm font-medium text-foreground sm:text-base">Shortage Prediction</h4>
              <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                Forecasts stockouts with day-level precision based on trends
              </p>
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <div className="text-xl font-light text-foreground sm:text-2xl">03</div>
              <h4 className="text-sm font-medium text-foreground sm:text-base">Automated Ordering</h4>
              <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                Drafts orders, contacts suppliers, sends SMS approval requests
              </p>
            </div>
          </div>
        </section>

        {/* Photo Upload Section */}
        <section className="mb-8 sm:mb-16">
          <div className="mb-4 flex items-center gap-2 sm:mb-8 sm:gap-3">
            <Camera className="h-4 w-4 text-muted-foreground sm:h-5 sm:w-5" />
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground sm:text-sm">
              Upload Snapshot
            </h3>
          </div>
          <PhotoUpload onUploadComplete={() => setRefreshPhotos(prev => prev + 1)} />
        </section>

        {/* Photo Archive Section */}
        <section className="mb-8 sm:mb-16">
          <div className="mb-4 flex items-center gap-2 sm:mb-8 sm:gap-3">
            <Archive className="h-4 w-4 text-muted-foreground sm:h-5 sm:w-5" />
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground sm:text-sm">
              Photo Archive
            </h3>
          </div>
          <PhotoArchive refreshTrigger={refreshPhotos} />
        </section>

        {/* Install CTA */}
        <Card className="border border-border bg-secondary/30 p-4 text-center sm:p-8">
          <p className="text-xs text-muted-foreground sm:text-sm">
            <span className="font-medium text-foreground">Mobile optimized.</span> Install to home screen for instant access.
          </p>
        </Card>
      </main>
    </div>
  );
};

export default Index;
