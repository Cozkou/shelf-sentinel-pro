import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { analyzeImage } from "@/lib/fal-service";
import { supabase } from "@/integrations/supabase/client";

interface SimplePhotoCaptureProps {
  onPhotoSaved?: () => void;
}

export const SimplePhotoCapture = ({ onPhotoSaved }: SimplePhotoCaptureProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const parseInventoryItems = (analysisText: string): { name: string; quantity: number }[] => {
    const items: { name: string; quantity: number }[] = [];
    const lines = analysisText.split('\n');
    
    for (const line of lines) {
      const patterns = [
        /(\d+)\s*x\s*(.+)/i,
        /(.+?):\s*(\d+)/,
        /(.+?)\s*\((\d+)\)/,
        /(\d+)\s+(.+)/,
      ];
      
      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
          let name: string;
          let quantity: number;
          
          if (pattern.source.startsWith('(\\d+)')) {
            quantity = parseInt(match[1]);
            name = match[2].trim();
          } else {
            name = match[1].trim();
            quantity = parseInt(match[2]);
          }
          
          if (name && !isNaN(quantity) && quantity > 0) {
            items.push({ name, quantity });
            break;
          }
        }
      }
    }
    
    return items;
  };

  const checkForDecliningStock = async (userId: string, currentItems: { name: string; quantity: number }[]) => {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      for (const currentItem of currentItems) {
        const { data: itemData } = await supabase
          .from('inventory_items')
          .select('id')
          .eq('user_id', userId)
          .eq('item_name', currentItem.name)
          .single();

        if (!itemData) continue;

        const { data: previousCounts } = await supabase
          .from('inventory_counts')
          .select('quantity, created_at')
          .eq('item_id', itemData.id)
          .gte('created_at', sevenDaysAgo.toISOString())
          .order('created_at', { ascending: false })
          .limit(5);

        if (previousCounts && previousCounts.length >= 2) {
          const averagePrevious = previousCounts.reduce((sum, c) => sum + c.quantity, 0) / previousCounts.length;
          const decline = ((averagePrevious - currentItem.quantity) / averagePrevious) * 100;

          if (decline > 30) {
            toast({
              title: "⚠️ Stock Alert",
              description: `${currentItem.name} is running low: ${currentItem.quantity} (down ${Math.round(decline)}%)`,
              variant: "destructive",
            });
          }
        }
      }
    } catch (error) {
      console.error("Error checking stock:", error);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Analyze image with AI
      toast({
        title: "Analyzing Image",
        description: "AI is processing your inventory photo...",
      });

      const analysis = await analyzeImage(file);

      // Upload to storage
      const fileName = `${user.id}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('inventory-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Parse inventory items
      const parsedItems = parseInventoryItems(analysis);

      // Save photo record
      const { data: photoData, error: photoError } = await supabase
        .from('inventory_photos')
        .insert({
          user_id: user.id,
          storage_path: fileName,
          description: 'AI analyzed inventory snapshot',
          analysis_data: { items: parsedItems, raw: analysis },
        })
        .select()
        .single();

      if (photoError) throw photoError;

      // Save inventory items and counts
      for (const item of parsedItems) {
        const { data: itemData, error: itemError } = await supabase
          .from('inventory_items')
          .upsert(
            { user_id: user.id, item_name: item.name },
            { onConflict: 'user_id,item_name' }
          )
          .select()
          .single();

        if (itemError) throw itemError;

        const { error: countError } = await supabase
          .from('inventory_counts')
          .insert({
            item_id: itemData.id,
            photo_id: photoData.id,
            quantity: item.quantity,
          });

        if (countError) throw countError;
      }

      // Check for declining stock
      await checkForDecliningStock(user.id, parsedItems);

      toast({
        title: "✓ Photo Saved",
        description: `Successfully processed ${parsedItems.length} item${parsedItems.length !== 1 ? 's' : ''}`,
      });

      onPhotoSaved?.();
    } catch (error) {
      console.error("Processing error:", error);
      toast({
        title: "Processing Failed",
        description: error instanceof Error ? error.message : "Failed to process photo",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <Card 
        className={`group relative overflow-hidden border border-border/50 bg-gradient-to-br from-card to-accent/10 transition-all hover:shadow-lg hover:border-primary/30 ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <button 
          onClick={handleClick}
          disabled={isProcessing}
          className="w-full p-5 sm:p-6 text-left disabled:cursor-not-allowed"
        >
          <div className="mb-4 sm:mb-5">
            {isProcessing ? (
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 sm:h-14 sm:w-14">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="inline-flex h-12 w-12 items-center justify-center sm:h-14 sm:w-14">
                <div className="relative">
                  {/* Outer ring */}
                  <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-pulse" />
                  {/* Middle ring */}
                  <div className="relative h-12 w-12 sm:h-14 sm:w-14 rounded-full border-[3px] border-primary bg-primary/10 flex items-center justify-center transition-transform group-hover:scale-110">
                    {/* Inner circle */}
                    <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-gradient-to-br from-primary to-primary/70" />
                  </div>
                </div>
              </div>
            )}
          </div>
          <h3 className="mb-2 text-base font-semibold text-foreground sm:text-lg">
            {isProcessing ? "Processing..." : "Capture Photo"}
          </h3>
          <p className="mb-3 text-xs text-muted-foreground sm:text-sm sm:mb-4">
            {isProcessing ? "Analyzing inventory with AI..." : "Take inventory snapshot with AI analysis"}
          </p>
          <div className="inline-flex items-center text-sm font-medium text-primary transition-transform group-hover:translate-x-1">
            {isProcessing ? "Please wait" : "Take Photo"}
          </div>
        </button>
      </Card>
    </>
  );
};
