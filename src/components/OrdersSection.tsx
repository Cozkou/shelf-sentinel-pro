import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Clock } from "lucide-react";

const orders = [
  {
    id: "ORD-1234",
    item: "Cement bags (20)",
    status: "pending",
    eta: "Awaiting approval",
  },
  {
    id: "ORD-1233",
    item: "Wire rolls (5)",
    status: "incoming",
    eta: "Tomorrow, 2 PM",
  },
];

export const OrdersSection = () => {
  return (
    <Card className="p-4 sm:p-6">
      <h3 className="text-sm font-medium text-foreground mb-4">Orders</h3>
      <div className="space-y-3">
        {orders.map((order) => (
          <div key={order.id} className="flex items-start gap-3 p-2 sm:p-3 rounded-lg bg-secondary/30">
            <div className="rounded-lg bg-card p-1.5 flex-shrink-0">
              {order.status === "pending" ? (
                <Clock className="h-3.5 w-3.5 text-primary" />
              ) : (
                <Package className="h-3.5 w-3.5 text-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-xs sm:text-sm font-medium text-foreground">{order.item}</p>
                <Badge variant={order.status === "pending" ? "secondary" : "outline"} className="text-xs flex-shrink-0">
                  {order.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-2">{order.id} • {order.eta}</p>
              {order.status === "pending" && (
                <div className="flex gap-2">
                  <Button size="sm" className="text-xs h-7">
                    Approve
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs h-7">
                    Reject
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
