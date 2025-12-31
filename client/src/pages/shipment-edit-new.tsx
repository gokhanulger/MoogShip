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
import { Loader2, ArrowLeft, Check, X, AlertTriangle, MapPin, UserRound, Package, FileText, Upload, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { COUNTRIES } from "@/lib/countries";
import { withAuth } from "@/lib/with-auth";
import { useToast } from "@/hooks/use-toast";
import { ShipmentStatus, ServiceLevel } from "@shared/schema";
import Layout from "@/components/layout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Currency options
const CURRENCIES = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "TRY", name: "Turkish Lira", symbol: "₺" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
];

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
  receiverPostalCode: z.string().min(1, "Receiver postal code is required"),
  receiverCountry: z.string().min(1, "Receiver country is required"),
  receiverPhone: z.string().min(1, "Receiver phone is required"),
  receiverEmail: z.string().email("Invalid email address"),
  receiverState: z.string().optional(),
  
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
  
  // Original cost prices (before multiplier)
  originalBasePrice: z.number().optional(),
  originalFuelCharge: z.number().optional(),
  originalTotalPrice: z.number().optional(),
  appliedMultiplier: z.number().optional(),
  
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
  
  // Document management state
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [isDeletingDocument, setIsDeletingDocument] = useState(false);
  
  // Calculate volumetric weight
  const calculateVolumetricWeight = (l: number, w: number, h: number) => {
    return (l * w * h) / 5000;
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
      receiverPostalCode: "",
      receiverCountry: "",
      receiverPhone: "",
      receiverEmail: "",
      receiverState: "",
      
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
        receiverPostalCode: shipment.receiverPostalCode,
        receiverCountry: shipment.receiverCountry,
        receiverPhone: shipment.receiverPhone,
        receiverEmail: shipment.receiverEmail,
        receiverState: shipment.receiverState || "",
        
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
        
        // Original cost prices
        originalBasePrice: shipment.originalBasePrice,
        originalFuelCharge: shipment.originalFuelCharge,
        originalTotalPrice: shipment.originalTotalPrice,
        appliedMultiplier: shipment.appliedMultiplier,
      });
    }
  }, [shipment, form]);

  // Watch for form changes to recalculate price
  const weight = form.watch("packageWeight");
  const length = form.watch("packageLength");
  const width = form.watch("packageWidth");
  const height = form.watch("packageHeight");
  const serviceLevel = form.watch("serviceLevel");

  // Calculate the billable weight (greater of actual weight vs volumetric weight)
  const volumetricWeight = 
    length && width && height 
      ? calculateVolumetricWeight(length, width, height) 
      : 0;
  
  const billableWeight = Math.max(weight || 0, volumetricWeight);

  // Price recalculation state
  const [isRecalculatingPrice, setIsRecalculatingPrice] = useState(false);

  // Price recalculation function
  const recalculatePrice = async () => {
    if (!weight || !length || !width || !height) {
      toast({
        title: "Missing Dimensions",
        description: "Please ensure all package dimensions and weight are filled before recalculating price.",
        variant: "destructive"
      });
      return;
    }

    setIsRecalculatingPrice(true);

    try {
      const receiverCountry = form.getValues("receiverCountry");
      
      if (!receiverCountry) {
        toast({
          title: "Missing Country",
          description: "Please select a receiver country before recalculating price.",
          variant: "destructive"
        });
        return;
      }

      const response = await fetch("/api/pricing/moogship-options", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          receiverCountry: receiverCountry,
          packageLength: length,
          packageWidth: width,
          packageHeight: height,
          packageWeight: billableWeight,
          senderPostalCode: form.getValues("senderPostalCode") || "34387",
          senderCity: form.getValues("senderCity") || "Istanbul",
          receiverPostalCode: form.getValues("receiverPostalCode") || "10001",
          receiverCity: form.getValues("receiverCity") || "New York"
        }),
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error("Failed to calculate price");
      }

      const pricingData = await response.json();
      
      if (pricingData.success && pricingData.options && pricingData.options.length > 0) {
        const bestOption = pricingData.options[0]; // Get the first/cheapest option
        
        // Update form with new pricing data including BOTH customer and cost prices
        form.setValue("basePrice", bestOption.cargoPrice || bestOption.basePrice);
        form.setValue("fuelCharge", bestOption.fuelCost || bestOption.fuelCharge);
        form.setValue("totalPrice", bestOption.totalPrice);
        
        // CRITICAL FIX: Update the original cost prices (these are the actual costs before multiplier)
        form.setValue("originalBasePrice", bestOption.originalBasePrice || bestOption.cargoPrice);
        form.setValue("originalFuelCharge", bestOption.originalFuelCharge || bestOption.fuelCost);
        form.setValue("originalTotalPrice", bestOption.originalTotalPrice || bestOption.totalPriceWithoutInsurance || bestOption.totalPrice);
        form.setValue("appliedMultiplier", bestOption.appliedMultiplier || 1);
        
        toast({
          title: "Price Recalculated",
          description: `New price: $${(bestOption.totalPrice / 100).toFixed(2)}`,
        });
      } else {
        throw new Error("No pricing options available");
      }
    } catch (error) {
      console.error("Error recalculating price:", error);
      toast({
        title: "Price Calculation Failed",
        description: "Unable to calculate new price. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRecalculatingPrice(false);
    }
  };

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: EditShipmentFormValues) => {
      if (!shipmentId) throw new Error("Shipment ID is required");
      
      // Add __priceUpdate flag if prices have been recalculated
      const updateData = {
        ...data,
        __priceUpdate: true // Always set this for admin updates to ensure proper price handling
      };
      
      const response = await apiRequest("PATCH", `/api/shipments/${shipmentId}`, updateData);
      
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
      });
      
      // Invalidate the shipment query to refetch the data
      queryClient.invalidateQueries({ queryKey: [`/api/shipments/${shipmentId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/shipments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shipments/my'] });
      
      setLocation("/admin-shipments");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update shipment",
        variant: "destructive",
      });
    },
  });

  // Submit handler
  const onSubmit = (data: EditShipmentFormValues) => {
    updateMutation.mutate(data);
  };

  // Document upload handler
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== 'application/pdf') {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Only PDF files are allowed."
      });
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "File size must be less than 10MB."
      });
      return;
    }

    try {
      setIsUploadingDocument(true);
      
      const formData = new FormData();
      formData.append('invoice', file);
      
      const response = await fetch(`/api/shipments/${shipmentId}/upload-invoice`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload document');
      }
      
      toast({
        title: "Document uploaded",
        description: `${file.name} has been successfully uploaded.`
      });
      
      // Refresh shipment data
      queryClient.invalidateQueries({ queryKey: [`/api/shipments/${shipmentId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/shipments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shipments/my'] });
      
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload document"
      });
    } finally {
      setIsUploadingDocument(false);
      // Reset the input
      event.target.value = '';
    }
  };

  // Document deletion handler
  const handleDeleteInvoice = async () => {
    if (!shipment?.id) return;

    try {
      setIsDeletingDocument(true);
      
      const response = await fetch(`/api/shipments/${shipment.id}/delete-invoice`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete document');
      }
      
      toast({
        title: "Document deleted",
        description: "The invoice has been successfully removed."
      });
      
      // Refresh shipment data
      queryClient.invalidateQueries({ queryKey: [`/api/shipments/${shipmentId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/shipments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shipments/my'] });
      
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Failed to delete document"
      });
    } finally {
      setIsDeletingDocument(false);
    }
  };

  return (
    <Layout user={user} hideMobileActions={true}>
      <div className="container mx-auto py-8">
        <Card className="bg-white rounded-lg shadow-md">
          <CardHeader className="border-b border-gray-100">
            <div className="flex justify-between items-center">
              {/* Desktop header */}
              <div className="hidden md:flex items-center">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="mr-2"
                  onClick={() => setLocation("/admin-shipments")}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
                <div>
                  <CardTitle className="text-xl font-semibold text-gray-900">
                    Edit Shipment {shipmentId}
                  </CardTitle>
                  <CardDescription className="text-gray-500">
                    Update shipping details and recipient information
                  </CardDescription>
                </div>
              </div>
              
              {/* Mobile header - simplified without extra icons */}
              <div className="md:hidden flex-1">
                <div className="flex items-center mb-1">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="mr-2 -ml-3 h-9 w-9"
                    onClick={() => setLocation("/admin-shipments")}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Back</span>
                  </Button>
                  <CardTitle className="text-lg font-semibold">
                    Edit Shipment {shipmentId}
                  </CardTitle>
                </div>
                <CardDescription className="text-xs text-gray-500">
                  Update shipping details and recipient information
                </CardDescription>
              </div>
              
              {shipment?.status && (
                <div>
                  <Badge
                    className={
                      shipment.status === ShipmentStatus.APPROVED
                        ? "bg-green-100 text-green-800"
                        : shipment.status === ShipmentStatus.REJECTED
                        ? "bg-red-100 text-red-800"
                        : shipment.status === ShipmentStatus.IN_TRANSIT
                        ? "bg-blue-100 text-blue-800"
                        : shipment.status === ShipmentStatus.DELIVERED
                        ? "bg-purple-100 text-purple-800"
                        : "bg-amber-100 text-amber-800"
                    }
                  >
                    {shipment.status}
                  </Badge>
                </div>
              )}
            </div>
          </CardHeader>
          
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
                <Button variant="outline" className="mt-4" onClick={() => setLocation("/admin-shipments")}>
                  Return to Shipments
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
                    <TabsList className="grid grid-cols-5 mb-4">
                      <TabsTrigger value="package">Package</TabsTrigger>
                      <TabsTrigger value="sender">Sender</TabsTrigger>
                      <TabsTrigger value="receiver">Receiver</TabsTrigger>
                      <TabsTrigger value="documents">Documents</TabsTrigger>
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
                                <FormLabel>Item Description</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Describe the contents of the package" 
                                    className="resize-none"
                                    {...field}
                                    value={field.value || ''}
                                  />
                                </FormControl>
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
                    
                    {/* Documents Tab */}
                    <TabsContent value="documents" className="space-y-4">
                      <div className="bg-purple-50/50 rounded-md border border-purple-100/50 p-6 space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                          <FileText className="h-5 w-5 text-purple-600" />
                          <h3 className="text-lg font-medium text-purple-900">Document Management</h3>
                        </div>
                        
                        {/* Current Invoice Display */}
                        {shipment?.invoicePdf && (
                          <div className="bg-white rounded-lg border border-purple-200 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <FileText className="h-6 w-6 text-purple-600" />
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {shipment.invoiceFilename || "Invoice.pdf"}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    Uploaded: {formatDate(shipment.invoiceUploadedAt)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(`/api/shipments/${shipment.id}/invoice`, '_blank')}
                                  className="text-purple-600 border-purple-200 hover:bg-purple-50"
                                >
                                  <FileText className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handleDeleteInvoice}
                                  disabled={isDeletingDocument}
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                >
                                  {isDeletingDocument ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Upload New Document */}
                        {!shipment?.invoicePdf && (
                          <div className="border-2 border-dashed border-purple-200 rounded-lg p-8 text-center">
                            <Upload className="mx-auto h-12 w-12 text-purple-400 mb-4" />
                            <h4 className="text-lg font-medium text-gray-900 mb-2">Upload Invoice</h4>
                            <p className="text-sm text-gray-500 mb-4">
                              Upload a PDF invoice for this shipment. Maximum file size: 10MB
                            </p>
                            <Button
                              onClick={() => document.getElementById('invoice-upload')?.click()}
                              disabled={isUploadingDocument}
                              className="bg-purple-600 hover:bg-purple-700"
                            >
                              {isUploadingDocument ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Uploading...
                                </>
                              ) : (
                                <>
                                  <Upload className="mr-2 h-4 w-4" />
                                  Choose PDF File
                                </>
                              )}
                            </Button>
                            <input
                              id="invoice-upload"
                              type="file"
                              accept=".pdf"
                              onChange={handleFileUpload}
                              className="hidden"
                            />
                          </div>
                        )}
                        
                        {/* Replace Document */}
                        {shipment?.invoicePdf && (
                          <div className="bg-gray-50 rounded-lg p-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Replace Document</h4>
                            <p className="text-xs text-gray-500 mb-3">
                              Upload a new PDF to replace the current invoice
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => document.getElementById('invoice-replace')?.click()}
                              disabled={isUploadingDocument}
                              className="text-purple-600 border-purple-200 hover:bg-purple-50"
                            >
                              {isUploadingDocument ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Uploading...
                                </>
                              ) : (
                                <>
                                  <Upload className="mr-2 h-4 w-4" />
                                  Replace PDF
                                </>
                              )}
                            </Button>
                            <input
                              id="invoice-replace"
                              type="file"
                              accept=".pdf"
                              onChange={handleFileUpload}
                              className="hidden"
                            />
                          </div>
                        )}
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
                        
                        <div className="flex justify-between items-center pt-1">
                          <span className="text-gray-600 font-medium">Shipping Price:</span>
                          <span className="text-lg font-bold text-blue-600">
                            {formatPrice(form.getValues("totalPrice"))}
                          </span>
                        </div>
                        
                        {/* Recalculate Price Button */}
                        <div className="pt-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={recalculatePrice}
                            disabled={isRecalculatingPrice}
                            className="w-full text-blue-600 border-blue-200 hover:bg-blue-50"
                          >
                            {isRecalculatingPrice ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Recalculating...
                              </>
                            ) : (
                              "Recalculate Price"
                            )}
                          </Button>
                        </div>
                        
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Base Price:</span>
                          <span>{formatPrice(form.getValues("basePrice"))}</span>
                        </div>
                        
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Fuel Charge:</span>
                          <span>{formatPrice(form.getValues("fuelCharge"))}</span>
                        </div>
                      </div>
                      
                      {/* Status fields (for admin) */}
                      <div className="pt-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Shipment Status</h4>
                        <FormField
                          control={form.control}
                          name="status"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Status</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value={ShipmentStatus.PENDING}>
                                    Pending
                                  </SelectItem>
                                  <SelectItem value={ShipmentStatus.APPROVED}>
                                    Approved
                                  </SelectItem>
                                  <SelectItem value={ShipmentStatus.REJECTED}>
                                    Rejected
                                  </SelectItem>
                                  <SelectItem value={ShipmentStatus.IN_TRANSIT}>
                                    In Transit
                                  </SelectItem>
                                  <SelectItem value={ShipmentStatus.DELIVERED}>
                                    Delivered
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
                  
                  <div className="flex justify-end space-x-4 pt-4">
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => setLocation("/admin-shipments")}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit"
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Update Shipment
                    </Button>
                  </div>
                </form>
              </Form>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default withAuth(ShipmentEditContent);