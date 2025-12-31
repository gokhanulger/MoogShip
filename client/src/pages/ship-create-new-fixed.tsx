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
  receiverName: z.string().min(1, "Receiver name is required"),
  receiverEmail: z.string().email().optional().or(z.literal('')),
  receiverPhone: z.string().min(1, "Receiver phone is required"),
  receiverAddress: z.string().min(1, "Receiver address is required"),
  receiverCity: z.string().min(1, "Receiver city is required"),
  receiverPostalCode: z.string().min(1, "Receiver postal code is required"),
  packageContents: z.string().min(1, "Package contents are required"),
  
  // Sender details
  senderName: z.string().min(1, "Sender name is required"),
  senderAddress: z.string().min(1, "Sender address is required"),
  senderCity: z.string().min(1, "Sender city is required"),
  senderPostalCode: z.string().min(1, "Sender postal code is required"),
  senderPhone: z.string().optional(),
  senderEmail: z.string().email().optional().or(z.literal('')),
});

const packageFormSchema = z.object({
  receiverCountry: z.string().min(1, "Destination country is required"),
  packageLength: z.coerce.number().min(1, "Length must be at least 1 cm"),
  packageWidth: z.coerce.number().min(1, "Width must be at least 1 cm"),
  packageHeight: z.coerce.number().min(1, "Height must be at least 1 cm"),
  packageWeight: z.coerce.number().min(0.1, "Weight must be at least 0.1 kg"),
  pieceCount: z.coerce.number().min(1, "Must have at least 1 piece"),
  serviceLevel: z.string().min(1, "Service level is required"),
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
  const [selectedPriceOption, setSelectedPriceOption] = useState<string | null>(null);
  const { toast } = useToast();
  
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
      return !!priceDetails && !!selectedPriceOption;
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
  
  // Function to show credit limit exceeded notification
  const showCreditLimitExceededToast = (creditDetails?: any) => {
    let description;
    
    if (creditDetails) {
      // Format the numbers for better readability
      const formattedUserBalance = `$${(creditDetails.userBalance / 100).toFixed(2)}`;
      const formattedShipmentPrice = `$${(creditDetails.shipmentPrice / 100).toFixed(2)}`;
      const formattedNewBalance = `$${(creditDetails.newBalance / 100).toFixed(2)}`;
      const formattedMinBalance = creditDetails.minBalance !== null ? 
        `$${(creditDetails.minBalance / 100).toFixed(2)}` : 'Not set';
      
      description = (
        <div className="space-y-2">
          <p className="font-medium text-red-600">Your shipment cannot be created because it would exceed your credit limit.</p>
          <div className="grid grid-cols-2 gap-1 text-sm">
            <p>Current balance:</p>
            <p className="font-semibold">{formattedUserBalance}</p>
            <p>Shipment cost:</p>
            <p className="font-semibold">{formattedShipmentPrice}</p>
            <p>New balance would be:</p>
            <p className="font-semibold">{formattedNewBalance}</p>
            <p>Minimum balance limit:</p>
            <p className="font-semibold">{formattedMinBalance}</p>
          </div>
          <p className="text-sm mt-2">Please add funds to your account or contact support for assistance.</p>
        </div>
      );
    } else {
      // Simple version without details
      description = (
        <div className="bg-red-50 p-3 rounded-md border border-red-200">
          <p className="font-semibold text-red-600 mb-2">You cannot create this shipment</p>
          <p className="text-sm text-gray-700 mb-1">Your account balance would fall below the allowed credit limit.</p>
          <p className="text-sm text-gray-700">Please add funds to your account before creating this shipment, or contact support for assistance.</p>
        </div>
      );
    }
    
    toast({
      title: "Credit Limit Exceeded",
      description,
      variant: "destructive",
      duration: 10000 // Keep it visible for 10 seconds
    });
  };
  
  // Helper to determine if an error is related to credit limit
  const isCreditLimitError = (error: any): boolean => {
    return (
      error?.errorData?.message?.includes("credit limit") || 
      error?.message?.includes("credit limit")
    );
  };
  
  // Calculate shipping price using MoogShip pricing options
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
      
      // Make API call to calculate MoogShip pricing options
      const response = await fetch("/api/pricing/moogship-options", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          senderPostalCode: receiverFormData.senderPostalCode,
          senderCity: receiverFormData.senderCity,
          receiverPostalCode: receiverFormData.receiverPostalCode,
          receiverCity: receiverFormData.receiverCity,
          receiverCountry: packageFormData.receiverCountry,
          packageLength: packageFormData.packageLength,
          packageWidth: packageFormData.packageWidth,
          packageHeight: packageFormData.packageHeight,
          packageWeight: packageFormData.packageWeight,
          serviceLevel: packageFormData.serviceLevel,
        }),
        credentials: "include"
      });
      
      if (!response.ok) {
        throw new Error("Failed to calculate MoogShip pricing options");
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
      if (!priceDetails || !selectedPriceOption) {
        throw new Error("Price details or selected option not available");
      }
      
      // Get the selected price option
      const selectedOption = priceDetails.options.find((opt: any) => opt.id === selectedPriceOption);
      if (!selectedOption) {
        throw new Error("Selected pricing option not found");
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
          body: JSON.stringify({ totalPrice: selectedOption.totalPrice }),
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
        price: selectedOption.totalPrice,
        totalPrice: selectedOption.totalPrice, 
        basePrice: selectedOption.cargoPrice,
        fuelCharge: selectedOption.fuelCost,
        currency: priceDetails.currency || "USD",
        carrierName: "MoogShip",
        estimatedDeliveryDays: 7, // Default, will be updated based on service type
        serviceLevel: selectedOption.serviceType || "STANDARD",
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
      
      // If the response indicates a credit limit issue, show the toast and throw an error
      if (!response.ok) {
        if (responseData.message && responseData.message.includes("credit limit")) {
          console.log("Credit limit error detected in API response:", responseData);
          showCreditLimitExceededToast();
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
            <h1 className="text-3xl font-bold tracking-tight">Create New Shipment</h1>
            <p className="text-muted-foreground mt-1">
              Fill in the shipment details to create a new order.
            </p>
          </div>
          <Button
            variant="outline"
            className="flex items-center"
            onClick={() => navigate("/")}
          >
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            Back to Dashboard
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
              <span className="sr-only">Back</span>
            </Button>
            <h1 className="text-xl font-bold">Create New Shipment</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Fill in the shipment details to create a new order.
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
                {isSectionComplete("recipient") ? <Check className="h-3 w-3" /> : "1."} Recipient
              </div>
              <div className={`flex items-center gap-1 ${isSectionComplete("package") ? "text-primary font-semibold" : ""}`}>
                {isSectionComplete("package") ? <Check className="h-3 w-3" /> : "2."} Package
              </div>
              <div className={`flex items-center gap-1 ${isSectionComplete("price") ? "text-primary font-semibold" : ""}`}>
                {isSectionComplete("price") ? <Check className="h-3 w-3" /> : "3."} Price & Submit
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
              <CardTitle className="text-xl">Recipient & Sender Details</CardTitle>
            </div>
            <div className="flex items-center">
              {isSectionComplete("recipient") && (
                <span className="text-green-600 text-sm mr-2 flex items-center">
                  <Check className="h-4 w-4 mr-1" /> Complete
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
                    <h3 className="text-lg font-medium mb-4">Recipient Information</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={receiverForm.control}
                        name="receiverName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Recipient Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Full name" {...field} />
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
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input placeholder="Phone number" {...field} />
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
                            <FormLabel>Email (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Email address" {...field} />
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
                            <FormLabel>Address</FormLabel>
                            <FormControl>
                              <Input placeholder="Street address" {...field} />
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
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input placeholder="City" {...field} />
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
                            <FormLabel>Postal Code</FormLabel>
                            <FormControl>
                              <Input placeholder="Postal code" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <div className="border-b pb-4 mb-6">
                    <h3 className="text-lg font-medium mb-4">Shipment Contents</h3>
                    <div className="grid gap-4">
                      <FormField
                        control={receiverForm.control}
                        name="packageContents"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Package Contents Description</FormLabel>
                            <FormControl>
                              <Input placeholder="Brief description of contents" {...field} />
                            </FormControl>
                            <FormDescription>
                              Provide a brief description of what's in the package
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-4">Sender Information</h3>
                    
                    <div className="mb-6">
                      <Label className="mb-2 block">Select Sender Address</Label>
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
                              <h4 className="font-medium">My Address</h4>
                              <p className="text-sm text-muted-foreground">Use your saved address</p>
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
                              <h4 className="font-medium">Custom Address</h4>
                              <p className="text-sm text-muted-foreground">Use a different address</p>
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
                            <FormLabel>Sender Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Full name" {...field} />
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
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input placeholder="Phone number" {...field} />
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
                            <FormLabel>Email (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Email address" {...field} />
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
                            <FormLabel>Address</FormLabel>
                            <FormControl>
                              <Input placeholder="Street address" {...field} />
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
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input placeholder="City" {...field} />
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
                            <FormLabel>Postal Code</FormLabel>
                            <FormControl>
                              <Input placeholder="Postal code" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button type="submit">
                      Continue to Package Details
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
              <CardTitle className="text-xl">Package Details</CardTitle>
            </div>
            <div className="flex items-center">
              {isSectionComplete("package") && (
                <span className="text-green-600 text-sm mr-2 flex items-center">
                  <Check className="h-4 w-4 mr-1" /> Complete
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
                          <FormLabel>Destination Country</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select country" />
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
                          <FormLabel>Service Level</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select service level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value={ServiceLevel.STANDARD}>Standard (5-7 business days)</SelectItem>
                              <SelectItem value={ServiceLevel.EXPRESS}>Express (3-5 business days)</SelectItem>
                              <SelectItem value={ServiceLevel.PRIORITY}>Priority (1-2 business days)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="sm:col-span-2">
                      <h3 className="text-base font-medium mb-3 mt-2">Package Dimensions</h3>
                    </div>
                    
                    <FormField
                      control={packageForm.control}
                      name="packageLength"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Length (cm)</FormLabel>
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
                          <FormLabel>Width (cm)</FormLabel>
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
                          <FormLabel>Height (cm)</FormLabel>
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
                          <FormLabel>Weight (kg)</FormLabel>
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
                          <FormLabel>Number of Pieces</FormLabel>
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
                      Back
                    </Button>
                    <Button type="submit" disabled={isCalculatingPrice} className="min-w-[140px]">
                      {isCalculatingPrice ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Calculating...
                        </>
                      ) : (
                        <>
                          <Calculator className="mr-2 h-4 w-4" />
                          Calculate Price
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
              <CardTitle className="text-xl">Price & Submit</CardTitle>
            </div>
            <div className="flex items-center">
              {isSectionComplete("price") && (
                <span className="text-green-600 text-sm mr-2 flex items-center">
                  <Check className="h-4 w-4 mr-1" /> Complete
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
              {priceDetails && priceDetails.success && priceDetails.options ? (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium mb-4">Choose Your MoogShip Service</h3>
                    
                    {priceDetails.options.map((option: any, index: number) => (
                      <div
                        key={option.id}
                        className={`border rounded-lg p-4 cursor-pointer transition-all ${
                          selectedPriceOption === option.id 
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedPriceOption(option.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`w-4 h-4 rounded-full border-2 ${
                              selectedPriceOption === option.id 
                                ? 'border-primary bg-primary' 
                                : 'border-gray-300'
                            }`}>
                              {selectedPriceOption === option.id && (
                                <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                              )}
                            </div>
                            <div>
                              <h4 className="font-semibold text-lg">{option.displayName}</h4>
                              <p className="text-sm text-muted-foreground">{option.deliveryTime}</p>
                              {option.description && (
                                <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold">${(option.totalPrice / 100).toFixed(2)}</div>
                            <div className="text-xs text-muted-foreground">
                              Base: ${(option.cargoPrice / 100).toFixed(2)} + Fuel: ${(option.fuelCost / 100).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {billableWeight && (
                      <div className="text-sm text-muted-foreground mt-4 p-3 bg-gray-50 rounded">
                        <span className="font-medium">Billable weight:</span> {billableWeight.toFixed(2)} kg
                      </div>
                    )}
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
                      Back
                    </Button>
                    <Button 
                      onClick={() => {
                        if (!selectedPriceOption) {
                          toast({
                            title: "Please select a shipping option",
                            description: "Choose your preferred MoogShip service level before creating the shipment.",
                            variant: "destructive"
                          });
                          return;
                        }

                        // Get the selected price option details
                        const selectedOption = priceDetails.options.find((opt: any) => opt.id === selectedPriceOption);
                        if (!selectedOption) {
                          toast({
                            title: "Invalid selection",
                            description: "Please select a valid shipping option.",
                            variant: "destructive"
                          });
                          return;
                        }
                        
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
                        
                        // Combine everything with selected pricing option
                        const shipmentData = {
                          ...receiverData,
                          ...packageData,
                          packageItems,
                          packages: physicalPackages,
                          customsItemCount: 1, // Default to 1
                          customsValue: 6999, // Default to $69.99 in cents
                          // Include selected pricing details
                          selectedServiceId: selectedOption.id,
                          selectedServiceName: selectedOption.displayName,
                          totalPrice: selectedOption.totalPrice,
                          basePrice: selectedOption.cargoPrice,
                          fuelCharge: selectedOption.fuelCost,
                          carrierName: "MoogShip",
                          serviceType: selectedOption.serviceType,
                          deliveryTime: selectedOption.deliveryTime
                        };
                        
                        // Submit the shipment
                        createShipmentMutation.mutate(shipmentData);
                      }}
                      disabled={createShipmentMutation.isPending || !selectedPriceOption}
                      variant={selectedPriceOption ? "default" : "outline"}
                      className="min-w-[140px]"
                    >
                      {createShipmentMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create Shipment"
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    Please fill in the package details and calculate the price first.
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => {
                      toggleSection("package");
                      setTimeout(() => document.getElementById("package-section")?.scrollIntoView({ behavior: "smooth" }), 100);
                    }}
                  >
                    Go to Package Details
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