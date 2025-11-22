import { useState, useRef } from "react";
import { Camera, Upload, X, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { analyzeImage } from "@/lib/fal-service";

interface PhotoUploadProps {
  onUploadComplete: () => void;
}

export const PhotoUpload = ({ onUploadComplete }: PhotoUploadProps) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('inventory-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('inventory_photos')
        .insert({
          user_id: user.id,
          storage_path: fileName,
          description: description || null,
        });

      if (dbError) throw dbError;

      toast({
        title: "Photo uploaded",
        description: "Inventory snapshot saved successfully",
      });

      setFile(null);
      setPreview(null);
      setDescription("");
      onUploadComplete();
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;

    setAnalyzing(true);
    setAnalysisResult(null);

    try {
      const result = await analyzeImage(file);
      setAnalysisResult(result);

      toast({
        title: "Analysis Complete",
        description: "AI has analyzed your inventory image",
      });
    } catch (error) {
      console.error("Analysis error:", error);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Failed to analyze",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const clearPreview = () => {
    setFile(null);
    setPreview(null);
    setDescription("");
    setAnalysisResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Card className="p-6">
      {!preview ? (
        <div className="space-y-4">
          <Label htmlFor="photo-upload" className="cursor-pointer">
            <div className="flex items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border p-12 transition-colors hover:border-primary hover:bg-secondary/50">
              <Camera className="h-6 w-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Click to select photo
              </span>
            </div>
          </Label>
          <Input
            id="photo-upload"
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative">
            <img
              src={preview}
              alt="Preview"
              className="w-full rounded-lg"
            />
            <Button
              size="icon"
              variant="destructive"
              className="absolute right-2 top-2"
              onClick={clearPreview}
              disabled={uploading || analyzing}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {analysisResult && (
            <Card className="p-4 bg-primary/5">
              <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4" />
                AI Analysis Results
              </h4>
              <p className="text-sm whitespace-pre-wrap">{analysisResult}</p>
            </Card>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Morning inventory check"
              disabled={uploading || analyzing}
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleAnalyze}
              disabled={analyzing || uploading}
              variant="outline"
              className="flex-1"
            >
              {analyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Analyze with AI
                </>
              )}
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploading || analyzing}
              className="flex-1"
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? "Uploading..." : "Upload Photo"}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};
