"use client";

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StockMovementIndicatorProps {
  productId: string;
  branchId: string;
  initialValue: number;
  currentValue: number;
}

export function StockMovementIndicator({ 
  productId, 
  branchId, 
  initialValue, 
  currentValue 
}: StockMovementIndicatorProps) {
  const [movement, setMovement] = useState<number>(0);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  
  useEffect(() => {
    // Calculate movement when current value changes
    const diff = currentValue - initialValue;
    if (diff !== 0) {
      setMovement(diff);
      setIsAnimating(true);
      
      // Reset animation after delay
      const timer = setTimeout(() => {
        setIsAnimating(false);
        setMovement(0);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [currentValue, initialValue]);
  
  if (movement === 0) return null;
  
  return (
    <div className={`inline-flex items-center ml-2 text-xs font-medium transition-all duration-500 ${
      isAnimating 
        ? movement > 0 
          ? 'text-green-600 animate-pulse' 
          : 'text-red-600 animate-pulse'
        : movement > 0 
          ? 'text-green-500' 
          : 'text-red-500'
    }`}>
      {movement > 0 ? (
        <TrendingUp className="w-3 h-3 mr-1" />
      ) : (
        <TrendingDown className="w-3 h-3 mr-1" />
      )}
      {Math.abs(movement)}
    </div>
  );
}