import { useEffect, useState } from "react";
import { Trash2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Photo {
  id: string;
  storage_path: string;
  description: string | null;
  created_at: string;
}

interface PhotoArchiveProps {
  refreshTrigger: number;
}

export const PhotoArchive = ({ refreshTrigger }: PhotoArchiveProps) => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPhotos = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_photos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPhotos(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading photos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotos();
  }, [refreshTrigger]);

  const getPhotoUrl = (path: string) => {
    const { data } = supabase.storage
      .from('inventory-photos')
      .getPublicUrl(path);
    return data.publicUrl;
  };

  const handleDelete = async (id: string, storagePath: string) => {
    try {
      const { error: storageError } = await supabase.storage
        .from('inventory-photos')
        .remove([storagePath]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('inventory_photos')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      toast({
        title: "Photo deleted",
        description: "Inventory snapshot removed",
      });

      fetchPhotos();
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="aspect-square animate-pulse bg-secondary/50" />
        ))}
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <Card className="p-8 text-center bg-card/50 backdrop-blur-sm border-dashed">
        <p className="text-sm text-muted-foreground">
          No inventory snapshots yet. Capture your first photo!
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
      {photos.map((photo) => (
        <Card key={photo.id} className="group relative overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <div className="relative aspect-square">
            <img
              src={getPhotoUrl(photo.storage_path)}
              alt={photo.description || "Inventory photo"}
              className="h-full w-full object-cover"
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            {/* Delete Button - appears on hover */}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => handleDelete(photo.id, photo.storage_path)}
              className="absolute top-2 right-2 h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-destructive hover:text-destructive-foreground opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-full"
            >
              <Trash2 className="h-4 w-4" />
            </Button>

            {/* Info Overlay - shows on hover */}
            <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
              <div className="flex items-center gap-2 text-xs text-white/90">
                <Calendar className="h-3 w-3" />
                {format(new Date(photo.created_at), 'MMM d, yyyy')}
              </div>
              {photo.description && (
                <p className="text-xs text-white/80 mt-1 line-clamp-2">{photo.description}</p>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
