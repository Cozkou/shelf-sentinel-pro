-- Create storage bucket for inventory photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('inventory-photos', 'inventory-photos', true);

-- Create photos table to track metadata
CREATE TABLE public.inventory_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  storage_path TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inventory_photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for photos table
CREATE POLICY "Users can view their own photos"
  ON public.inventory_photos
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upload their own photos"
  ON public.inventory_photos
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own photos"
  ON public.inventory_photos
  FOR DELETE
  USING (auth.uid() = user_id);

-- Storage policies for inventory-photos bucket
CREATE POLICY "Users can view their own photos in storage"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'inventory-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own photos to storage"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'inventory-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own photos from storage"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'inventory-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_inventory_photos_updated_at
  BEFORE UPDATE ON public.inventory_photos
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();