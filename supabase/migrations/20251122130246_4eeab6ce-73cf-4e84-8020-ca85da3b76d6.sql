-- Create table for inventory items
CREATE TABLE public.inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  item_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_name)
);

-- Enable RLS
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for inventory_items
CREATE POLICY "Users can view their own items"
ON public.inventory_items
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own items"
ON public.inventory_items
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own items"
ON public.inventory_items
FOR UPDATE
USING (auth.uid() = user_id);

-- Create table for inventory counts (tracks quantity over time)
CREATE TABLE public.inventory_counts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  photo_id UUID NOT NULL REFERENCES public.inventory_photos(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inventory_counts ENABLE ROW LEVEL SECURITY;

-- RLS policies for inventory_counts
CREATE POLICY "Users can view counts for their items"
ON public.inventory_counts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.inventory_items
    WHERE inventory_items.id = inventory_counts.item_id
    AND inventory_items.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert counts for their items"
ON public.inventory_counts
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.inventory_items
    WHERE inventory_items.id = inventory_counts.item_id
    AND inventory_items.user_id = auth.uid()
  )
);

-- Add trigger for updated_at on inventory_items
CREATE TRIGGER update_inventory_items_updated_at
BEFORE UPDATE ON public.inventory_items
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Add analysis_data column to inventory_photos to store parsed results
ALTER TABLE public.inventory_photos
ADD COLUMN analysis_data JSONB;