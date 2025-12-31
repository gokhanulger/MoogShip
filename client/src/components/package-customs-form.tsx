import { useState, useEffect } from 'react';
import { FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Package, ChevronDown, InfoIcon, Shield, DollarSign } from 'lucide-react';
import { isEUCountry, isHMRCCountry } from '@/lib/countries';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';



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

// Insurance Cost Display Component
interface InsuranceCostDisplayProps {
  insuranceValue?: number; // Value in cents
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

  const currencySymbol = CURRENCIES.find(c => c.code === currency)?.symbol || '$';
  const valueInDollars = (insuranceValue / 100).toFixed(2);

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
      <div className="flex items-center space-x-2 text-blue-800">
        <Shield className="h-4 w-4" />
        <span className="text-sm font-medium">
          {t('customs.insuranceCoverage')}
        </span>
      </div>
      
      <div className="mt-2 space-y-1">
        <div className="flex justify-between items-center text-sm">
          <span className="text-blue-700">
            {t('customs.declaredValue')}:
          </span>
          <span className="font-medium text-blue-900">
            {currencySymbol}{valueInDollars}
          </span>
        </div>
        
        <div className="flex justify-between items-center text-sm">
          <span className="text-blue-700">
            {t('customs.insuranceCost')}:
          </span>
          <span className="font-medium text-green-600 flex items-center">
            {isLoading ? (
              <span className="text-blue-600">Calculating...</span>
            ) : (
              <>
                <DollarSign className="h-3 w-3 mr-1" />
                {currencySymbol}{insuranceCost ? (insuranceCost.cost / 100).toFixed(2) : '0.00'}
              </>
            )}
          </span>
        </div>
        
        <div className="text-xs text-blue-600 mt-2">
          {t('customs.description.insuranceCostInfo')}
        </div>
      </div>
    </div>
  );
}

interface PackageCustomsFormProps {
  form: any;
  receiverForm?: any; // Add receiverForm for package contents
  isAccordion?: boolean;
  defaultOpen?: boolean;
  packageItems?: any[]; // Add packageItems array to update package contents
}

