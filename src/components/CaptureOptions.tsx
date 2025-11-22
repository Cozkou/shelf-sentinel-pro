import { Camera, Upload, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface CaptureOptionsProps {
  open: boolean;
  onClose: () => void;
  onTakePhoto: () => void;
  onUploadPhoto: () => void;
}

export const CaptureOptions = ({ open, onClose, onTakePhoto, onUploadPhoto }: CaptureOptionsProps) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden bg-transparent border-0 shadow-none">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col gap-3 p-6 animate-scale-in">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute -top-12 left-1/2 -translate-x-1/2 h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Take Photo Button */}
          <button
            onClick={() => {
              onTakePhoto();
              onClose();
            }}
            className="group relative overflow-hidden flex items-center gap-4 p-6 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-xl hover:shadow-2xl hover:scale-105 transition-all"
          >
            <div className="flex items-center justify-center h-14 w-14 rounded-full bg-white/20 backdrop-blur-sm">
              <Camera className="h-7 w-7" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-lg font-bold">Take Photo</h3>
              <p className="text-sm text-primary-foreground/80">Use camera to capture</p>
            </div>
            
            {/* Animated gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          </button>

          {/* Upload Photo Button */}
          <button
            onClick={() => {
              onUploadPhoto();
              onClose();
            }}
            className="group relative overflow-hidden flex items-center gap-4 p-6 rounded-2xl bg-card border-2 border-border/50 hover:border-primary/50 text-foreground shadow-lg hover:shadow-xl hover:scale-105 transition-all"
          >
            <div className="flex items-center justify-center h-14 w-14 rounded-full bg-muted">
              <Upload className="h-7 w-7 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-lg font-bold">Upload Photo</h3>
              <p className="text-sm text-muted-foreground">Choose from gallery</p>
            </div>
            
            {/* Animated gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
