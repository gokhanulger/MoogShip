import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield } from "lucide-react";

// Common currencies for insurance value
const CURRENCIES = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "TRY", name: "Turkish Lira", symbol: "₺" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
];

interface InsuranceCostDisplayProps {
  insuranceValue: number;
  currency?: string;
}

function InsuranceCostDisplay({ insuranceValue, currency = 'USD' }: InsuranceCostDisplayProps) {
  const { t } = useTranslation();
  
  // Fetch insurance cost calculation
  const { data: insuranceCost, isLoading } = useQuery({
    queryKey: ['/api/insurance/calculate', insuranceValue],
    queryFn: async () => {
      
      const response = await fetch(`/api/insurance/calculate?insuranceValue=${insuranceValue}`);
      if (!response.ok) {
        
        throw new Error('Failed to calculate insurance cost');
      }
      const result = await response.json();
      
      return result;
    },
    enabled: !!(insuranceValue && insuranceValue > 0),
  });

  if (!insuranceValue || insuranceValue <= 0) {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <Shield className="h-4 w-4 text-blue-600" />
        <span className="text-sm font-medium text-blue-900">
          {t('customs.insuranceProtection')}
        </span>
      </div>
      <div className="text-sm text-blue-800">
        <div className="flex justify-between items-center">
          <span>{t('customs.declaredValue')}:</span>
          <span className="font-medium">
            ${(insuranceValue / 100).toFixed(2)}
          </span>
        </div>
        {isLoading ? (
          <div className="flex justify-between items-center mt-1">
            <span>{t('customs.insuranceCost')}:</span>
            <span className="text-blue-600">{t('common.calculating', 'Calculating...')}</span>
          </div>
        ) : insuranceCost?.cost ? (
          <div className="flex justify-between items-center mt-1">
            <span>{t('customs.insuranceCost')}:</span>
            <span className="font-semibold text-green-600">
              ${(insuranceCost.cost / 100).toFixed(2)}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface InsuranceSelectionProps {
  form?: any;
  onInsuranceChange?: (includeInsurance: boolean, insuranceValue: number) => void;
}

export function InsuranceSelection({ form, onInsuranceChange }: InsuranceSelectionProps) {
  const { t } = useTranslation();
  const [includeInsurance, setIncludeInsurance] = useState(false);
  const [insuranceDisplayValue, setInsuranceDisplayValue] = useState("0.00");
  const [insuranceValue, setInsuranceValue] = useState(0);

  // Watch for changes in the form's customsValue to automatically populate insurance value
  useEffect(() => {
    if (form && includeInsurance) {
      const subscription = form.watch((value, { name }) => {
        // Only react to customsValue changes, not insuranceValue changes to prevent infinite loop
        if (name === 'customsValue') {
          const customsValue = value.customsValue;
          if (customsValue && customsValue > 0) {
            // Use customs value as insurance value (both in cents)
            setInsuranceValue(customsValue);
            setInsuranceDisplayValue((customsValue / 100).toFixed(2));
            // Don't call form.setValue here to avoid infinite loop
            if (onInsuranceChange) {
              onInsuranceChange(includeInsurance, customsValue);
            }
          }
        }
      });
      return () => subscription.unsubscribe();
    }
  }, [form, includeInsurance, onInsuranceChange]);

  const handleInsuranceToggle = (checked: boolean) => {
    setIncludeInsurance(checked);
    if (form) {
      form.setValue('includeInsurance', checked);
      
      // When insurance is enabled, automatically use customs value
      if (checked) {
        const customsValue = form.getValues('customsValue');
        if (customsValue && customsValue > 0) {
          setInsuranceValue(customsValue);
          setInsuranceDisplayValue((customsValue / 100).toFixed(2));
          form.setValue('insuranceValue', customsValue);
          if (onInsuranceChange) {
            onInsuranceChange(checked, customsValue);
            return; // Early return to avoid calling onInsuranceChange twice
          }
        }
      }
    }
    if (onInsuranceChange) {
      onInsuranceChange(checked, checked ? insuranceValue : 0);
    }
  };

  const handleInsuranceValueChange = (value: string) => {
    setInsuranceDisplayValue(value);
    // Convert to cents for API
    const numericValue = parseFloat(value) || 0;
    const centsValue = Math.round(numericValue * 100);
    setInsuranceValue(centsValue);
    
    if (form) {
      form.setValue('insuranceValue', centsValue);
    }
    if (onInsuranceChange) {
      onInsuranceChange(includeInsurance, centsValue);
    }
  };

  const handleInputBlur = () => {
    // Ensure proper formatting on blur
    const numericValue = parseFloat(insuranceDisplayValue) || 0;
    setInsuranceDisplayValue(numericValue.toFixed(2));
    const centsValue = Math.round(numericValue * 100);
    setInsuranceValue(centsValue);
    
    if (form) {
      form.setValue('insuranceValue', centsValue);
    }
    if (onInsuranceChange) {
      onInsuranceChange(includeInsurance, centsValue);
    }
  };

  return (
    <div className="space-y-4">
      {/* Insurance Selection */}
      <div className="space-y-3">
        <div className="flex flex-row items-start space-x-3 space-y-0">
          <div className="flex items-center">
            <input
              type="checkbox"
              className="h-4 w-4 text-primary border-gray-300 rounded"
              checked={includeInsurance}
              onChange={(e) => handleInsuranceToggle(e.target.checked)}
              id="insurance-checkbox"
            />
          </div>
          <div className="flex flex-col space-y-1">
            <Label htmlFor="insurance-checkbox" className="font-medium">
              {t('customs.addShippingInsurance', 'Add Shipping Insurance')}
            </Label>
            <p className="text-sm text-gray-600">
              {t('customs.description.insurance', 'Protect your shipment with insurance coverage')}
            </p>
          </div>
        </div>
        
        {/* Insurance Value Input - Show when insurance is selected */}
        {includeInsurance && (
          <div className="mt-3 space-y-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {t('customs.insuranceValue', 'Insurance Value')}
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  $
                </span>
                <Input
                  type="text"
                  placeholder="0.00"
                  className="pl-8"
                  value={insuranceDisplayValue}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Only allow numbers, decimal point, and reasonable formatting
                    if (/^\d*\.?\d{0,2}$/.test(value)) {
                      handleInsuranceValueChange(value);
                    }
                  }}
                  onBlur={handleInputBlur}
                  onFocus={() => {
                    // Initialize display value if needed
                    if (insuranceValue > 0 && insuranceDisplayValue === "0.00") {
                      setInsuranceDisplayValue((insuranceValue / 100).toFixed(2));
                    }
                  }}
                />
              </div>
              <p className="text-xs text-gray-500">
                {t('customs.description.insuranceValue', 'Enter the declared value of your shipment for insurance coverage')}
              </p>
            </div>

            {/* Insurance Cost Display */}
            {insuranceValue > 0 && (
              <InsuranceCostDisplay 
                insuranceValue={insuranceValue}
                currency="USD"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}