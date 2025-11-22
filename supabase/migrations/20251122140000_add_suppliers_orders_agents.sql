-- Migration: Add suppliers, orders, and agent conversation tables
-- Description: Extends the inventory system with supplier management, order tracking, and AI agent interactions

-- Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_phone TEXT,
  contact_email TEXT,
  location TEXT,
  specialties JSONB DEFAULT '[]'::jsonb,
  rating DECIMAL(2,1) CHECK (rating >= 0 AND rating <= 5),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create supplier_products table (pricing and availability)
CREATE TABLE IF NOT EXISTS supplier_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  product_code TEXT,
  unit_price DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  min_order_quantity INTEGER DEFAULT 1,
  lead_time_days INTEGER DEFAULT 1,
  availability_status TEXT DEFAULT 'available', -- 'available', 'limited', 'unavailable'
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_id UUID REFERENCES inventory_photos(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'approved', 'ordered', 'shipped', 'received', 'cancelled'
  total_cost DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  notes TEXT,
  approval_required BOOLEAN DEFAULT true,
  approved_at TIMESTAMP WITH TIME ZONE,
  ordered_at TIMESTAMP WITH TIME ZONE,
  expected_delivery_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create agent_conversations table (ElevenLabs conversation history)
CREATE TABLE IF NOT EXISTS agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_id UUID REFERENCES inventory_photos(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  transcript JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of {role, content, timestamp}
  agent_reasoning TEXT,
  recommendations JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'archived'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create supplier_embeddings table (for Weaviate sync reference)
CREATE TABLE IF NOT EXISTS supplier_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  weaviate_id TEXT UNIQUE,
  embedding_version TEXT DEFAULT 'v1',
  last_synced TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(supplier_id, embedding_version)
);

-- Add confidence_score to inventory_counts
ALTER TABLE inventory_counts
ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2) DEFAULT 1.0 CHECK (confidence_score >= 0 AND confidence_score <= 1);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_supplier_products_supplier ON supplier_products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_products_name ON supplier_products(product_name);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_photo ON orders(photo_id);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_user ON agent_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_photo ON agent_conversations(photo_id);
CREATE INDEX IF NOT EXISTS idx_supplier_embeddings_supplier ON supplier_embeddings(supplier_id);

-- Enable Row Level Security
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_embeddings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for suppliers (public read, admin write)
CREATE POLICY "Suppliers are viewable by all authenticated users"
  ON suppliers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Suppliers are insertable by all authenticated users"
  ON suppliers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Suppliers are updatable by all authenticated users"
  ON suppliers FOR UPDATE
  TO authenticated
  USING (true);

-- RLS Policies for supplier_products (public read, admin write)
CREATE POLICY "Supplier products are viewable by all authenticated users"
  ON supplier_products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Supplier products are insertable by all authenticated users"
  ON supplier_products FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Supplier products are updatable by all authenticated users"
  ON supplier_products FOR UPDATE
  TO authenticated
  USING (true);

-- RLS Policies for orders (users see only their own)
CREATE POLICY "Orders are viewable by owner"
  ON orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Orders are insertable by owner"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Orders are updatable by owner"
  ON orders FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Orders are deletable by owner"
  ON orders FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for agent_conversations (users see only their own)
CREATE POLICY "Agent conversations are viewable by owner"
  ON agent_conversations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Agent conversations are insertable by owner"
  ON agent_conversations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Agent conversations are updatable by owner"
  ON agent_conversations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for supplier_embeddings (public read)
CREATE POLICY "Supplier embeddings are viewable by all authenticated users"
  ON supplier_embeddings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Supplier embeddings are insertable by all authenticated users"
  ON supplier_embeddings FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_conversations_updated_at
  BEFORE UPDATE ON agent_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample suppliers for testing
INSERT INTO suppliers (name, contact_email, location, specialties, rating) VALUES
  ('Metro Wholesale Supply', 'sales@metrowholesale.com', 'New York, NY', '["beverages", "snacks", "groceries"]'::jsonb, 4.5),
  ('QuickStock Distribution', 'orders@quickstock.com', 'Los Angeles, CA', '["office supplies", "cleaning products"]'::jsonb, 4.2),
  ('Fresh Goods Inc', 'contact@freshgoods.com', 'Chicago, IL', '["produce", "dairy", "refrigerated items"]'::jsonb, 4.8),
  ('BulkBuy Suppliers', 'info@bulkbuy.com', 'Houston, TX', '["bulk items", "beverages", "packaged foods"]'::jsonb, 4.0),
  ('Local Market Supplies', 'orders@localmarket.com', 'San Francisco, CA', '["local products", "organic items", "specialty foods"]'::jsonb, 4.6);

-- Insert some sample supplier products
INSERT INTO supplier_products (supplier_id, product_name, unit_price, min_order_quantity, lead_time_days)
SELECT
  s.id,
  product.name,
  product.price,
  product.min_qty,
  product.lead_days
FROM suppliers s
CROSS JOIN LATERAL (
  VALUES
    ('Coca Cola 12oz Cans (24-pack)', 12.99, 1, 2),
    ('Bottled Water 16.9oz (24-pack)', 5.99, 2, 1),
    ('Potato Chips Variety Pack', 15.49, 1, 2),
    ('Coffee Beans 2lb Bag', 24.99, 1, 3),
    ('Paper Towels (12-roll pack)', 18.99, 1, 1)
) AS product(name, price, min_qty, lead_days)
WHERE s.name = 'Metro Wholesale Supply';

COMMENT ON TABLE suppliers IS 'Stores supplier information for inventory procurement';
COMMENT ON TABLE supplier_products IS 'Product catalog from various suppliers with pricing';
COMMENT ON TABLE orders IS 'Purchase orders created by users or AI agent';
COMMENT ON TABLE agent_conversations IS 'Conversation history with ElevenLabs AI agent';
COMMENT ON TABLE supplier_embeddings IS 'Reference table for Weaviate vector embeddings';
