import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertShipmentSchema, ServiceLevel, ServiceLevelDetails } from "@shared/schema";
import { z } from "zod";
import { usePriceCalculator } from "@/hooks/use-price-calculator";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle, Clock, Package, DollarSign } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

// Country list for dropdown
const countries = [
  { value: "United States", label: "United States" },
  { value: "United Kingdom", label: "United Kingdom" },
  { value: "Canada", label: "Canada" },
  { value: "Germany", label: "Germany" },
  { value: "France", label: "France" },
  { value: "Italy", label: "Italy" },
  { value: "Spain", label: "Spain" },
  { value: "Australia", label: "Australia" },
  { value: "Japan", label: "Japan" },
  { value: "China", label: "China" },
];

// Extend the shipment schema for form validation
const shipmentFormSchema = insertShipmentSchema.extend({
  customerAccepted: z.boolean().default(false),
  
  // Make required fields optional for step-by-step form
  senderName: z.string().min(1, "Sender name is required"),
  senderAddress: z.string().min(1, "Sender address is required"),
  senderCity: z.string().min(1, "Sender city is required"),
  senderPostalCode: z.string().min(1, "Sender postal code is required"),
  senderPhone: z.string().optional(),
  senderEmail: z.string().email("Invalid email").optional().or(z.literal('')),
  
  receiverName: z.string().min(1, "Receiver name is required"),
  receiverAddress: z.string().min(1, "Receiver address is required"),
  receiverCity: z.string().min(1, "Receiver city is required"),
  receiverCountry: z.string().min(1, "Receiver country is required"),
  receiverPostalCode: z.string().min(1, "Receiver postal code is required"),
  receiverPhone: z.string().min(1, "Receiver phone is required"),
  
  packageLength: z.number().min(0.1, "Length must be greater than 0"),
  packageWidth: z.number().min(0.1, "Width must be greater than 0"),
  packageHeight: z.number().min(0.1, "Height must be greater than 0"),
  packageWeight: z.number().min(0.1, "Weight must be greater than 0"),
  packageContents: z.string().min(1, "Package contents description is required"),
  
  serviceLevel: z.nativeEnum(ServiceLevel),
});

type ShipmentFormValues = z.infer<typeof shipmentFormSchema>;

interface ShipmentFormProps {
  onSubmit: (data: ShipmentFormValues) => void;
  isSubmitting: boolean;
  defaultValues?: Partial<ShipmentFormValues>;
}

