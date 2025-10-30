"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Package, 
  TrendingUp, 
  TrendingDown, 
  Clock,
  CheckCircle,
  XCircle
} from "lucide-react";

interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  fromBranch: string;
  toBranch: string;
  quantity: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  timestamp: Date;
  type: 'incoming' | 'outgoing' | 'transfer';
}

export function RealTimeInventoryDashboard() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Simulate real-time stock movements
  useEffect(() => {
    // In a real implementation, this would connect to your SSE or WebSocket
    // For now, we'll simulate periodic updates
    
    const generateDemoMovement = (): StockMovement => {
      const statuses: StockMovement['status'][] = ['pending', 'approved', 'rejected', 'completed'];
      const types: StockMovement['type'][] = ['incoming', 'outgoing', 'transfer'];
      const branches = ['Main Branch', 'Sub Branch A', 'Sub Branch B', 'Sub Branch C'];
      const products = ['Laptop Pro', 'Smartphone X', 'Tablet Mini', 'Headphones Elite', 'Smart Watch S'];
      
      return {
        id: `move_${Date.now()}_${Math.random()}`,
        productId: `prod_${Math.random().toString(36).substr(2, 9)}`,
        productName: products[Math.floor(Math.random() * products.length)],
        fromBranch: branches[Math.floor(Math.random() * branches.length)],
        toBranch: branches[Math.floor(Math.random() * branches.length)],
        quantity: Math.floor(Math.random() * 100) + 1,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        timestamp: new Date(),
        type: types[Math.floor(Math.random() * types.length)]
      };
    };

    // Initial data
    const initialMovements = Array.from({ length: 5 }, () => generateDemoMovement());
    setMovements(initialMovements);
    setIsLoading(false);

    // Periodic updates
    const interval = setInterval(() => {
      // Add new movement occasionally
      if (Math.random() > 0.3) { // 70% chance of new movement
        setMovements(prev => {
          const newMovement = generateDemoMovement();
          // Keep only the last 10 movements
          return [newMovement, ...prev].slice(0, 10);
        });
      }
    }, 8000); // New movement every 8 seconds

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: StockMovement['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: StockMovement['type']) => {
    switch (type) {
      case 'incoming': return <TrendingDown className="h-4 w-4 text-green-500" />;
      case 'outgoing': return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'transfer': return <Package className="h-4 w-4 text-blue-500" />;
      default: return <Package className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTypeColor = (type: StockMovement['type']) => {
    switch (type) {
      case 'incoming': return 'text-green-600';
      case 'outgoing': return 'text-red-600';
      case 'transfer': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Real-Time Inventory Movements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <p className="text-muted-foreground">Loading movements...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Real-Time Inventory Movements
        </CardTitle>
      </CardHeader>
      <CardContent>
        {movements.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-muted-foreground">No recent movements</p>
          </div>
        ) : (
          <div className="space-y-4">
            {movements.map((movement) => (
              <div 
                key={movement.id} 
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${getTypeColor(movement.type)}`}>
                    {getTypeIcon(movement.type)}
                  </div>
                  <div>
                    <div className="font-medium">{movement.productName}</div>
                    <div className="text-sm text-muted-foreground">
                      {movement.fromBranch} → {movement.toBranch}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-medium">{movement.quantity} units</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(movement.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                  <Badge className={getStatusColor(movement.status)}>
                    {movement.status.charAt(0).toUpperCase() + movement.status.slice(1)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}