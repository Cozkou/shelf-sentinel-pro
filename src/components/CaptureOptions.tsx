import { Camera, Upload } from "lucide-react";

interface CaptureOptionsProps {
  open: boolean;
  onClose: () => void;
  onTakePhoto: () => void;
  onUploadPhoto: () => void;
}

export const CaptureOptions = ({ open, onClose, onTakePhoto, onUploadPhoto }: CaptureOptionsProps) => {
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
      />
      
      {/* Buttons */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-4">
        {/* Take Photo Button */}
        <button
          onClick={() => {
            onTakePhoto();
            onClose();
          }}
          className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-xl hover:shadow-2xl hover:scale-110 transition-all flex items-center justify-center animate-slide-up-curve"
          style={{ animationDelay: '0.1s', animationFillMode: 'both' }}
        >
          <Camera className="h-7 w-7" />
        </button>

        {/* Upload Photo Button */}
        <button
          onClick={() => {
            onUploadPhoto();
            onClose();
          }}
          className="h-16 w-16 rounded-full bg-card border-2 border-border/50 hover:border-primary/50 text-foreground shadow-lg hover:shadow-xl hover:scale-110 transition-all flex items-center justify-center animate-slide-up-curve"
          style={{ animationDelay: '0.2s', animationFillMode: 'both' }}
        >
          <Upload className="h-7 w-7 text-primary" />
        </button>
      </div>
    </>
  );
};
