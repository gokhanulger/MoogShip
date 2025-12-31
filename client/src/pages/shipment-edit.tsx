import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ArrowLeft, Check, X, AlertTriangle, ArrowUp, ArrowDown, Clock, MapPin, UserRound, Package, CreditCard, Tag } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { COUNTRIES } from "@/lib/countries";
import { withAuth } from "@/lib/with-auth";
import { useToast } from "@/hooks/use-toast";
import { ShipmentStatus, ServiceLevel, ServiceLevelDetails } from "@shared/schema";
import Layout from "@/components/layout";
import { PriceChangeIndicator } from "@/components/price-change-indicator";
import { PriceHistoryDialog } from "@/components/price-history-dialog";

// Currency options
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Schema for editing shipment
const editShipmentSchema = z.object({
  // Sender details
  senderName: z.string().min(1, "Sender name is required"),
  senderAddress: z.string().optional(),
  senderCity: z.string().optional(),
  senderPostalCode: z.string().optional(),
  senderPhone: z.string().optional(),
  senderEmail: z.string().optional(),
  
  // Receiver details
  receiverName: z.string().min(1, "Receiver name is required"),
  receiverAddress: z.string().min(1, "Receiver address is required"),
  receiverCity: z.string().min(1, "Receiver city is required"),
  receiverState: z.string().optional(),
  receiverPostalCode: z.string().min(1, "Receiver postal code is required"),
  receiverCountry: z.string().min(1, "Receiver country is required"),
  receiverPhone: z.string().min(1, "Receiver phone is required"),
  receiverEmail: z.string().email("Invalid email address"),
  
  // Package details
  packageWeight: z.preprocess(
    (val) => (val === "" ? 0 : Number(val)),
    z.number().min(0.1, "Weight must be greater than 0")
  ),
  packageLength: z.preprocess(
    (val) => (val === "" ? 0 : Number(val)),
    z.number().min(1, "Length must be greater than 0")
  ),
  packageWidth: z.preprocess(
    (val) => (val === "" ? 0 : Number(val)),
    z.number().min(1, "Width must be greater than 0")
  ),
  packageHeight: z.preprocess(
    (val) => (val === "" ? 0 : Number(val)),
    z.number().min(1, "Height must be greater than 0")
  ),
  packageContents: z.string().optional(),
  pieceCount: z.preprocess(
    (val) => (val === "" ? 1 : Number(val)),
    z.number().min(1, "Piece count must be at least 1")
  ),
  itemCount: z.preprocess(
    (val) => (val === "" ? 1 : Number(val)),
    z.number().min(1, "Item count must be at least 1")
  ),
  
  // Customs details
  gtip: z.string().optional(),
  customsValue: z.preprocess(
    (val) => (val === "" ? 0 : Number(val)),
    z.number().min(0, "Customs value cannot be negative")
  ),
  currency: z.string().default("USD"),
  
  // Service details
  serviceLevel: z.enum([ServiceLevel.STANDARD, ServiceLevel.EXPRESS, ServiceLevel.PRIORITY]),
  
  // Pricing details
  basePrice: z.number().optional(),
  fuelCharge: z.number().optional(),
  totalPrice: z.number().optional(),
  
  // Status
  status: z.enum([
    ShipmentStatus.PENDING, 
    ShipmentStatus.APPROVED, 
    ShipmentStatus.REJECTED, 
    ShipmentStatus.IN_TRANSIT, 
    ShipmentStatus.DELIVERED
  ]),
});

type EditShipmentFormValues = z.infer<typeof editShipmentSchema>;

// Format price for display
const formatPrice = (price?: number) => {
  if (price === undefined || price === null) return "N/A";
  return `$${(price / 100).toFixed(2)}`;
};

// Format date
const formatDate = (dateString?: string) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  }).format(date);
};

type ShipmentEditProps = {
  user: any;
};

