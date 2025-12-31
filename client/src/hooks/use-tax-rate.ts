import { useState, useEffect } from 'react';
import { useDebounce } from '@/hooks/use-debounce';

interface TaxRateData {
  hsCode: string;
  truncatedCode: string;
  wasTruncated: boolean;
  country: string;
  dutyRate: number | null;
  taxRate: number | null;
  totalRate: number;
  source: string;
  displayText: string;
  details: string | null;
}

interface UseTaxRateOptions {
  country?: string;
  enabled?: boolean;
  minLength?: number;
}

export function useTaxRate(hsCode: string, options: UseTaxRateOptions = {}) {
  const { 
    country = 'US', 
    enabled = true,
    minLength = 6  // Minimum HS code length to trigger tax calculation
  } = options;
  
  const [data, setData] = useState<TaxRateData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Debounce the HS code to avoid too many API calls
  const debouncedHsCode = useDebounce(hsCode, 500);
  
  useEffect(() => {
    if (!enabled || !debouncedHsCode) {
      setData(null);
      return;
    }
    
    // Remove formatting and check length
    const cleanCode = debouncedHsCode.replace(/\D/g, '');
    if (cleanCode.length < minLength) {
      setData(null);
      return;
    }
    
    const fetchTaxRate = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(
          `/api/hs-codes/tax-rate?hsCode=${encodeURIComponent(debouncedHsCode)}&country=${encodeURIComponent(country)}`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch tax rate');
        }
        
        const taxData = await response.json();
        setData(taxData);
      } catch (err) {
        console.error('Error fetching tax rate:', err);
        setError(err as Error);
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTaxRate();
  }, [debouncedHsCode, country, enabled, minLength]);
  
  return {
    data,
    isLoading,
    error,
    isReady: !isLoading && !error && data !== null
  };
}