export default function ShipmentForm({ 
  onSubmit, 
  isSubmitting,
  defaultValues 
}: ShipmentFormProps) {
  // Start directly with receiver information 
  const [formStep, setFormStep] = useState<number>(0);
  const [isCalculatingPrice, setIsCalculatingPrice] = useState(false);
  const { toast } = useToast();
  const priceCalculator = usePriceCalculator();
  
  // Add real-time weight calculations
  const [billableWeight, setBillableWeight] = useState({
    actual: 0,
    volumetric: 0,
    final: 0
  });
  
  const [priceDetails, setPriceDetails] = useState({
    basePrice: 0,
    fuelCharge: 0,
    totalPrice: 0,
    currency: 'USD',
    estimatedDeliveryDays: 0,
    carrierName: ''
  });
  
  const form = useForm<ShipmentFormValues>({
    resolver: zodResolver(shipmentFormSchema),
    defaultValues: defaultValues || {
      // Sender information - Using TR Ofis address in Istanbul
      senderName: "TR Ofis",
      senderAddress: "Halil Rifat Pasa Mh. Perpa Tic.",
      senderCity: "Istanbul",
      senderPostalCode: "34384",
      senderPhone: "",
      senderEmail: "",
      
      // Receiver information
      receiverName: "",
      receiverAddress: "",
      receiverCity: "",
      receiverCountry: "",
      receiverPostalCode: "",
      receiverPhone: "",
      
      // Package information
      packageLength: 0,
      packageWidth: 0,
      packageHeight: 0,
      packageWeight: 0,
      packageContents: "",
      
      // Service information
      serviceLevel: ServiceLevel.STANDARD,
      customerAccepted: false
    },
  });
  
  // Calculate price based on package dimensions, weight, and service level
  const calculatePrice = (data: ShipmentFormValues) => {
    // Calculate volumetric weight (L x W x H / 5000)
    const volumetricWeight = (data.packageLength * data.packageWidth * data.packageHeight) / 5000;
    // Use the larger of actual weight or volumetric weight
    const chargeableWeight = Math.max(data.packageWeight, volumetricWeight);
    
    // Base price calculation (simplified for demonstration)
    let basePrice = chargeableWeight * 10; // $10 per kg
    
    // Apply service level multiplier
    const serviceLevelMultiplier = 
      data.serviceLevel === ServiceLevel.STANDARD ? 1 :
      data.serviceLevel === ServiceLevel.EXPRESS ? 1.5 :
      data.serviceLevel === ServiceLevel.PRIORITY ? 2 : 1;
    
    basePrice = basePrice * serviceLevelMultiplier;
    
    // Calculate fuel charge (simplified - 15% of base price)
    const fuelCharge = basePrice * 0.15;
    
    // Total price
    const totalPrice = basePrice + fuelCharge;
    
    // Return the calculated prices (in cents for storage)
    return {
      basePrice: Math.round(basePrice * 100),
      fuelCharge: Math.round(fuelCharge * 100),
      totalPrice: Math.round(totalPrice * 100),
      currency: 'USD',
      estimatedDeliveryDays: 
        data.serviceLevel === ServiceLevel.STANDARD ? 5 :
        data.serviceLevel === ServiceLevel.EXPRESS ? 2 :
        data.serviceLevel === ServiceLevel.PRIORITY ? 1 : 5,
      carrierName: 'UPS Express (Local)'
    };
  };
  
  // Calculate price from Shipentegra API whenever the service level changes in the final step
  useEffect(() => {
    // Only run this once when the form step changes to 2 (pricing step) - adjusted for new steps
    if (formStep === 2) {
      // Create a flag to track if we've already calculated the price
      let isPriceCalculated = false;
      
      const calculateShippingPrice = async () => {
        // Skip if we've already calculated the price or if we're not on step 2
        if (isPriceCalculated || formStep !== 2) return;
        
        try {
          setIsCalculatingPrice(true);
          isPriceCalculated = true; // Mark as calculated to prevent repeated calls
          
          const formData = form.getValues();
          
          // Ensure numeric values are properly parsed as numbers
          const packageLength = parseFloat(String(formData.packageLength)) || 0;
          const packageWidth = parseFloat(String(formData.packageWidth)) || 0;
          const packageHeight = parseFloat(String(formData.packageHeight)) || 0;
          const packageWeight = parseFloat(String(formData.packageWeight)) || 0;
          
          // Validate the data before sending
          if (!packageLength || !packageWidth || !packageHeight || !packageWeight) {
            throw new Error("Package dimensions and weight must be valid numbers");
          }
          
          if (!formData.serviceLevel) {
            // If no service level is selected yet, use standard as default
            formData.serviceLevel = ServiceLevel.STANDARD;
            // Update the form field
            form.setValue('serviceLevel', ServiceLevel.STANDARD);
          }
          
          // For real API integration with properly parsed numeric values
          const result = await priceCalculator.mutateAsync({
            senderPostalCode: formData.senderPostalCode,
            senderCity: formData.senderCity,
            receiverPostalCode: formData.receiverPostalCode,
            receiverCity: formData.receiverCity,
            receiverCountry: formData.receiverCountry,
            packageLength,
            packageWidth,
            packageHeight,
            packageWeight,
            serviceLevel: formData.serviceLevel
          });
          
          setPriceDetails(result);
        } catch (error) {
          console.error('Error calculating price:', error);
          toast({
            title: 'Price calculation failed',
            description: 'Could not retrieve shipping price. Using estimated price instead.',
            variant: 'destructive'
          });
          
          // Fallback to local calculation if API fails
          const data = form.getValues();
          const calculatedPrice = calculatePrice(data);
          setPriceDetails(calculatedPrice);
        } finally {
          setIsCalculatingPrice(false);
        }
      };
      
      calculateShippingPrice();
    }
  }, [formStep]); // Only depend on formStep to prevent continuous recalculation
  
  // Simple manual price calculation function for each service level selection
  const updatePriceWhenServiceLevelChanges = () => {
    // Only track this on the price calculation step
    if (formStep === 2) {
      // Create a one-time event listener that runs once when service level changes
      const handleServiceLevelChange = () => {
        const serviceLevel = form.watch('serviceLevel');
        
        if (serviceLevel) {
          // Use local calculation instead of API to prevent flooding
          const data = form.getValues();
          const calculatedPrice = calculatePrice({
            ...data,
            serviceLevel: serviceLevel
          });
          
          setPriceDetails(calculatedPrice);
        }
      };
      
      // Set up the event listener
      const subscription = form.watch((value, { name }) => {
        if (name === 'serviceLevel') {
          handleServiceLevelChange();
        }
      });
      
      // Clean up the subscription when component unmounts or form step changes
      return () => subscription.unsubscribe();
    }
  };

  // Use the manual price calculation when service level changes
  useEffect(updatePriceWhenServiceLevelChanges, [formStep]);
  
  // Calculate billable weight in real-time when package dimensions or weight change
  useEffect(() => {
    // Only run on the package information step
    if (formStep === 1) {
      const updateBillableWeight = () => {
        const data = form.getValues();
        
        // Ensure numeric values
        const packageLength = parseFloat(String(data.packageLength)) || 0;
        const packageWidth = parseFloat(String(data.packageWidth)) || 0;
        const packageHeight = parseFloat(String(data.packageHeight)) || 0;
        const packageWeight = parseFloat(String(data.packageWeight)) || 0;
        
        // Calculate volumetric weight (L x W x H / 5000)
        const volumetricWeight = (packageLength * packageWidth * packageHeight) / 5000;
        
        // Use the larger of actual weight or volumetric weight
        const finalWeight = Math.max(packageWeight, volumetricWeight);
        
        // Update the billable weight state
        setBillableWeight({
          actual: packageWeight, 
          volumetric: volumetricWeight,
          final: finalWeight
        });
      };
      
      // Initial calculation
      updateBillableWeight();
      
      // Set up the subscription to watch for changes
      const subscription = form.watch((value, { name }) => {
        if (name === 'packageLength' || name === 'packageWidth' || 
            name === 'packageHeight' || name === 'packageWeight') {
          updateBillableWeight();
        }
      });
      
      // Clean up the subscription when component unmounts or form step changes
      return () => subscription.unsubscribe();
    }
  }, [formStep, form]);
  
  const handleFormSubmit = (values: ShipmentFormValues) => {
    // Make sure the customer has accepted the price before submitting
    if (!values.customerAccepted && formStep === 2) {
      return;
    }
    
    // Include calculated price details with the form submission
    if (formStep === 2) {
      onSubmit({
        ...values,
        basePrice: priceDetails.basePrice,
        fuelCharge: priceDetails.fuelCharge,
        totalPrice: priceDetails.totalPrice,
        estimatedDeliveryDays: priceDetails.estimatedDeliveryDays,
        carrierName: priceDetails.carrierName
      });
    } else {
      onSubmit(values);
    }
  };
  
  const nextFormStep = async () => {
    let fields: string[] = [];
    
    if (formStep === 0) {
      fields = ['receiverName', 'receiverAddress', 'receiverCity', 'receiverCountry', 'receiverPostalCode', 'receiverPhone'];
    } else if (formStep === 1) {
      fields = ['packageLength', 'packageWidth', 'packageHeight', 'packageWeight', 'packageContents'];
    }
    
    const isValid = await form.trigger(fields as any);
    
    if (isValid) {
      setFormStep(formStep + 1);
      
      // When going to the price calculation step (step 2), calculate initial price using API
      if (formStep === 1) {
        const calculatePriceFromAPI = async () => {
          try {
            setIsCalculatingPrice(true);
            const formData = form.getValues();
            
            // Ensure numeric values are properly parsed as numbers
            const packageLength = parseFloat(String(formData.packageLength)) || 0;
            const packageWidth = parseFloat(String(formData.packageWidth)) || 0;
            const packageHeight = parseFloat(String(formData.packageHeight)) || 0;
            const packageWeight = parseFloat(String(formData.packageWeight)) || 0;
            
            if (!packageLength || !packageWidth || !packageHeight || !packageWeight) {
              throw new Error("Package dimensions and weight must be valid numbers");
            }
            
            console.log('Sending price calculation request with data:', {
              ...formData,
              packageLength,
              packageWidth,
              packageHeight,
              packageWeight
            });
            
            // Call the price API with properly formatted data
            const result = await priceCalculator.mutateAsync({
              senderPostalCode: formData.senderPostalCode,
              senderCity: formData.senderCity,
              receiverPostalCode: formData.receiverPostalCode,
              receiverCity: formData.receiverCity,
              receiverCountry: formData.receiverCountry,
              packageLength,
              packageWidth,
              packageHeight,
              packageWeight,
              serviceLevel: formData.serviceLevel
            });
            
            console.log('Received price calculation result:', result);
            setPriceDetails(result);
          } catch (error) {
            console.error('Error calculating price:', error);
            toast({
              title: 'Price calculation failed',
              description: 'Could not retrieve shipping price. Using estimated price instead.',
              variant: 'destructive'
            });
            
            // Fallback to local calculation if API fails
            const data = form.getValues();
            const calculatedPrice = calculatePrice(data);
            setPriceDetails(calculatedPrice);
          } finally {
            setIsCalculatingPrice(false);
          }
        };
        
        calculatePriceFromAPI();
      }
    }
  };
  
  const prevFormStep = () => {
    setFormStep(formStep - 1);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Step 0: Receiver Information */}
        {formStep === 0 && (
          <div className="space-y-6">
            <div className="mb-6">
              <h3 className="font-medium text-gray-700 mb-2">Receiver Information</h3>
              <div className="grid grid-cols-1 gap-y-4 sm:grid-cols-2 sm:gap-x-4">
                <div className="sm:col-span-2">
                  <FormField
                    control={form.control}
                    name="receiverName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="sm:col-span-2">
                  <FormField
                    control={form.control}
                    name="receiverAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div>
                  <FormField
                    control={form.control}
                    name="receiverCity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter city" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div>
                  <FormField
                    control={form.control}
                    name="receiverCountry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a country" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {countries.map((country) => (
                              <SelectItem key={country.value} value={country.value}>
                                {country.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div>
                  <FormField
                    control={form.control}
                    name="receiverPostalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postal Code</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter postal code" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div>
                  <FormField
                    control={form.control}
                    name="receiverPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter phone number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={nextFormStep}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Next: Package Information
              </Button>
            </div>
          </div>
        )}
        
        {/* Step 1: Package Information */}
        {formStep === 1 && (
          <div className="space-y-6">
            <div className="mb-6">
              <h3 className="font-medium text-gray-700 mb-2">Package Information</h3>
              
              {/* Real-time billable weight calculation display */}
              {billableWeight.actual > 0 && (
                <Card className="mb-4 bg-slate-50 border-slate-200">
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="flex flex-col items-center justify-center text-center p-2 rounded-md bg-white shadow-sm">
                        <span className="text-sm text-gray-500 mb-1">Actual Weight</span>
                        <span className="text-lg font-semibold">{billableWeight.actual.toFixed(2)} kg</span>
                      </div>
                      <div className="flex flex-col items-center justify-center text-center p-2 rounded-md bg-white shadow-sm">
                        <span className="text-sm text-gray-500 mb-1">Volumetric Weight</span>
                        <span className="text-lg font-semibold">{billableWeight.volumetric.toFixed(2)} kg</span>
                      </div>
                      <div className="flex flex-col items-center justify-center text-center p-2 rounded-md bg-primary/10 shadow-sm border border-primary/20">
                        <span className="text-sm text-gray-700 mb-1 font-medium">Billable Weight</span>
                        <span className="text-lg font-bold text-primary">{billableWeight.final.toFixed(2)} kg</span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-2 text-center">
                      You will be charged based on the greater of actual weight or volumetric weight (L × W × H ÷ 5000)
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <div className="grid grid-cols-1 gap-y-4 sm:grid-cols-2 sm:gap-x-4">
                <div>
                  <FormField
                    control={form.control}
                    name="packageLength"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Length (cm)</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" placeholder="Enter length" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div>
                  <FormField
                    control={form.control}
                    name="packageWidth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Width (cm)</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" placeholder="Enter width" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div>
                  <FormField
                    control={form.control}
                    name="packageHeight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Height (cm)</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" placeholder="Enter height" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div>
                  <FormField
                    control={form.control}
                    name="packageWeight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Weight (kg)</FormLabel>
                        <FormControl>
                          <Input type="number" min="0.1" step="0.1" placeholder="Enter weight" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="sm:col-span-2">
                  <FormField
                    control={form.control}
                    name="packageContents"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Package Contents</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe the contents of your package"
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Please provide a detailed description of the items in your package.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={prevFormStep}
              >
                Back to Receiver Information
              </Button>
              <Button 
                type="button"
                onClick={nextFormStep}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Next: Service & Pricing
              </Button>
            </div>
          </div>
        )}
        
        {/* Step 2: Service and Pricing */}
        {formStep === 2 && (
          <div className="space-y-6">
            <div className="mb-6">
              <h3 className="font-medium text-gray-700 mb-2">Select Service Level and Confirm Price</h3>
              
              <div className="mb-6">
                <FormField
                  control={form.control}
                  name="serviceLevel"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Service Level</FormLabel>
                      <FormControl>
                        <RadioGroup 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                          className="grid grid-cols-1 gap-4 md:grid-cols-3"
                        >
                          {Object.values(ServiceLevel).map((level) => (
                            <FormItem key={level}>
                              <FormLabel className="cursor-pointer [&:has([data-state=checked])>div]:border-primary">
                                <FormControl>
                                  <RadioGroupItem value={level} className="sr-only" />
                                </FormControl>
                                <div className="border rounded-md p-4 h-full flex flex-col hover:border-primary transition-colors">
                                  <div className="flex items-center mb-2">
                                    <Badge className={ServiceLevelDetails[level].color}>
                                      {ServiceLevelDetails[level].name}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {ServiceLevelDetails[level].description}
                                  </p>
                                </div>
                              </FormLabel>
                            </FormItem>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <Card className="mt-6 overflow-hidden">
                <CardHeader className="bg-muted pb-2">
                  <CardTitle className="flex items-center">
                    <DollarSign className="h-5 w-5 mr-2" />
                    Price Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  {isCalculatingPrice ? (
                    <div className="flex flex-col items-center justify-center py-4">
                      <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                      <p className="text-sm text-muted-foreground">Calculating shipping price...</p>
                    </div>
                  ) : (
                    <dl className="divide-y divide-gray-200">
                      <div className="flex justify-between py-2">
                        <dt className="text-sm text-gray-500">Base Price</dt>
                        <dd className="text-sm font-medium">{priceDetails.currency} {(priceDetails.basePrice / 100).toFixed(2)}</dd>
                      </div>
                      <div className="flex justify-between py-2">
                        <dt className="text-sm text-gray-500">Fuel Charge</dt>
                        <dd className="text-sm font-medium">{priceDetails.currency} {(priceDetails.fuelCharge / 100).toFixed(2)}</dd>
                      </div>
                      <div className="flex justify-between py-2">
                        <dt className="text-base font-medium">Total Price</dt>
                        <dd className="text-base font-bold">{priceDetails.currency} {(priceDetails.totalPrice / 100).toFixed(2)}</dd>
                      </div>
                      <div className="flex justify-between py-2">
                        <dt className="text-sm text-gray-500">Estimated Delivery</dt>
                        <dd className="text-sm font-medium">{priceDetails.estimatedDeliveryDays} days</dd>
                      </div>
                      <div className="flex justify-between py-2">
                        <dt className="text-sm text-gray-500">Carrier</dt>
                        <dd className="text-sm font-medium">{priceDetails.carrierName}</dd>
                      </div>
                    </dl>
                  )}
                </CardContent>
              </Card>
              
              <div className="mt-6">
                <FormField
                  control={form.control}
                  name="customerAccepted"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          I accept the shipping price and terms
                        </FormLabel>
                        <FormDescription>
                          By accepting, you agree to the shipping price and terms of service.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={prevFormStep}
              >
                Back to Package Information
              </Button>
              <Button 
                type="submit"
                disabled={isSubmitting || !form.getValues().customerAccepted}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Create Shipment"
                )}
              </Button>
            </div>
          </div>
        )}
      </form>
    </Form>
  );
}