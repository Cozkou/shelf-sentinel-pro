import { useState } from "react";
import { Camera, Mic, Package, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);

  const handleCameraCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      toast({
        title: "Camera Ready",
        description: "Snap a photo of your inventory shelf",
      });
      
      // Stop the stream for now (we'll implement full camera later)
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
      
      // Stop the stream for now (we'll implement full recording later)
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      toast({
        title: "Microphone Access Denied",
        description: "Please allow microphone access for voice check-ins",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2 py-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Package className="h-10 w-10 text-primary" />
            <h1 className="text-4xl font-bold text-foreground">Inventory Sentinel</h1>
          </div>
          <p className="text-lg text-muted-foreground">
            AI-powered inventory tracking that predicts shortages before they happen
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Camera className="h-8 w-8 text-primary" />
              <div>
                <h3 className="text-xl font-semibold text-foreground">Photo Check-In</h3>
                <p className="text-sm text-muted-foreground">Snap your inventory shelf daily</p>
              </div>
            </div>
            <Button 
              onClick={handleCameraCapture}
              className="w-full"
              size="lg"
            >
              Open Camera
            </Button>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Mic className="h-8 w-8 text-primary" />
              <div>
                <h3 className="text-xl font-semibold text-foreground">Voice Update</h3>
                <p className="text-sm text-muted-foreground">Quick voice inventory notes</p>
              </div>
            </div>
            <Button 
              onClick={handleVoiceInput}
              className="w-full"
              size="lg"
              variant={isRecording ? "destructive" : "default"}
            >
              {isRecording ? "Stop Recording" : "Start Recording"}
            </Button>
          </Card>
        </div>

        {/* Features Overview */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="h-6 w-6 text-primary" />
            <h3 className="text-xl font-semibold text-foreground">Smart Predictions</h3>
          </div>
          <div className="space-y-3 text-muted-foreground">
            <p>• Agent builds inventory curves from your daily check-ins</p>
            <p>• Predicts when items will run out based on usage patterns</p>
            <p>• Automatically drafts orders and contacts suppliers</p>
            <p>• Sends SMS approvals for one-tap ordering</p>
          </div>
        </Card>

        {/* Install Prompt */}
        <Card className="p-6 bg-primary/5 border-primary/20">
          <p className="text-center text-sm text-muted-foreground">
            💡 <strong>Pro tip:</strong> Install this app to your home screen for quick access!<br/>
            Tap your browser menu → "Add to Home Screen"
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Index;
