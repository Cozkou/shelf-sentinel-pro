import { useState, useRef, useEffect } from "react";
import { Camera, Video, X, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { analyzeVideo } from "@/lib/fal-service";

interface CameraCaptureProps {
  open: boolean;
  onClose: () => void;
}

const CameraCapture = ({ open, onClose }: CameraCaptureProps) => {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [open]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      toast({
        title: "Camera Ready",
        description: "Point at your inventory shelf and start recording",
      });
    } catch (error) {
      console.error("Camera error:", error);
      toast({
        title: "Camera Access Denied",
        description: "Please allow camera access to capture inventory",
        variant: "destructive",
      });
      onClose();
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startRecording = () => {
    if (!stream) return;

    chunksRef.current = [];

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp8,opus'
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setRecordedVideoUrl(url);
      stopCamera();
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setIsRecording(true);

    toast({
      title: "Recording Started",
      description: "Capture your inventory shelf for 5-10 seconds",
    });
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      toast({
        title: "Recording Complete",
        description: "Review your video or analyze it with AI",
      });
    }
  };

  const handleAnalyze = async () => {
    if (!recordedVideoUrl) return;

    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      // Convert blob URL to File
      const response = await fetch(recordedVideoUrl);
      const blob = await response.blob();
      const file = new File([blob], 'inventory-video.webm', { type: 'video/webm' });

      const result = await analyzeVideo(
        file,
        "Analyze this inventory shelf video. List all visible items, their approximate quantities, and note any items that appear to be running low or out of stock."
      );

      setAnalysisResult(result);

      toast({
        title: "Analysis Complete",
        description: "AI has analyzed your inventory video",
      });
    } catch (error) {
      console.error("Analysis error:", error);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Failed to analyze video",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRetake = () => {
    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl);
    }
    setRecordedVideoUrl(null);
    setAnalysisResult(null);
    startCamera();
  };

  const handleClose = () => {
    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl);
    }
    setRecordedVideoUrl(null);
    setAnalysisResult(null);
    stopCamera();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Inventory Camera
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Camera/Video Preview */}
          <Card className="relative overflow-hidden bg-black aspect-video">
            {recordedVideoUrl ? (
              <video
                src={recordedVideoUrl}
                controls
                className="w-full h-full object-contain"
              />
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain"
              />
            )}
          </Card>

          {/* Controls */}
          {!recordedVideoUrl ? (
            <div className="flex gap-2 justify-center">
              {!isRecording ? (
                <Button
                  onClick={startRecording}
                  size="lg"
                  className="gap-2"
                >
                  <Video className="h-5 w-5" />
                  Start Recording
                </Button>
              ) : (
                <Button
                  onClick={stopRecording}
                  size="lg"
                  variant="destructive"
                  className="gap-2"
                >
                  <Video className="h-5 w-5" />
                  Stop Recording
                </Button>
              )}
              <Button
                onClick={handleClose}
                size="lg"
                variant="outline"
                className="gap-2"
              >
                <X className="h-5 w-5" />
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex gap-2 justify-center flex-wrap">
              <Button
                onClick={handleAnalyze}
                size="lg"
                disabled={isAnalyzing}
                className="gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5" />
                    Analyze with AI
                  </>
                )}
              </Button>
              <Button
                onClick={handleRetake}
                size="lg"
                variant="outline"
                disabled={isAnalyzing}
                className="gap-2"
              >
                <Camera className="h-5 w-5" />
                Retake
              </Button>
              <Button
                onClick={handleClose}
                size="lg"
                variant="outline"
                disabled={isAnalyzing}
                className="gap-2"
              >
                <X className="h-5 w-5" />
                Done
              </Button>
            </div>
          )}

          {/* Analysis Results */}
          {analysisResult && (
            <Card className="p-4 bg-primary/5">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Upload className="h-4 w-4" />
                AI Analysis Results
              </h3>
              <p className="text-sm whitespace-pre-wrap">{analysisResult}</p>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CameraCapture;
