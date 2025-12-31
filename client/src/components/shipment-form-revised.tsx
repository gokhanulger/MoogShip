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
import { COUNTRIES, getStatesByCountryCode, getCountryCodeByName, hasStates } from "@/lib/countries";

// Format countries for dropdown
const countries = COUNTRIES.map(country => ({
  value: country.name,
  label: country.name
}));

// First step schema - packages and destination country
const packageFormSchema = z.object({
  receiverCountry: z.string().min(1, "Country is required"),
  packageLength: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)),
    z.number().min(0.1, "Length must be greater than 0")
  ),
  packageWidth: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)),
    z.number().min(0.1, "Width must be greater than 0")
  ),
  packageHeight: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)),
    z.number().min(0.1, "Height must be greater than 0")
  ),
  packageWeight: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)),
    z.number().min(0.1, "Weight must be greater than 0")
  ),
  packageContents: z.string().min(1, "Description is required"),
  // Set serviceLevel to standard by default (not shown in UI)
  serviceLevel: z.nativeEnum(ServiceLevel).default(ServiceLevel.STANDARD),
});

// Second step schema - receiver information
const receiverFormSchema = z.object({
  receiverName: z.string().min(1, "Name is required"),
  receiverAddress: z.string().min(1, "Address is required"),
  receiverCity: z.string().min(1, "City is required"),
  receiverState: z.string().optional(),
  receiverCountry: z.string().min(1, "Country is required"),
  receiverPostalCode: z.string().min(1, "Postal code is required"),
  receiverPhone: z.string().min(1, "Phone is required"),
  receiverEmail: z.string().email("Please enter a valid email"),
});

