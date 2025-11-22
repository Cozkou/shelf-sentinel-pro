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
      {/* Invisible backdrop for clicks */}
      <div 
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      
      {/* Buttons */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-6">
        {/* Take Photo Button */}
        <div className="flex items-center gap-3 animate-pop-up-delay">
          <button
            onClick={() => {
              onTakePhoto();
              onClose();
            }}
            className="h-14 w-14 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-xl hover:shadow-2xl hover:scale-110 transition-all flex items-center justify-center"
          >
            <Camera className="h-6 w-6" />
          </button>
          <span className="text-sm font-medium text-foreground whitespace-nowrap">Take Photo</span>
        </div>

        {/* Upload Photo Button */}
        <div className="flex items-center gap-3 animate-pop-up">
          <button
            onClick={() => {
              onUploadPhoto();
              onClose();
            }}
            className="h-14 w-14 rounded-full bg-card border-2 border-border/50 hover:border-primary/50 text-foreground shadow-lg hover:shadow-xl hover:scale-110 transition-all flex items-center justify-center"
          >
            <Upload className="h-6 w-6 text-primary" />
          </button>
          <span className="text-sm font-medium text-foreground whitespace-nowrap">Upload Photo</span>
        </div>
      </div>
    </>
  );
};
