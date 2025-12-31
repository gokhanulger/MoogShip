import React from 'react';
import { ArrowDown, ArrowUp, DollarSign, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PriceChangeIndicatorProps {
  originalPrice: number;
  currentPrice: number;
  className?: string;
  compact?: boolean;
  showPercentage?: boolean;
  pulseAnimation?: boolean;
}

/**
 * A component that displays the change between original and current prices
 * with visual indicators showing the direction of change
 */
export function PriceChangeIndicator({
  originalPrice,
  currentPrice,
  className,
  compact = false,
  showPercentage = true,
  pulseAnimation = true
}: PriceChangeIndicatorProps) {
  const hasChanged = originalPrice !== currentPrice;
  
  if (!hasChanged) return null;
  
  const isIncrease = currentPrice > originalPrice;
  const changeAmount = Math.abs(currentPrice - originalPrice);
  let changePercentage = Math.round((changeAmount / originalPrice) * 100);
  
  // Handle edge cases
  if (!isFinite(changePercentage)) changePercentage = 0;
  
  // Background and border colors based on price direction
  const bgColor = isIncrease ? 'bg-red-50' : 'bg-green-50';
  const borderColor = isIncrease ? 'border-red-200' : 'border-green-200';
  const textColor = isIncrease ? 'text-red-700' : 'text-green-700';
  const secTextColor = isIncrease ? 'text-red-600' : 'text-green-600';
  
  // Calculate animations
  const animationClass = pulseAnimation && hasChanged 
    ? 'animate-pulse' 
    : '';
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return `$${(amount / 100).toFixed(2)}`;
  };
  
  if (compact) {
    return (
      <div 
        className={cn(
          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
          bgColor, borderColor, 'border', textColor, animationClass, className
        )}
      >
        {isIncrease ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        )}
        <span>{showPercentage ? `${changePercentage}%` : formatCurrency(changeAmount)}</span>
      </div>
    );
  }
  
  return (
    <div 
      className={cn(
        'rounded border p-3 space-y-1', 
        bgColor, 
        borderColor,
        animationClass,
        className
      )}
    >
      <div className="flex items-center justify-between">
        <h4 className={cn('text-sm font-semibold flex items-center gap-1', textColor)}>
          <AlertCircle className="h-4 w-4" />
          Price Multiplier Applied
          {showPercentage && (
            <span className="ml-1 rounded-full bg-white px-1.5 py-0.5 text-xs">
              {changePercentage}%
            </span>
          )}
        </h4>
        
        <div className={cn('flex items-center text-sm font-medium', secTextColor)}>
          {isIncrease ? (
            <ArrowUp className="h-4 w-4 mr-1" />
          ) : (
            <ArrowDown className="h-4 w-4 mr-1" />
          )}
          {formatCurrency(changeAmount)}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-gray-500">Base Rate:</span>
          <span className="ml-1 font-medium">
            {formatCurrency(originalPrice)}
          </span>
        </div>
        
        <div>
          <span className="text-gray-500">After Multiplier:</span>
          <span className={cn('ml-1 font-medium', textColor)}>
            {formatCurrency(currentPrice)}
          </span>
        </div>
      </div>
    </div>
  );
}