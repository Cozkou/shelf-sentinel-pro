import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Phone, Trash2, Package, TrendingDown, Loader2, Globe, MapPin, Mail } from "lucide-react";
import { motion } from "framer-motion";

interface BestDeal {
  supplier_name: string;
  website: string;
  contact_phone?: string;
  contact_email?: string;
  location: string;
  product_name: string;
  price: number;
  currency: string;
  unit: string;
  availability: string;
  reasoning: string;
}

interface ProductDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  quantity: number;
  onDelete: () => void;
  onSearchSupplier: () => void;
  bestDeal: BestDeal | null;
  searchLoading: boolean;
  maxStock: number;
  reorderLevel: number;
}

export const ProductDetailModal = ({
  open,
  onOpenChange,
  itemName,
  quantity,
  onDelete,
  onSearchSupplier,
  bestDeal,
  searchLoading,
  maxStock,
  reorderLevel,
}: ProductDetailModalProps) => {
  const isLowStock = quantity <= reorderLevel;
  const isMaxStock = quantity >= maxStock;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {itemName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Stock Status */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Stock</p>
                <p className="text-3xl font-bold">{quantity} units</p>
              </div>
              <div className="text-right">
                {isLowStock && (
                  <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                    <TrendingDown className="h-5 w-5" />
                    <span className="font-semibold">Low Stock</span>
                  </div>
                )}
                {isMaxStock && (
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">At Max</span>
                )}
                {!isLowStock && !isMaxStock && (
                  <span className="text-green-600 dark:text-green-400 font-semibold">Good Stock</span>
                )}
              </div>
            </div>
          </Card>

          {/* Best Supplier - Show if available */}
          {bestDeal && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="p-4 bg-primary/5 border-primary/20">
                <h3 className="text-lg font-semibold mb-3 text-primary flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Best Supplier Found
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-bold text-lg">{bestDeal.supplier_name}</p>
                      <p className="text-sm text-muted-foreground">{bestDeal.product_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">
                        £{bestDeal.price.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">{bestDeal.unit}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {bestDeal.contact_phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-green-500" />
                        <a 
                          href={`tel:${bestDeal.contact_phone}`}
                          className="font-medium hover:text-primary hover:underline"
                        >
                          {bestDeal.contact_phone}
                        </a>
                      </div>
                    )}
                    {bestDeal.contact_email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-blue-500" />
                        <a 
                          href={`mailto:${bestDeal.contact_email}`}
                          className="hover:text-primary hover:underline"
                        >
                          {bestDeal.contact_email}
                        </a>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <Globe className="h-4 w-4" />
                      <a 
                        href={bestDeal.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary hover:underline"
                      >
                        {bestDeal.website}
                      </a>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{bestDeal.location}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      <strong>Why this supplier?</strong> {bestDeal.reasoning}
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            {isLowStock && (
              <Button
                onClick={onSearchSupplier}
                disabled={searchLoading}
                className="flex-1"
              >
                {searchLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Phone className="h-4 w-4 mr-2" />
                    {bestDeal ? 'Search Again' : 'Find Supplier'}
                  </>
                )}
              </Button>
            )}
            <Button
              variant="destructive"
              onClick={() => {
                onDelete();
                onOpenChange(false);
              }}
              className="flex-1"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Item
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
