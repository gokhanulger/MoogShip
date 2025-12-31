import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeftIcon, Package, Calculator, TruckIcon, 
  Loader2, ChevronDown, ChevronUp, Check, MapPin, Box, Truck, User
} from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ServiceLevel, ShipmentStatus } from "@shared/schema";
import { showCreditLimitExceededToast } from "@/components/credit-limit-toast";
import { isCreditLimitError } from "@/lib/credit-limit";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { COUNTRIES } from "@/lib/countries";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// Form schemas
const receiverFormSchema = z.object({
  receiverName: z.string().min(1),
  receiverEmail: z.string().email().optional().or(z.literal('')),
  receiverPhone: z.string().min(1),
  receiverAddress: z.string().min(1),
  receiverCity: z.string().min(1),
  receiverPostalCode: z.string().min(1),
  packageContents: z.string().min(1).max(100),
  
  // Sender details
  senderName: z.string().min(1),
  senderAddress: z.string().min(1),
  senderCity: z.string().min(1),
  senderPostalCode: z.string().min(1),
  senderPhone: z.string().optional(),
  senderEmail: z.string().email().optional().or(z.literal('')),
});

const packageFormSchema = z.object({
  receiverCountry: z.string().min(1),
  packageLength: z.coerce.number().min(1),
  packageWidth: z.coerce.number().min(1),
  packageHeight: z.coerce.number().min(1),
  packageWeight: z.coerce.number().min(0.1),
  pieceCount: z.coerce.number().min(1),
  serviceLevel: z.string().min(1),
});

