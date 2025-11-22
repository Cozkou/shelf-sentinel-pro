import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Order {
  id: string;
  items: Array<{
    name: string;
    quantity: number;
    unit_price: number;
  }>;
  status: string;
  total_cost: number;
  currency: string;
  notes: string;
  approval_required: boolean;
  expected_delivery_date?: string;
  created_at: string;
  suppliers?: {
    name: string;
  };
}

export const OrdersSection = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingOrder, setProcessingOrder] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchOrders();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('orders_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          items,
          status,
          total_cost,
          currency,
          notes,
          approval_required,
          expected_delivery_date,
          created_at,
          suppliers (
            name
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: "Failed to load orders",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (orderId: string) => {
    try {
      setProcessingOrder(orderId);

      const { error } = await supabase
        .from('orders')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: "Order Approved",
        description: "The order has been approved and is ready to be placed.",
      });

      fetchOrders();
    } catch (error) {
      console.error('Error approving order:', error);
      toast({
        title: "Approval Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setProcessingOrder(null);
    }
  };

  const handleReject = async (orderId: string) => {
    try {
      setProcessingOrder(orderId);

      const { error } = await supabase
        .from('orders')
        .update({
          status: 'cancelled'
        })
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: "Order Rejected",
        description: "The order has been cancelled.",
      });

      fetchOrders();
    } catch (error) {
      console.error('Error rejecting order:', error);
      toast({
        title: "Rejection Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setProcessingOrder(null);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'draft':
        return 'secondary';
      case 'approved':
        return 'default';
      case 'ordered':
        return 'default';
      case 'shipped':
        return 'outline';
      case 'received':
        return 'outline';
      case 'cancelled':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <Clock className="h-3.5 w-3.5 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="h-3.5 w-3.5 text-green-500" />;
      case 'ordered':
        return <Package className="h-3.5 w-3.5 text-blue-500" />;
      case 'shipped':
        return <Package className="h-3.5 w-3.5 text-purple-500" />;
      case 'received':
        return <CheckCircle className="h-3.5 w-3.5 text-green-600" />;
      case 'cancelled':
        return <XCircle className="h-3.5 w-3.5 text-red-500" />;
      default:
        return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <Card className="p-4 sm:p-6">
        <h3 className="text-sm font-medium text-foreground mb-4">Orders</h3>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  if (orders.length === 0) {
    return (
      <Card className="p-6 sm:p-8 bg-card/50 backdrop-blur-sm border-dashed">
        <div className="text-center py-6">
          <div className="rounded-full bg-secondary/50 w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">No orders yet</p>
          <p className="text-xs text-muted-foreground">
            Orders will appear here when items need reordering
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => {
        const itemCount = order.items.length;
        const firstItem = order.items[0];
        const orderDate = format(new Date(order.created_at), 'MMM dd, yyyy');
        const eta = order.expected_delivery_date
          ? format(new Date(order.expected_delivery_date), 'MMM dd, yyyy')
          : 'Not scheduled';

        return (
          <Card key={order.id} className="overflow-hidden hover:shadow-md transition-all duration-300">
            <div className="p-4 sm:p-5">
              <div className="flex items-start gap-4">
                {/* Status Icon */}
                <div className="rounded-full bg-secondary/50 p-2.5 flex-shrink-0">
                  {getStatusIcon(order.status)}
                </div>
                
                {/* Order Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground mb-1">
                        {firstItem.name} <span className="text-muted-foreground font-normal">×{firstItem.quantity}</span>
                        {itemCount > 1 && <span className="text-xs text-muted-foreground ml-1">+{itemCount - 1} more item{itemCount > 2 ? 's' : ''}</span>}
                      </p>
                      {order.suppliers?.name && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Package className="h-3 w-3 inline" />
                          {order.suppliers.name}
                        </p>
                      )}
                    </div>
                    <Badge variant={getStatusBadgeVariant(order.status)} className="text-xs font-medium flex-shrink-0">
                      {order.status}
                    </Badge>
                  </div>

                  {/* Order Info */}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mb-3">
                    <span className="font-semibold text-foreground">${order.total_cost.toFixed(2)} {order.currency}</span>
                    <span>•</span>
                    <span>{orderDate}</span>
                    {order.status !== 'draft' && order.status !== 'cancelled' && (
                      <>
                        <span>•</span>
                        <span>ETA: {eta}</span>
                      </>
                    )}
                  </div>

                  {/* AI Recommendation for draft orders */}
                  {order.status === 'draft' && order.notes && (
                    <div className="text-xs bg-secondary/30 border border-border/50 p-3 rounded-lg mb-3">
                      <p className="font-semibold text-foreground mb-1">💡 AI Recommendation:</p>
                      <p className="text-muted-foreground leading-relaxed">{order.notes}</p>
                    </div>
                  )}

                  {/* Action buttons for draft orders */}
                  {order.status === 'draft' && order.approval_required && (
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        className="text-xs h-8 flex-1"
                        onClick={() => handleApprove(order.id)}
                        disabled={processingOrder === order.id}
                      >
                        {processingOrder === order.id ? (
                          <>
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                            Approve Order
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-8 flex-1"
                        onClick={() => handleReject(order.id)}
                        disabled={processingOrder === order.id}
                      >
                        <XCircle className="mr-1.5 h-3.5 w-3.5" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