// Combine schemas for the full shipment
const shipmentFormSchema = z.object({
  // Predefined sender fields
  senderName: z.string().default("TR Ofis"),
  senderAddress: z.string().default("Halil Rifat Pasa Mh. Perpa Tic."),
  senderAddress1: z.string().default("Halil Rifat Pasa Mh."),
  senderAddress2: z.string().default("Perpa Tic."),
  senderCity: z.string().default("Istanbul"),
  senderPostalCode: z.string().default("34384"),
  senderPhone: z.string().default(""),
  senderEmail: z.string().default(""),
  
  // Form fields
  ...packageFormSchema.shape,
  ...receiverFormSchema.shape,
  
  // Additional fields
  customerAccepted: z.boolean().default(false),
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
      senderAddress1: "Halil Rifat Pasa Mh.",
      senderAddress2: "Perpa Tic.",
      senderCity: "Istanbul",
      senderPostalCode: "34384",
      senderPhone: "",
      senderEmail: "",
      
      // Package information
      packageLength: 0,
      packageWidth: 0,
      packageHeight: 0,
      packageWeight: 0,
      packageContents: "",
      
      // Receiver information
      receiverName: "",
      receiverAddress: "",
      receiverCity: "",
      receiverState: "",
      receiverCountry: "",
      receiverPostalCode: "",
      receiverPhone: "",
      receiverEmail: "",
      
      // Service information
      serviceLevel: ServiceLevel.STANDARD,
      customerAccepted: false
    },
  });
  
  // Calculate price based on package dimensions, weight, and service level
  const calculatePrice = (data: Partial<ShipmentFormValues>) => {
    // Calculate volumetric weight (L x W x H / 5000)
    const length = data.packageLength || 0;
    const width = data.packageWidth || 0;
    const height = data.packageHeight || 0;
    const weight = data.packageWeight || 0;
    
    const volumetricWeight = (length * width * height) / 5000;
    
    // Use the larger of actual weight or volumetric weight
    const chargeableWeight = Math.max(weight, volumetricWeight);
    
    // Base price calculation (simplified for demonstration)
    let basePrice = chargeableWeight * 10; // $10 per kg
    
    // Apply service level multiplier
    const serviceLevel = data.serviceLevel || ServiceLevel.STANDARD;
    const serviceLevelMultiplier = 
      serviceLevel === ServiceLevel.STANDARD ? 1 :
      serviceLevel === ServiceLevel.EXPRESS ? 1.5 :
      serviceLevel === ServiceLevel.PRIORITY ? 2 : 1;
    
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
        serviceLevel === ServiceLevel.STANDARD ? 5 :
        serviceLevel === ServiceLevel.EXPRESS ? 2 :
        serviceLevel === ServiceLevel.PRIORITY ? 1 : 5,
      carrierName: 'UPS Express (Local)'
    };
  };
  
  // Calculate billable weight in real-time when package dimensions or weight change
  useEffect(() => {
    // Only run on the package information step
    if (formStep === 0) {
      const updateBillableWeight = () => {
        const data = form.getValues();
        
        // Ensure numeric values
        const packageLength = parseFloat(String(data.packageLength)) || 0;
        const packageWidth = parseFloat(String(data.packageWidth)) || 0;
        const packageHeight = parseFloat(String(data.packageHeight)) || 0;
        const packageWeight = parseFloat(String(data.packageWeight)) || 0;
        
        // Calculate volumetric weight (L x W x H / 5000)
        const volumetricWeight = (packageLength * packageWidth * packageHeight) / 5000;
        
        // Use the greater of actual weight or volumetric weight
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
    if (!values.customerAccepted && formStep === 1) {
      toast({
        title: "Price not accepted",
        description: "Please accept the shipping price before proceeding",
        variant: "destructive"
      });
      return;
    }
    
    // Include calculated price details with the form submission
    if (formStep === 2) {
      onSubmit({
        ...values,
        // Add calculated price data
        basePrice: priceDetails.basePrice,
        fuelCharge: priceDetails.fuelCharge,
        totalPrice: priceDetails.totalPrice,
        estimatedDeliveryDays: priceDetails.estimatedDeliveryDays,
        carrierName: priceDetails.carrierName
      });
    }
  };
  
  const calculatePriceFromAPI = async () => {
    const packageFields = ['receiverCountry', 'packageLength', 'packageWidth', 'packageHeight', 'packageWeight', 'packageContents', 'serviceLevel'];
    const isPackageValid = await form.trigger(packageFields as any);
    
    if (!isPackageValid) {
      toast({
        title: "Validation Failed",
        description: "Please fill in all required package information correctly",
        variant: "destructive",
      });
      return;
    }
    
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
      
      // Call the price API with properly formatted data
      const result = await priceCalculator.mutateAsync({
        senderPostalCode: formData.senderPostalCode,
        senderCity: formData.senderCity,
        receiverPostalCode: "00000", // We don't have this yet
        receiverCity: "City", // Placeholder
        receiverCountry: formData.receiverCountry,
        packageLength,
        packageWidth,
        packageHeight,
        packageWeight,
        serviceLevel: formData.serviceLevel
      });
      
      setPriceDetails(result);
      setFormStep(1); // Move to price confirmation step
      
      // Automatically accept price to simplify flow
      form.setValue('customerAccepted', true);
      
      toast({
        title: "Price Calculated",
        description: `Shipping will cost ${result.currency} ${(result.totalPrice / 100).toFixed(2)}`,
      });
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
      
      // Still move to price confirmation step
      setFormStep(1);
    } finally {
      setIsCalculatingPrice(false);
    }
  };
  
  const nextFormStep = async () => {
    if (formStep === 0) {
      calculatePriceFromAPI();
    } else if (formStep === 1) {
      // Move from price confirmation to receiver information
      setFormStep(2);
    } else if (formStep === 2) {
      // Final step - validate receiver info
      const receiverFields = ['receiverName', 'receiverAddress', 'receiverCity', 'receiverState', 'receiverCountry', 'receiverPostalCode', 'receiverPhone', 'receiverEmail'];
      const isReceiverValid = await form.trigger(receiverFields as any);
      
      if (isReceiverValid) {
        form.handleSubmit(handleFormSubmit)();
      }
    }
  };
  
  const prevFormStep = () => {
    if (formStep > 0) {
      setFormStep(formStep - 1);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={(e) => {
        e.preventDefault();
        if (formStep === 2) {
          form.handleSubmit(handleFormSubmit)(e);
        } else {
          nextFormStep();
        }
      }} className="space-y-6">
      
        {/* Step 0: Select Country and Package Information */}
        {formStep === 0 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="h-5 w-5 mr-2 text-primary" />
                  Destination & Package Details
                </CardTitle>
                <CardDescription>
                  Select destination country and enter package dimensions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Country Selection */}
                <div className="mb-6">
                  <FormField
                    control={form.control}
                    name="receiverCountry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Destination Country</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select destination country" />
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
                        <FormDescription>
                          Choose the country where the package will be delivered
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Package Dimensions */}
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
                </div>
                
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
                
                {/* Package Contents */}
                <div>
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
                

              </CardContent>
            </Card>
            
            <div className="flex justify-end">
              <Button 
                type="button"
                onClick={calculatePriceFromAPI}
                disabled={isCalculatingPrice}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isCalculatingPrice ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Calculating Price...
                  </>
                ) : (
                  "Calculate Price"
                )}
              </Button>
            </div>
          </div>
        )}
        
        {/* Step 1: Price Confirmation */}
        {formStep === 1 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="h-5 w-5 mr-2 text-primary" />
                  Shipping Price Details
                </CardTitle>
                <CardDescription>
                  Review and confirm shipping cost
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
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
              </CardContent>
            </Card>
            
            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={prevFormStep}
              >
                Back to Package Details
              </Button>
              <Button 
                type="button"
                onClick={nextFormStep}
                disabled={!form.getValues().customerAccepted}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Next: Enter Receiver Details
              </Button>
            </div>
          </div>
        )}
        
        {/* Step 2: Receiver Information */}
        {formStep === 2 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Receiver Information</CardTitle>
                <CardDescription>
                  Enter the details of where this package will be delivered
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
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
                  
                  <div>
                    <FormField
                      control={form.control}
                      name="receiverCountry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(value);
                              // Reset the state field when country changes
                              form.setValue('receiverState', '');
                            }}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select country" />
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
                  
                  {/* State/Province field - only shown for countries that have states */}
                  {form.watch('receiverCountry') && hasStates(getCountryCodeByName(form.watch('receiverCountry')) || '') && (
                    <div>
                      <FormField
                        control={form.control}
                        name="receiverState"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State/Province</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              value={field.value || ''}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select state/province" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {getStatesByCountryCode(getCountryCodeByName(form.watch('receiverCountry')) || '').map((state) => (
                                  <SelectItem key={state.code} value={state.name}>
                                    {state.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                  
                  <div className="sm:col-span-2">
                    <FormField
                      control={form.control}
                      name="receiverEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="Enter email address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={prevFormStep}
              >
                Back to Price Details
              </Button>
              <Button 
                type="submit"
                disabled={isSubmitting}
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