export default function ShipmentCreate() {
  const [, navigate] = useLocation();
  const [expandedSections, setExpandedSections] = useState(["recipient"]);
  const [selectedSender, setSelectedSender] = useState("MyAddress");
  const [customAddress, setCustomAddress] = useState({
    name: "",
    address: "",
    city: "",
    postalCode: "",
    phone: "",
    email: ""
  });
  const [billableWeight, setBillableWeight] = useState<number | null>(null);
  const [priceDetails, setPriceDetails] = useState<any>(null);
  const [isCalculatingPrice, setIsCalculatingPrice] = useState(false);
  const [acceptedPrice, setAcceptedPrice] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  // Initialize forms with default values
  const receiverForm = useForm<z.infer<typeof receiverFormSchema>>({
    resolver: zodResolver(receiverFormSchema),
    defaultValues: {
      receiverName: "",
      receiverEmail: "",
      receiverPhone: "",
      receiverAddress: "",
      receiverCity: "",
      receiverPostalCode: "",
      packageContents: "",
      senderName: "",
      senderAddress: "",
      senderCity: "",
      senderPostalCode: "",
      senderPhone: "",
      senderEmail: "",
    },
  });
  
  const packageForm = useForm<z.infer<typeof packageFormSchema>>({
    resolver: zodResolver(packageFormSchema),
    defaultValues: {
      receiverCountry: "US",
      packageLength: 0,
      packageWidth: 0,
      packageHeight: 0,
      packageWeight: 0,
      pieceCount: 1,
      serviceLevel: ServiceLevel.STANDARD,
    },
  });
  
  // Load user's address on initial render
  useEffect(() => {
    const loadUserAddress = async () => {
      try {
        const response = await fetch("/api/user", {
          credentials: "include"
        });
        
        if (!response.ok) {
          console.error("Failed to load user data");
          return;
        }
        
        const userData = await response.json();
        
        // Check if the user has address data
        if (userData.name && userData.address && userData.city && userData.postalCode) {
          // Update the form with the user's address details
          receiverForm.setValue("senderName", userData.name);
          receiverForm.setValue("senderAddress", userData.address);
          receiverForm.setValue("senderCity", userData.city);
          receiverForm.setValue("senderPostalCode", userData.postalCode);
          receiverForm.setValue("senderPhone", userData.phone || "");
          receiverForm.setValue("senderEmail", userData.email || "");
        }
      } catch (error) {
        console.error("Error loading user address:", error);
      }
    };
    
    loadUserAddress();
    
    // If there's stored data, load it
    const storedValues = localStorage.getItem('packageDetails');
    if (storedValues) {
      try {
        const parsedValues = JSON.parse(storedValues);
        
        // Update form values if they exist
        if (parsedValues.length) packageForm.setValue('packageLength', parseFloat(parsedValues.length));
        if (parsedValues.width) packageForm.setValue('packageWidth', parseFloat(parsedValues.width));
        if (parsedValues.height) packageForm.setValue('packageHeight', parseFloat(parsedValues.height));
        if (parsedValues.weight) packageForm.setValue('packageWeight', parseFloat(parsedValues.weight));
        if (parsedValues.country) packageForm.setValue('receiverCountry', parsedValues.country);
        if (parsedValues.service) packageForm.setValue('serviceLevel', parsedValues.service);
        if (parsedValues.contents) receiverForm.setValue('packageContents', parsedValues.contents);
        
        // Clear localStorage after using the values
        localStorage.removeItem('packageDetails');
      } catch (error) {
        console.error("Error parsing stored values:", error);
      }
    }
  }, [receiverForm, packageForm]);
  
  // Helper functions
  // Check if a section is complete
  const isSectionComplete = (section: string): boolean => {
    if (section === "recipient") {
      return receiverForm.formState.isValid;
    } else if (section === "package") {
      return packageForm.formState.isValid;
    } else if (section === "price") {
      return !!priceDetails && acceptedPrice;
    }
    return false;
  };
  
  // Toggle a section's expanded state
  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section) 
        : [...prev, section]
    );
  };
  
  // Handle receiver form submission
  const onReceiverSubmit = (data: z.infer<typeof receiverFormSchema>) => {
    // No special action needed, just expand the next section
    setExpandedSections(prev => 
      prev.includes("package") ? prev : [...prev, "package"]
    );
    
    // Scroll to the next section
    setTimeout(() => {
      const packageSection = document.getElementById("package-section");
      if (packageSection) {
        packageSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  };
  
  // Handle package form submission
  const onPackageSubmit = (data: z.infer<typeof packageFormSchema>) => {
    // Calculate volume weight
    const volumeWeight = (data.packageLength * data.packageWidth * data.packageHeight) / 5000;
    const actualWeight = data.packageWeight;
    
    // Determine the billable weight (the higher of actual and volume weight)
    const billable = Math.max(volumeWeight, actualWeight);
    setBillableWeight(billable);
    
    // Calculate the price
    calculatePrice();
  };
  
  // We're using the imported showCreditLimitExceededToast from @/components/credit-limit-toast
  
  // We're now using the imported isCreditLimitError from @/lib/credit-limit
  
  // Calculate shipping price
  const calculatePrice = async () => {
    setIsCalculatingPrice(true);
    try {
      // Ensure both forms are valid
      const receiverFormValid = await receiverForm.trigger();
      const packageFormValid = await packageForm.trigger();
      
      if (!receiverFormValid || !packageFormValid) {
        toast({
          title: "Please complete all required fields",
          description: "Ensure all required fields in the recipient and package sections are filled in.",
          variant: "destructive"
        });
        return;
      }
      
      const receiverFormData = receiverForm.getValues();
      const packageFormData = packageForm.getValues();
      
      // Make API call to calculate price
      const response = await fetch("/api/calculate-price", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          // Package and shipment details
          pieceCount: packageFormData.pieceCount,
          packageLength: packageFormData.packageLength,
          packageWidth: packageFormData.packageWidth,
          packageHeight: packageFormData.packageHeight,
          packageWeight: packageFormData.packageWeight,
          serviceLevel: packageFormData.serviceLevel,
          receiverCountry: packageFormData.receiverCountry,
          senderPostalCode: receiverFormData.senderPostalCode,
          senderCity: receiverFormData.senderCity,
          receiverPostalCode: receiverFormData.receiverPostalCode,
          receiverCity: receiverFormData.receiverCity,
        }),
        credentials: "include"
      });
      
      if (!response.ok) {
        throw new Error("Failed to calculate price");
      }
      
      const data = await response.json();
      setPriceDetails(data);
      
      // Check credit limit
      if (data.totalPrice) {
        try {
          // First create a temporary shipment for credit limit checking
          const tempRes = await fetch("/api/shipments/temporary", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ totalPrice: data.totalPrice }),
            credentials: "include"
          });
          
          if (!tempRes.ok) {
            console.error("Failed to create temporary shipment for credit check");
            return;
          }
          
          const tempShipment = await tempRes.json();
          
          // Now check if this would exceed the credit limit
          const creditCheckRes = await fetch(`/api/shipments/check-credit-limit/${tempShipment.id}`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json"
            },
            credentials: "include"
          });
          
          if (!creditCheckRes.ok) {
            console.error("Credit limit check failed");
            return;
          }
          
          const creditCheck = await creditCheckRes.json();
          
          // If credit limit would be exceeded, show a warning toast
          if (creditCheck.exceeds) {
            toast({
              title: "Credit Limit Warning",
              description: (
                <div className="bg-amber-50 p-3 rounded-md border border-amber-200">
                  <p className="font-semibold text-amber-600 mb-2">Warning: Credit Limit</p>
                  <p className="text-sm text-gray-700">This shipment would exceed your credit limit.</p>
                  <p className="text-sm text-gray-700 mt-1">You can still continue, but it's recommended to add funds to your account.</p>
                </div>
              ),
              variant: "default",
              duration: 8000
            });
          }
        } catch (error) {
          console.error("Failed to check credit limit:", error);
          // Don't block the price calculation if credit check fails
        }
      }
      
      // Expand the price section automatically and scroll to it
      setExpandedSections(prev => 
        prev.includes("price") ? prev : [...prev, "price"]
      );
      
      // Scroll to the price section after a short delay to ensure it's visible
      setTimeout(() => {
        const priceSection = document.getElementById("price-section");
        if (priceSection) {
          priceSection.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    } catch (error) {
      toast({
        title: "Price calculation failed",
        description: "There was a problem calculating the shipping price. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCalculatingPrice(false);
    }
  };
  
  // Shipment creation mutation
  const createShipmentMutation = useMutation({
    mutationFn: async (shipmentData: any) => {
      if (!priceDetails) {
        throw new Error("Price details not available");
      }
      
      // Validate all sections
      if (!isSectionComplete("recipient") || !isSectionComplete("package") || !isSectionComplete("price")) {
        throw new Error("Please complete all sections before creating shipment");
      }
      
      // Check credit limit first with a separate API call
      try {
        // First create a temporary shipment for credit limit checking
        const tempRes = await fetch("/api/shipments/temporary", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ totalPrice: priceDetails.totalPrice }),
          credentials: "include"
        });
        
        if (!tempRes.ok) {
          console.error("Failed to create temporary shipment for credit check");
          throw new Error("Failed to check credit limit");
        }
        
        const tempShipment = await tempRes.json();
        
        // Now check if this would exceed the credit limit
        const creditCheckRes = await fetch(`/api/shipments/check-credit-limit/${tempShipment.id}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include"
        });
        
        if (!creditCheckRes.ok) {
          console.error("Credit limit check failed");
          throw new Error("Failed to check credit limit");
        }
        
        const creditCheck = await creditCheckRes.json();
        
        // If credit limit would be exceeded, show the toast and cancel the mutation
        if (creditCheck.exceeds) {
          showCreditLimitExceededToast(creditCheck);
          throw new Error("CREDIT_LIMIT_EXCEEDED");
        }
      } catch (error) {
        if ((error as Error).message === "CREDIT_LIMIT_EXCEEDED") {
          throw error;
        }
        console.error("Error during credit limit check:", error);
        // Continue with the shipment creation even if credit check fails
        // The server will still enforce credit limits
      }
      
      const enhancedShipmentData = {
        ...shipmentData,
        status: ShipmentStatus.PENDING,
        price: priceDetails.totalPrice,
        totalPrice: priceDetails.totalPrice, 
        basePrice: priceDetails.basePrice,
        fuelCharge: priceDetails.fuelCharge,
        currency: priceDetails.currency || "USD",
        carrierName: priceDetails.carrierName || "Shipentegra",
        estimatedDeliveryDays: priceDetails.estimatedDeliveryDays || 7,
      };
      
      // Use fetch directly for better error handling
      const response = await fetch("/api/shipments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(enhancedShipmentData),
        credentials: "include"
      });
      
      const responseData = await response.json();
      
      // If the response is not ok, handle various error cases
      if (!response.ok) {
        // Log the complete response for debugging
        console.log("Error response from API:", response.status, responseData);
        
        // Handle credit limit errors - look for specific credit limit messages or details
        if ((responseData.message && responseData.message.includes("credit limit")) ||
            (responseData.message && responseData.message.includes("Cannot create shipment")) ||
            (responseData.message && responseData.message.includes("shipment: This sh"))) {
          
          console.log("Credit limit error detected in response:", responseData);
          
          // Extract credit details from response if they exist, following the server's nesting structure
          if (responseData.creditDetails) {
            console.log("Found creditDetails in response:", responseData.creditDetails);
            // Pass only the creditDetails object to avoid showing any JSON structure in the toast
            showCreditLimitExceededToast(responseData.creditDetails);
          } 
          // For legacy responses that might have the data at the top level
          else {
            console.log("No creditDetails found in response, using simplified message");
            // Use a simplified message with no technical details
            showCreditLimitExceededToast();
          }
          
          throw new Error("CREDIT_LIMIT_EXCEEDED");
        }
        
        // For other errors
        const error: any = new Error(responseData.message || "Failed to create shipment");
        error.status = response.status;
        error.errorData = responseData;
        throw error;
      }
      
      return responseData;
    },
    onSuccess: () => {
      toast({
        title: "Shipment created",
        description: "Your shipment has been successfully created and is pending approval.",
      });
      
      // Invalidate query cache and navigate to dashboard
      queryClient.invalidateQueries({ queryKey: ['/api/shipments/my'] });
      navigate("/");
    },
    onError: (error: any) => {
      // Skip error toasts for credit limit errors as they're already shown
      if (error.message === "CREDIT_LIMIT_EXCEEDED") {
        return;
      }
      
      // Check if it's a credit limit error
      if (isCreditLimitError(error)) {
        showCreditLimitExceededToast();
        return;
      }
      
      // For other errors, show a generic error message
      let errorMessage = "Failed to create shipment";
      
      if (error?.errorData?.message) {
        errorMessage = error.errorData.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error creating shipment",
        description: errorMessage,
        variant: "destructive"
      });
    }
  });
  
  return (
    <Layout hideMobileActions={true}>
      <div className="container py-6">
        {/* Desktop header */}
        <div className="hidden md:flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('createShipment.title')}</h1>
            <p className="text-muted-foreground mt-1">
              {t('createShipment.subtitle')}
            </p>
          </div>
          <Button
            variant="outline"
            className="flex items-center"
            onClick={() => navigate("/")}
          >
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            {t('createShipment.backToDashboard')}
          </Button>
        </div>
        
        {/* Mobile header */}
        <div className="md:hidden mb-6">
          <div className="flex items-center mb-2">
            <Button 
              variant="ghost" 
              size="sm"
              className="mr-2 -ml-3 h-9 w-9"
              onClick={() => navigate("/")}
            >
              <ArrowLeftIcon className="h-4 w-4" />
              <span className="sr-only">{t('common.back')}</span>
            </Button>
            <h1 className="text-xl font-bold">{t('createShipment.title')}</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            {t('createShipment.subtitle')}
          </p>
        </div>
        
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="relative">
            <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
              <div 
                className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary transition-all duration-500 ease-in-out`}
                style={{ 
                  width: `${(
                    (isSectionComplete("recipient") ? 1 : 0) + 
                    (isSectionComplete("package") ? 1 : 0) + 
                    (isSectionComplete("price") ? 1 : 0)
                  ) * 33.33}%` 
                }}
              />
            </div>
            
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <div className={`flex items-center gap-1 ${isSectionComplete("recipient") ? "text-primary font-semibold" : ""}`}>
                {isSectionComplete("recipient") ? <Check className="h-3 w-3" /> : "1."} {t('createShipment.sections.recipient')}
              </div>
              <div className={`flex items-center gap-1 ${isSectionComplete("package") ? "text-primary font-semibold" : ""}`}>
                {isSectionComplete("package") ? <Check className="h-3 w-3" /> : "2."} {t('createShipment.sections.package')}
              </div>
              <div className={`flex items-center gap-1 ${isSectionComplete("price") ? "text-primary font-semibold" : ""}`}>
                {isSectionComplete("price") ? <Check className="h-3 w-3" /> : "3."} {t('createShipment.sections.price')}
              </div>
            </div>
          </div>
        </div>
        
        {/* 1. Recipient Information Section */}
        <Card className={`${expandedSections.includes("recipient") ? "border-primary" : ""}`}>
          <CardHeader 
            className="cursor-pointer flex flex-row items-center justify-between"
            onClick={() => toggleSection("recipient")}
          >
            <div className="flex items-center">
              <div className="bg-primary text-white p-2 rounded-full mr-3">
                <MapPin className="h-5 w-5" />
              </div>
              <CardTitle className="text-xl">{t('createShipment.recipientInfo.title')} & {t('createShipment.senderInfo.title')}</CardTitle>
            </div>
            <div className="flex items-center">
              {isSectionComplete("recipient") && (
                <span className="text-green-600 text-sm mr-2 flex items-center">
                  <Check className="h-4 w-4 mr-1" /> {t('createShipment.validation.completeFields')}
                </span>
              )}
              {expandedSections.includes("recipient") ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </div>
          </CardHeader>
          
          {expandedSections.includes("recipient") && (
            <CardContent>
              <Form {...receiverForm}>
                <form onSubmit={receiverForm.handleSubmit(onReceiverSubmit)} className="space-y-6">
                  <div className="border-b pb-4 mb-6">
                    <h3 className="text-lg font-medium mb-4">{t('createShipment.recipientInfo.title')}</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={receiverForm.control}
                        name="receiverName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('createShipment.recipientInfo.name')}</FormLabel>
                            <FormControl>
                              <Input placeholder={t('createShipment.recipientInfo.name')} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={receiverForm.control}
                        name="receiverPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('createShipment.recipientInfo.phone')}</FormLabel>
                            <FormControl>
                              <Input placeholder={t('createShipment.recipientInfo.phone')} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={receiverForm.control}
                        name="receiverEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('createShipment.recipientInfo.email')}</FormLabel>
                            <FormControl>
                              <Input placeholder={t('createShipment.recipientInfo.email')} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={receiverForm.control}
                        name="receiverAddress"
                        render={({ field }) => (
                          <FormItem className="sm:col-span-2">
                            <FormLabel>{t('createShipment.recipientInfo.address')}</FormLabel>
                            <FormControl>
                              <Input placeholder={t('createShipment.recipientInfo.address')} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={receiverForm.control}
                        name="receiverCity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('createShipment.recipientInfo.city')}</FormLabel>
                            <FormControl>
                              <Input placeholder={t('createShipment.recipientInfo.city')} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={receiverForm.control}
                        name="receiverPostalCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('createShipment.recipientInfo.postalCode')}</FormLabel>
                            <FormControl>
                              <Input placeholder={t('createShipment.recipientInfo.postalCode')} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <div className="border-b pb-4 mb-6">
                    <h3 className="text-lg font-medium mb-4">{t('shipping.customsInfo')}</h3>
                    <div className="grid gap-4">
                      <FormField
                        control={receiverForm.control}
                        name="packageContents"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('createShipment.recipientInfo.contents')}</FormLabel>
                            <FormControl>
                              <Input placeholder={t('createShipment.recipientInfo.contents')} {...field} />
                            </FormControl>
                            <FormDescription>
                              {t('createShipment.validation.contentsMaxLength')}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-4">{t('createShipment.senderInfo.title')}</h3>
                    
                    <div className="mb-6">
                      <Label className="mb-2 block">{t('common.select')} {t('createShipment.senderInfo.title')}</Label>
                      <RadioGroup 
                        defaultValue="MyAddress"
                        value={selectedSender}
                        onValueChange={setSelectedSender}
                        className="grid gap-4 md:grid-cols-2"
                      >
                        <div className={`border rounded-md p-4 ${selectedSender === "MyAddress" ? "border-primary bg-primary/5" : ""}`}>
                          <RadioGroupItem value="MyAddress" id="MyAddress" className="sr-only" />
                          <Label
                            htmlFor="MyAddress"
                            className="flex items-center justify-between cursor-pointer"
                          >
                            <div>
                              <h4 className="font-medium">{t('common.myAddress')}</h4>
                              <p className="text-sm text-muted-foreground">{t('common.useSavedAddress')}</p>
                            </div>
                            <User className="h-5 w-5 text-primary" />
                          </Label>
                        </div>
                        
                        <div className={`border rounded-md p-4 ${selectedSender === "Custom" ? "border-primary bg-primary/5" : ""}`}>
                          <RadioGroupItem value="Custom" id="Custom" className="sr-only" />
                          <Label
                            htmlFor="Custom"
                            className="flex items-center justify-between cursor-pointer"
                          >
                            <div>
                              <h4 className="font-medium">{t('common.customAddress')}</h4>
                              <p className="text-sm text-muted-foreground">{t('common.useDifferentAddress')}</p>
                            </div>
                            <Package className="h-5 w-5 text-primary" />
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                    
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={receiverForm.control}
                        name="senderName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('createShipment.senderInfo.name')}</FormLabel>
                            <FormControl>
                              <Input placeholder={t('createShipment.senderInfo.name')} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={receiverForm.control}
                        name="senderPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('createShipment.senderInfo.phone')}</FormLabel>
                            <FormControl>
                              <Input placeholder={t('createShipment.senderInfo.phone')} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={receiverForm.control}
                        name="senderEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('createShipment.senderInfo.email')}</FormLabel>
                            <FormControl>
                              <Input placeholder={t('createShipment.senderInfo.email')} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={receiverForm.control}
                        name="senderAddress"
                        render={({ field }) => (
                          <FormItem className="sm:col-span-2">
                            <FormLabel>{t('createShipment.senderInfo.address')}</FormLabel>
                            <FormControl>
                              <Input placeholder={t('createShipment.senderInfo.address')} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={receiverForm.control}
                        name="senderCity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('createShipment.senderInfo.city')}</FormLabel>
                            <FormControl>
                              <Input placeholder={t('createShipment.senderInfo.city')} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={receiverForm.control}
                        name="senderPostalCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('createShipment.senderInfo.postalCode')}</FormLabel>
                            <FormControl>
                              <Input placeholder={t('createShipment.senderInfo.postalCode')} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button type="submit">
                      {t('createShipment.actions.continueToPackage')}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          )}
        </Card>
        
        {/* 2. Package Details Section */}
        <Card className={`mt-4 ${expandedSections.includes("package") ? "border-primary" : ""}`} id="package-section">
          <CardHeader 
            className="cursor-pointer flex flex-row items-center justify-between"
            onClick={() => toggleSection("package")}
          >
            <div className="flex items-center">
              <div className="bg-primary text-white p-2 rounded-full mr-3">
                <Box className="h-5 w-5" />
              </div>
              <CardTitle className="text-xl">{t('createShipment.packageDetails.title')}</CardTitle>
            </div>
            <div className="flex items-center">
              {isSectionComplete("package") && (
                <span className="text-green-600 text-sm mr-2 flex items-center">
                  <Check className="h-4 w-4 mr-1" /> {t('createShipment.validation.completeFields')}
                </span>
              )}
              {expandedSections.includes("package") ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </div>
          </CardHeader>
          
          {expandedSections.includes("package") && (
            <CardContent>
              <Form {...packageForm}>
                <form onSubmit={packageForm.handleSubmit(onPackageSubmit)} className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={packageForm.control}
                      name="receiverCountry"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>{t('createShipment.packageDetails.destinationCountry')}</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('createShipment.packageDetails.selectCountry')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {COUNTRIES.map((country) => (
                                <SelectItem key={country.code} value={country.code}>
                                  {country.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={packageForm.control}
                      name="serviceLevel"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>{t('createShipment.packageDetails.serviceLevel')}</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('createShipment.packageDetails.selectServiceLevel')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value={ServiceLevel.STANDARD}>{t('shipping.serviceOptions.standard')}</SelectItem>
                              <SelectItem value={ServiceLevel.EXPRESS}>{t('shipping.serviceOptions.express')}</SelectItem>
                              <SelectItem value={ServiceLevel.PRIORITY}>{t('shipping.serviceOptions.priority')}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="sm:col-span-2">
                      <h3 className="text-base font-medium mb-3 mt-2">{t('createShipment.packageDetails.dimensions')}</h3>
                    </div>
                    
                    <FormField
                      control={packageForm.control}
                      name="packageLength"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('createShipment.packageDetails.length')}</FormLabel>
                          <FormControl>
                            <Input type="number" min="1" step="0.1" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={packageForm.control}
                      name="packageWidth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('createShipment.packageDetails.width')}</FormLabel>
                          <FormControl>
                            <Input type="number" min="1" step="0.1" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={packageForm.control}
                      name="packageHeight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('createShipment.packageDetails.height')}</FormLabel>
                          <FormControl>
                            <Input type="number" min="1" step="0.1" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={packageForm.control}
                      name="packageWeight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('createShipment.packageDetails.weight')}</FormLabel>
                          <FormControl>
                            <Input type="number" min="0.1" step="0.1" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={packageForm.control}
                      name="pieceCount"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>{t('createShipment.packageDetails.pieces')}</FormLabel>
                          <FormControl>
                            <Input type="number" min="1" step="1" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        toggleSection("recipient");
                        setTimeout(() => document.getElementById("recipient")?.scrollIntoView({ behavior: "smooth" }), 100);
                      }}
                    >
                      {t('common.back')}
                    </Button>
                    <Button type="submit" disabled={isCalculatingPrice} className="min-w-[140px]">
                      {isCalculatingPrice ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t('common.calculating')}
                        </>
                      ) : (
                        <>
                          <Calculator className="mr-2 h-4 w-4" />
                          {t('createShipment.actions.calculatePrice')}
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          )}
        </Card>
        
        {/* 3. Price & Submit Section */}
        <Card className={`mt-4 ${expandedSections.includes("price") ? "border-primary" : ""}`} id="price-section">
          <CardHeader 
            className="cursor-pointer flex flex-row items-center justify-between"
            onClick={() => toggleSection("price")}
          >
            <div className="flex items-center">
              <div className="bg-primary text-white p-2 rounded-full mr-3">
                <Truck className="h-5 w-5" />
              </div>
              <CardTitle className="text-xl">{t('createShipment.sections.price')}</CardTitle>
            </div>
            <div className="flex items-center">
              {isSectionComplete("price") && (
                <span className="text-green-600 text-sm mr-2 flex items-center">
                  <Check className="h-4 w-4 mr-1" /> {t('createShipment.validation.completeFields')}
                </span>
              )}
              {expandedSections.includes("price") ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </div>
          </CardHeader>
          
          {expandedSections.includes("price") && (
            <CardContent>
              {priceDetails ? (
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-lg p-4 border">
                    <h3 className="text-lg font-medium mb-3">{t('shipping.cost')}</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('shipping.baseRate')}</span>
                        <span>${(priceDetails.basePrice / 100).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('shipping.fuelSurcharge')}</span>
                        <span>${(priceDetails.fuelCharge / 100).toFixed(2)}</span>
                      </div>
                      <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
                        <span>{t('common.total')}</span>
                        <span>${(priceDetails.totalPrice / 100).toFixed(2)}</span>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 mt-4 p-3 rounded border border-blue-200">
                      <div className="flex items-start">
                        <TruckIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-2" />
                        <div>
                          <h4 className="text-sm font-medium text-blue-800">
                            {priceDetails.carrierName || t('shipping.standardService')}
                          </h4>
                          <p className="text-xs text-blue-600 mt-1">
                            {t('shipping.estimatedDelivery', { days: priceDetails.estimatedDeliveryDays || 5 })}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {billableWeight && (
                      <div className="text-sm text-muted-foreground mt-3">
                        <span className="font-medium">{t('shipping.billableWeight')}:</span> {billableWeight.toFixed(2)} kg
                      </div>
                    )}
                  </div>
                  
                  {/* Terms and conditions acceptance */}
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="accept-price"
                        checked={acceptedPrice}
                        onChange={(e) => setAcceptedPrice(e.target.checked)}
                        className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                      />
                      <label htmlFor="accept-price" className="ml-2 block text-sm text-gray-700">
                        {t('shipping.termsAcceptance')}
                      </label>
                    </div>
                  </div>
                  
                  {/* Submit button */}
                  <div className="flex justify-end space-x-3">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        toggleSection("package");
                        setTimeout(() => document.getElementById("package-section")?.scrollIntoView({ behavior: "smooth" }), 100);
                      }}
                    >
                      {t('common.back')}
                    </Button>
                    <Button 
                      onClick={() => {
                        // Combine data from both forms for the final submission
                        const receiverData = receiverForm.getValues();
                        const packageData = packageForm.getValues();
                        const packageItems = [{
                          name: receiverData.packageContents,
                          description: "This is a sample product description",
                          quantity: "1",
                          price: "69.99",
                          currency: "USD",
                          gtin: "",
                          hsCode: "1234.56.81",
                          weight: (packageData.packageWeight / 2).toFixed(1),
                          length: "10",
                          width: "10",
                          height: "10",
                          countryOfOrigin: "Turkey",
                          manufacturer: ""
                        }];
                        
                        // Create a package record
                        const physicalPackages = [{
                          id: Date.now(), // Use a timestamp as a temp ID
                          name: `${packageData.packageLength}×${packageData.packageWidth}×${packageData.packageHeight} cm`,
                          description: null,
                          weight: packageData.packageWeight,
                          length: packageData.packageLength,
                          width: packageData.packageWidth,
                          height: packageData.packageHeight,
                          items: [] // We'll associate items separately
                        }];
                        
                        // Combine everything
                        const shipmentData = {
                          ...receiverData,
                          ...packageData,
                          packageItems,
                          packages: physicalPackages,
                          customsItemCount: 1, // Default to 1
                          customsValue: 6999 // Default to $69.99 in cents
                        };
                        
                        // Submit the shipment
                        createShipmentMutation.mutate(shipmentData);
                      }}
                      disabled={createShipmentMutation.isPending || !acceptedPrice}
                      variant={acceptedPrice ? "default" : "outline"}
                      className="min-w-[140px]"
                    >
                      {createShipmentMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t('common.creating')}
                        </>
                      ) : (
                        t('createShipment.actions.create')
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    {t('createShipment.validation.calculatePriceFirst')}
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => {
                      toggleSection("package");
                      setTimeout(() => document.getElementById("package-section")?.scrollIntoView({ behavior: "smooth" }), 100);
                    }}
                  >
                    {t('createShipment.actions.goToPackageDetails')}
                  </Button>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      </div>
    </Layout>
  );
}