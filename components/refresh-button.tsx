"use client";

import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useState } from "react";

interface RefreshButtonProps {
  onRefresh: () => Promise<void>;
  className?: string;
}

export function RefreshButton({ onRefresh, className }: RefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const handleClick = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };
  
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={isRefreshing}
      className={className}
    >
      <RefreshCw 
        className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} 
      />
      <span className="ml-2">Refresh</span>
    </Button>
  );
}