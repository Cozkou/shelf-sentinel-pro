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
        <div className="mx-auto max-w-5xl px-6 py-5">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Inventory Sentinel
            </h1>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-5xl px-6 py-12">
        {/* Hero Section */}
        <section className="mb-16 space-y-4">
          <h2 className="text-4xl font-light tracking-tight text-foreground sm:text-5xl">
            Predictive inventory management
          </h2>
          <p className="max-w-2xl text-lg font-light text-muted-foreground">
            Voice-driven tracking that predicts shortages before they impact your business.
          </p>
        </section>

        {/* Action Cards */}
        <section className="mb-16 grid gap-4 sm:grid-cols-2">
          <Card className="group relative overflow-hidden border border-border bg-card transition-all hover:shadow-md">
            <button 
              onClick={handleCameraCapture}
              className="w-full p-8 text-left"
            >
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-secondary">
                <Camera className="h-5 w-5 text-foreground" />
              </div>
              <h3 className="mb-2 text-xl font-medium text-foreground">
                Photo Check-In
              </h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Daily shelf snapshots for automated tracking
              </p>
              <div className="inline-flex items-center text-sm font-medium text-foreground transition-transform group-hover:translate-x-1">
                Start Capture
                <ArrowRight className="ml-2 h-4 w-4" />
              </div>
            </button>
          </Card>

          <Card className="group relative overflow-hidden border border-border bg-card transition-all hover:shadow-md">
            <button 
              onClick={handleVoiceInput}
              className="w-full p-8 text-left"
            >
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-secondary">
                <Mic className="h-5 w-5 text-foreground" />
              </div>
              <h3 className="mb-2 text-xl font-medium text-foreground">
                Voice Update
              </h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Quick verbal inventory notes and adjustments
              </p>
              <div className="inline-flex items-center text-sm font-medium text-foreground transition-transform group-hover:translate-x-1">
                {isRecording ? "Stop Recording" : "Start Recording"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </div>
            </button>
          </Card>
        </section>

        {/* Features Section */}
        <section className="mb-16">
          <div className="mb-8 flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Intelligence Layer
            </h3>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            <div className="space-y-2">
              <div className="text-2xl font-light text-foreground">01</div>
              <h4 className="font-medium text-foreground">Pattern Recognition</h4>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Agent analyzes daily check-ins to build accurate usage curves
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-2xl font-light text-foreground">02</div>
              <h4 className="font-medium text-foreground">Shortage Prediction</h4>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Forecasts stockouts with day-level precision based on trends
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-2xl font-light text-foreground">03</div>
              <h4 className="font-medium text-foreground">Automated Ordering</h4>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Drafts orders, contacts suppliers, sends SMS approval requests
              </p>
            </div>
          </div>
        </section>

        {/* Photo Upload Section */}
        <section className="mb-16">
          <div className="mb-8 flex items-center gap-3">
            <Camera className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Upload Snapshot
            </h3>
          </div>
          <PhotoUpload onUploadComplete={() => setRefreshPhotos(prev => prev + 1)} />
        </section>

        {/* Photo Archive Section */}
        <section className="mb-16">
          <div className="mb-8 flex items-center gap-3">
            <Archive className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Photo Archive
            </h3>
          </div>
          <PhotoArchive refreshTrigger={refreshPhotos} />
        </section>

        {/* Install CTA */}
        <Card className="border border-border bg-secondary/30 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Mobile optimized.</span> Install to home screen for instant access.
          </p>
        </Card>
      </main>
    </div>
  );
};

export default Index;
