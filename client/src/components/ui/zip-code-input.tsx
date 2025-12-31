import { useState, useEffect } from 'react';
import { Input } from './input';
import { cn } from '@/lib/utils';
import { Check, AlertCircle, Info } from 'lucide-react';
import { 
  validateZipCode, 
  formatZipCode, 
  getPostalCodeLabel, 
  getPostalCodePlaceholder,
  requiresPostalCode,
  type ZipValidationResult
} from '@shared/zipCodeValidation';

interface ZipCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  countryCode?: string;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  onValidationChange?: (isValid: boolean, message?: string) => void;
}

export function ZipCodeInput({
  value,
  onChange,
  countryCode = '',
  className,
  disabled = false,
  placeholder,
  onValidationChange
}: ZipCodeInputProps) {
  const [validation, setValidation] = useState<ZipValidationResult>({ isValid: true });
  const [isDirty, setIsDirty] = useState(false);

  // Get country-specific label and placeholder
  const fieldLabel = getPostalCodeLabel(countryCode);
  const fieldPlaceholder = placeholder || getPostalCodePlaceholder(countryCode);
  const isRequired = requiresPostalCode(countryCode);

  // Validate zip code when value or country changes
  useEffect(() => {
    if (!isDirty && !value) {
      setValidation({ isValid: true });
      return;
    }

    if (!isRequired && !value) {
      setValidation({ 
        isValid: true, 
        message: "This country does not require a postal code",
        formatted: ""
      });
      return;
    }

    if (countryCode && value) {
      const result = validateZipCode(value, countryCode);
      setValidation(result);
      
      // Auto-format valid zip codes
      if (result.isValid && result.formatted && result.formatted !== value) {
        onChange(result.formatted);
      }

      // Notify parent component about validation status
      if (onValidationChange) {
        onValidationChange(result.isValid, result.message);
      }
    } else if (value && !countryCode) {
      setValidation({
        isValid: false,
        message: "Please select a country first to validate postal code format"
      });
    }
  }, [value, countryCode, isDirty, isRequired, onChange, onValidationChange]);

  const handleChange = (inputValue: string) => {
    setIsDirty(true);
    onChange(inputValue);
    
    // Immediate validation on input change
    if (countryCode && inputValue) {
      const result = validateZipCode(inputValue, countryCode);
      setValidation(result);
    }
  };

  const getValidationIcon = () => {
    if (!isDirty && !value) return null;
    
    if (!isRequired && !value) {
      return <Info className="h-4 w-4 text-blue-500" />;
    }

    if (validation.isValid && value) {
      return <Check className="h-4 w-4 text-green-500" />;
    }

    if (!validation.isValid && value) {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }

    return null;
  };

  const getInputStatus = () => {
    if (!isDirty && !value) return 'default';
    
    if (!isRequired && !value) return 'info';
    
    if (validation.isValid && value) return 'valid';
    
    if (!validation.isValid && value) return 'invalid';
    
    return 'default';
  };

  const inputStatus = getInputStatus();

  return (
    <div className="space-y-1">
      <div className="relative">
        <Input
          type="text"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={fieldPlaceholder}
          className={cn(
            "pr-10", // Space for validation icon
            inputStatus === 'valid' && "border-green-500 focus:border-green-500",
            inputStatus === 'invalid' && "border-red-500 focus:border-red-500",
            inputStatus === 'info' && "border-blue-500 focus:border-blue-500",
            className
          )}
          disabled={disabled}
          onBlur={() => setIsDirty(true)}
        />
        
        {/* Validation icon */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {getValidationIcon()}
        </div>
      </div>

      {/* Validation message */}
      {isDirty && validation.message && (
        <p className={cn(
          "text-xs",
          inputStatus === 'valid' && "text-green-600",
          inputStatus === 'invalid' && "text-red-600",
          inputStatus === 'info' && "text-blue-600"
        )}>
          {validation.message}
        </p>
      )}

      {/* Country-specific help text */}
      {countryCode && isRequired && !isDirty && (
        <p className="text-xs text-gray-500">
          Enter {fieldLabel.toLowerCase()} for {countryCode}
        </p>
      )}
    </div>
  );
}