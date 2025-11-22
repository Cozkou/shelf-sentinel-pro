import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, CheckCircle, Phone, Globe, MapPin } from "lucide-react";
import { motion } from "framer-motion";

interface LogEntry {
  step: string;
  output: any;
  timestamp: string;
}

interface BestDeal {
  supplier_name: string;
  website: string;
  contact_phone?: string;
  location: string;
  product_name: string;
  price: number;
  currency: string;
  unit: string;
  availability: string;
  reasoning: string;
}

interface SupplierSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  logs: LogEntry[];
  bestDeal: BestDeal | null;
  loading: boolean;
  productName: string;
}

export const SupplierSearchModal = ({
  open,
  onOpenChange,
  logs,
  bestDeal,
  loading,
  productName
}: SupplierSearchModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Searching Suppliers for {productName}...
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                Supplier Search Complete
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4 py-4">
            {logs.map((log, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="border border-border rounded-lg p-4 bg-card"
              >
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <h4 className="font-semibold text-sm">{log.step}</h4>
                </div>
                
                <div className="text-xs text-muted-foreground mb-2">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </div>

                {log.step.includes('Step 3') && bestDeal ? (
                  <div className="mt-3 p-3 bg-primary/5 rounded-md border border-primary/20">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h5 className="font-bold text-base mb-1">{bestDeal.supplier_name}</h5>
                        <p className="text-sm font-semibold text-primary mb-2">
                          {bestDeal.product_name}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">
                          £{bestDeal.price.toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground">{bestDeal.unit}</div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-3">
                      {bestDeal.contact_phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-3.5 w-3.5 text-green-500" />
                          <span className="font-medium">{bestDeal.contact_phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Globe className="h-3.5 w-3.5" />
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
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{bestDeal.location}</span>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground bg-background/50 p-2 rounded border border-border">
                      <strong className="text-foreground">Reasoning:</strong> {bestDeal.reasoning}
                    </div>
                  </div>
                ) : (
                  <pre className="text-xs bg-muted/30 p-3 rounded-md overflow-x-auto max-h-60 overflow-y-auto">
                    {JSON.stringify(log.output, null, 2)}
                  </pre>
                )}
              </motion.div>
            ))}

            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center py-8"
              >
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </motion.div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};