-- Allow users to delete their own inventory items
CREATE POLICY "Users can delete their own items" 
ON public.inventory_items 
FOR DELETE 
USING (auth.uid() = user_id);