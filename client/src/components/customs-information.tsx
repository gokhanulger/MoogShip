import { useState, useEffect } from 'react';
import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Common currencies for customs value
const CURRENCIES = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "TRY", name: "Turkish Lira", symbol: "₺" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF" },
];

interface CustomsInformationProps {
  form: any;
  showTitle?: boolean;
}

export function CustomsInformation({ form, showTitle = true }: CustomsInformationProps) {
  // State to track and format the customs value with proper decimal places
  const [formattedValue, setFormattedValue] = useState<string>('');
  
  // Immediately format the value when the component mounts
  useEffect(() => {
    // Get the raw value (in cents)
    const rawValue = form.getValues('customsValue');
    
    // Ensure we're working with an integer - handle string, number, or undefined
    const centsValue = typeof rawValue === 'string' 
      ? parseInt(rawValue, 10) || 0
      : typeof rawValue === 'number' 
        ? Math.round(rawValue) 
        : 0;
    
    // Convert from cents to dollars with 2 decimal places
    const dollarsValue = (centsValue / 100).toFixed(2);
    
    // Update the displayed value
    setFormattedValue(dollarsValue);
    
    console.log("Customs information initial format:", { 
      rawValue, 
      centsValue, 
      dollarsValue 
    });
  }, []);  // Run only on mount
  
  // Also listen for changes to the form value
  useEffect(() => {
    const subscription = form.watch((value: any, { name }: { name?: string }) => {
      if (name === 'customsValue' || !name) {
        const rawValue = form.getValues('customsValue');
        const centsValue = typeof rawValue === 'string' 
          ? parseInt(rawValue, 10) || 0 
          : typeof rawValue === 'number' 
            ? Math.round(rawValue) 
            : 0;
            
        setFormattedValue((centsValue / 100).toFixed(2));
        
        console.log("Customs info value watch:", { 
          rawValue, 
          centsValue, 
          displayValue: (centsValue / 100).toFixed(2) 
        });
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form]);
  
  // Handle value change - convert displayed decimal value (dollars) to cents for storage
  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Get user input as decimal value (dollars)
    const displayValue = parseFloat(e.target.value) || 0;
    
    // Convert to cents (integer) for storage
    const centsValue = Math.round(displayValue * 100);
    
    // Update the form value with the cents value
    form.setValue('customsValue', centsValue);
    
    // Update the display with properly formatted value
    setFormattedValue(displayValue.toFixed(2));
    
    console.log("Customs value changed:", { 
      input: e.target.value,
      displayValue,
      centsValue
    });
  };

  return (
    <div className="space-y-4">
      {showTitle && <h4 className="text-sm font-medium text-gray-700 mb-2">Customs Information</h4>}
      
      <FormField
        control={form.control}
        name="gtipCode"
        render={({ field }) => (
          <FormItem>
            <FormLabel>GTIP Code</FormLabel>
            <FormControl>
              <Input 
                placeholder="Enter GTIP/HS code" 
                {...field}
                value={field.value || ''}
              />
            </FormControl>
          </FormItem>
        )}
      />
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormItem>
          <FormLabel>Customs Value</FormLabel>
          <FormControl>
            <Input 
              type="number" 
              min="0" 
              step="0.01" 
              placeholder="Value" 
              value={formattedValue}
              onChange={handleValueChange}
            />
          </FormControl>
        </FormItem>
        
        <FormField
          control={form.control}
          name="currency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Currency</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value || 'USD'}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {CURRENCIES.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      {currency.symbol} {currency.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}