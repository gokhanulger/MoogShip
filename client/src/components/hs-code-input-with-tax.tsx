import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Info, AlertCircle, Loader2 } from 'lucide-react';
import { HSCodeSearchDialog } from './hs-code-search-dialog';
import { useTaxRate } from '@/hooks/use-tax-rate';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface HSCodeInputWithTaxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  productName?: string;
  showRapidAPIToggle?: boolean;
  destinationCountry?: string;
  showTaxRate?: boolean;
}

export function HSCodeInputWithTax({ 
  value, 
  onChange, 
  placeholder,
  className = "",
  disabled = false,
  productName,
  showRapidAPIToggle,
  destinationCountry = 'US',
  showTaxRate = true
}: HSCodeInputWithTaxProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Fetch tax rate if enabled
  const { data: taxData, isLoading: isLoadingTax } = useTaxRate(value, {
    country: destinationCountry,
    enabled: showTaxRate
  });

  // Format HS code as user types: ####.##.## or ####.##.##.##
  const formatHSCode = (input: string): string => {
    // Remove all non-digit characters
    const digits = input.replace(/\D/g, '');
    
    // Limit to 10 digits maximum
    const limitedDigits = digits.slice(0, 10);
    
    // Apply formatting based on length
    if (limitedDigits.length <= 4) {
      return limitedDigits;
    } else if (limitedDigits.length <= 6) {
      return `${limitedDigits.slice(0, 4)}.${limitedDigits.slice(4)}`;
    } else if (limitedDigits.length <= 8) {
      return `${limitedDigits.slice(0, 4)}.${limitedDigits.slice(4, 6)}.${limitedDigits.slice(6)}`;
    } else {
      return `${limitedDigits.slice(0, 4)}.${limitedDigits.slice(4, 6)}.${limitedDigits.slice(6, 8)}.${limitedDigits.slice(8)}`;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const formattedValue = formatHSCode(inputValue);
    onChange(formattedValue);
  };

  return (
    <div className={`${className}`}>
      <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
        <div className="flex gap-1 sm:gap-2 flex-1">
          <div className="flex-1 relative">
            <Input
              value={value}
              onChange={handleInputChange}
              placeholder={placeholder || "0000.00.00"}
              disabled={disabled}
              className="w-full h-9 sm:pr-20 pr-2"
              maxLength={13} // Maximum length for ####.##.##.##
            />
            
            {/* Tax Rate Display - Hidden on mobile, shown inline on larger screens */}
            {showTaxRate && taxData && (
              <div className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 items-center gap-1">
                {isLoadingTax ? (
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <Badge 
                      variant={taxData.source === 'usitc' ? 'default' : 'secondary'}
                      className="text-xs px-1.5 py-0 h-5"
                    >
                      {taxData.displayText}
                    </Badge>
                    
                    {taxData.wasTruncated && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertCircle className="h-3 w-3 text-orange-500" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs max-w-xs">
                              {taxData.details}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          
          <HSCodeSearchDialog
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            onSelect={(hsCode) => onChange(hsCode)}
            trigger={
              <Button 
                type="button"
                variant="outline" 
                size="icon" 
                className="shrink-0 h-9 w-9"
                disabled={disabled}
                title="Search HS Code"
              >
                <Search className="h-4 w-4" />
              </Button>
            }
          />
        </div>
        
        {/* Tax Rate Display - Below input on mobile */}
        {showTaxRate && taxData && (
          <div className="flex sm:hidden items-center gap-1 justify-start pl-1">
            {isLoadingTax ? (
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            ) : (
              <>
                <Badge 
                  variant={taxData.source === 'usitc' ? 'default' : 'secondary'}
                  className="text-[10px] px-1 py-0 h-4"
                >
                  Tax: {taxData.displayText}
                </Badge>
                
                {taxData.wasTruncated && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertCircle className="h-3 w-3 text-orange-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs max-w-xs">
                          {taxData.details}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}