export function PackageCustomsForm({ 
  form,
  receiverForm,
  isAccordion = true,
  defaultOpen = false,
  packageItems = []
}: PackageCustomsFormProps) {
  const { t, i18n } = useTranslation();
  // State to track the formatted display value (in dollars with decimal points)
  const [displayValue, setDisplayValue] = useState<string>('0.00');
  // State to track the insurance value display (in dollars with decimal points)
  const [insuranceDisplayValue, setInsuranceDisplayValue] = useState<string>('0.00');
  
  // State to control accordion open state
  const [accordionValue, setAccordionValue] = useState<string | undefined>(defaultOpen ? "customs" : undefined);
  
  // Initialize the display value based on the form value (in cents)
  useEffect(() => {
    const centsValue = form.getValues('customsValue') || 0;
    const formattedValue = (centsValue / 100).toFixed(2);
    setDisplayValue(formattedValue);
  }, [form]);

  // Initialize the insurance display value based on the form value (in cents)
  useEffect(() => {
    const insuranceCentsValue = form.getValues('insuranceValue') || 0;
    const insuranceFormattedValue = (insuranceCentsValue / 100).toFixed(2);
    setInsuranceDisplayValue(insuranceFormattedValue);
  }, [form]);
  
  // Listen for changes to the form value through watch
  useEffect(() => {
    const subscription = form.watch((value: any, { name }: { name?: string }) => {
      if (name === 'customsValue' || !name) {
        const centsValue = form.getValues('customsValue') || 0;
        setDisplayValue((centsValue / 100).toFixed(2));
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form]);
  
  // Automatically update packageContents, GTIP code, and customs value when packageItems change
  useEffect(() => {
    if (packageItems && packageItems.length > 0) {
      // Extract item names and join them with commas for packageContents
      if (receiverForm) {
        const contents = packageItems
          .map(item => item.name)
          .filter(Boolean) // Filter out any null or undefined values
          .join(', ');
          
        // Update the receiver form with the new contents
        receiverForm.setValue('packageContents', contents);
      }
      
      // Extract GTIP codes from items
      const gtipCodes = packageItems
        .map(item => item.gtipCode || item.hsCode) // Try both gtipCode and hsCode properties
        .filter(Boolean) // Filter out any null or undefined values
        .filter((value, index, self) => self.indexOf(value) === index) // Remove duplicates
        .join(', ');
        
      // Update the GTIP code field if we have any codes
      if (gtipCodes) {
        form.setValue('gtipCode', gtipCodes);
      }
      
      // Calculate total value for customs value
      const totalValue = packageItems.reduce((total, item) => {
        // Calculate price based on price and quantity
        const price = parseFloat(item.price) || 0;
        const quantity = parseInt(item.quantity) || 1;
        return total + (price * quantity);
      }, 0);
      
      // Update the customs value in cents (dollar amount * 100)
      const valueInCents = Math.round(totalValue * 100);
      form.setValue('customsValue', valueInCents);
      
      // Update display value to show the calculated total
      setDisplayValue(totalValue.toFixed(2));
      
      // Auto-open the accordion when items are added
      setAccordionValue("customs");
    }
  }, [packageItems, receiverForm, form]);
  
  // Handle user input changes - convert display value (dollars) to storage value (cents)
  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Update what the user sees immediately
    setDisplayValue(inputValue);
    
    // Convert to cents for storage if it's a valid number
    if (inputValue && !isNaN(Number(inputValue))) {
      const dollars = parseFloat(inputValue);
      const cents = Math.round(dollars * 100);
      form.setValue('customsValue', cents);
    }
  };
  
  // Check if the selected country is in the EU or requires HMRC
  const selectedCountry = form.getValues("receiverCountry");
  const isEUDestination = isEUCountry(selectedCountry);
  const isHMRCDestination = isHMRCCountry(selectedCountry);
  
  // Effect to watch for country changes to update validation
  useEffect(() => {
    const subscription = form.watch((value: any, { name }: { name?: string }) => {
      if (name === 'receiverCountry' || !name) {
        const country = form.getValues('receiverCountry');
        // If country changed to/from EU or HMRC, trigger validation for IOSS field
        if (form.getValues('iossNumber') !== undefined) {
          form.trigger('iossNumber');
        }
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form]);
  
  const formContent = (
    <div className="space-y-4 py-2" dir={i18n.dir()}>
      {/* Package Contents */}
      {receiverForm && (
        <FormField
          control={receiverForm.control}
          name="packageContents"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('customs.packageContents')}</FormLabel>
              <FormControl>
                <Input 
                  placeholder={t('customs.placeholder.describeContents')}
                  {...field}
                />
              </FormControl>
              <FormMessage />
              <FormDescription>
                {t('customs.description.contents')}
              </FormDescription>
            </FormItem>
          )}
        />
      )}
      
      {/* IOSS Number field - only shown for EU countries that are not HMRC countries */}
      {isEUDestination && !isHMRCDestination && (
        <FormField
          control={form.control}
          name="iossNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center">
                {t('customs.iossNumber')}
                <span className="text-sm mx-2 text-red-500">*</span>
                <InfoIcon className="h-4 w-4 text-gray-400" />
              </FormLabel>
              <FormControl>
                <Input 
                  placeholder={t('customs.placeholder.enterIossNumber')} 
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
              <FormDescription>
                {t('customs.description.iossNumber')}
              </FormDescription>
            </FormItem>
          )}
        />
      )}
      
      {/* HMRC Number field - only shown for UK and Sweden */}
      {isHMRCDestination && (
        <FormField
          control={form.control}
          name="iossNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center">
                {t('customs.hmrcNumber')}
                <span className="text-sm mx-2 text-red-500">*</span>
                <InfoIcon className="h-4 w-4 text-gray-400" />
              </FormLabel>
              <FormControl>
                <Input 
                  placeholder={t('customs.placeholder.enterHmrcNumber')} 
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
              <FormDescription>
                {t('customs.description.hmrcNumber', { 
                  country: selectedCountry === "GB" 
                    ? t('countries.unitedKingdom') 
                    : t('countries.sweden') 
                })}
              </FormDescription>
            </FormItem>
          )}
        />
      )}
      
      <FormField
        control={form.control}
        name="gtipCode"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('customs.gtipCode')}</FormLabel>
            <FormControl>
              <Input 
                placeholder={t('customs.placeholder.enterGtipCode')}
                {...field}
                value={field.value || ''}
                readOnly={packageItems && packageItems.length > 0}
                className={packageItems && packageItems.length > 0 ? "bg-gray-50" : ""}
              />
            </FormControl>
            <FormMessage />
            <FormDescription>
              {packageItems && packageItems.length > 0 
                ? t('customs.description.gtipCodeAuto')
                : t('customs.description.gtipCode')}
            </FormDescription>
          </FormItem>
        )}
      />
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormItem>
          <FormLabel>{t('customs.customsValue')}</FormLabel>
          <FormControl>
            <Input 
              type="text"
              inputMode="decimal"
              placeholder={t('customs.placeholder.value')} 
              value={displayValue}
              onChange={handleValueChange}
              readOnly={packageItems && packageItems.length > 0}
              className={packageItems && packageItems.length > 0 ? "bg-gray-50" : ""}
              onBlur={() => {
                // On blur, ensure we always show with 2 decimal places
                if (displayValue && !isNaN(Number(displayValue))) {
                  setDisplayValue(parseFloat(displayValue).toFixed(2));
                } else {
                  setDisplayValue('0.00');
                }
              }}
              onFocus={(e) => e.target.select()}
            />
          </FormControl>
          <FormDescription>
            {packageItems && packageItems.length > 0 
              ? t('customs.description.valueAuto')
              : t('customs.description.value')}
          </FormDescription>
        </FormItem>
        
        <FormField
          control={form.control}
          name="currency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('customs.currency')}</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value || 'USD'}
                value={field.value || 'USD'}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('customs.placeholder.selectCurrency')} />
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
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      
      {/* Insurance Option */}

    </div>
  );
  
  // Return the content wrapped in an accordion if requested
  return isAccordion ? (
    <Accordion 
      type="single" 
      collapsible 
      value={accordionValue}
      onValueChange={setAccordionValue}
      className={packageItems && packageItems.length > 0 ? "border-2 border-blue-100 rounded-md" : ""}
      dir={i18n.dir()}
    >
      <AccordionItem value="customs" className="border-0">
        <AccordionTrigger className={`py-3 ${packageItems && packageItems.length > 0 ? "bg-blue-50 hover:bg-blue-100 px-3 rounded-t-md" : ""}`}>
          <div className="flex items-center">
            <Package className={`h-4 w-4 mr-2 ${packageItems && packageItems.length > 0 ? "text-blue-600" : ""}`} />
            <span className={packageItems && packageItems.length > 0 ? "font-medium text-blue-700" : ""}>
              {t('customs.customsInformation')}
              {packageItems && packageItems.length > 0 && (
                <span className="mx-2 text-sm font-normal text-blue-600">
                  {t('customs.importantReview')}
                </span>
              )}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
        </AccordionTrigger>
        <AccordionContent className={packageItems && packageItems.length > 0 ? "px-3 pb-3 pt-1 bg-white rounded-b-md" : ""}>
          {packageItems && packageItems.length > 0 && (
            <div className="mb-4 p-2 bg-blue-50 text-blue-700 text-sm rounded border border-blue-200">
              <p className="flex items-center">
                <InfoIcon className="h-4 w-4 mr-2 inline-block" />
                {t('customs.packageAdded')}
              </p>
            </div>
          )}
          {formContent}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ) : formContent;
}