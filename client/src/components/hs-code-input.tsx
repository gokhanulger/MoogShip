import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { HSCodeSearchDialog } from './hs-code-search-dialog';

interface HSCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function HSCodeInput({ 
  value, 
  onChange, 
  placeholder,
  className = "",
  disabled = false
}: HSCodeInputProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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
    <div className={`relative flex gap-2 ${className}`}>
      <div className="flex-1">
        <Input
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder || "0000.00.00"}
          disabled={disabled}
          className="w-full h-9"
          maxLength={13} // Maximum length for ####.##.##.##
        />
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
            title="HS Kodu Ara"
          >
            <Search className="h-4 w-4" />
          </Button>
        }
      />
    </div>
  );
}