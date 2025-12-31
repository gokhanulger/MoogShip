import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import Layout from "@/components/layout";
import { withAuth } from "@/lib/with-auth";
import { Link } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { 
  Package, 
  Download, 
  RefreshCw, 
  Calculator, 
  ChevronRight, 
  ExternalLink, 
  Copy, 
  Mail, 
  ScanLine, 
  Loader2, 
  DollarSign,
  ChevronDownIcon,
  EditIcon,
  PackageIcon,
  HashIcon,
  ShieldCheckIcon,
  Settings,
  Send,
  Printer,
  Check,
  X,
  Shield,
  Package2
} from "lucide-react";
import { PackageTemplateSelector } from "@/components/package-template-selector";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

function EtsyIntegrationContent({ user }: { user: any }) {
  const { toast } = useToast();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showInstructions, setShowInstructions] = useState(true);
  const [apiToken, setApiToken] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<number>>(new Set());
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [orderDetails, setOrderDetails] = useState<Map<number, any>>(new Map());
  const [recalculatingPrices, setRecalculatingPrices] = useState(false);
  const [editingDimensions, setEditingDimensions] = useState<{
    orderId: number | null;
    dimensions: { length: number; width: number; height: number; weight: number };
  }>({ orderId: null, dimensions: { length: 15, width: 10, height: 1, weight: 0.5 } });
  const [isCreatingShipment, setIsCreatingShipment] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkActionValues, setBulkActionValues] = useState<{
    customsValue: string;
    gtip: string;
    productName: string;
    packageType: string;
    customLength: string;
    customWidth: string;
    customHeight: string;
    customWeight: string;
  }>({
    customsValue: '',
    gtip: '',
    productName: '',
    packageType: '',
    customLength: '',
    customWidth: '',
    customHeight: '',
    customWeight: ''
  });
  const [showSetup, setShowSetup] = useState(false);
  
  // User is passed from withAuth, no need to fetch
  
  // Fetch package templates from API
  const { data: packageTemplates = [] } = useQuery({
    queryKey: ["/api/package-templates"],
    enabled: !!user
  });
  
  // Bulk selection helpers
  const selectAllOrders = () => {
    // Find all orders in the orders state from scanning
    const allOrderIds = new Set(orders.map((o: any) => o.id));
    setSelectedOrderIds(allOrderIds);
    setShowBulkActions(true);
  };

  const deselectAllOrders = () => {
    setSelectedOrderIds(new Set());
    setShowBulkActions(false);
  };

  const toggleOrderSelection = (orderId: number) => {
    const newSelection = new Set(selectedOrderIds);
    if (newSelection.has(orderId)) {
      newSelection.delete(orderId);
    } else {
      newSelection.add(orderId);
    }
    setSelectedOrderIds(newSelection);
    setShowBulkActions(newSelection.size > 0);
  };
  
  // Bulk action handlers
  const applyBulkInsurance = (enable: boolean) => {
    const newDetails = new Map(orderDetails);
    selectedOrderIds.forEach(orderId => {
      const current = newDetails.get(orderId) || {};
      newDetails.set(orderId, { 
        ...current, 
        sigortala: enable,
        ...(enable ? {} : { insuranceAmount: 0 })
      });
    });
    setOrderDetails(newDetails);
    toast({
      title: enable ? "Insurance Enabled" : "Insurance Disabled",
      description: `Updated ${selectedOrderIds.size} orders`,
    });
  };

  const applyBulkCustomsValue = () => {
    const value = parseFloat(bulkActionValues.customsValue);
    if (isNaN(value) || value < 0) {
      toast({
        title: "Invalid Value",
        description: "Please enter a valid customs value",
        variant: "destructive",
      });
      return;
    }
    
    const newDetails = new Map(orderDetails);
    selectedOrderIds.forEach(orderId => {
      const current = newDetails.get(orderId) || {};
      newDetails.set(orderId, { ...current, customsValue: value });
    });
    setOrderDetails(newDetails);
    
    toast({
      title: "Customs Value Updated",
      description: `Set customs value to $${value} for ${selectedOrderIds.size} orders`,
    });
  };

  const applyBulkGTIP = () => {
    if (!bulkActionValues.gtip) {
      toast({
        title: "Invalid Value",
        description: "Please enter a valid GTIP/HS code",
        variant: "destructive",
      });
      return;
    }
    
    const newDetails = new Map(orderDetails);
    selectedOrderIds.forEach(orderId => {
      const current = newDetails.get(orderId) || {};
      newDetails.set(orderId, { ...current, gtipCode: bulkActionValues.gtip });
    });
    setOrderDetails(newDetails);
    
    toast({
      title: "GTIP Code Updated",
      description: `Set GTIP code to ${bulkActionValues.gtip} for ${selectedOrderIds.size} orders`,
    });
  };

  const applyBulkProductName = () => {
    if (!bulkActionValues.productName) {
      toast({
        title: "Invalid Value",
        description: "Please enter a product name",
        variant: "destructive",
      });
      return;
    }
    
    const newDetails = new Map(orderDetails);
    selectedOrderIds.forEach(orderId => {
      const current = newDetails.get(orderId) || {};
      newDetails.set(orderId, { ...current, productDescription: bulkActionValues.productName });
    });
    setOrderDetails(newDetails);
    
    toast({
      title: "Product Name Updated",
      description: `Set product name for ${selectedOrderIds.size} orders`,
    });
  };
  
  const applyBulkPackage = () => {
    let length, width, height, weight;
    
    if (bulkActionValues.packageType === 'custom') {
      // Use custom dimensions
      length = parseFloat(bulkActionValues.customLength);
      width = parseFloat(bulkActionValues.customWidth);
      height = parseFloat(bulkActionValues.customHeight);
      weight = parseFloat(bulkActionValues.customWeight);
      
      if (!length || !width || !height || !weight) {
        toast({
          title: "Invalid Dimensions",
          description: "Please enter all custom dimensions",
          variant: "destructive",
        });
        return;
      }
    } else if (bulkActionValues.packageType) {
      // Use template
      const selectedPackage = packageTemplates.find(p => p.id === parseInt(bulkActionValues.packageType));
      if (!selectedPackage) {
        toast({
          title: "Invalid Selection",
          description: "Please select a valid package type",
          variant: "destructive",
        });
        return;
      }
      length = selectedPackage.length;
      width = selectedPackage.width;
      height = selectedPackage.height;
      weight = selectedPackage.weight;
    } else {
      toast({
        title: "Invalid Selection",
        description: "Please select a package type or enter custom dimensions",
        variant: "destructive",
      });
      return;
    }
    
    const newDetails = new Map(orderDetails);
    selectedOrderIds.forEach(orderId => {
      const current = newDetails.get(orderId) || {};
      newDetails.set(orderId, { 
        ...current, 
        length,
        width,
        height,
        weight
      });
    });
    setOrderDetails(newDetails);
    
    toast({
      title: "Package Dimensions Updated",
      description: `Updated dimensions for ${selectedOrderIds.size} orders`,
    });
  };

  const recalculateAllPrices = async () => {
    if (selectedOrderIds.size === 0) {
      toast({
        variant: "destructive",
        title: "No Orders Selected",
        description: "Please select orders to recalculate prices",
      });
      return;
    }
    
    // Preserve the selected order IDs
    const ordersToRecalculate = new Set(selectedOrderIds);
    
    setRecalculatingPrices(true);
    try {
      // Use calculatePricesForSelected which handles everything properly
      await calculatePricesForSelected();
      
      // Restore the selection after calculation
      setSelectedOrderIds(ordersToRecalculate);
      
      toast({
        title: "Prices Recalculated",
        description: `Updated prices for ${ordersToRecalculate.size} orders`,
      });
    } catch (error) {
      console.error('Error recalculating prices:', error);
      // Restore selection even on error
      setSelectedOrderIds(ordersToRecalculate);
      toast({
        title: "Error",
        description: "Failed to recalculate some prices",
        variant: "destructive",
      });
    } finally {
      setRecalculatingPrices(false);
    }
  };
  
  // Generate or get API token for the user
  useEffect(() => {
    if (user?.id && user?.email) {
      // In production, you'd generate a proper JWT token
      // For now, we'll use a simple format
      setApiToken(btoa(`${user.id}:${user.email}`));
    }
  }, [user]);
  
  // Fetch import status
  const { data: importStatus, refetch: refetchStatus } = useQuery({
    queryKey: ["/api/etsy-import/status"],
    enabled: !!user,
  });
  
  // Fetch imported orders
  const { data: orders = [], isLoading: ordersLoading, refetch: refetchOrders } = useQuery({
    queryKey: ["/api/etsy/orders"],
    enabled: !!user,
  });
  
  // Fetch email connections
  const { data: emailConnections = [] } = useQuery({
    queryKey: ["/api/email/connections"],
    enabled: !!user,
  });
  
  // Check if user has email connection
  const hasEmailConnection = emailConnections.length > 0;
  
  // Calculate shipping price mutation
  const calculateShippingMutation = useMutation({
    mutationFn: async (orderId: number) => {
      return apiRequest(`/api/etsy/orders/${orderId}/calculate-shipping`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      toast({
        title: "Shipping calculated",
        description: "Shipping price has been calculated successfully",
      });
      refetchOrders();
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to calculate shipping price",
      });
    },
  });
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "API token copied to clipboard",
    });
  };
  
  const scanEmails = async () => {
    if (!hasEmailConnection) {
      toast({
        variant: "destructive",
        title: "No Email Connection",
        description: "Please set up email integration first",
      });
      return;
    }
    
    setIsScanning(true);
    try {
      const connection = emailConnections[0];
      const response = await apiRequest("POST", `/api/email/scan/${connection.id}`);
      
      toast({
        title: "Email Scan Complete",
        description: `Imported ${response.imported} new orders from ${response.processed} emails`,
      });
      
      // Refresh orders after successful scan
      refetchOrders();
    } catch (error) {
      console.error("Scan error:", error);
      toast({
        variant: "destructive",
        title: "Scan Failed",
        description: "Failed to scan emails for Etsy orders",
      });
    } finally {
      setIsScanning(false);
    }
  };
  
  const formatCurrency = (amount: number, currency = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount / 100); // Assuming amount is in cents
  };
  
  const toggleAllOrders = () => {
    if (selectedOrderIds.size === orders.length) {
      setSelectedOrderIds(new Set());
      setShowBulkActions(false);
    } else {
      const allIds = new Set(orders.map((order: any) => order.id));
      setSelectedOrderIds(allIds);
      setShowBulkActions(true);
    }
  };
  
  const calculateSelectedTotal = () => {
    const selectedOrders = orders.filter((order: any) => selectedOrderIds.has(order.id));
    const total = selectedOrders.reduce((sum: number, order: any) => {
      return sum + (order.grandTotal || 0);
    }, 0);
    return formatCurrency(total);
  };
  
  const calculateBulkShipping = async () => {
    const selectedOrders = orders.filter((order: any) => selectedOrderIds.has(order.id));
    if (selectedOrders.length === 0) {
      toast({
        variant: "destructive",
        title: "No Orders Selected",
        description: "Please select orders to calculate shipping",
      });
      return;
    }
    
    // Calculate shipping for each selected order
    for (const order of selectedOrders) {
      if (!order.shippingPriceCalculated) {
        await calculateShippingMutation.mutateAsync(order.id);
      }
    }
    
    toast({
      title: "Shipping Calculated",
      description: `Calculated shipping for ${selectedOrders.length} orders`,
    });
  };
  
  const toggleRowExpansion = (orderId: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedRows(newExpanded);
  };
  
  const updateOrderDetail = (orderId: number, field: string, value: any) => {
    const newDetails = new Map(orderDetails);
    const current = newDetails.get(orderId) || {};
    newDetails.set(orderId, { ...current, [field]: value });
    setOrderDetails(newDetails);
  };
  
  const getOrderDetail = (orderId: number, field: string, defaultValue: any = null) => {
    const details = orderDetails.get(orderId);
    return details?.[field] ?? defaultValue;
  };
  
  // Create shipment from an Etsy order with calculated prices
  const createShipmentFromOrder = async (order: any) => {
    try {
      const selectedService = getOrderDetail(order.id, 'selectedService');
      if (!selectedService) {
        toast({
          title: "Error",
          description: "Please select a shipping service first",
          variant: "destructive"
        });
        return null;
      }
      
      // Debug the selected service structure
      console.log('[Etsy] Selected service object:', selectedService);

      // Validate required fields for label purchase
      const productDescription = getOrderDetail(order.id, 'productDescription', '');
      const gtipCode = getOrderDetail(order.id, 'gtipCode', '');
      // Use the same fallback logic as in price calculation - default to order grandTotal if not manually set
      const customsValue = getOrderDetail(order.id, 'customsValue', order.grandTotal / 100 || 0);
      
      // Check if required fields are missing
      const missingFields = [];
      if (!productDescription || productDescription === '') {
        missingFields.push('Product Description');
      }
      if (!gtipCode || gtipCode === '') {
        missingFields.push('GTIP/HS Code');
      }
      if (!customsValue || customsValue <= 0) {
        missingFields.push('Customs Value');
      }
      
      if (missingFields.length > 0) {
        toast({
          title: "Missing Required Information",
          description: `Please fill in the following fields for order ${order.receiptId || order.id}: ${missingFields.join(', ')}`,
          variant: "destructive"
        });
        return null;
      }

      // Get the shipping terms - DDP for US destinations, DAP for others
      const isUSDestination = order.shipToCountry === 'US' || 
                           order.shipToCountry === 'USA' || 
                           order.shipToCountry === 'United States';
      // For US destinations, force DDP; for others, use stored value or default to DAP
      const shippingTerms = isUSDestination ? 'ddp' : getOrderDetail(order.id, 'shippingTerms', 'dap');
      
      // Get insurance status from the sigortala field
      const isInsured = getOrderDetail(order.id, 'sigortala', false);
      
      // Get user's price multiplier (default to 1.25 if not set)
      const userMultiplier = user?.priceMultiplier || 1.25;
      console.log('[Etsy] User multiplier:', userMultiplier);
      
      // Extract SHIPPING prices from selected service (without insurance)
      // baseShippingPrice is the shipping cost with multiplier already applied
      const customerShippingPrice = Math.round(selectedService.baseShippingPrice || selectedService.totalPrice || selectedService.price || 0);
      
      // Get insurance amount - if insured but no amount, calculate it now
      let insuranceAmount = getOrderDetail(order.id, 'insuranceAmount', 0);
      
      // If insurance is enabled but we don't have a calculated amount, fetch it from API
      if (isInsured && insuranceAmount === 0) {
        try {
          const customsValueInCents = Math.round(customsValue * 100);
          const insuranceResponse = await fetch(`/api/insurance/calculate?insuranceValue=${customsValueInCents}`);
          if (insuranceResponse.ok) {
            const insuranceData = await insuranceResponse.json();
            insuranceAmount = insuranceData.cost || 0;
            // Store it for future use
            updateOrderDetail(order.id, 'insuranceAmount', insuranceAmount);
            console.log('[Etsy] Calculated insurance using admin ranges:', insuranceData);
          } else {
            // Fallback to 2% with $5 minimum if API fails
            insuranceAmount = Math.max(Math.round(customsValueInCents * 0.02), 500);
            console.warn('[Etsy] Insurance API failed, using fallback calculation');
          }
        } catch (error) {
          console.error('[Etsy] Error calculating insurance:', error);
          // Fallback to 2% with $5 minimum
          const customsValueInCents = Math.round(customsValue * 100);
          insuranceAmount = Math.max(Math.round(customsValueInCents * 0.02), 500);
        }
      }
      
      console.log('[Etsy] Insurance details for order', order.id, ':', {
        isInsured: isInsured,
        insuranceAmount: insuranceAmount,
        sigortala: getOrderDetail(order.id, 'sigortala')
      });
      
      // Get customs charges and DDP details from pricing calculation
      const customsCharges = getOrderDetail(order.id, 'customsCharges', 0);
      const ddpAmount = getOrderDetail(order.id, 'ddpAmount', 0); // DDP duty amount in cents
      const ddpBaseDutiesAmount = getOrderDetail(order.id, 'ddpBaseDutiesAmount', 0); // Base HS tax in cents
      const ddpTrumpTariffsAmount = getOrderDetail(order.id, 'ddpTrumpTariffsAmount', 0); // Trump tariffs in cents
      const totalDDP = getOrderDetail(order.id, 'totalDDP', 0); // Total DDP in cents
      console.log('[Etsy] Customs charges for order', order.id, ':', {
        customsCharges: customsCharges,
        duties: getOrderDetail(order.id, 'duties'),
        totalDDP: totalDDP,
        ddpAmount: ddpAmount,
        ddpBaseDutiesAmount: ddpBaseDutiesAmount,
        ddpTrumpTariffsAmount: ddpTrumpTariffsAmount
      });
      
      // Calculate original shipping price (cost price before multiplier)
      // This is the actual ShipEntegra price before user markup
      const originalShippingPrice = Math.round(customerShippingPrice / userMultiplier);
      
      // For compatibility with old fields, calculate base and fuel charges
      const customerBasePrice = customerShippingPrice; // Use shipping price as base
      const customerFuelCharge = 0; // Not separated in new pricing
      const originalBasePrice = originalShippingPrice;
      const originalFuelCharge = 0;
      
      console.log('[Etsy] Price breakdown:', {
        shippingPrice: { customer: customerShippingPrice, cost: originalShippingPrice },
        insuranceAmount: insuranceAmount,
        multiplier: userMultiplier,
        total: customerShippingPrice + insuranceAmount
      });
      
      // Prepare shipment data from the Etsy order
      const shipmentData = {
        // Sender info (using current user)
        senderName: user?.name || 'MoogShip User',
        senderCompany: user?.companyName || '',
        senderAddress: user?.address1 || user?.address || 'Default Address',
        senderAddress2: user?.address2 || '',
        senderCity: user?.city || 'Istanbul',
        senderState: '',  // Turkey doesn't have states
        senderPostalCode: user?.postalCode || '34000',  // Fixed field name from senderZipCode
        senderCountry: user?.country || 'TR',
        senderEmail: user?.email || '',
        senderPhone: user?.phone || '',
        
        // Receiver info from Etsy order
        receiverName: order.shipToName,
        receiverAddress: order.shipToAddress1,
        receiverAddress2: order.shipToAddress2 || '',
        receiverCity: order.shipToCity,
        receiverState: order.shipToState || '',
        receiverPostalCode: order.shipToZip,  // Fixed field name from receiverZipCode
        receiverCountry: order.shipToCountry,
        receiverEmail: order.buyerEmail || '',
        receiverPhone: '',
        
        // Package details (using validated values)
        packageContents: productDescription, // Using validated product description
        packageValue: customsValue, // Using validated customs value
        packageWeight: getOrderDetail(order.id, 'weight', 0.5),
        packageLength: getOrderDetail(order.id, 'length', 15),
        packageWidth: getOrderDetail(order.id, 'width', 10),
        packageHeight: getOrderDetail(order.id, 'height', 1),
        
        // Shipping details with proper service information - FIXED field names to match database schema
        serviceLevel: selectedService.name.toLowerCase().includes('express') ? 'express' : 
                      selectedService.name.toLowerCase().includes('priority') ? 'priority' : 'standard',
        selectedService: selectedService.name || selectedService.displayName || '', // Database expects 'selectedService' not 'serviceName'
        carrierName: selectedService.carrier || selectedService.carrierName || 'MoogShip',
        
        // Customer prices (what the user sees - already multiplied)
        totalPrice: customerShippingPrice, // Shipping price only (with multiplier, without insurance)
        basePrice: customerBasePrice, // Same as shipping price for compatibility
        fuelCharge: customerFuelCharge, // Not separated in new pricing
        
        // Original prices (cost prices - before multiplier)
        originalTotalPrice: originalShippingPrice, // ShipEntegra original shipping price
        originalBasePrice: originalBasePrice, // Same as original shipping price
        originalFuelCharge: originalFuelCharge, // Not separated
        appliedMultiplier: userMultiplier, // The multiplier that was applied
        
        insurance: isInsured, // Use the sigortala field value
        isInsured: isInsured, // Also set the isInsured field for database
        insuranceCost: insuranceAmount, // Insurance cost already in CENTS from API
        insuranceValue: Math.round(customsValue * 100), // Insurance declared value in CENTS (same as customs value)
        insuredValue: customsValue, // Pass insured value in dollars for compatibility
        customsValue: Math.round(customsValue * 100), // Customs value in CENTS for database
        taxId: getOrderDetail(order.id, 'taxId', ''),
        etsyReferenceId: order.orderNumber || order.receiptId || `etsy-${order.id}`,
        hsCode: gtipCode, // Using validated GTIP/HS code
        gtip: gtipCode, // Database uses 'gtip' field for customs code
        
        // Shipping terms - DDP for US destinations, DAP for others
        shippingTerms: shippingTerms,
        
        // DDP details if applicable - use pre-calculated values from pricing phase
        // Split duties into base HS tax and Trump tariffs
        ddpDutiesAmount: isUSDestination && shippingTerms === 'ddp' ? 
          ddpAmount : 0, // Total duties (base HS + Trump tariffs) in cents
        ddpBaseDutiesAmount: isUSDestination && shippingTerms === 'ddp' ?
          ddpBaseDutiesAmount : 0, // Base HS tax in cents (already retrieved above)
        ddpTrumpTariffsAmount: isUSDestination && shippingTerms === 'ddp' ?
          ddpTrumpTariffsAmount : 0, // Trump tariffs in cents (already retrieved above)
        // Check if ECO shipping based on selectedService
        ddpProcessingFee: isUSDestination && shippingTerms === 'ddp' ? 
          (selectedService && selectedService.name && (selectedService.name.toLowerCase().includes('eco') || selectedService.name.toLowerCase().includes('eko')) ? 45 : 450) : 0, // ECO: $0.45, Standard: $4.50
        ddpTaxAmount: 0, // Not separately calculated for now
        
        // Send for admin approval if user is not admin
        status: user?.role === 'admin' ? 'pending' : 'pending_approval'
      };

      console.log('[Etsy] Creating shipment with data:', {
        ...shipmentData,
        selectedService_debug: selectedService,
        shippingTerms_debug: shippingTerms,
        isUSDestination_debug: isUSDestination,
        totalPrice_debug: shipmentData.totalPrice,
        basePrice_debug: shipmentData.basePrice,
        insuranceCost_debug: shipmentData.insuranceCost,
        ddpDutiesAmount_debug: shipmentData.ddpDutiesAmount,
        orderDetailsFromStorage: {
          insuranceAmount: getOrderDetail(order.id, 'insuranceAmount'),
          customsCharges: getOrderDetail(order.id, 'customsCharges'),
          sigortala: getOrderDetail(order.id, 'sigortala'),
          totalDDP: getOrderDetail(order.id, 'totalDDP'),
          ddpAmount: getOrderDetail(order.id, 'ddpAmount'),
          allDetails: orderDetails.get(order.id)
        }
      });

      const response = await apiRequest('POST', '/api/shipments', shipmentData);

      if (!response.ok) {
        let errorMessage = 'Failed to create shipment';
        try {
          const errorText = await response.text();
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorJson.error || errorText;
        } catch (e) {
          // If response is not JSON, use default message
        }
        throw new Error(errorMessage);
      }

      const createdShipment = await response.json();
      console.log('[Etsy] Shipment created successfully:', createdShipment);
      
      // Store the shipment ID with the order
      updateOrderDetail(order.id, 'shipmentId', createdShipment.id);
      
      toast({
        title: "Success",
        description: user?.role === 'admin' ? 
          "Shipment created successfully. You can now print the label." :
          "Shipment sent to admin for approval."
      });
      
      return createdShipment;
    } catch (error: any) {
      console.error('[Etsy] Error creating shipment:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create shipment",
        variant: "destructive"
      });
      return null;
    }
  };

  // Print MoogShip label for a shipment
  const printLabel = (shipmentId: number) => {
    // Open the label PDF in a new window for printing
    window.open(`/api/shipments/${shipmentId}/label`, '_blank');
  };

  // Calculate prices for all selected orders
  const calculatePricesForSelected = async () => {
    if (recalculatingPrices) return;
    
    const selectedOrders = orders.filter((order: any) => selectedOrderIds.has(order.id));
    if (selectedOrders.length === 0) {
      toast({
        variant: "destructive",
        title: "No Orders Selected",
        description: "Please select orders to calculate prices",
      });
      return;
    }
    
    setRecalculatingPrices(true);
    try {
      const ordersData = selectedOrders.map((order: any) => {
        const details = orderDetails.get(order.id) || {};
        return {
          orderId: order.id,
          destination: {
            country: order.shipToCountry || 'USA',
            state: order.shipToState,
            city: order.shipToCity,
            zip: order.shipToZip,
          },
          package: {
            length: details.length || 15,
            width: details.width || 10,
            height: details.height || 1,
            weight: details.weight || 0.5,
          },
          customsValue: (details.customsValue || order.grandTotal / 100 || 0) * 100, // Convert to cents for API
          insurance: details.sigortala || false, // Send boolean flag, backend will calculate the amount
          insuranceValue: (details.insuredValue || details.customsValue || order.grandTotal / 100 || 0) * 100, // Use insured value if specified, otherwise customs value
          hsCode: details.gtipCode || '', // Include HS code for DDP calculation
        };
      });
      
      // Process each order individually using moogship-options endpoint
      const results = await Promise.all(ordersData.map(async (orderData) => {
        const response = await fetch("/api/pricing/moogship-options", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            packageLength: orderData.package.length,
            packageWidth: orderData.package.width,
            packageHeight: orderData.package.height,
            packageWeight: orderData.package.weight,
            receiverCountry: orderData.destination.country,
            hsCode: orderData.hsCode,
            customsValue: orderData.customsValue,
            productName: `Etsy Order ${orderData.orderId}`,
            productDescription: 'Etsy marketplace order'
          }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to calculate price');
        }
        
        const moogshipData = await response.json();
        console.log('[Etsy] API response for order', orderData.orderId, ':', moogshipData);
        
        // Extract duties information if available (for US destinations)
        const duties = moogshipData.duties || null;
        console.log('[Etsy] Duties data:', duties);
        
        return {
          orderId: orderData.orderId,
          orderCountryCode: orderData.destination.country, // Include country code for DDP calculation
          ...moogshipData,
          duties: duties // Include duties in the response
        };
      }));
      
      const data = { results };
      
      // Update order details with pricing options and DDP calculations
      const newDetails = new Map(orderDetails);
      await Promise.all(data.results.map(async (result: any) => {
        console.log('[Etsy] Processing result for order:', result.orderId, 'Options:', result.options);
        console.log('[Etsy] Duties for order:', result.orderId, 'Duties:', result.duties);
        
        const current = newDetails.get(result.orderId) || {};
        // Keep currently selected service if it exists, otherwise don't auto-select
        const currentSelectedId = current.selectedService?.id;
        let selectedService = null;
        
        // Map MoogShip options to pricing options format with duties included
        const pricingOptions = result.options?.map((option: any, index: number) => {
          // Extract days from deliveryTime string (e.g., "2-5 business days" -> "2-5")
          let estimatedDays = '5';
          if (option.deliveryTime) {
            const match = option.deliveryTime.match(/(\d+-?\d*)/);
            if (match) {
              estimatedDays = match[1];
            }
          }
          
          // Important: option.totalPrice from API is ONLY the shipping price (already with multiplier)
          // Insurance is calculated separately and NOT included in this price
          const baseShippingPrice = option.totalPrice; // This is shipping price only (with multiplier)
          
          return {
            id: option.id || `${option.serviceName || 'option'}_${index}`, // Generate ID if missing
            name: option.displayName || option.name,
            baseShippingPrice: baseShippingPrice, // Shipping price only (with multiplier) 
            totalPrice: baseShippingPrice, // Will be updated when insurance is calculated
            insuranceAmount: 0, // Will be calculated separately when insurance is selected
            hasInsurance: false, // Will be updated when sigortala checkbox is checked
            estimatedDays: estimatedDays,
            serviceType: option.serviceType || 'standard',
            carrier: option.carrier || 'MoogShip',
            // Store original cost price for backend (divide by multiplier)
            costPrice: Math.round(baseShippingPrice / (user?.priceMultiplier || 1.25)),
          };
        }) || [];
        
        console.log('[Etsy] Mapped pricing options for order', result.orderId, ':', pricingOptions);
        console.log('[Etsy] Options length:', pricingOptions.length, 'First option:', pricingOptions[0]);
        
        if (currentSelectedId && pricingOptions.length > 0) {
          // Try to keep the same service selected
          selectedService = pricingOptions.find((opt: any) => opt.id === currentSelectedId);
        }
        
        // Extract DDP data from duties response if available
        // For US destinations, calculate duties properly
        // Get the country from the API result which includes the order's shipping country
        // Also find the original order to get its shipping country
        const originalOrder = selectedOrders.find((o: any) => o.id === result.orderId);
        const orderCountry = result.orderCountryCode || originalOrder?.shipToCountry || current.shipToCountry || '';
        console.log('[Etsy] Order country for', result.orderId, ':', orderCountry, 'from original order:', originalOrder?.shipToCountry);
        const isUSDestination = orderCountry === 'US' || 
                                orderCountry === 'USA' || 
                                orderCountry === 'United States';
        
        // Get customs value from the order data 
        // The customs value in orderDetails is stored in dollars, not cents
        const customsValueInDollars = current.customsValue || (originalOrder?.grandTotal / 100) || 0;
        const customsValue = customsValueInDollars; // Already in dollars
        console.log('[Etsy] Customs value for', result.orderId, ':', customsValue, 'USD');
        
        // Calculate DDP duties for US destinations
        // Split into base HS tax and Trump tariffs
        let ddpBaseDutiesAmount = 0;
        let ddpTrumpTariffsAmount = 0;
        let ddpAmount = 0;
        
        if (isUSDestination) {
          // First check if we have duties from the API response
          if (result.duties && result.duties.baseDutyAmount && result.duties.trumpTariffAmount) {
            // Use the actual calculated duties from the API
            ddpBaseDutiesAmount = result.duties.baseDutyAmount || 0; // Already in cents
            ddpTrumpTariffsAmount = result.duties.trumpTariffAmount || 0; // Already in cents
            ddpAmount = ddpBaseDutiesAmount + ddpTrumpTariffsAmount; // Total duties
            
            console.log('[Etsy] Using API-calculated DDP for US order', result.orderId, ':', {
              customsValue: customsValue,
              baseDutyRate: result.duties.baseDutyRate,
              trumpTariffRate: result.duties.trumpTariffRate, 
              totalDutyRate: result.duties.totalDutyRate,
              ddpBaseDutiesAmount: ddpBaseDutiesAmount,
              ddpTrumpTariffsAmount: ddpTrumpTariffsAmount,
              ddpAmount: ddpAmount,
              ddpAmountDollars: ddpAmount / 100
            });
          } else {
            // Fallback: For US, use fixed 23.3% rate
            // Split this into base HS duties and Trump tariffs
            // We'll allocate roughly 10% to base HS and 13.3% to Trump tariffs
            const baseHSRate = 0.10; // 10% base HS tax rate
            const trumpTariffRate = 0.133; // 13.3% Trump tariff rate
            
            ddpBaseDutiesAmount = Math.round(customsValue * baseHSRate * 100); // Convert to cents
            ddpTrumpTariffsAmount = Math.round(customsValue * trumpTariffRate * 100); // Convert to cents
            ddpAmount = ddpBaseDutiesAmount + ddpTrumpTariffsAmount; // Total duties
            
            console.log('[Etsy] Fallback DDP calculation for US order', result.orderId, ':', {
              customsValue: customsValue,
              baseHSRate: '10%',
              trumpTariffRate: '13.3%',
              totalDutyRate: '23.3%',
              ddpBaseDutiesAmount: ddpBaseDutiesAmount,
              ddpTrumpTariffsAmount: ddpTrumpTariffsAmount,
              ddpAmount: ddpAmount,
              ddpAmountDollars: ddpAmount / 100
            });
          }
        }
        
        const dutyRate = result.duties?.totalDutyRate || 0.233;
        // Check if ECO shipping based on selectedService from pricing options
        const isEcoShipping = selectedService && selectedService.name &&
          (selectedService.name.toLowerCase().includes('eco') || selectedService.name.toLowerCase().includes('eko'));
        const ddpProcessingFee = isEcoShipping ? 45 : 450; // ECO: $0.45, Standard: $4.50
        const totalDDP = isUSDestination ? ddpAmount + ddpProcessingFee : 0;
        
        // Calculate total customs charges (in dollars for display)
        const customsCharges = totalDDP > 0 ? totalDDP / 100 : 0; // Convert from cents to dollars
        console.log('[Etsy] Customs charges for order', result.orderId, ':', customsCharges);
        
        // Calculate insurance amount if insurance is enabled
        let insuranceAmount = 0;
        const isInsured = current.sigortala || false;
        if (isInsured) {
          // Use insured value if set, otherwise use customs value
          const valueToInsure = current.insuredValue || customsValue;
          const valueToInsureInCents = Math.round(valueToInsure * 100);
          
          // Fetch the actual insurance cost from admin-defined ranges
          if (valueToInsureInCents > 0) {
            try {
              const insuranceResponse = await fetch(`/api/insurance/calculate?insuranceValue=${valueToInsureInCents}`);
              if (insuranceResponse.ok) {
                const insuranceData = await insuranceResponse.json();
                insuranceAmount = insuranceData.cost || 0;
                console.log('[Etsy] Insurance calculated using admin ranges for order', result.orderId, ':', {
                  isInsured,
                  valueToInsure,
                  insuranceAmount,
                  rangeApplied: insuranceData.rangeId ? true : false,
                  insuranceData
                });
              } else {
                // Only use fallback if API fails
                insuranceAmount = Math.max(Math.round(valueToInsureInCents * 0.02), 500);
                console.warn('[Etsy] Insurance API failed, using fallback for order', result.orderId);
              }
            } catch (error) {
              console.error('[Etsy] Error fetching insurance cost:', error);
              // Only use fallback if API fails
              insuranceAmount = Math.max(Math.round(valueToInsureInCents * 0.02), 500);
            }
          }
        }
        
        // If no match or no previous selection, don't auto-select (let user choose)
        const detailsToSet = {
          ...current,
          pricingOptions: pricingOptions,
          selectedService: selectedService || null, // Don't auto-select first option
          ddpAmount: ddpAmount,
          ddpBaseDutiesAmount: ddpBaseDutiesAmount, // Base HS tax
          ddpTrumpTariffsAmount: ddpTrumpTariffsAmount, // Trump tariffs
          dutyRate: dutyRate,
          ddpProcessingFee: ddpProcessingFee,
          totalDDP: totalDDP,
          customsCharges: customsCharges, // Store customs charges in dollars
          duties: result.duties, // Store full duties object for detailed info
          shippingPriceCalculated: true,
          insuranceAmount: insuranceAmount, // Store calculated insurance amount
          shipToCountry: result.orderCountryCode || current.shipToCountry, // Store the country for future use
        };
        
        console.log('[Etsy] Setting order details for', result.orderId, ':', detailsToSet);
        newDetails.set(result.orderId, detailsToSet);
      }));
      
      console.log('[Etsy] Final order details map:', Array.from(newDetails.entries()));
      setOrderDetails(newDetails);
      
      // Show success message with pricing details
      const totalOptions = data.results.reduce((sum: number, r: any) => sum + (r.options?.length || 0), 0);
      toast({
        title: "Prices Calculated",
        description: `Found ${totalOptions} shipping options for ${selectedOrders.length} orders`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Calculation Failed",
        description: "Failed to calculate shipping prices",
      });
    } finally {
      setRecalculatingPrices(false);
    }
  };
  
  const openDimensionsDialog = (order: any) => {
    const details = orderDetails.get(order.id) || {};
    setEditingDimensions({
      orderId: order.id,
      dimensions: {
        length: details.length || 15,
        width: details.width || 10,
        height: details.height || 1,
        weight: details.weight || 0.5,
      },
    });
  };
  
  const saveDimensions = () => {
    if (editingDimensions.orderId) {
      const { length, width, height, weight } = editingDimensions.dimensions;
      updateOrderDetail(editingDimensions.orderId, 'length', length);
      updateOrderDetail(editingDimensions.orderId, 'width', width);
      updateOrderDetail(editingDimensions.orderId, 'height', height);
      updateOrderDetail(editingDimensions.orderId, 'weight', weight);
      setEditingDimensions({ orderId: null, dimensions: { length: 15, width: 10, height: 1, weight: 0.5 } });
    }
  };
  
  return (
    <Layout user={user}>
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold">Etsy Entegrasyonu</h1>
            <Button
              onClick={() => setShowSetup(!showSetup)}
              variant={showSetup ? "default" : "outline"}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              {showSetup ? "Close Set Up" : "Set Up"}
            </Button>
          </div>
          <p className="text-muted-foreground">
            Etsy siparişlerinizi içe aktarın ve gönderim için yönetin
          </p>
        </div>
      
      {/* Setup Content - Shows when Set Up button is clicked */}
      {showSetup && (
        <div className="space-y-4 mb-6">
          {/* Email Integration Setup */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-blue-600" />
                </div>
                E-posta Entegrasyonu Kurulumu
              </CardTitle>
              <CardDescription>
                Etsy siparişlerinizi e-posta bildirimlerinizden otomatik olarak içe aktarın
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {hasEmailConnection ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                        <Check className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-green-900">E-posta Bağlı</p>
                        <p className="text-sm text-green-700">E-postanız bağlı ve Etsy siparişlerini taramaya hazır</p>
                      </div>
                    </div>
                    <Button
                      onClick={scanEmails}
                      disabled={isScanning}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isScanning ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Taranıyor...
                        </>
                      ) : (
                        <>
                          <ScanLine className="h-4 w-4 mr-2" />
                          Siparişleri Tara
                        </>
                      )}
                    </Button>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-2">Nasıl Çalışır</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
                          <span className="text-xs text-blue-600">1</span>
                        </div>
                        <span>Gelen kutunuzu "Etsy'de bir satış yaptınız" e-postaları için tarıyoruz</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
                          <span className="text-xs text-blue-600">2</span>
                        </div>
                        <span>Sipariş detayları e-postalardan otomatik olarak çıkarılır</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
                          <span className="text-xs text-blue-600">3</span>
                        </div>
                        <span>Gönderim fiyatlarını hesaplayın ve tek tıkla etiket oluşturun</span>
                      </li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm">
                    E-posta hesabınızı bağlayarak Etsy siparişlerinizi bildirim e-postalarından otomatik olarak içe aktarın. 
                    Sipariş onay e-postalarını tarayıp gönderim detaylarını çıkaracağız.
                  </p>
                  
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Hızlı Kurulum
                    </h4>
                    <ul className="space-y-2 text-sm text-blue-800">
                      <li>• Tüm e-posta sağlayıcılarıyla çalışır (Gmail, Outlook, Yahoo, vb.)</li>
                      <li>• Etsy e-postalarından otomatik sipariş algılama</li>
                      <li>• Manuel veri girişi gerekmez</li>
                      <li>• IMAP protokolü ile güvenli e-posta tarama</li>
                    </ul>
                  </div>
                  
                  <Link href="/email-integration">
                    <Button className="w-full bg-blue-600 hover:bg-blue-700" size="lg">
                      <Mail className="h-5 w-5 mr-2" />
                      E-posta Hesabını Bağla
                      <ChevronRight className="h-5 w-5 ml-2" />
                    </Button>
                  </Link>
                  
                  <div className="text-center text-sm text-muted-foreground">
                    Yardıma mı ihtiyacınız var? <Link href="/guides/etsy-email-setup" className="text-blue-600 hover:underline">Kurulum kılavuzumuza</Link> göz atın
                  </div>
                  
                  {/* Gmail Setup Instructions */}
                  <div className="mt-6 border-t pt-6">
                    <details className="group">
                      <summary className="flex items-center justify-between cursor-pointer font-medium text-gray-900 hover:text-blue-600">
                        <div className="flex items-center gap-2">
                          <Mail className="h-5 w-5" />
                          📨 Gmail Bağlantı Kılavuzu
                        </div>
                        <ChevronRight className="h-5 w-5 transition-transform group-open:rotate-90" />
                      </summary>
                      
                      <div className="mt-6 space-y-6 text-sm">
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="font-medium text-blue-900 mb-2">
                            Gmail hesabınızı güvenli bir şekilde bağlamak için bu adımları izleyin.
                          </p>
                          <p className="text-blue-800">
                            MoogShip, Etsy sipariş e-postalarınızı otomatik olarak alıp etiket oluşturabilir.
                          </p>
                        </div>
                        
                        {/* Step 1: 2-Step Verification */}
                        <div className="space-y-3">
                          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                              1
                            </div>
                            🔐 2 Adımlı Doğrulamayı Etkinleştirin
                          </h3>
                          
                          <ol className="space-y-2 ml-10">
                            <li className="flex items-start gap-2">
                              <span className="text-blue-600 font-medium">a.</span>
                              <span>
                                <a 
                                  href="https://myaccount.google.com/security" 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline font-medium"
                                >
                                  Google Hesap Güvenliği
                                </a>
                                {' '}sayfasına gidin.
                              </span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-blue-600 font-medium">b.</span>
                              <span>"Google'da oturum açma" bölümüne inin.</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-blue-600 font-medium">c.</span>
                              <span>"2 Adımlı Doğrulama"ya tıklayın.</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-blue-600 font-medium">d.</span>
                              <span>Adımları izleyin (Google telefonunuzu veya cihazınızı doğrulamanızı isteyecektir).</span>
                            </li>
                          </ol>
                          
                          <div className="ml-10 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-green-800 text-sm">
                              2 Adımlı Doğrulama etkinleştirildiğinde şunları göreceksiniz:
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className="px-2 py-1 bg-white border border-green-300 rounded text-xs">✅ Google istemi</span>
                              <span className="px-2 py-1 bg-white border border-green-300 rounded text-xs">📱 Telefon numarası</span>
                              <span className="px-2 py-1 bg-white border border-green-300 rounded text-xs">🔑 Kimlik doğrulayıcı uygulama</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Step 2: Generate App Password */}
                        <div className="space-y-3">
                          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                              2
                            </div>
                            🔑 Uygulama Şifresi Oluşturun
                          </h3>
                          
                          <ol className="space-y-2 ml-10">
                            <li className="flex items-start gap-2">
                              <span className="text-blue-600 font-medium">a.</span>
                              <span>
                                Oturum açmışken{' '}
                                <a 
                                  href="https://myaccount.google.com/apppasswords" 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline font-medium"
                                >
                                  Uygulama Şifreleri
                                </a>
                                {' '}sayfasını açın.
                              </span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-blue-600 font-medium">b.</span>
                              <span>Google tekrar oturum açmanızı isteyebilir.</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-blue-600 font-medium">c.</span>
                              <span>"Uygulama seçin" altında <strong>Posta</strong>'yı seçin.</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-blue-600 font-medium">d.</span>
                              <span>"Cihaz seçin" altında <strong>Diğer (Özel ad)</strong> → <strong>MoogShip</strong> yazın.</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-blue-600 font-medium">e.</span>
                              <span><strong>Oluştur</strong>'a tıklayın.</span>
                            </li>
                          </ol>
                          
                          <div className="ml-10 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-yellow-900 font-medium text-sm mb-2">
                              📋 16 karakterli bir şifre göreceksiniz:
                            </p>
                            <div className="font-mono text-lg bg-white border-2 border-yellow-300 rounded px-3 py-2 text-center">
                              abcd efgh ijkl mnop
                            </div>
                            <p className="text-yellow-800 text-xs mt-2">
                              Bu şifreyi kopyalayın - bir daha gösterilmeyecek!
                            </p>
                          </div>
                        </div>
                        
                        {/* Step 3: Add Credentials */}
                        <div className="space-y-3">
                          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                              3
                            </div>
                            📋 MoogShip'e Gmail Bilgilerinizi Ekleyin
                          </h3>
                          
                          <div className="ml-10">
                            <p className="mb-3">
                              <Link href="/email-integration" className="text-blue-600 hover:underline font-medium">
                                E-posta Entegrasyonu
                              </Link>
                              {' '}sayfasında Gmail'inizi bağlarken şu bilgileri girin:
                            </p>
                            
                            <div className="overflow-x-auto">
                              <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
                                <thead className="bg-gray-100">
                                  <tr>
                                    <th className="px-4 py-2 text-left text-sm font-medium">Alan</th>
                                    <th className="px-4 py-2 text-left text-sm font-medium">Değer</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  <tr>
                                    <td className="px-4 py-3 font-medium">E-posta</td>
                                    <td className="px-4 py-3">
                                      <code className="bg-gray-100 px-2 py-1 rounded text-sm">sizinmail@gmail.com</code>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td className="px-4 py-3 font-medium">Şifre</td>
                                    <td className="px-4 py-3">
                                      <code className="bg-gray-100 px-2 py-1 rounded text-sm">16 karakterli uygulama şifresi</code>
                                      <span className="text-gray-500 text-xs ml-2">(boşluksuz)</span>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td className="px-4 py-3 font-medium">IMAP Sunucu</td>
                                    <td className="px-4 py-3">
                                      <code className="bg-gray-100 px-2 py-1 rounded text-sm">imap.gmail.com</code>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td className="px-4 py-3 font-medium">Port</td>
                                    <td className="px-4 py-3">
                                      <code className="bg-gray-100 px-2 py-1 rounded text-sm">993</code>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td className="px-4 py-3 font-medium">SSL</td>
                                    <td className="px-4 py-3">
                                      <code className="bg-gray-100 px-2 py-1 rounded text-sm">Evet</code>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                            
                            <div className="mt-4">
                              <Link href="/email-integration">
                                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                                  <Mail className="h-4 w-4 mr-2" />
                                  Bağlan
                                  <ChevronRight className="h-4 w-4 ml-2" />
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                        
                        {/* Step 4: Done */}
                        <div className="space-y-3">
                          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                              ✓
                            </div>
                            ✅ Tamamlandı!
                          </h3>
                          
                          <div className="ml-10 space-y-3">
                            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                              <p className="text-green-900 font-medium mb-2">
                                MoogShip artık güvenli bir şekilde:
                              </p>
                              <ul className="space-y-1 text-green-800">
                                <li className="flex items-start gap-2">
                                  <Check className="h-4 w-4 text-green-600 mt-0.5" />
                                  <span>IMAP kullanarak Etsy sipariş e-postalarınıza (transaction@etsy.com) erişebilir</span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <Check className="h-4 w-4 text-green-600 mt-0.5" />
                                  <span>Google şifreniz gizli kalır - sadece uygulama şifresi kullanılır</span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <Check className="h-4 w-4 text-green-600 mt-0.5" />
                                  <span>İstediğiniz zaman Google Hesabınız → Güvenlik → Uygulama Şifreleri'nden iptal edebilirsiniz</span>
                                </li>
                              </ul>
                            </div>
                            
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                              <p className="text-amber-800 text-sm">
                                <strong>💡 İpucu:</strong> Gmail'de "Daha az güvenli uygulama erişimi" ayarı 2022'den beri kullanılmamaktadır. 
                                Uygulama şifreleri, üçüncü taraf uygulamaların Gmail'e bağlanması için Google'ın önerdiği güvenli yöntemdir.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </details>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Alternative Import Methods */}
          <Card>
            <CardHeader>
              <CardTitle>Alternatif İçe Aktarma Yöntemleri</CardTitle>
              <CardDescription>
                Etsy siparişlerinizi içe aktarmanın diğer yolları
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <Package className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium">CSV İçe Aktarma</p>
                    <p className="text-sm text-muted-foreground">Etsy sipariş dışa aktarımlarını manuel olarak yükleyin</p>
                  </div>
                </div>
                <Link href="/bulk-upload">
                  <Button 
                    variant="outline" 
                    size="sm"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    CSV İçe Aktar
                  </Button>
                </Link>
              </div>
              
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <ExternalLink className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium">Manuel Giriş</p>
                    <p className="text-sm text-muted-foreground">Siparişleri tek tek ekleyin</p>
                  </div>
                </div>
                <Link href="/shipment-create">
                  <Button 
                    variant="outline" 
                    size="sm"
                  >
                    Sipariş Ekle
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Main Tabs - Only Orders and Status */}
      <Tabs defaultValue="orders" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="orders">
            Siparişler {orders.length > 0 && `(${orders.length})`}
          </TabsTrigger>
          <TabsTrigger value="status">Durum</TabsTrigger>
        </TabsList>
        
        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>İçe Aktarılan Siparişler</CardTitle>
                <CardDescription>
                  {orders.length} sipariş Etsy'den içe aktarıldı
                  {selectedOrderIds.size > 0 && (
                    <span className="ml-2 font-medium text-primary">
                      • {selectedOrderIds.size} seçili • Toplam: {calculateSelectedTotal()}
                    </span>
                  )}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {selectedOrderIds.size > 0 && (
                  <>
                    <Button
                      onClick={calculatePricesForSelected}
                      variant="default"
                      disabled={recalculatingPrices}
                    >
                      {recalculatingPrices ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Hesaplanıyor...
                        </>
                      ) : (
                        <>
                          <Calculator className="h-4 w-4 mr-2" />
                          Fiyatları Hesapla ({selectedOrderIds.size})
                        </>
                      )}
                    </Button>
                    {/* Bulk create labels button - only show when selected orders have prices */}
                    {Array.from(selectedOrderIds).some(id => {
                      const order = orders.find((o: any) => o.id === id);
                      return order && getOrderDetail(id, 'selectedService');
                    }) && (
                      <Button
                        onClick={async () => {
                          const selectedOrders = orders.filter((o: any) => selectedOrderIds.has(o.id));
                          const ordersWithPrices = selectedOrders.filter((order: any) => 
                            getOrderDetail(order.id, 'selectedService') && !getOrderDetail(order.id, 'shipmentId')
                          );
                          
                          if (ordersWithPrices.length === 0) {
                            toast({
                              title: "No Orders Ready",
                              description: "Please calculate prices and select shipping services first",
                              variant: "destructive"
                            });
                            return;
                          }
                          
                          setIsCreatingShipment(true);
                          let createdCount = 0;
                          let failedCount = 0;
                          const createdShipmentIds: number[] = [];
                          
                          // Create shipments for all selected orders with prices
                          for (const order of ordersWithPrices) {
                            try {
                              const result = await createShipmentFromOrder(order);
                              if (result && result.id) {
                                createdCount++;
                                createdShipmentIds.push(result.id);
                              } else {
                                failedCount++;
                              }
                            } catch (error) {
                              failedCount++;
                              console.error(`Failed to create shipment for order ${order.id}:`, error);
                            }
                          }
                          
                          setIsCreatingShipment(false);
                          
                          if (createdCount > 0) {
                            toast({
                              title: "Labels Created Successfully",
                              description: `Created ${createdCount} shipment label${createdCount > 1 ? 's' : ''}${failedCount > 0 ? ` (${failedCount} failed)` : ''}. Opening merged PDF...`
                            });
                            
                            // Merge and open all labels in a single PDF
                            if (createdShipmentIds.length > 0) {
                              try {
                                const response = await apiRequest('POST', '/api/shipments/merge-labels', {
                                  shipmentIds: createdShipmentIds
                                });
                                
                                if (response.ok) {
                                  const blob = await response.blob();
                                  const url = window.URL.createObjectURL(blob);
                                  
                                  // Open the merged PDF in a new tab
                                  const newWindow = window.open(url, '_blank');
                                  
                                  // Auto-trigger print dialog after a short delay
                                  if (newWindow) {
                                    setTimeout(() => {
                                      newWindow.print();
                                    }, 1000);
                                  }
                                  
                                  // Clean up the object URL after a delay
                                  setTimeout(() => {
                                    window.URL.revokeObjectURL(url);
                                  }, 60000); // Clean up after 1 minute
                                  
                                  console.log(`[Etsy] Opened merged PDF with ${createdShipmentIds.length} labels`);
                                } else {
                                  console.error('[Etsy] Failed to merge labels');
                                  toast({
                                    title: "Warning",
                                    description: "Labels created but failed to merge PDFs. You can print them individually.",
                                    variant: "destructive"
                                  });
                                }
                              } catch (error) {
                                console.error('[Etsy] Error merging labels:', error);
                                toast({
                                  title: "Warning",
                                  description: "Labels created but failed to merge PDFs. You can print them individually.",
                                  variant: "destructive"
                                });
                              }
                            }
                          } else if (failedCount > 0) {
                            toast({
                              title: "Error",
                              description: `Failed to create ${failedCount} shipment${failedCount > 1 ? 's' : ''}`,
                              variant: "destructive"
                            });
                          }
                        }}
                        variant="default"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        disabled={isCreatingShipment}
                      >
                        {isCreatingShipment ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Etiketler Oluşturuluyor...
                          </>
                        ) : (
                          <>
                            <Printer className="h-4 w-4 mr-2" />
                            Etiket Oluştur ({Array.from(selectedOrderIds).filter(id => {
                              const order = orders.find((o: any) => o.id === id);
                              return order && getOrderDetail(id, 'selectedService') && !getOrderDetail(id, 'shipmentId');
                            }).length})
                          </>
                        )}
                      </Button>
                    )}
                  </>
                )}
                {hasEmailConnection && (
                  <Button
                    onClick={scanEmails}
                    disabled={isScanning}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isScanning ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Scanning Emails...
                      </>
                    ) : (
                      <>
                        <ScanLine className="h-4 w-4 mr-2" />
                        Scan Emails for Orders
                      </>
                    )}
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => refetchOrders()}
                  disabled={ordersLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${ordersLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    No orders imported yet.
                  </p>
                  <div className="flex flex-col items-center gap-3">
                    {hasEmailConnection ? (
                      <>
                        <p className="text-sm text-muted-foreground">
                          Click "Scan Emails for Orders" above to import your Etsy orders from email notifications.
                        </p>
                        <Button 
                          onClick={scanEmails} 
                          disabled={isScanning}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {isScanning ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Scanning...
                            </>
                          ) : (
                            <>
                              <Mail className="h-4 w-4 mr-2" />
                              Scan Emails Now
                            </>
                          )}
                        </Button>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-muted-foreground">
                          Set up email integration to automatically import orders from Etsy notification emails.
                        </p>
                        <Link href="/email-integration">
                          <Button className="bg-green-600 hover:bg-green-700">
                            <Mail className="h-4 w-4 mr-2" />
                            Set Up Email Integration
                          </Button>
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {/* Bulk Actions Toolbar */}
                  {orders.length > 0 && (
                    <div className="mb-4 p-4 bg-gray-50 border rounded-lg space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-base font-medium text-gray-700">
                          <span>{selectedOrderIds.size}/{orders.length} seçili</span>
                          {selectedOrderIds.size > 0 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={deselectAllOrders}
                              className="h-9 w-9 p-0"
                              title="Seçimi Temizle"
                            >
                              <X className="h-5 w-5" />
                            </Button>
                          )}
                        </div>
                        
                        <div className="h-8 w-px bg-gray-300"></div>
                        
                        <div className="flex items-center gap-3">
                          {/* Recalculate All Prices */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={recalculateAllPrices}
                            disabled={recalculatingPrices || selectedOrderIds.size === 0}
                            className="h-10 px-4 text-base text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                            title="Tüm Fiyatları Yeniden Hesapla"
                          >
                            {recalculatingPrices ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              <RefreshCw className="h-5 w-5" />
                            )}
                          </Button>
                          
                          {/* Insurance */}
                          <div className="flex items-center gap-2 pl-2 border-l">
                            <Shield className="h-5 w-5 text-gray-600" />
                            <span className="text-sm font-medium text-gray-700">SİGORTA</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => applyBulkInsurance(true)}
                              disabled={selectedOrderIds.size === 0}
                              className="h-9 w-9 p-0 text-green-600 hover:bg-green-100 disabled:opacity-50"
                              title="Sigortayı Etkinleştir"
                            >
                              <Check className="h-5 w-5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => applyBulkInsurance(false)}
                              disabled={selectedOrderIds.size === 0}
                              className="h-9 w-9 p-0 text-red-600 hover:bg-red-100 disabled:opacity-50"
                              title="Sigortayı Kaldır"
                            >
                              <X className="h-5 w-5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Grid Layout - 2 columns */}
                      <div className="grid grid-cols-2 gap-4">
                        {/* Customs Value */}
                        <div className="flex items-center gap-2 p-3 bg-white rounded border">
                          <DollarSign className="h-5 w-5 text-gray-600 flex-shrink-0" />
                          <div className="flex flex-col gap-1 flex-1">
                            <label className="text-xs font-medium text-gray-600">GÜMRÜK DEĞERİ</label>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="0.01"
                                value={bulkActionValues.customsValue}
                                onChange={(e) => setBulkActionValues(prev => ({ ...prev, customsValue: e.target.value }))}
                                className="flex-1 h-8 px-2 text-sm border rounded"
                                placeholder="0.00"
                                title="Gümrük Değeri"
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={applyBulkCustomsValue}
                                disabled={selectedOrderIds.size === 0}
                                className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-100 disabled:opacity-50 flex-shrink-0"
                                title="Gümrük Değerini Uygula"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        {/* GTIP Code */}
                        <div className="flex items-center gap-2 p-3 bg-white rounded border">
                          <HashIcon className="h-5 w-5 text-gray-600 flex-shrink-0" />
                          <div className="flex flex-col gap-1 flex-1">
                            <label className="text-xs font-medium text-gray-600">GTIP KODU</label>
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={bulkActionValues.gtip}
                                onChange={(e) => {
                                  const input = e.target.value;
                                  const digits = input.replace(/\D/g, '');
                                  const limitedDigits = digits.slice(0, 10);
                                  let formattedValue = '';
                                  if (limitedDigits.length <= 4) {
                                    formattedValue = limitedDigits;
                                  } else if (limitedDigits.length <= 6) {
                                    formattedValue = `${limitedDigits.slice(0, 4)}.${limitedDigits.slice(4)}`;
                                  } else if (limitedDigits.length <= 8) {
                                    formattedValue = `${limitedDigits.slice(0, 4)}.${limitedDigits.slice(4, 6)}.${limitedDigits.slice(6)}`;
                                  } else {
                                    formattedValue = `${limitedDigits.slice(0, 4)}.${limitedDigits.slice(4, 6)}.${limitedDigits.slice(6, 8)}.${limitedDigits.slice(8)}`;
                                  }
                                  setBulkActionValues(prev => ({ ...prev, gtip: formattedValue }));
                                }}
                                className="flex-1 h-8 px-2 text-sm border rounded"
                                placeholder="0000"
                                maxLength={13}
                                title="GTIP Kodu"
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={applyBulkGTIP}
                                disabled={selectedOrderIds.size === 0}
                                className="h-8 w-8 p-0 text-purple-600 hover:bg-purple-100 disabled:opacity-50 flex-shrink-0"
                                title="GTIP Kodunu Uygula"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        {/* Product Name */}
                        <div className="flex items-center gap-2 p-3 bg-white rounded border">
                          <Package className="h-5 w-5 text-gray-600 flex-shrink-0" />
                          <div className="flex flex-col gap-1 flex-1">
                            <label className="text-xs font-medium text-gray-600">ÜRÜN ADI</label>
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={bulkActionValues.productName}
                                onChange={(e) => setBulkActionValues(prev => ({ ...prev, productName: e.target.value }))}
                                className="flex-1 h-8 px-2 text-sm border rounded"
                                placeholder="Ürün adını girin"
                                title="Ürün Adı"
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={applyBulkProductName}
                                disabled={selectedOrderIds.size === 0}
                                className="h-8 w-8 p-0 text-orange-600 hover:bg-orange-100 disabled:opacity-50 flex-shrink-0"
                                title="Ürün Adını Uygula"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        {/* Package Dimensions */}
                        <div className="flex items-center gap-2 p-3 bg-white rounded border">
                          <Package2 className="h-5 w-5 text-gray-600 flex-shrink-0" />
                          <div className="flex flex-col gap-1 flex-1">
                            <label className="text-xs font-medium text-gray-600">PAKET</label>
                            <div className="flex items-center gap-1">
                              <Select
                                value={bulkActionValues.packageType}
                                onValueChange={(value) => setBulkActionValues(prev => ({ ...prev, packageType: value }))}
                              >
                                <SelectTrigger className="flex-1 h-8 text-sm">
                                  <SelectValue placeholder="Paket seç" />
                                </SelectTrigger>
                                <SelectContent>
                                  {packageTemplates.map((template: any) => (
                                    <SelectItem key={template.id} value={template.id.toString()}>
                                      {template.name} ({template.length}x{template.width}x{template.height}cm)
                                    </SelectItem>
                                  ))}
                                  <SelectItem value="custom">Özel Boyut Gir</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={applyBulkPackage}
                                disabled={selectedOrderIds.size === 0}
                                className="h-8 w-8 p-0 text-indigo-600 hover:bg-indigo-100 disabled:opacity-50 flex-shrink-0"
                                title="Paket Boyutlarını Uygula"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Custom Dimensions Row */}
                      {bulkActionValues.packageType === 'custom' && (
                        <div className="grid grid-cols-4 gap-2 p-3 bg-white rounded border">
                          <input
                            type="number"
                            value={bulkActionValues.customLength}
                            onChange={(e) => setBulkActionValues(prev => ({ ...prev, customLength: e.target.value }))}
                            className="h-8 px-2 text-sm border rounded"
                            placeholder="En"
                          />
                          <input
                            type="number"
                            value={bulkActionValues.customWidth}
                            onChange={(e) => setBulkActionValues(prev => ({ ...prev, customWidth: e.target.value }))}
                            className="h-8 px-2 text-sm border rounded"
                            placeholder="Boy"
                          />
                          <input
                            type="number"
                            value={bulkActionValues.customHeight}
                            onChange={(e) => setBulkActionValues(prev => ({ ...prev, customHeight: e.target.value }))}
                            className="h-8 px-2 text-sm border rounded"
                            placeholder="Yük"
                          />
                          <input
                            type="number"
                            step="0.1"
                            value={bulkActionValues.customWeight}
                            onChange={(e) => setBulkActionValues(prev => ({ ...prev, customWeight: e.target.value }))}
                            className="h-8 px-2 text-sm border rounded"
                            placeholder="kg"
                          />
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="overflow-auto max-h-[70vh]">
                  <Table className="w-full">
                    <colgroup>
                      <col className="w-10" />
                      <col className="w-10" />
                      <col className="w-20" />
                      <col className="w-32" />
                      <col className="w-32" />
                      <col className="w-28" />
                      <col className="w-32" />
                      <col className="w-20" />
                    </colgroup>
                    <TableHeader className="sticky top-0 z-20 bg-white border-b">
                      <TableRow>
                        <TableHead className="p-2">
                          <Checkbox 
                            checked={orders.length > 0 && selectedOrderIds.size === orders.length}
                            onCheckedChange={toggleAllOrders}
                            data-testid="checkbox-select-all"
                          />
                        </TableHead>
                        <TableHead className="p-2"></TableHead>
                        <TableHead className="p-2 text-xs">Alıcı</TableHead>
                        <TableHead className="p-2 text-xs">Gönderi Detayları</TableHead>
                        <TableHead className="p-2 text-xs">Gümrük Değeri</TableHead>
                        <TableHead className="p-2 text-xs">Paket Detayları</TableHead>
                        <TableHead className="p-2 text-xs">Fiyat ve Sigorta</TableHead>
                        <TableHead className="p-2 text-xs text-center">$ DDP</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.flatMap((order: any) => {
                        const rows = [];
                        rows.push(
                        <TableRow key={order.id} className="border-b">
                          {/* Checkbox */}
                          <TableCell className="p-2">
                            <Checkbox 
                              checked={selectedOrderIds.has(order.id)}
                              onCheckedChange={() => toggleOrderSelection(order.id)}
                              data-testid={`checkbox-order-${order.id}`}
                            />
                          </TableCell>
                          
                          {/* Expand Arrow */}
                          <TableCell className="p-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRowExpansion(order.id);
                              }}
                              className="h-6 w-6 p-0"
                            >
                              {expandedRows.has(order.id) ? (
                                <ChevronDownIcon className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                          
                          {/* Alıcı (Receiver) */}
                          <TableCell className="p-2">
                            <div className="flex items-start space-x-2">
                              <div>
                                <div className="text-xs text-blue-600">#{order.orderNumber || order.receiptId}</div>
                                <div className="text-xs font-medium mt-1">{order.shipToName}</div>
                                <div className="text-xs text-gray-500">
                                  {order.shipToCity}, {order.shipToState}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {order.shipToCountry === 'US' ? 'United States' : order.shipToCountry}
                                </div>
                                {order.buyerEmail && (
                                  <div className="text-xs text-blue-500 mt-1">
                                    ✉ {order.buyerEmail}
                                  </div>
                                )}
                                <span className="inline-block w-5 h-4 mt-1">
                                  {order.shipToCountry === 'US' && '🇺🇸'}
                                  {order.shipToCountry === 'CA' && '🇨🇦'}
                                  {order.shipToCountry === 'GB' && '🇬🇧'}
                                  {order.shipToCountry === 'AU' && '🇦🇺'}
                                  {order.shipToCountry === 'DE' && '🇩🇪'}
                                  {order.shipToCountry === 'FR' && '🇫🇷'}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          
                          {/* Gönderi Detayları (Shipment Details) */}
                          <TableCell className="p-2">
                            <div className="space-y-2">
                              <div className="text-xs text-gray-500 mb-1">Ürün Açıklaması</div>
                              <Input
                                type="text"
                                placeholder="Enter product..."
                                value={(() => {
                                  // Get current value or auto-fill from items
                                  const currentValue = getOrderDetail(order.id, 'productDescription', '');
                                  if (currentValue) return currentValue;
                                  
                                  // Auto-fill from items if empty
                                  if (order.items && order.items.length > 0) {
                                    // Extract just the base title without personalization details
                                    const firstItem = order.items[0];
                                    const titleMatch = firstItem.title?.match(/^([^(]+)(?:\s*\(([^)]+)\))?$/);
                                    const baseTitle = titleMatch ? titleMatch[1].trim() : firstItem.title;
                                    
                                    // Truncate to reasonable length if needed
                                    const truncatedTitle = baseTitle && baseTitle.length > 100 
                                      ? baseTitle.substring(0, 97) + '...' 
                                      : baseTitle;
                                    
                                    // Return the auto-filled value without updating state during render
                                    if (truncatedTitle && !currentValue) {
                                      return truncatedTitle;
                                    }
                                  }
                                  
                                  return '';
                                })()}
                                onChange={(e) => updateOrderDetail(order.id, 'productDescription', e.target.value)}
                                className="h-7 text-xs"
                                data-testid={`input-product-${order.id}`}
                              />
                              <div className="text-xs text-gray-500 mt-2 mb-1">GTIP Kodu</div>
                              <Input
                                type="text"
                                placeholder="0000.00.00"
                                value={getOrderDetail(order.id, 'gtipCode', '')}
                                onChange={(e) => {
                                  const input = e.target.value;
                                  // Remove all non-digit characters
                                  const digits = input.replace(/\D/g, '');
                                  // Limit to 10 digits maximum
                                  const limitedDigits = digits.slice(0, 10);
                                  // Apply formatting based on length
                                  let formattedValue = '';
                                  if (limitedDigits.length <= 4) {
                                    formattedValue = limitedDigits;
                                  } else if (limitedDigits.length <= 6) {
                                    formattedValue = `${limitedDigits.slice(0, 4)}.${limitedDigits.slice(4)}`;
                                  } else if (limitedDigits.length <= 8) {
                                    formattedValue = `${limitedDigits.slice(0, 4)}.${limitedDigits.slice(4, 6)}.${limitedDigits.slice(6)}`;
                                  } else {
                                    formattedValue = `${limitedDigits.slice(0, 4)}.${limitedDigits.slice(4, 6)}.${limitedDigits.slice(6, 8)}.${limitedDigits.slice(8)}`;
                                  }
                                  updateOrderDetail(order.id, 'gtipCode', formattedValue);
                                }}
                                className="h-7 text-xs"
                                maxLength={13} // Maximum length for ####.##.##.##
                                data-testid={`input-gtip-${order.id}`}
                              />
                            </div>
                          </TableCell>
                          
                          {/* Gümrük Değeri (Customs Value) */}
                          <TableCell className="p-2">
                            <div className="space-y-2">
                              <div className="text-xs text-gray-500">Gümrük Değeri ($)</div>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={getOrderDetail(order.id, 'customsValue', order.grandTotal / 100 || 0)}
                                onChange={async (e) => {
                                  const newCustomsValue = parseFloat(e.target.value) || 0;
                                  updateOrderDetail(order.id, 'customsValue', newCustomsValue);
                                  
                                  // If insurance is enabled, recalculate insurance amount based on new customs value
                                  if (getOrderDetail(order.id, 'sigortala', false)) {
                                    const customsValueInCents = Math.round(newCustomsValue * 100);
                                    
                                    let insuranceAmount = 0;
                                    if (customsValueInCents > 0) {
                                      try {
                                        // Fetch insurance cost based on value ranges from the backend
                                        const insuranceResponse = await fetch(`/api/insurance/calculate?insuranceValue=${customsValueInCents}`);
                                        if (insuranceResponse.ok) {
                                          const insuranceData = await insuranceResponse.json();
                                          insuranceAmount = insuranceData.cost || 0;
                                          console.log('[Etsy] Customs value changed - recalculating insurance:', insuranceData);
                                          updateOrderDetail(order.id, 'insuranceAmount', insuranceAmount);
                                        } else {
                                          // Fallback to 2% with $5 minimum if API fails
                                          insuranceAmount = Math.max(Math.round(customsValueInCents * 0.02), 500);
                                          updateOrderDetail(order.id, 'insuranceAmount', insuranceAmount);
                                        }
                                      } catch (error) {
                                        console.error('[Etsy] Insurance recalculation error:', error);
                                        // Fallback to 2% with $5 minimum
                                        insuranceAmount = Math.max(Math.round(customsValueInCents * 0.02), 500);
                                        updateOrderDetail(order.id, 'insuranceAmount', insuranceAmount);
                                      }
                                    } else {
                                      // Insurance is off, ensure amount is 0
                                      updateOrderDetail(order.id, 'insuranceAmount', 0);
                                    }
                                    
                                    // Update pricing options with new insurance amount
                                    const pricingOptions = getOrderDetail(order.id, 'pricingOptions');
                                    if (pricingOptions && pricingOptions.length > 0) {
                                      const updatedOptions = pricingOptions.map((opt: any) => ({
                                        ...opt,
                                        // Use basePrice or shippingPrice as the base, then add new insurance
                                        price: (opt.basePrice || opt.shippingPrice || opt.price - (opt.insuranceAmount || 0)) + insuranceAmount,
                                        insuranceAmount: insuranceAmount,
                                        hasInsurance: true,
                                      }));
                                      
                                      updateOrderDetail(order.id, 'pricingOptions', updatedOptions);
                                      
                                      // Update selected service if one was selected
                                      const selectedService = getOrderDetail(order.id, 'selectedService');
                                      if (selectedService) {
                                        const updatedSelected = updatedOptions.find((opt: any) => opt.id === selectedService.id);
                                        if (updatedSelected) {
                                          updateOrderDetail(order.id, 'selectedService', updatedSelected);
                                        }
                                      }
                                    }
                                  }
                                }}
                                className="h-7 text-xs font-semibold"
                                data-testid={`input-customs-${order.id}`}
                              />
                              <div className="text-xs text-gray-500 mt-2">Vergi Kimlik No</div>
                              <Input
                                type="text"
                                placeholder="N/A"
                                value={getOrderDetail(order.id, 'taxId', '')}
                                onChange={(e) => updateOrderDetail(order.id, 'taxId', e.target.value)}
                                className="h-7 text-xs"
                                data-testid={`input-taxid-${order.id}`}
                              />
                            </div>
                          </TableCell>
                          
                          {/* Paket Detayları (Package Details) */}
                          <TableCell className="p-2">
                            <div className="space-y-2">
                              <div className="text-xs">
                                {getOrderDetail(order.id, 'length', 15)}×{getOrderDetail(order.id, 'width', 10)}×{getOrderDetail(order.id, 'height', 1)}cm
                              </div>
                              <div className="text-xs text-gray-600">
                                {getOrderDetail(order.id, 'weight', 0.5)}kg
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openDimensionsDialog(order)}
                                className="h-8 w-full text-xs mt-2"
                                data-testid={`button-package-${order.id}`}
                              >
                                <Package className="h-3 w-3 mr-1 text-orange-500" />
                                Bir paket...
                              </Button>
                            </div>
                          </TableCell>
                          
                          {/* Fiyat ve Sigorta (Price and Insurance) */}
                          <TableCell className="p-2">
                            {getOrderDetail(order.id, 'pricingOptions')?.length > 0 ? (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="text-2xl font-bold cursor-help hover:text-blue-600 transition-colors">
                                          {(() => {
                                            if (!getOrderDetail(order.id, 'selectedService') && getOrderDetail(order.id, 'pricingOptions')?.length > 0) {
                                              return <span className="text-sm">Select service</span>;
                                            }
                                            
                                            const selectedService = getOrderDetail(order.id, 'selectedService');
                                            if (!selectedService) return null;
                                            
                                            // Get the base shipping price (without insurance)
                                            const shippingPrice = selectedService.baseShippingPrice || selectedService.totalPrice || 0;
                                            const insuranceAmount = getOrderDetail(order.id, 'insuranceAmount', 0);
                                            const hasInsurance = getOrderDetail(order.id, 'sigortala', false);
                                            const isUSDestination = order.shipToCountry === 'USA' || order.shipToCountry === 'US';
                                            
                                            // Dynamically calculate customs charges based on selected service
                                            let dynamicCustomsCharges = 0;
                                            if (isUSDestination) {
                                              const duties = getOrderDetail(order.id, 'duties');
                                              const hasHSCode = getOrderDetail(order.id, 'gtipCode');
                                              const customsValue = getOrderDetail(order.id, 'customsValue', order.grandTotal / 100 || 0);
                                              
                                              if (customsValue > 0) {
                                                // Calculate DDP based on current selected service
                                                if (hasHSCode && duties) {
                                                  const baseDutyAmount = duties.baseDutyAmount !== undefined 
                                                    ? duties.baseDutyAmount / 100 
                                                    : customsValue * (duties.baseDutyRate || duties.dutyRate || 0);
                                                  const trumpTariffAmount = duties.trumpTariffAmount !== undefined 
                                                    ? duties.trumpTariffAmount / 100
                                                    : customsValue * 0.15;
                                                  // Check if ECO shipping based on selected service's displayName or name
                                                  const serviceName = selectedService.displayName || selectedService.name || '';
                                                  const isEcoShipping = serviceName && 
                                                    (serviceName.toLowerCase().includes('eco') || 
                                                     serviceName.toLowerCase().includes('eko'));
                                                  const ddpProcessingFee = isEcoShipping ? 0.45 : 4.50; // ECO: $0.45, Standard: $4.50
                                                  dynamicCustomsCharges = baseDutyAmount + trumpTariffAmount + ddpProcessingFee;
                                                } else {
                                                  // No HS code - only Trump tariff
                                                  const trumpTariffAmount = customsValue * 0.15;
                                                  const serviceName = selectedService.displayName || selectedService.name || '';
                                                  const isEcoShipping = serviceName && 
                                                    (serviceName.toLowerCase().includes('eco') || 
                                                     serviceName.toLowerCase().includes('eko'));
                                                  const ddpProcessingFee = isEcoShipping ? 0.45 : 4.50;
                                                  dynamicCustomsCharges = trumpTariffAmount + ddpProcessingFee;
                                                }
                                              }
                                            }
                                            
                                            // Display shipping price plus breakdown
                                            return (
                                              <div className="space-y-1">
                                                <div className="text-2xl font-bold">
                                                  {formatCurrency(shippingPrice)}
                                                </div>
                                                {hasInsurance && insuranceAmount > 0 && (
                                                  <div className="text-xs text-blue-600">
                                                    + {formatCurrency(insuranceAmount)} sigorta
                                                  </div>
                                                )}
                                                {isUSDestination && dynamicCustomsCharges > 0 && (
                                                  <div className="text-xs text-orange-600">
                                                    + {formatCurrency(Math.round(dynamicCustomsCharges * 100))} gümrük
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })()}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent side="left" className="max-w-sm">
                                        {(() => {
                                          const selectedService = getOrderDetail(order.id, 'selectedService');
                                          if (!selectedService) return <div className="text-xs">Please select a service</div>;
                                          
                                          // Get proper prices
                                          const baseShippingPrice = selectedService.baseShippingPrice || selectedService.totalPrice || 0;
                                          const insuranceAmount = getOrderDetail(order.id, 'insuranceAmount', 0);
                                          const hasInsurance = getOrderDetail(order.id, 'sigortala', false);
                                          const costPrice = selectedService.costPrice || Math.round(baseShippingPrice / (user?.priceMultiplier || 1.25));
                                          
                                          const duties = getOrderDetail(order.id, 'duties');
                                          const isUSDestination = order.shipToCountry === 'USA' || order.shipToCountry === 'US';
                                          const hasHSCode = getOrderDetail(order.id, 'gtipCode');
                                          const customsValue = getOrderDetail(order.id, 'customsValue', order.grandTotal / 100 || 0);
                                          
                                          let ddpAmount = 0;
                                          if (isUSDestination && customsValue > 0) {
                                            // Calculate DDP based on duties data
                                            if (hasHSCode && duties) {
                                              const baseDutyRate = duties.baseDutyRate || duties.dutyRate || 0;
                                              const baseDutyAmount = duties.baseDutyAmount !== undefined 
                                                ? duties.baseDutyAmount / 100 
                                                : customsValue * baseDutyRate;
                                              const trumpTariffAmount = duties.trumpTariffAmount !== undefined 
                                                ? duties.trumpTariffAmount / 100
                                                : customsValue * 0.15;
                                              // Check if ECO shipping based on selected service
                                              const isEcoShipping = selectedService.name && (selectedService.name.toLowerCase().includes('eco') || selectedService.name.toLowerCase().includes('eko'));
                                              const ddpProcessingFee = isEcoShipping ? 0.45 : 4.50; // ECO: $0.45, Standard: $4.50
                                              ddpAmount = baseDutyAmount + trumpTariffAmount + ddpProcessingFee;
                                            } else {
                                              // No HS code - only Trump tariff
                                              const trumpTariffAmount = customsValue * 0.15;
                                              // Check if ECO shipping based on selected service
                                              const isEcoShipping = selectedService.name && (selectedService.name.toLowerCase().includes('eco') || selectedService.name.toLowerCase().includes('eko'));
                                              const ddpProcessingFee = isEcoShipping ? 0.45 : 4.50; // ECO: $0.45, Standard: $4.50
                                              ddpAmount = trumpTariffAmount + ddpProcessingFee;
                                            }
                                          }
                                          
                                          return (
                                            <div className="text-xs space-y-1 p-2">
                                              <div className="font-semibold text-gray-800 mb-1">
                                                Price Breakdown
                                              </div>
                                              
                                              {/* Shipping Price */}
                                              <div className="flex justify-between text-gray-700 gap-4">
                                                <span>Shipping ({selectedService.name}):</span>
                                                <span className="font-medium">{formatCurrency(baseShippingPrice)}</span>
                                              </div>
                                              
                                              {/* Insurance if selected */}
                                              {hasInsurance && insuranceAmount > 0 && (
                                                <div className="flex justify-between text-blue-700 gap-4">
                                                  <span>Insurance:</span>
                                                  <span className="font-medium">{formatCurrency(insuranceAmount)}</span>
                                                </div>
                                              )}
                                              
                                              {/* DDP if applicable */}
                                              {isUSDestination && ddpAmount > 0 && (
                                                <div className="flex justify-between text-yellow-700 gap-4">
                                                  <span>US Customs (DDP):</span>
                                                  <span className="font-medium">{formatCurrency(Math.round(ddpAmount * 100))}</span>
                                                </div>
                                              )}
                                              
                                              {/* Total */}
                                              <div className="flex justify-between font-semibold text-gray-900 pt-1 border-t border-gray-300 gap-4">
                                                <span>Total:</span>
                                                <span>{formatCurrency(baseShippingPrice + insuranceAmount + Math.round(ddpAmount * 100))}</span>
                                              </div>
                                              
                                              <div className="text-[10px] text-gray-600 mt-1">
                                                {selectedService.estimatedDays ? `Delivery: ${selectedService.estimatedDays} days` : ''}
                                              </div>
                                            </div>
                                          );
                                        })()}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  <div className="flex items-center space-x-2">
                                    {getOrderDetail(order.id, 'selectedService')?.name?.toLowerCase().includes('ground') && (
                                      <Badge className="bg-green-100 text-green-800">ECO</Badge>
                                    )}
                                    {getOrderDetail(order.id, 'selectedService')?.name?.toLowerCase().includes('express') && (
                                      <Badge className="bg-orange-100 text-orange-800">EXPRESS</Badge>
                                    )}
                                    {getOrderDetail(order.id, 'selectedService')?.name?.toLowerCase().includes('priority') && (
                                      <Badge className="bg-blue-100 text-blue-800">PRIORITY</Badge>
                                    )}
                                    {getOrderDetail(order.id, 'selectedService')?.name?.toLowerCase().includes('standard') && (
                                      <Badge className="bg-gray-100 text-gray-800">STANDARD</Badge>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={async () => {
                                        // Preserve current selection and restore after calculation
                                        const previousSelection = new Set(selectedOrderIds);
                                        setSelectedOrderIds(new Set([order.id]));
                                        setRecalculatingPrices(true);
                                        try {
                                          await calculatePricesForSelected();
                                        } finally {
                                          setSelectedOrderIds(previousSelection);
                                          setRecalculatingPrices(false);
                                        }
                                      }}
                                      disabled={recalculatingPrices}
                                      className="h-6 text-xs px-2"
                                    >
                                      {recalculatingPrices ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <RefreshCw className="h-3 w-3" />
                                      )}
                                    </Button>
                                  </div>
                                </div>
                                
                                
                                <div className="space-y-1">
                                  <div className="flex items-center space-x-1">
                                    <Checkbox 
                                      checked={getOrderDetail(order.id, 'sigortala', false)}
                                      onCheckedChange={async (checked) => {
                                        // First, immediately update the sigortala state to ensure UI updates
                                        updateOrderDetail(order.id, 'sigortala', checked);
                                        
                                        // If checking, initialize insured value with customs value if not set
                                        if (checked) {
                                          const currentInsuredValue = getOrderDetail(order.id, 'insuredValue', null);
                                          if (currentInsuredValue === null) {
                                            const customsValue = getOrderDetail(order.id, 'customsValue', order.grandTotal / 100 || 0);
                                            updateOrderDetail(order.id, 'insuredValue', customsValue);
                                          }
                                        }
                                        
                                        // Update prices locally if we have pricing options
                                        const pricingOptions = getOrderDetail(order.id, 'pricingOptions');
                                        if (pricingOptions && pricingOptions.length > 0) {
                                          // Use insured value instead of customs value
                                          const insuredValue = getOrderDetail(order.id, 'insuredValue', getOrderDetail(order.id, 'customsValue', order.grandTotal / 100 || 0));
                                          const insuredValueInCents = Math.round(insuredValue * 100);
                                          
                                          let insuranceAmount = 0;
                                          if (checked && insuredValueInCents > 0) {
                                            try {
                                              // Fetch insurance cost based on admin-defined ranges from the backend
                                              const insuranceResponse = await fetch(`/api/insurance/calculate?insuranceValue=${insuredValueInCents}`);
                                              if (insuranceResponse.ok) {
                                                const insuranceData = await insuranceResponse.json();
                                                insuranceAmount = insuranceData.cost || 0;
                                                console.log('[Etsy] Insurance calculation for insured value:', insuranceData);
                                                // Store the insurance amount in orderDetails
                                                updateOrderDetail(order.id, 'insuranceAmount', insuranceAmount);
                                              } else {
                                                // Fallback to 2% with $5 minimum if API fails
                                                insuranceAmount = Math.max(Math.round(insuredValueInCents * 0.02), 500);
                                                console.warn('[Etsy] Insurance API failed, using fallback calculation');
                                                updateOrderDetail(order.id, 'insuranceAmount', insuranceAmount);
                                              }
                                            } catch (error) {
                                              console.error('[Etsy] Insurance calculation error:', error);
                                              // Fallback to 2% with $5 minimum
                                              insuranceAmount = Math.max(Math.round(insuredValueInCents * 0.02), 500);
                                              updateOrderDetail(order.id, 'insuranceAmount', insuranceAmount);
                                            }
                                          } else {
                                            // Insurance is unchecked, set amount to 0
                                            updateOrderDetail(order.id, 'insuranceAmount', 0);
                                          }
                                          
                                          // Update each pricing option with/without insurance
                                          const updatedOptions = pricingOptions.map((opt: any) => ({
                                            ...opt,
                                            // Use baseShippingPrice as the base, then add insurance if needed
                                            totalPrice: (opt.baseShippingPrice || opt.totalPrice - (opt.insuranceAmount || 0)) + (checked ? insuranceAmount : 0),
                                            price: (opt.baseShippingPrice || opt.totalPrice - (opt.insuranceAmount || 0)) + (checked ? insuranceAmount : 0),
                                            insuranceAmount: checked ? insuranceAmount : 0,
                                            hasInsurance: checked,
                                          }));
                                          
                                          updateOrderDetail(order.id, 'pricingOptions', updatedOptions);
                                          
                                          // Update selected service if one was selected
                                          const selectedService = getOrderDetail(order.id, 'selectedService');
                                          if (selectedService) {
                                            const updatedSelected = updatedOptions.find((opt: any) => opt.id === selectedService.id);
                                            if (updatedSelected) {
                                              updateOrderDetail(order.id, 'selectedService', updatedSelected);
                                              console.log('[Etsy] Updated selected service with insurance:', updatedSelected);
                                            }
                                          }
                                          
                                          // Re-confirm sigortala is still checked after async operations
                                          updateOrderDetail(order.id, 'sigortala', checked);
                                        }
                                      }}
                                      className="h-3 w-3"
                                    />
                                    <span className="text-xs">Sigortala</span>
                                    {getOrderDetail(order.id, 'sigortala', false) && (
                                      <span className="text-xs font-semibold text-green-600 ml-1">
                                        +{(() => {
                                          const selectedService = getOrderDetail(order.id, 'selectedService');
                                          const pricingOptions = getOrderDetail(order.id, 'pricingOptions');
                                          const firstOption = pricingOptions?.[0];
                                          const insuranceAmount = selectedService?.insuranceAmount || firstOption?.insuranceAmount || 0;
                                          return formatCurrency(insuranceAmount);
                                        })()}
                                      </span>
                                    )}
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger>
                                          <span className="text-blue-500 text-xs cursor-help">ⓘ</span>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Insurance cost is calculated based on insured value</p>
                                          <p className="text-xs">You can set a different insured value below</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                  {getOrderDetail(order.id, 'sigortala', false) && (
                                    <div className="ml-4 space-y-2">
                                      <div className="flex items-center gap-2">
                                        <label htmlFor={`insured-value-${order.id}`} className="text-xs text-gray-600">
                                          Insured Value:
                                        </label>
                                        <div className="flex items-center gap-1">
                                          <span className="text-xs text-gray-600">$</span>
                                          <input
                                            id={`insured-value-${order.id}`}
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={getOrderDetail(order.id, 'insuredValue', getOrderDetail(order.id, 'customsValue', order.grandTotal / 100 || 0))}
                                            onChange={(e) => {
                                              // Just update the value without recalculating
                                              const inputValue = e.target.value;
                                              const value = inputValue === '' ? 0 : parseFloat(inputValue);
                                              updateOrderDetail(order.id, 'insuredValue', value);
                                            }}
                                            onBlur={async (e) => {
                                              // Recalculate insurance when user finishes typing
                                              const value = parseFloat(e.target.value) || 0;
                                              updateOrderDetail(order.id, 'insuredValue', value);
                                              
                                              // Recalculate insurance with new value
                                              const insuredValueInCents = Math.round(value * 100);
                                              let insuranceAmount = 0;
                                              
                                              if (insuredValueInCents > 0) {
                                                try {
                                                  const insuranceResponse = await fetch(`/api/insurance/calculate?insuranceValue=${insuredValueInCents}`);
                                                  if (insuranceResponse.ok) {
                                                    const insuranceData = await insuranceResponse.json();
                                                    insuranceAmount = insuranceData.cost || 0;
                                                    console.log('[Etsy] Insurance recalculated for new value:', insuranceData);
                                                  } else {
                                                    insuranceAmount = Math.max(Math.round(insuredValueInCents * 0.02), 500);
                                                  }
                                                } catch (error) {
                                                  console.error('[Etsy] Insurance calculation error:', error);
                                                  insuranceAmount = Math.max(Math.round(insuredValueInCents * 0.02), 500);
                                                }
                                              }
                                              
                                              // Update all pricing options with new insurance amount
                                              updateOrderDetail(order.id, 'insuranceAmount', insuranceAmount);
                                              
                                              const pricingOptions = getOrderDetail(order.id, 'pricingOptions');
                                              if (pricingOptions && pricingOptions.length > 0) {
                                                const updatedOptions = pricingOptions.map((opt: any) => ({
                                                  ...opt,
                                                  price: (opt.basePrice || opt.shippingPrice || opt.price - (opt.insuranceAmount || 0)) + insuranceAmount,
                                                  insuranceAmount: insuranceAmount,
                                                  hasInsurance: true,
                                                }));
                                                
                                                updateOrderDetail(order.id, 'pricingOptions', updatedOptions);
                                                
                                                const selectedService = getOrderDetail(order.id, 'selectedService');
                                                if (selectedService) {
                                                  const updatedSelected = updatedOptions.find((opt: any) => opt.id === selectedService.id);
                                                  if (updatedSelected) {
                                                    updateOrderDetail(order.id, 'selectedService', updatedSelected);
                                                  }
                                                }
                                              }
                                            }}
                                            className="w-20 px-1 py-0.5 text-xs border rounded"
                                          />
                                        </div>
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        Customs value: {formatCurrency(getOrderDetail(order.id, 'customsValue', 0) * 100)}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <Select
                                  value={getOrderDetail(order.id, 'selectedService')?.id || ''}
                                  onValueChange={(value) => {
                                    const selected = getOrderDetail(order.id, 'pricingOptions')?.find((opt: any) => opt.id === value);
                                    updateOrderDetail(order.id, 'selectedService', selected);
                                  }}
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Select a shipping service">
                                      {getOrderDetail(order.id, 'selectedService')?.name || 'Select a service'}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    {getOrderDetail(order.id, 'pricingOptions')?.length > 0 ? (
                                      getOrderDetail(order.id, 'pricingOptions')?.map((option: any) => (
                                        <SelectItem key={option.id} value={option.id}>
                                          <div className="flex justify-between items-center w-full">
                                            <span>{option.name}</span>
                                            <span className="ml-2 flex items-center gap-1">
                                              <span className="text-green-600 font-semibold">
                                                {formatCurrency(option.totalPrice || option.baseShippingPrice)}
                                              </span>
                                              {option.hasInsurance && option.insuranceAmount > 0 && (
                                                <span className="text-blue-600 text-xs">
                                                  (incl. {formatCurrency(option.insuranceAmount)} ins.)
                                                </span>
                                              )}
                                              <span className="text-gray-600">
                                                • {option.estimatedDays} days
                                              </span>
                                            </span>
                                          </div>
                                        </SelectItem>
                                      ))
                                    ) : (
                                      <div className="p-2 text-center text-xs text-gray-500">
                                        Click "Calculate Prices" to see options
                                      </div>
                                    )}
                                  </SelectContent>
                                </Select>
                                <div className="mt-2 space-y-2">
                                  {/* Show Purchase Label button when service is selected but no shipment yet */}
                                  {getOrderDetail(order.id, 'selectedService') && !getOrderDetail(order.id, 'shipmentId') && (
                                    <Button 
                                      variant="default" 
                                      size="sm" 
                                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                                      onClick={async () => {
                                        setIsCreatingShipment(true);
                                        const result = await createShipmentFromOrder(order);
                                        setIsCreatingShipment(false);
                                        if (result) {
                                          toast({
                                            title: "Success",
                                            description: "Label created successfully! You can now print it."
                                          });
                                        }
                                      }}
                                      disabled={isCreatingShipment}
                                    >
                                      {isCreatingShipment ? (
                                        <>
                                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                          Creating...
                                        </>
                                      ) : (
                                        <>
                                          <Send className="h-3 w-3 mr-1" />
                                          Purchase Label
                                        </>
                                      )}
                                    </Button>
                                  )}
                                  
                                  {/* Show Print Label button when shipment is created */}
                                  {getOrderDetail(order.id, 'shipmentId') && (
                                    <>
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="w-full"
                                        onClick={() => printLabel(getOrderDetail(order.id, 'shipmentId'))}
                                      >
                                        <Printer className="h-3 w-3 mr-1" />
                                        Print Label
                                      </Button>
                                      <div className="text-xs text-green-600 text-center">
                                        <Check className="h-3 w-3 inline mr-1" />
                                        Label Ready
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="text-center">
                                <div className="text-xs text-gray-400 mb-2">No price calculated</div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={async () => {
                                    // Preserve current selection and restore after calculation
                                    const previousSelection = new Set(selectedOrderIds);
                                    setSelectedOrderIds(new Set([order.id]));
                                    setRecalculatingPrices(true);
                                    try {
                                      await calculatePricesForSelected();
                                    } finally {
                                      setSelectedOrderIds(previousSelection);
                                      setRecalculatingPrices(false);
                                    }
                                  }}
                                  className="text-xs"
                                >
                                  <Calculator className="h-3 w-3 mr-1" />
                                  Calculate
                                </Button>
                              </div>
                            )}
                          </TableCell>
                          
                          {/* $ DDP */}
                          <TableCell className="p-2 text-center">
                            {(() => {
                              const shippingPriceCalculated = getOrderDetail(order.id, 'shippingPriceCalculated');
                              
                              // Only show DDP if price has been calculated
                              if (!shippingPriceCalculated) {
                                return (
                                  <div className="space-y-2">
                                    <div className="text-2xl font-bold">--</div>
                                    <div className="text-xs text-gray-500">Calculate prices first</div>
                                  </div>
                                );
                              }
                              
                              const isUSDestination = order.shipToCountry === 'USA' || order.shipToCountry === 'US';
                              const hasHSCode = getOrderDetail(order.id, 'gtipCode');
                              const customsValue = getOrderDetail(order.id, 'customsValue', order.grandTotal / 100 || 0);
                              const duties = getOrderDetail(order.id, 'duties');
                              
                              if (isUSDestination && hasHSCode && customsValue) {
                                // Calculate base duty (from HS code)
                                const baseDutyRate = duties?.baseDutyRate || duties?.dutyRate || 0;
                                const baseDutyAmount = duties?.baseDutyAmount !== undefined 
                                  ? duties.baseDutyAmount / 100 
                                  : customsValue * baseDutyRate;
                                
                                // Calculate Trump tariff (15% of customs value)
                                const trumpTariffRate = 0.15;
                                const trumpTariffAmount = duties?.trumpTariffAmount !== undefined 
                                  ? duties.trumpTariffAmount / 100
                                  : customsValue * trumpTariffRate;
                                
                                // DDP processing fee - Check if ECO shipping based on selected service
                                const selectedService = getOrderDetail(order.id, 'selectedService');
                                const isEcoShipping = selectedService?.name && (selectedService.name.toLowerCase().includes('eco') || selectedService.name.toLowerCase().includes('eko'));
                                const ddpProcessingFee = isEcoShipping ? 0.45 : 4.50; // ECO: $0.45, Standard: $4.50
                                
                                // Total DDP amount
                                const totalDDP = baseDutyAmount + trumpTariffAmount + ddpProcessingFee;
                                
                                return (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="cursor-help">
                                          <div className="text-2xl font-bold hover:text-yellow-700 transition-colors">
                                            {formatCurrency(Math.round(totalDDP * 100))}
                                          </div>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent side="left" className="max-w-sm">
                                        <div className="text-xs space-y-1 p-2">
                                          <div className="font-semibold text-yellow-800 mb-1">
                                            🇺🇸 US Customs {hasHSCode ? `(HS: ${hasHSCode})` : ''}
                                          </div>
                                          
                                          {/* Base Duty */}
                                          <div className="flex justify-between text-gray-700 gap-4">
                                            <span>HS Tax ({(baseDutyRate * 100).toFixed(1)}%):</span>
                                            <span className="font-medium">{formatCurrency(Math.round(baseDutyAmount * 100))}</span>
                                          </div>
                                          
                                          {/* Trump Tariff */}
                                          <div className="flex justify-between text-red-700 gap-4">
                                            <span>Trump Tax (15%):</span>
                                            <span className="font-medium">{formatCurrency(Math.round(trumpTariffAmount * 100))}</span>
                                          </div>
                                          
                                          {/* DDP Processing Fee */}
                                          <div className="flex justify-between text-purple-700 gap-4">
                                            <span>DDP Fee:</span>
                                            <span className="font-medium">${ddpProcessingFee.toFixed(2)}</span>
                                          </div>
                                          
                                          {/* Total */}
                                          <div className="flex justify-between font-semibold text-yellow-900 pt-1 border-t border-yellow-300 gap-4">
                                            <span>Total:</span>
                                            <span>{formatCurrency(Math.round(totalDDP * 100))}</span>
                                          </div>
                                          
                                          <div className="text-[10px] text-yellow-700 mt-1">
                                            {duties?.provider === 'USITC' ? 'Official USITC rates' : 'Estimated taxes'}
                                          </div>
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                );
                              } else if (isUSDestination && customsValue && !hasHSCode) {
                                // No HS code but has customs value - show only Trump tariff
                                const trumpTariffAmount = customsValue * 0.15;
                                // Check if ECO shipping based on selected service
                                const selectedService = getOrderDetail(order.id, 'selectedService');
                                const isEcoShipping = selectedService?.name && (selectedService.name.toLowerCase().includes('eco') || selectedService.name.toLowerCase().includes('eko'));
                                const ddpProcessingFee = isEcoShipping ? 0.45 : 4.50; // ECO: $0.45, Standard: $4.50
                                const totalDDP = trumpTariffAmount + ddpProcessingFee;
                                
                                return (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="cursor-help">
                                          <div className="text-2xl font-bold hover:text-yellow-700 transition-colors">
                                            {formatCurrency(Math.round(totalDDP * 100))}
                                          </div>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent side="left" className="max-w-sm">
                                        <div className="text-xs space-y-1 p-2">
                                          <div className="font-semibold text-yellow-800 mb-1">
                                            🇺🇸 US Customs (No HS Code)
                                          </div>
                                          
                                          {/* Trump Tariff Only */}
                                          <div className="flex justify-between text-red-700 gap-4">
                                            <span>Trump Tax (15%):</span>
                                            <span className="font-medium">{formatCurrency(Math.round(trumpTariffAmount * 100))}</span>
                                          </div>
                                          
                                          {/* DDP Processing Fee */}
                                          <div className="flex justify-between text-purple-700 gap-4">
                                            <span>DDP Fee:</span>
                                            <span className="font-medium">${ddpProcessingFee.toFixed(2)}</span>
                                          </div>
                                          
                                          {/* Total */}
                                          <div className="flex justify-between font-semibold text-yellow-900 pt-1 border-t border-yellow-300 gap-4">
                                            <span>Total:</span>
                                            <span>{formatCurrency(Math.round(totalDDP * 100))}</span>
                                          </div>
                                          
                                          <div className="text-[10px] text-yellow-700 mt-1">
                                            Add HS code for accurate base duty
                                          </div>
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                );
                              } else {
                                // Not US destination or missing customs value
                                return (
                                  <div className="space-y-2">
                                    <div className="text-2xl font-bold">$0.00</div>
                                    <div className="text-xs text-gray-500">
                                      {isUSDestination ? 'Enter customs value' : 'Non-US destination'}
                                    </div>
                                  </div>
                                );
                              }
                            })()}
                            {/* Orange DDP Button */}
                            {(() => {
                              const isUSDestination = order.shipToCountry === 'USA' || order.shipToCountry === 'US';
                              const shippingPriceCalculated = getOrderDetail(order.id, 'shippingPriceCalculated');
                              
                              // Only show button for US destinations after price calculation
                              if (isUSDestination && shippingPriceCalculated) {
                                return (
                                  <div className="mt-3">
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="w-full bg-orange-500 hover:bg-orange-600 text-xs text-white"
                                            onClick={() => {
                                              toast({
                                                title: "DDP Service",
                                                description: "US shipments via this service use DDU terms only",
                                              });
                                            }}
                                          >
                                            DDP
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p className="text-xs">US shipments via this service use DDU terms only</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </TableCell>
                        </TableRow>
                        );
                        
                        /* Expanded Row */
                        if (expandedRows.has(order.id)) {
                          rows.push(
                          <TableRow key={`expanded-${order.id}`} className="bg-gray-50 border-b">
                            <TableCell colSpan={8} className="p-4">
                              {/* Order Items Section */}
                              {order.items && order.items.length > 0 && (
                                <div className="mb-4">
                                  <h4 className="font-semibold text-sm mb-3 flex items-center">
                                    <Package className="h-4 w-4 mr-2" />
                                    Order Items ({order.items.length})
                                  </h4>
                                  <div className={`grid gap-4 ${
                                    order.items.length === 1 ? 'grid-cols-1' :
                                    order.items.length === 2 ? 'grid-cols-1 lg:grid-cols-2' :
                                    order.items.length === 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
                                    order.items.length === 4 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' :
                                    'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                                  }`}>
                                    {order.items.map((item: any, idx: number) => (
                                      <div key={idx} className="flex items-start space-x-3 bg-white p-4 rounded-lg border border-gray-200">
                                        {/* Product Image */}
                                        <div className="flex-shrink-0">
                                          {item.imageUrl ? (
                                            <img 
                                              src={item.imageUrl} 
                                              alt={item.title}
                                              className="w-16 h-16 object-cover rounded-md border border-gray-200"
                                              onError={(e) => {
                                                // Fallback to placeholder if image fails to load
                                                (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yOCA0MkwyNCAzOEwyOCAzNEwzNiAyNkw0MiAzMkw0OCAyNlY0Mkw0MiA0MkgzMiIgc3Ryb2tlPSIjOUI5Q0EzIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8Y2lyY2xlIGN4PSI0MCIgY3k9IjIwIiByPSIzIiBzdHJva2U9IiM5QjlDQTMiIHN0cm9rZS13aWR0aD0iMiIvPgo8L3N2Zz4=';
                                              }}
                                            />
                                          ) : (
                                            <div className="w-16 h-16 bg-gray-100 rounded-md flex items-center justify-center">
                                              <Package2 className="h-8 w-8 text-gray-400" />
                                            </div>
                                          )}
                                        </div>
                                        
                                        {/* Product Details */}
                                        <div className="flex-1 min-w-0">
                                          {/* Extract base title and personalization */}
                                          {(() => {
                                            // Check if title contains personalization in parentheses
                                            const titleMatch = item.title?.match(/^([^(]+)(?:\s*\(([^)]+)\))?$/);
                                            const baseTitle = titleMatch ? titleMatch[1].trim() : item.title;
                                            const personalization = titleMatch && titleMatch[2] ? titleMatch[2] : null;
                                            
                                            return (
                                              <>
                                                {/* Product Title - Full, not truncated */}
                                                <h5 className="text-sm font-medium text-gray-900 break-words" title={baseTitle}>
                                                  {baseTitle}
                                                </h5>
                                                
                                                {/* Personalization Details */}
                                                {personalization && (
                                                  <div className="text-xs text-purple-600 mt-1 font-medium">
                                                    📝 {personalization}
                                                  </div>
                                                )}
                                              </>
                                            );
                                          })()}
                                          
                                          {item.sku && (
                                            <div className="text-xs text-gray-500 mt-1">
                                              SKU: {item.sku}
                                            </div>
                                          )}
                                          {item.variationName && (
                                            <div className="text-xs text-gray-600 mt-1">
                                              {item.variationName}
                                            </div>
                                          )}
                                          <div className="flex items-center justify-between mt-2">
                                            <span className="text-xs font-medium text-blue-600">
                                              Quantity: {item.quantity}
                                            </span>
                                            <span className="text-sm font-semibold text-green-600">
                                              ${((item.price / 100) * item.quantity).toFixed(2)}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* Rest of the expanded content */}
                              <div className="grid grid-cols-3 gap-4">
                                <div>
                                  <h4 className="font-semibold text-sm mb-2">Shipping Address</h4>
                                  <div className="text-xs space-y-1">
                                    <div>{order.shipToName}</div>
                                    <div>{order.shipToAddress1}</div>
                                    {order.shipToAddress2 && <div>{order.shipToAddress2}</div>}
                                    <div>{order.shipToCity}, {order.shipToState} {order.shipToZip}</div>
                                    <div>{order.shipToCountry}</div>
                                    {order.buyerEmail && (
                                      <div className="mt-2 pt-2 border-t">
                                        <span className="font-medium">Email:</span> {order.buyerEmail}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <h4 className="font-semibold text-sm mb-2">Order Summary</h4>
                                  <div className="text-xs space-y-1">
                                    <div className="flex justify-between">
                                      <span>Subtotal:</span>
                                      <span className="font-medium">${(order.subtotal / 100).toFixed(2)}</span>
                                    </div>
                                    {order.shippingCost > 0 && (
                                      <div className="flex justify-between">
                                        <span>Shipping:</span>
                                        <span className="font-medium">${(order.shippingCost / 100).toFixed(2)}</span>
                                      </div>
                                    )}
                                    {order.taxTotal > 0 && (
                                      <div className="flex justify-between">
                                        <span>Tax:</span>
                                        <span className="font-medium">${(order.taxTotal / 100).toFixed(2)}</span>
                                      </div>
                                    )}
                                    <div className="flex justify-between pt-1 border-t font-semibold">
                                      <span>Total:</span>
                                      <span className="text-green-600">${(order.grandTotal / 100).toFixed(2)}</span>
                                    </div>
                                  </div>
                                </div>
                                <div>
                                  <h4 className="font-semibold text-sm mb-2">Additional Options</h4>
                                  <div className="space-y-2">
                                    <div className="text-xs">
                                      <span className="font-medium">Service Selected:</span> {getOrderDetail(order.id, 'selectedService')?.name || 'Not selected'}
                                    </div>
                                    <div className="text-xs">
                                      <span className="font-medium">Insurance:</span> {getOrderDetail(order.id, 'sigortala') ? 'Yes' : 'No'}
                                    </div>
                                    <div className="text-xs">
                                      <span className="font-medium">Terms:</span> {getOrderDetail(order.id, 'shippingTerms', 'ddu').toUpperCase()}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                          );
                        }
                        return rows;
                      })}
                    </TableBody>
                  </Table>
                </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="status" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>İçe Aktarma İstatistikleri</CardTitle>
              <CardDescription>
                Etsy sipariş içe aktarımlarınızın özeti
              </CardDescription>
            </CardHeader>
            <CardContent>
              {importStatus ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Toplam Sipariş</p>
                    <p className="text-2xl font-bold">{importStatus.totalOrders}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Bekleyen</p>
                    <p className="text-2xl font-bold">{importStatus.pendingOrders}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Gönderilen</p>
                    <p className="text-2xl font-bold">{importStatus.shippedOrders}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Fiyatlandırılmış</p>
                    <p className="text-2xl font-bold">{importStatus.ordersWithShipping}</p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">İstatistikler yükleniyor...</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Dimensions Edit Dialog */}
      <Dialog open={editingDimensions.orderId !== null} onOpenChange={() => setEditingDimensions({ orderId: null, dimensions: { length: 15, width: 10, height: 1, weight: 0.5 } })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Paket Boyutlarını Düzenle</DialogTitle>
            <DialogDescription>
              Doğru gönderim hesaplamaları için paket şablonu seçin veya özel boyutlar girin
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {/* Package Template Selector */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Paket Şablonları
              </label>
              <PackageTemplateSelector
                userId={user?.id || 0}
                onTemplateSelect={(template) => {
                  setEditingDimensions({
                    ...editingDimensions,
                    dimensions: {
                      length: template.length,
                      width: template.width,
                      height: template.height,
                      weight: template.weight
                    }
                  });
                  toast({
                    title: "Template Applied",
                    description: `Package dimensions set to ${template.name}`
                  });
                }}
                showSaveCurrentDimensions={true}
                currentDimensions={editingDimensions.dimensions}
              />
            </div>
            
            {/* Manual Dimension Inputs */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Özel Boyutlar
              </label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Input
                    type="number"
                    value={editingDimensions.dimensions.length}
                    onChange={(e) => setEditingDimensions({
                      ...editingDimensions,
                      dimensions: { ...editingDimensions.dimensions, length: parseFloat(e.target.value) || 0 }
                    })}
                    placeholder="Uzunluk"
                    className="h-8"
                  />
                  <span className="text-xs text-gray-500">Uzunluk (cm)</span>
                </div>
                <div>
                  <Input
                    type="number"
                    value={editingDimensions.dimensions.width}
                    onChange={(e) => setEditingDimensions({
                      ...editingDimensions,
                      dimensions: { ...editingDimensions.dimensions, width: parseFloat(e.target.value) || 0 }
                    })}
                    placeholder="Genişlik"
                    className="h-8"
                  />
                  <span className="text-xs text-gray-500">Genişlik (cm)</span>
                </div>
                <div>
                  <Input
                    type="number"
                    value={editingDimensions.dimensions.height}
                    onChange={(e) => setEditingDimensions({
                      ...editingDimensions,
                      dimensions: { ...editingDimensions.dimensions, height: parseFloat(e.target.value) || 0 }
                    })}
                    placeholder="Yükseklik"
                    className="h-8"
                  />
                  <span className="text-xs text-gray-500">Yükseklik (cm)</span>
                </div>
              </div>
            </div>
            
            {/* Weight Input */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Ağırlık
              </label>
              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  step="0.1"
                  value={editingDimensions.dimensions.weight}
                  onChange={(e) => setEditingDimensions({
                    ...editingDimensions,
                    dimensions: { ...editingDimensions.dimensions, weight: parseFloat(e.target.value) || 0 }
                  })}
                  placeholder="Ağırlık"
                  className="h-8 flex-1"
                />
                <span className="text-xs text-gray-500">kg</span>
              </div>
            </div>
            
            {/* Current dimensions display */}
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-gray-600 mb-1">Current Package:</p>
              <p className="text-sm font-medium">
                {editingDimensions.dimensions.length} × {editingDimensions.dimensions.width} × {editingDimensions.dimensions.height} cm
                <span className="text-gray-500 ml-2">({editingDimensions.dimensions.weight} kg)</span>
              </p>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setEditingDimensions({ orderId: null, dimensions: { length: 15, width: 10, height: 1, weight: 0.5 } })}>
              İptal
            </Button>
            <Button onClick={saveDimensions}>
              Boyutları Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Order #{selectedOrder?.etsyOrderId || selectedOrder?.etsyReceiptId}
            </DialogTitle>
            <DialogDescription>
              Order details and shipping information
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Customer</p>
                  <p>{selectedOrder.buyerName}</p>
                  {selectedOrder.buyerEmail && (
                    <p className="text-sm text-muted-foreground">{selectedOrder.buyerEmail}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge variant={selectedOrder.isShipped ? "secondary" : "default"}>
                    {selectedOrder.isShipped ? "Shipped" : "Pending"}
                  </Badge>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Shipping Address</p>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="font-medium">{selectedOrder.shipToName}</p>
                  <p>{selectedOrder.shipToAddress1}</p>
                  {selectedOrder.shipToAddress2 && <p>{selectedOrder.shipToAddress2}</p>}
                  <p>
                    {selectedOrder.shipToCity}, {selectedOrder.shipToState} {selectedOrder.shipToZip}
                  </p>
                  <p>{selectedOrder.shipToCountry}</p>
                </div>
              </div>
              
              {selectedOrder.items && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Items</p>
                  <div className="space-y-2">
                    {(() => {
                      // Handle both JSON string and object formats
                      let itemsData;
                      try {
                        itemsData = typeof selectedOrder.items === 'string' 
                          ? JSON.parse(selectedOrder.items) 
                          : selectedOrder.items;
                      } catch (e) {
                        console.error('Failed to parse items:', e);
                        itemsData = [];
                      }
                      
                      return itemsData.map((item: any, index: number) => (
                        <div key={index} className="flex justify-between bg-muted/50 rounded-lg p-3">
                          <div>
                            <p className="font-medium">{item.title}</p>
                            {item.sku && <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>}
                          </div>
                          <div className="text-right">
                            <p>Qty: {item.quantity}</p>
                            {item.price && (
                              <p className="text-sm text-muted-foreground">
                                ${item.price.toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}
              
              <div className="flex justify-between items-center pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Order Total</p>
                  <p className="text-xl font-bold">
                    {formatCurrency(selectedOrder.orderTotal * 100, selectedOrder.currency)}
                  </p>
                </div>
                {selectedOrder.shippingPriceCalculated && (
                  <div>
                    <p className="text-sm text-muted-foreground">Shipping Cost</p>
                    <p className="text-xl font-bold text-green-600">
                      {formatCurrency(selectedOrder.calculatedShippingPrice * 100)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </Layout>
  );
}

export default withAuth(EtsyIntegrationContent);