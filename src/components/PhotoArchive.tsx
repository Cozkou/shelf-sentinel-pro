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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="h-64 animate-pulse bg-secondary" />
        ))}
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="text-muted-foreground">
          No inventory snapshots yet. Upload your first photo above.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {photos.map((photo) => (
        <Card key={photo.id} className="overflow-hidden">
          <div className="relative aspect-video">
            <img
              src={getPhotoUrl(photo.storage_path)}
              alt={photo.description || "Inventory photo"}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="p-4 space-y-3">
            {photo.description && (
              <p className="text-sm text-foreground">{photo.description}</p>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {format(new Date(photo.created_at), 'MMM d, yyyy')}
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleDelete(photo.id, photo.storage_path)}
              >
                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