const ShipmentEditContent = ({ user }: ShipmentEditProps) => {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/shipment-edit/:id");
  const { toast } = useToast();
  const shipmentId = params?.id ? parseInt(params.id) : null;
  
  // Calculate volumetric weight
  const calculateVolumetricWeight = (l: number, w: number, h: number) => {
    return (l * w * h) / 5000;
  };

  // Calculate total price based on weight, dimensions, and service level
  const calculateTotalPrice = (
    weight: number,
    length: number,
    width: number,
    height: number,
    serviceLevel: ServiceLevel
  ) => {
    const volumetricWeight = calculateVolumetricWeight(length, width, height);
    const billableWeight = Math.max(weight, volumetricWeight);
    
    // Base rate of $10 per kg, minimum 0.5kg
    const baseRate = 1000; // $10 in cents
    let basePrice = Math.max(0.5, billableWeight) * baseRate;
    
    // Add service level premium
    if (serviceLevel === ServiceLevel.EXPRESS) {
      basePrice *= 1.5; // 50% premium for express
    } else if (serviceLevel === ServiceLevel.PRIORITY) {
      basePrice *= 2.0; // 100% premium for priority
    }
    
    // Round to nearest cent
    basePrice = Math.round(basePrice);
    
    // Calculate fuel charge (15% of base price, similar to ShipEntegra)
    const fuelCharge = Math.round(basePrice * 0.15);
    const totalPrice = basePrice + fuelCharge;
    
    return {
      basePrice,
      fuelCharge,
      totalPrice
    };
  };

  // Fetch shipment data
  const {
    data: shipment,
    isLoading: isLoadingShipment,
    isError: isErrorShipment,
  } = useQuery({
    queryKey: [`/api/shipments/${shipmentId}`],
    queryFn: async () => {
      if (!shipmentId) return null;
      const response = await apiRequest("GET", `/api/shipments/${shipmentId}`);
      return response.json();
    },
    enabled: !!shipmentId,
  });

  // Setup form
  const form = useForm<EditShipmentFormValues>({
    resolver: zodResolver(editShipmentSchema),
    defaultValues: {
      // Sender details
      senderName: "",
      senderAddress: "",
      senderCity: "",
      senderPostalCode: "",
      senderEmail: "",
      senderPhone: "",
      
      // Receiver details
      receiverName: "",
      receiverAddress: "",
      receiverCity: "",
      receiverState: "",
      receiverPostalCode: "",
      receiverCountry: "",
      receiverPhone: "",
      receiverEmail: "",
      
      // Package details
      packageWeight: 0,
      packageLength: 0,
      packageWidth: 0,
      packageHeight: 0,
      packageContents: "",
      pieceCount: 1,
      itemCount: 1,
      
      // Customs details
      gtip: "",
      customsValue: 0,
      currency: "USD",
      
      // Service details
      serviceLevel: ServiceLevel.STANDARD,
      
      // Status
      status: ShipmentStatus.PENDING,
    },
  });

  // Update form when shipment data is loaded
  useEffect(() => {
    if (shipment) {
      form.reset({
        // Sender details
        senderName: shipment.senderName || "",
        senderAddress: shipment.senderAddress || "",
        senderCity: shipment.senderCity || "",
        senderPostalCode: shipment.senderPostalCode || "",
        senderEmail: shipment.senderEmail || "",
        senderPhone: shipment.senderPhone || "",
        
        // Receiver details
        receiverName: shipment.receiverName,
        receiverAddress: shipment.receiverAddress,
        receiverCity: shipment.receiverCity,
        receiverState: shipment.receiverState || "",
        receiverPostalCode: shipment.receiverPostalCode,
        receiverCountry: shipment.receiverCountry,
        receiverPhone: shipment.receiverPhone,
        receiverEmail: shipment.receiverEmail,
        
        // Package details
        packageWeight: shipment.packageWeight,
        packageLength: shipment.packageLength,
        packageWidth: shipment.packageWidth,
        packageHeight: shipment.packageHeight,
        
        // New custom fields
        packageContents: shipment.packageContents || "",
        pieceCount: shipment.pieceCount || 1,
        itemCount: shipment.itemCount || 1,
        gtip: shipment.gtip || "",
        customsValue: shipment.customsValue || 0,
        currency: shipment.currency || "USD",
        
        // Original fields
        serviceLevel: shipment.serviceLevel,
        basePrice: shipment.basePrice,
        fuelCharge: shipment.taxes, // Using existing taxes field in DB
        totalPrice: shipment.totalPrice,
        status: shipment.status,
      });
      
      // Store original prices for comparison
      setOriginalPrices({
        basePrice: shipment.basePrice || 0,
        fuelCharge: shipment.taxes || 0, // Using existing taxes field for fuel charge
        totalPrice: shipment.totalPrice || 0,
        customerPrice: shipment.customerPrice || shipment.totalPrice || 0, // Customer price if available, otherwise total
        customerMultiplier: shipment.customerMultiplier || 1.0 // Use multiplier or default to 1.0
      });
      
      console.log("Loaded shipment data:", shipment);
    }
  }, [shipment, form]);

  // Watch for form changes to recalculate price
  const weight = form.watch("packageWeight");
  const length = form.watch("packageLength");
  const width = form.watch("packageWidth");
  const height = form.watch("packageHeight");
  const serviceLevel = form.watch("serviceLevel");

  // Track if we're fetching prices from API
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  
  // Track if form fields were modified by admin (to avoid auto-recalculation on load)
  const [fieldsModified, setFieldsModified] = useState(false);
  
  // Determine if shipment is editable based on status
  const isEditable = () => {
    const status = form.getValues("status");
    // Allow editing if status is pending or rejected, or if user is admin
    return (status === ShipmentStatus.PENDING || status === ShipmentStatus.REJECTED) || user?.role === 'admin';
  };
  
  // Track original prices for comparison
  const [originalPrices, setOriginalPrices] = useState({
    basePrice: 0,
    fuelCharge: 0,
    totalPrice: 0,
    customerPrice: 0,
    customerMultiplier: 0
  });
  
  // Track which fields were modified (for price history)
  const [modifiedFields, setModifiedFields] = useState({
    dimensions: false,
    weight: false,
    address: false,
    serviceLevel: false
  });
  
  // Function to calculate current customer price with multiplier
  const getCurrentCustomerPrice = () => {
    // If this is a customer's shipment, calculate the price with their multiplier
    if (shipment && shipment.userId && shipment.userId !== user?.id && shipment.customerMultiplier) {
      return Math.round(form.getValues("totalPrice") * (shipment.customerMultiplier || 1.0));
    }
    // Otherwise just return the admin price
    return form.getValues("totalPrice");
  };
  
  // Record price change to history
  const recordPriceChange = async (
    previousBasePrice: number, 
    previousFuelCharge: number,
    previousTotalPrice: number,
    newBasePrice: number,
    newFuelCharge: number,
    newTotalPrice: number
  ) => {
    if (!shipmentId) return;
    
    try {
      // Prepare price history data
      const priceHistoryData = {
        shipmentId: Number(shipmentId),
        userId: user?.id || 0,
        
        // Previous prices
        previousBasePrice,
        previousFuelCharge,
        previousTotalPrice,
        
        // New prices
        newBasePrice,
        newFuelCharge,
        newTotalPrice,
        
        // Fields that triggered the change
        dimensionsChanged: modifiedFields.dimensions,
        weightChanged: modifiedFields.weight,
        addressChanged: modifiedFields.address,
        serviceLevelChanged: modifiedFields.serviceLevel,
        
        isAutoRecalculation: true,
        changeReason: "Automatic price recalculation due to shipment details change"
      };
      
      console.log("Recording price history:", priceHistoryData);
      
      // Record the price change
      const response = await apiRequest("POST", "/api/price-history", priceHistoryData);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to record price change history");
      }
      
      const result = await response.json();
      console.log("Price history recorded successfully:", result);
      
    } catch (error) {
      console.error("Failed to record price history:", error);
      // Don't show error to user as this is background functionality
    }
  };

  // Function to fetch price from Shipentegra API
  const fetchShipentegaPrice = async () => {
    if (!weight || !length || !width || !height || !serviceLevel) {
      return;
    }
    
    try {
      setIsFetchingPrice(true);
      
      // Get all the form values needed for price calculation
      const formData = form.getValues();
      
      // Ensure we have all the required address data
      if (!formData.receiverCity || !formData.receiverPostalCode || !formData.receiverCountry) {
        throw new Error("Receiver address details are required for price calculation");
      }
      
      // Prepare the data for the price calculation API
      const priceCalculationData = {
        senderPostalCode: "34000", // Default Istanbul postal code
        senderCity: "Istanbul",
        receiverPostalCode: formData.receiverPostalCode,
        receiverCity: formData.receiverCity,
        receiverCountry: formData.receiverCountry,
        packageLength: length,
        packageWidth: width,
        packageHeight: height,
        packageWeight: weight,
        serviceLevel: serviceLevel,
        userId: shipment?.userId // Pass the original shipment's user ID to ensure correct price multiplier
      };
      
      // Store current prices before fetching new ones
      const previousBasePrice = form.getValues("basePrice") || 0;
      const previousFuelCharge = form.getValues("fuelCharge") || 0;
      const previousTotalPrice = form.getValues("totalPrice") || 0;
      
      // Call the price calculation API
      const response = await apiRequest("POST", "/api/calculate-price", priceCalculationData);
      const priceData = await response.json();
      
      // Update form with the prices from the API (these already include the user's price multiplier)
      form.setValue("basePrice", priceData.basePrice);
      form.setValue("fuelCharge", priceData.fuelCharge);
      form.setValue("totalPrice", priceData.totalPrice);
      
      // Record price change in history if prices changed
      if (
        previousBasePrice !== priceData.basePrice || 
        previousFuelCharge !== priceData.fuelCharge || 
        previousTotalPrice !== priceData.totalPrice
      ) {
        await recordPriceChange(
          previousBasePrice,
          previousFuelCharge, 
          previousTotalPrice,
          priceData.basePrice,
          priceData.fuelCharge,
          priceData.totalPrice
        );
      }
      
      // Show success toast
      toast({
        title: "Price Updated",
        description: "Shipping price has been recalculated with the customer's price multiplier applied.",
        variant: "default"
      });
      
    } catch (error: any) {
      console.error("Error fetching price:", error);
      
      // Fallback to local calculation if API fails
      const { basePrice, fuelCharge, totalPrice } = calculateTotalPrice(
        weight,
        length,
        width,
        height,
        serviceLevel as ServiceLevel
      );
      
      form.setValue("basePrice", basePrice);
      form.setValue("fuelCharge", fuelCharge);
      form.setValue("totalPrice", totalPrice);
      
      // Show error toast
      toast({
        title: "Price Calculation Error",
        description: error.message || "There was an error calculating the shipping price from ShipEntegra. Using fallback price calculation.",
        variant: "destructive"
      });
    } finally {
      setIsFetchingPrice(false);
    }
  };
  
  // Debounce function to prevent too many API calls
  const [debouncedFetchTimer, setDebouncedFetchTimer] = useState<NodeJS.Timeout | null>(null);
  
  // Track changes to dimensions
  useEffect(() => {
    if (shipment && (
      weight !== shipment.packageWeight || 
      length !== shipment.packageLength || 
      width !== shipment.packageWidth || 
      height !== shipment.packageHeight
    )) {
      setFieldsModified(true);
      setModifiedFields(prev => ({
        ...prev,
        dimensions: width !== shipment.packageWidth || length !== shipment.packageLength || height !== shipment.packageHeight,
        weight: weight !== shipment.packageWeight
      }));
    }
  }, [weight, length, width, height, shipment]);

  // Track changes to address fields
  useEffect(() => {
    if (shipment && (
      form.watch("receiverCity") !== shipment.receiverCity || 
      form.watch("receiverPostalCode") !== shipment.receiverPostalCode || 
      form.watch("receiverCountry") !== shipment.receiverCountry
    )) {
      setFieldsModified(true);
      setModifiedFields(prev => ({
        ...prev,
        address: true
      }));
    }
  }, [form.watch("receiverCity"), form.watch("receiverPostalCode"), form.watch("receiverCountry"), shipment]);

  // Track service level changes
  useEffect(() => {
    if (shipment && serviceLevel !== shipment.serviceLevel) {
      setFieldsModified(true);
      setModifiedFields(prev => ({
        ...prev,
        serviceLevel: true
      }));
    }
  }, [serviceLevel, shipment]);

  // Calculate price when dimensions, address, or service level changes, but only if fields were modified
  useEffect(() => {
    // Skip initial render/component load
    if (!fieldsModified) {
      return;
    }
    
    // Clear any existing timer
    if (debouncedFetchTimer) {
      clearTimeout(debouncedFetchTimer);
    }
    
    // Set a new timer to fetch price after 500ms
    const timer = setTimeout(() => {
      if (weight && length && width && height && serviceLevel) {
        fetchShipentegaPrice();
      }
    }, 500); // Debounce for 500ms
    
    setDebouncedFetchTimer(timer);
    
    // Clean up on unmount
    return () => {
      if (debouncedFetchTimer) {
        clearTimeout(debouncedFetchTimer);
      }
    };
  }, [weight, length, width, height, serviceLevel, form.watch("receiverCity"), form.watch("receiverPostalCode"), form.watch("receiverCountry"), fieldsModified]);

  // Update shipment mutation
  const updateMutation = useMutation({
    mutationFn: async (data: EditShipmentFormValues) => {
      if (!shipmentId) throw new Error("Shipment ID is required");
      const response = await apiRequest("PUT", `/api/shipments/${shipmentId}`, data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update shipment");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Shipment Updated",
        description: "The shipment has been successfully updated.",
        variant: "default"
      });
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/shipments/${shipmentId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/shipments/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shipments/my"] });
      
      // Redirect based on user role
      setLocation(user?.role === 'admin' ? "/admin-shipments" : "/");
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "There was an error updating the shipment.",
        variant: "destructive"
      });
    }
  });

  // Approve shipment mutation
  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!shipmentId) throw new Error("Shipment ID is required");
      const response = await apiRequest("POST", `/api/shipments/approve/${shipmentId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to approve shipment");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Shipment Approved",
        description: "The shipment has been approved and the user has been charged.",
        variant: "default"
      });
      
      // Refresh data and redirect
      queryClient.invalidateQueries({ queryKey: [`/api/shipments/${shipmentId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/shipments/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shipments/my"] });
      
      setLocation(user?.role === "admin" ? "/admin-shipments" : "/");
    },
    onError: (error: any) => {
      toast({
        title: "Approval Failed",
        description: error.message || "There was an error approving the shipment.",
        variant: "destructive"
      });
    }
  });

  // Reject shipment mutation
  const rejectMutation = useMutation({
    mutationFn: async (rejectionReason: string) => {
      if (!shipmentId) throw new Error("Shipment ID is required");
      const response = await apiRequest("POST", `/api/shipments/reject/${shipmentId}`, { rejectionReason });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to reject shipment");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Shipment Rejected",
        description: "The shipment has been rejected with the provided reason.",
        variant: "default"
      });
      
      // Refresh data and redirect
      queryClient.invalidateQueries({ queryKey: [`/api/shipments/${shipmentId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/shipments/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shipments/my"] });
      
      setLocation(user?.role === "admin" ? "/admin-shipments" : "/");
    },
    onError: (error: any) => {
      toast({
        title: "Rejection Failed",
        description: error.message || "There was an error rejecting the shipment.",
        variant: "destructive"
      });
    }
  });

  // Handle form submission
  const onSubmit = (data: EditShipmentFormValues) => {
    // Block submission if shipment is not editable
    if (!isEditable()) {
      toast({
        title: "Cannot Update Shipment",
        description: "This shipment has been approved and cannot be edited.",
        variant: "destructive"
      });
      return;
    }
    updateMutation.mutate(data);
  };

  // Calculate volumetric weight for display
  const volumetricWeight = 
    length && width && height 
      ? calculateVolumetricWeight(length, width, height) 
      : 0;
  
  // Calculate billable weight for display
  const billableWeight = Math.max(weight || 0, volumetricWeight);

  return (
    <Layout hideMobileActions={true}>
      <div className="container mx-auto py-6">
        <Card className="w-full shadow-sm border-blue-100/50">
          <CardHeader>
            {/* Desktop header */}
              <div className="hidden md:block">
                <Button
                  variant="ghost"
                  size="sm"
                  className="mb-2"
                  onClick={() => setLocation(user?.role === 'admin' ? "/admin-shipments" : "/")}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to {user?.role === 'admin' ? "All Shipments" : "My Shipments"}
                </Button>
                <CardTitle className="text-2xl font-bold">Edit Shipment</CardTitle>
                <CardDescription>
                  Update shipment details and pricing
                </CardDescription>
              </div>
              
              {/* Mobile header - simplified without extra icons */}
              <div className="md:hidden">
                <div className="flex items-center mb-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="mr-2 -ml-3 h-9 w-9"
                    onClick={() => setLocation(user?.role === 'admin' ? "/admin-shipments" : "/")}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Back</span>
                  </Button>
                  <CardTitle className="text-xl font-bold">Edit Shipment</CardTitle>
                </div>
                <CardDescription className="text-sm">
                  Update shipment details and pricing
                </CardDescription>
              </div>
              
              {/* Status and Actions */}
              {isLoadingShipment ? (
                <div className="h-10"></div>
              ) : shipment ? (
                <div className="flex flex-col md:flex-row items-center gap-3">
                  <div className="text-sm">
                    <span className="text-gray-500">Status:</span>{" "}
                    <span 
                      className={`font-medium ${
                        shipment.status === ShipmentStatus.PENDING 
                          ? "text-amber-600" 
                          : shipment.status === ShipmentStatus.APPROVED 
                          ? "text-green-600"
                          : shipment.status === ShipmentStatus.REJECTED
                          ? "text-red-600"
                          : "text-blue-600"
                      }`}
                    >
                      {shipment.status.toUpperCase()}
                    </span>
                  </div>
                  
                  {/* Show approve/reject buttons only for pending shipments */}
                  {user?.role === "admin" && shipment.status === ShipmentStatus.PENDING && (
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
                        onClick={() => approveMutation.mutate()}
                        disabled={approveMutation.isPending}
                      >
                        {approveMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="mr-2 h-4 w-4" />
                        )}
                        Approve
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                        onClick={() => {
                          const reason = window.prompt("Please enter a rejection reason:");
                          if (reason) {
                            rejectMutation.mutate(reason);
                          }
                        }}
                        disabled={rejectMutation.isPending}
                      >
                        {rejectMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <X className="mr-2 h-4 w-4" />
                        )}
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              ) : null}
            </CardHeader>
          
        </Card>
        
        <Card>
          <CardContent>
            {isLoadingShipment ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <span className="ml-2 text-gray-500">Loading shipment details...</span>
              </div>
            ) : isErrorShipment ? (
              <div className="text-center py-10">
                <h3 className="text-lg font-medium text-gray-900">Error Loading Shipment</h3>
                <p className="text-gray-500 mt-1">
                  There was a problem fetching the shipment details.
                </p>
                <Button variant="outline" className="mt-4" onClick={() => setLocation(user?.role === 'admin' ? "/admin-shipments" : "/")}>
                  Return to {user?.role === 'admin' ? "All Shipments" : "My Shipments"}
                </Button>
              </div>
            ) : shipment ? (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Summary Info Card */}
                  <div className="grid grid-cols-2 gap-4 text-sm p-4 bg-blue-50/50 rounded-md border border-blue-100/50 mb-4">
                    <div className="text-gray-500">ID:</div>
                    <div className="font-medium">{shipment.id}</div>
                    
                    <div className="text-gray-500">User ID:</div>
                    <div className="font-medium">{shipment.userId}</div>
                    
                    <div className="text-gray-500">Created:</div>
                    <div className="font-medium">{formatDate(shipment.createdAt)}</div>
                    
                    {shipment.trackingNumber && (
                      <>
                        <div className="text-gray-500">Tracking Number:</div>
                        <div className="font-medium">{shipment.trackingNumber}</div>
                      </>
                    )}
                  </div>
                  
                  {/* Tabbed Interface */}
                  <Tabs defaultValue="package" className="w-full">
                    <TabsList className="grid grid-cols-4 mb-4">
                      <TabsTrigger value="package">Package</TabsTrigger>
                      <TabsTrigger value="sender">Sender</TabsTrigger>
                      <TabsTrigger value="receiver">Receiver</TabsTrigger>
                      <TabsTrigger value="pricing">Pricing</TabsTrigger>
                    </TabsList>
                    
                    {/* Package Details Tab */}
                    <TabsContent value="package" className="space-y-6">
                      {/* Package Information */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Package Dimensions</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="packageWeight"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Weight (kg)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    step="0.1" 
                                    min="0.1" 
                                    placeholder="Enter weight" 
                                    disabled={!isEditable()}
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="packageLength"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Length (cm)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    step="1" 
                                    min="1" 
                                    placeholder="Enter length" 
                                    disabled={!isEditable()}
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="packageWidth"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Width (cm)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    step="1" 
                                    min="1" 
                                    placeholder="Enter width" 
                                    disabled={!isEditable()}
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="packageHeight"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Height (cm)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    step="1" 
                                    min="1" 
                                    placeholder="Enter height" 
                                    disabled={!isEditable()}
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                      
                      {/* Package Contents Information */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Package Contents</h4>
                        <div className="space-y-4">
                          <FormField
                            control={form.control}
                            name="packageContents"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                  Product Name / Description
                                  {user?.role === 'admin' && (
                                    <Badge variant="secondary" className="text-xs">Admin Editable</Badge>
                                  )}
                                </FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Enter product name and description (e.g., Samsung Galaxy S24, Electronics)" 
                                    className="resize-none"
                                    disabled={!isEditable()}
                                    {...field}
                                    value={field.value || ''}
                                  />
                                </FormControl>
                                <FormDescription>
                                  {user?.role === 'admin' 
                                    ? "As an admin, you can edit the product name and description to fix any errors or provide more accurate information."
                                    : "Describe the product name and contents of the package"
                                  }
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="pieceCount"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Piece Count</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      min="1" 
                                      step="1" 
                                      placeholder="Number of packages" 
                                      disabled={!isEditable()}
                                      {...field}
                                      onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="itemCount"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Item Count</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      min="1" 
                                      step="1" 
                                      placeholder="Items in package" 
                                      disabled={!isEditable()}
                                      {...field}
                                      onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Service Level */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Service Details</h4>
                        <FormField
                          control={form.control}
                          name="serviceLevel"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Service Level</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value}
                                value={field.value}
                                disabled={!isEditable()}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select service level" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value={ServiceLevel.STANDARD}>
                                    Standard (5-7 days)
                                  </SelectItem>
                                  <SelectItem value={ServiceLevel.EXPRESS}>
                                    Express (3-4 days)
                                  </SelectItem>
                                  <SelectItem value={ServiceLevel.PRIORITY}>
                                    Priority (1-2 days)
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </TabsContent>
                    
                    {/* Sender Information Tab */}
                    <TabsContent value="sender" className="space-y-4">
                      <div className="bg-blue-50/50 border border-blue-100 rounded-md p-4">
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="senderName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-blue-700">Name</FormLabel>
                                  <FormControl>
                                    <Input 
                                      className="bg-white/80" 
                                      placeholder="Enter sender name" 
                                      {...field} 
                                      value={field.value || ''} 
                                      disabled={true}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="senderPhone"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-blue-700">Phone</FormLabel>
                                  <FormControl>
                                    <Input 
                                      className="bg-white/80" 
                                      placeholder="Enter phone number" 
                                      {...field} 
                                      value={field.value || ''} 
                                      disabled={true}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <FormField
                            control={form.control}
                            name="senderEmail"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-blue-700">Email</FormLabel>
                                <FormControl>
                                  <Input 
                                    className="bg-white/80" 
                                    placeholder="Enter email" 
                                    {...field} 
                                    value={field.value || ''} 
                                    disabled={true}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="senderAddress"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-blue-700">Address</FormLabel>
                                <FormControl>
                                  <Input 
                                    className="bg-white/80" 
                                    placeholder="Enter sender address" 
                                    {...field} 
                                    value={field.value || ''} 
                                    disabled={true}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="senderCity"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-blue-700">City</FormLabel>
                                  <FormControl>
                                    <Input 
                                      className="bg-white/80" 
                                      placeholder="Enter city" 
                                      {...field} 
                                      value={field.value || ''} 
                                      disabled={true}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="senderPostalCode"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-blue-700">Postal Code</FormLabel>
                                  <FormControl>
                                    <Input 
                                      className="bg-white/80" 
                                      placeholder="Enter postal code" 
                                      {...field} 
                                      value={field.value || ''} 
                                      disabled={true}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                        
                        <div className="mt-3 pt-3 border-t border-blue-100 text-xs text-blue-500 italic">
                          Sender information cannot be modified. Contact support for any changes.
                        </div>
                      </div>
                    </TabsContent>
                    
                    {/* Receiver Information Tab */}
                    <TabsContent value="receiver" className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="receiverName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Recipient Name</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Enter recipient name" 
                                  disabled={!isEditable()}
                                  {...field}
                                  value={field.value || ''}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="receiverPhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone Number</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Enter phone number" 
                                  disabled={!isEditable()}
                                  {...field}
                                  value={field.value || ''}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="receiverEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input 
                                type="email" 
                                placeholder="Enter email address" 
                                disabled={!isEditable()}
                                {...field}
                                value={field.value || ''}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="receiverAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter street address" 
                                disabled={!isEditable()}
                                {...field}
                                value={field.value || ''}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="receiverCity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>City</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Enter city" 
                                  disabled={!isEditable()}
                                  {...field}
                                  value={field.value || ''}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="receiverState"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>State/Province</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Enter state or province" 
                                  disabled={!isEditable()}
                                  {...field}
                                  value={field.value || ''}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="receiverPostalCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Postal/ZIP Code</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Enter postal code" 
                                  disabled={!isEditable()}
                                  {...field}
                                  value={field.value || ''}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="receiverCountry"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Country</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value}
                                value={field.value}
                                disabled={!isEditable()}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a country" />
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
                      </div>
                      
                      {/* Customs Information */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Customs Information</h4>
                        <div className="space-y-4">
                          <FormField
                            control={form.control}
                            name="gtip"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>GTIP Code</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Enter GTIP/HS code" 
                                    disabled={!isEditable()}
                                    {...field}
                                    value={field.value || ''}
                                  />
                                </FormControl>
                                <FormDescription className="text-xs">
                                  Harmonized System (HS) code for customs
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="customsValue"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Customs Value</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      min="0" 
                                      step="0.01" 
                                      placeholder="Value" 
                                      disabled={!isEditable()}
                                      {...field}
                                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                      value={field.value || 0}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="currency"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Currency</FormLabel>
                                  <Select 
                                    onValueChange={field.onChange} 
                                    value={field.value || 'USD'}
                                    disabled={!isEditable()}
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
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                    
                    {/* Pricing Tab */}
                    <TabsContent value="pricing" className="space-y-4">
                      {/* Weight and Calculation */}
                      <div className="bg-blue-50/50 rounded-md border border-blue-100/50 p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Actual Weight:</span>
                          <span className="font-medium">{weight || 0} kg</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Volumetric Weight:</span>
                          <span className="font-medium">{volumetricWeight.toFixed(2)} kg</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Billable Weight:</span>
                          <span className="font-medium">{billableWeight.toFixed(2)} kg</span>
                        </div>
                        <Separator className="my-2" />
                          
                          {isFetchingPrice ? (
                            <div className="py-2 flex flex-col items-center justify-center space-y-2">
                              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                              <span className="text-sm text-blue-500">Calculating price from ShipEntegra...</span>
                            </div>
                          ) : (
                            <>
                              {/* Admin-Only: Original prices if they differ from current */}
                              {user?.role === 'admin' && (originalPrices.basePrice !== form.getValues("basePrice") ||
                                originalPrices.fuelCharge !== form.getValues("fuelCharge") ||
                                originalPrices.totalPrice !== form.getValues("totalPrice")) && (
                                <div className="bg-amber-50 p-2 rounded-md mb-2 border border-amber-100">
                                  <div className="text-amber-700 text-xs font-medium mb-1 flex items-center">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    Original Pricing (For Reference)
                                  </div>
                                  <div className="flex justify-between text-xs text-amber-800">
                                    <span>Base Price:</span>
                                    <span>{formatPrice(originalPrices.basePrice)}</span>
                                  </div>
                                  <div className="flex justify-between text-xs text-amber-800">
                                    <span>Fuel Charge:</span>
                                    <span>{formatPrice(originalPrices.fuelCharge)}</span>
                                  </div>
                                  <div className="flex justify-between text-xs font-medium text-amber-800">
                                    <span>Total:</span>
                                    <span>{formatPrice(originalPrices.totalPrice)}</span>
                                  </div>
                                </div>
                              )}
                              
                              {/* Admin-Only: Original Price Section */}
                              {user?.role === 'admin' && originalPrices.basePrice !== form.getValues("basePrice") && (
                                <div className="bg-gray-50 p-2 rounded-md mb-2">
                                  <div className="text-sm font-medium text-gray-700 mb-1">Original Price (Admin):</div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Base Price:</span>
                                    <span className="font-medium text-gray-600">{formatPrice(originalPrices.basePrice)}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Fuel Charge:</span>
                                    <span className="font-medium text-gray-600">{formatPrice(originalPrices.fuelCharge)}</span>
                                  </div>
                                  <div className="flex justify-between text-sm pt-1">
                                    <span className="text-gray-600 font-medium">Total:</span>
                                    <span className="font-medium text-gray-600">{formatPrice(originalPrices.totalPrice)}</span>
                                  </div>

                                  {shipment.userId && shipment.userId !== user?.id && (
                                    <div className="mt-2 pt-2 border-t border-gray-200">
                                      <div className="text-sm font-medium text-gray-700 mb-1">Original Customer Price:</div>
                                      <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">User Multiplier:</span>
                                        <span className="font-medium text-gray-600">{originalPrices.customerMultiplier?.toFixed(2) || '-'}</span>
                                      </div>
                                      <div className="flex justify-between text-sm">
                                        <span className="text-gray-600 font-medium">Customer Total:</span>
                                        <span className="font-medium text-gray-600">{formatPrice(originalPrices.customerPrice || originalPrices.totalPrice)}</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {/* Current Price Section */}
                              <div className="flex justify-between items-center">
                                <div className="text-sm font-medium text-gray-700 mb-1">Current Price:</div>
                                {shipmentId && user?.role === 'admin' && (
                                  <PriceHistoryDialog 
                                    shipmentId={Number(shipmentId)} 
                                    trigger={
                                      <Button variant="ghost" size="sm" className="h-7 p-1">
                                        <Clock className="h-4 w-4 mr-1" />
                                        <span className="text-xs">History</span>
                                      </Button>
                                    }
                                  />
                                )}
                              </div>
                              
                              {/* Admin-Only: Detailed Price Breakdown */}
                              {user?.role === 'admin' ? (
                                <>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Base Price:</span>
                                    <div className="flex items-center">
                                      <span className="font-medium">{formatPrice(form.getValues("basePrice"))}</span>
                                      {originalPrices.basePrice !== form.getValues("basePrice") && (
                                        originalPrices.basePrice < form.getValues("basePrice") 
                                          ? <ArrowUp className="h-3 w-3 ml-1 text-red-500" /> 
                                          : <ArrowDown className="h-3 w-3 ml-1 text-green-500" />
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Fuel Charge:</span>
                                    <div className="flex items-center">
                                      <span className="font-medium">{formatPrice(form.getValues("fuelCharge"))}</span>
                                      {originalPrices.fuelCharge !== form.getValues("fuelCharge") && (
                                        originalPrices.fuelCharge < form.getValues("fuelCharge") 
                                          ? <ArrowUp className="h-3 w-3 ml-1 text-red-500" /> 
                                          : <ArrowDown className="h-3 w-3 ml-1 text-green-500" />
                                      )}
                                    </div>
                                  </div>
                                  <Separator className="my-2" />
                                </>
                              ) : null}
                              
                              {/* Total Price - Visible to All Users */}
                              <div className="flex justify-between">
                                <span className="font-medium">Total Price:</span>
                                <div className="flex items-center">
                                  <span className="font-bold text-blue-600">{formatPrice(form.getValues("totalPrice"))}</span>
                                  {user?.role === 'admin' && originalPrices.totalPrice !== form.getValues("totalPrice") && (
                                    originalPrices.totalPrice < form.getValues("totalPrice") 
                                      ? <ArrowUp className="h-4 w-4 ml-1 text-red-500" /> 
                                      : <ArrowDown className="h-4 w-4 ml-1 text-green-500" />
                                  )}
                                </div>
                              </div>
                              
                              {/* Admin-Only: Show customer price information when editing a customer's shipment */}
                              {user?.role === 'admin' && shipment.userId && shipment.userId !== user?.id && (
                                <div className="mt-4 pt-3 border-t border-dashed border-gray-200">
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-blue-700">Customer Price Information</span>
                                    {originalPrices.customerPrice !== getCurrentCustomerPrice() && (
                                      <Badge variant="outline" className={
                                        originalPrices.customerPrice < getCurrentCustomerPrice() 
                                          ? "bg-red-50 text-red-700 border-red-200" 
                                          : "bg-green-50 text-green-700 border-green-200"
                                      }>
                                        Price {originalPrices.customerPrice < getCurrentCustomerPrice() ? "Increased" : "Decreased"}
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">User Multiplier:</span>
                                    <span className="font-medium">{shipment.customerMultiplier?.toFixed(2) || '-'}</span>
                                  </div>
                                  
                                  <div className="flex justify-between text-sm mt-1">
                                    <span className="text-gray-600 font-medium">Customer Total:</span>
                                    <div className="flex items-center">
                                      <span className="font-bold text-blue-600">{formatPrice(getCurrentCustomerPrice())}</span>
                                      {originalPrices.customerPrice !== getCurrentCustomerPrice() && (
                                        originalPrices.customerPrice < getCurrentCustomerPrice() 
                                          ? <ArrowUp className="h-3 w-3 ml-1 text-red-500" /> 
                                          : <ArrowDown className="h-3 w-3 ml-1 text-green-500" />
                                      )}
                                    </div>
                                  </div>
                                  
                                  {originalPrices.customerPrice !== getCurrentCustomerPrice() && (
                                    <div className="mt-2 p-2 rounded bg-amber-50 border border-amber-200 text-xs text-amber-700">
                                      <p className="font-medium">Price Information</p>
                                      <p>
                                        Customer price: {formatPrice(getCurrentCustomerPrice())}
                                      </p>
                                      {/* Original price information hidden from customers as requested */}
                                      <p className="mt-1">
                                        Note: Any changes to the price will be applied to this shipment.
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </form>
            </Form>
          ) : null}
        </CardContent>
      </Card>
    </div>
  </Layout>
);
};

// Export with withAuth HOC
export default withAuth(ShipmentEditContent);