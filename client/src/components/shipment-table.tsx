import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ShipmentCancelDialog from "./shipment-cancel-dialog";
import LabelPreviewModal from "./label-preview-modal";
import { SimpleLabelModal } from "./simple-label-modal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PriceChangeIndicator } from "@/components/price-change-indicator";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  FileText,
  ExternalLink,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Printer,
  Truck,
  Calendar,
  Package,
  Map,
  Plus,
  Edit,
  Zap,
  HelpCircle,
  ShieldAlert,
  Upload,
  Trash2,
  PackageCheck,
  Plane,
  Navigation,
  MapPin,
  RefreshCw,
  Copy,
  Pencil,
  X,
  Send,
  DollarSign,
  Info,
} from "lucide-react";
import {
  formatDate,
  formatShipmentId,
  getStatusBadgeColor,
} from "@/lib/shipment-utils";
import { ShipmentStatus, PickupStatus } from "@shared/schema";
import { exportToExcel, formatShipmentForExport } from "@/lib/export-utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useSecureLabels } from "@/hooks/useSecureLabels";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

import { useMutation } from "@tanstack/react-query";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PackageItemsManager } from "@/components/admin/package-items-manager";
import { CountryFlag } from "@/components/country-flag";

// MoogShip service name mapping function for consistent branding
function getMoogShipServiceName(serviceCode: string): string {
  if (!serviceCode) return "MoogShip Service";
  // Remove technical prefixes before processing
  const cleanCode = serviceCode.replace(/^(shipentegra|afs|se)[-_]?/i, "");
  const normalized = cleanCode.toLowerCase().trim();
  const serviceMappings: Record<string, string> = {
    // Service mappings after technical prefixes are removed
    "eco-primary": "MoogShip Eco",
    "ups-ekspress": "MoogShip UPS Express", 
    "ups-express": "MoogShip UPS Express",
    "fedex": "MoogShip FedEx",
    "widect": "MoogShip Eco",
    "worldwide-standard": "MoogShip Worldwide Standard",
    "amerika-eko-plus": "MoogShip Eco",
    "almanya-eko-plus": "MoogShip Eco",
    "avustralya-eko-plus": "MoogShip Eco",
    "fransa-eko-plus": "MoogShip Eco",
    "global-eko-plus": "MoogShip Eco",
    "ingiltere-eko-plus": "MoogShip Eco",
    "dhlecommerce-eko-plus": "MoogShip DHL E-Commerce", // Fixed: removed se- prefix
    "aramex-ppx": "MoogShip Aramex Express",

    // AFS services after prefix removal
    "1": "MoogShip GLS Eco", // Fixed: afs-1 becomes 1
    "2": "MoogShip UPS Express", // Fixed: afs-2 becomes 2
    "7": "MoogShip AFS Express", // Fixed: afs-7 becomes 7
    "ecoafs": "MoogShip GLS Eco", // Fixed: normalized to lowercase
    // Legacy service codes
    eco: "MoogShip GLS Eco",
    standard: "MoogShip Worldwide Standard",
    express: "MoogShip UPS Express",
    "fedex-us": "MoogShip FedEx", // Fixed: se-fedex-us becomes fedex-us
  };

  // First check exact matches, then partial matches
  if (serviceMappings[normalized]) return serviceMappings[normalized];
  
  // Partial matches for better coverage
  if (normalized.includes("dhl")) return "MoogShip DHL E-Commerce"; // Fixed: Added DHL partial match
  if (normalized.includes("aramex")) return "MoogShip Aramex Express";
  if (normalized.includes("fedex")) return "MoogShip FedEx";
  if (normalized.includes("ups")) return "MoogShip UPS Express";
  if (normalized.includes("eco")) return "MoogShip GLS Eco";
  if (normalized.includes("express")) return "MoogShip UPS Express";
  if (normalized.includes("standard")) return "MoogShip Worldwide Standard";

  // Default fallback
  return "MoogShip Service";
}

// Helper function to extract description from error messages for admin display
function getErrorDescription(errorMessage: string): string {
  if (!errorMessage) return "";

  // First check if this starts with a service prefix like "MoogShip UPS Express API error:"
  const servicePrefixMatch = errorMessage.match(/^[^:]+:\s*(.+)$/);
  if (servicePrefixMatch) {
    errorMessage = servicePrefixMatch[1].trim();
  }

  try {
    // Try to parse as JSON first in case it's a structured error
    const parsed = JSON.parse(errorMessage);

    // Handle ShipEntegra API format: {"status":"fail","data":[{"message":"...","description":"..."}]}
    if (parsed.data && Array.isArray(parsed.data) && parsed.data.length > 0) {
      const firstError = parsed.data[0];
      if (firstError.description) return firstError.description;
      if (firstError.message) return firstError.message;
    }

    // Handle simple JSON objects with description or message
    if (parsed.description) return parsed.description;
    if (parsed.message) return parsed.message;
    if (parsed.error) return parsed.error;
  } catch {
    // Not JSON, proceed with string parsing
  }

  // Look for common error patterns and extract description
  const patterns = [
    /"description"\s*:\s*"([^"]+)"/i, // "description":"text" in JSON
    /"message"\s*:\s*"([^"]+)"/i, // "message":"text" in JSON
    /description[:\s]+"([^"]+)"/i, // description:"text"
    /description[:\s]+([^,;]+)/i, // description: text
    /message[:\s]+"([^"]+)"/i, // message:"text"
    /message[:\s]+([^,;]+)/i, // message: text
    /error[:\s]+"([^"]+)"/i, // error:"text"
    /error[:\s]+([^,;]+)/i, // error: text
    /:\s*(.+?)(?:\s*\(|$)/, // Extract text after colon until parenthesis or end
    /[0-9]{3}\s*-\s*(.+)/, // HTTP status code pattern like "400 - message"
  ];

  for (const pattern of patterns) {
    const match = errorMessage.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  // If no pattern matches, return the original message but truncated
  return errorMessage.length > 100
    ? errorMessage.substring(0, 100) + "..."
    : errorMessage;
}

interface ShipmentTableProps {
  shipments: any[]; // Using any here to accommodate different shipment types across the application
  isLoading: boolean;
  showFilters?: boolean;
  showPagination?: boolean;
  isAdmin?: boolean;
  canAccessCarrierLabels?: boolean;
  actions?: (shipment: any) => React.ReactNode;
  idActions?: (shipment: any) => React.ReactNode; // Actions to display in the ID cell (approve/reject buttons)
  onManualTrackingClick?: (shipment: any) => void; // Callback for manual tracking button click
  enableBulkSelection?: boolean;
  selectedShipmentIds?: number[];
  onSelectShipment?: (shipmentId: number, checked: boolean) => void;
  onSelectAll?: (checked: boolean) => void;
  onRefundRequest?: () => void;
  onBulkStatusChange?: () => void;
  currentPage?: number;
  totalPages?: number;
  itemsPerPage?: number;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
}

export default function ShipmentTable({
  shipments,
  isLoading,
  showFilters = false,
  showPagination = false,
  isAdmin = false,
  canAccessCarrierLabels = false,
  actions,
  idActions,
  onManualTrackingClick,
  initialPage,
  onPageChange,
  enableBulkSelection = false,
  selectedShipmentIds = [],
  onSelectShipment,
  onSelectAll,
  onRefundRequest,
  onBulkStatusChange,
  currentPage: externalCurrentPage,
  totalPages: externalTotalPages,
  itemsPerPage = 10,
  onItemsPerPageChange,
}: ShipmentTableProps & {
  initialPage?: number;
  onPageChange?: (page: number) => void;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { openMoogshipLabel, openCarrierLabel, isAnyLoading: isSecureLabelsLoading } = useSecureLabels();
  const userIsAdmin = isAdmin;
  const userCanAccessCarrierLabels = isAdmin || canAccessCarrierLabels;

  // Initialize current page from props or default to 1
  const [currentPage, setCurrentPage] = useState(
    externalCurrentPage || initialPage || 1,
  );

  // Effect to update parent component whenever page changes
  useEffect(() => {
    if (onPageChange && initialPage !== currentPage) {
      onPageChange(currentPage);
    }
  }, [currentPage, onPageChange, initialPage]);
  const [selectedShipment, setSelectedShipment] = useState<any>(null);
  const [showTrackingRequestDialog, setShowTrackingRequestDialog] =
    useState(false);
  const [showLabelPreview, setShowLabelPreview] = useState(false);
  const [labelPreviewShipmentId, setLabelPreviewShipmentId] = useState<
    number | null
  >(null);
  const [labelPreviewType, setLabelPreviewType] = useState<
    "moogship" | "carrier"
  >("moogship");
  const [labelPreviewTrackingNumber, setLabelPreviewTrackingNumber] =
    useState<string>("");

  // Invoice upload state
  const [isUploadingInvoice, setIsUploadingInvoice] = useState(false);
  const [isDeletingInvoice, setIsDeletingInvoice] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Debug effect to monitor modal state changes
  useEffect(() => {}, [
    showLabelPreview,
    labelPreviewShipmentId,
    labelPreviewType,
  ]);

  // Request tracking number faster mutation
  const requestTrackingMutation = useMutation({
    mutationFn: async (shipmentId: number) => {
      const response = await apiRequest(
        "POST",
        `/api/shipments/${shipmentId}/request-tracking`,
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to request tracking number",
        );
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Tracking Request Sent",
        description:
          data.message ||
          "Your request for a faster tracking number has been submitted",
      });
    },
    onError: (error) => {
      toast({
        title: "Request Failed",
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    },
  });

  // Create cancel shipment mutation
  const cancelMutation = useMutation({
    mutationFn: async (shipmentId: number) => {
      const response = await apiRequest(
        "POST",
        `/api/shipments/${shipmentId}/cancel`,
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to cancel shipment");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Shipment Cancelled",
        description: data.message || "Shipment has been cancelled successfully",
      });

      // Immediately update the shipment status in the local cache for instant UI feedback
      queryClient.setQueryData(["/api/shipments/my"], (oldData: any) => {
        if (!shipmentToCancel || !oldData) return oldData;

        // Update the cancelled shipment's status in the local cache
        return oldData.map((shipment: any) =>
          shipment.id === shipmentToCancel.id
            ? { ...shipment, status: "cancelled" }
            : shipment,
        );
      });

      // Also update the all shipments query if it's loaded
      queryClient.setQueryData(["/api/shipments/all"], (oldData: any) => {
        if (!shipmentToCancel || !oldData) return oldData;
        return oldData.map((shipment: any) =>
          shipment.id === shipmentToCancel.id
            ? { ...shipment, status: "cancelled" }
            : shipment,
        );
      });

      // Then refresh all shipment data
      queryClient.invalidateQueries({ queryKey: ["/api/shipments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shipments/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shipments/all"] });
    },
    onError: (error) => {
      toast({
        title: "Cancellation Failed",
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    },
  });

  // Invoice upload mutation
  const uploadInvoiceMutation = useMutation({
    mutationFn: async ({ shipmentId, file }: { shipmentId: number; file: File }) => {
      const formData = new FormData();
      formData.append('invoice', file);

      // Use fetch directly for file uploads to avoid JSON stringify issue
      const response = await fetch(`/api/shipments/${shipmentId}/upload-invoice`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        // Don't set Content-Type header - let browser set it with boundary for multipart/form-data
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to upload invoice");
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Invoice Uploaded",
        description: "Invoice has been uploaded successfully",
      });
      
      // Update the selected shipment with new invoice data
      if (selectedShipment && selectedShipment.id === variables.shipmentId) {
        setSelectedShipment({
          ...selectedShipment,
          invoiceFilename: data.filename,
          invoicePdf: 'uploaded', // placeholder to indicate file exists
          invoiceUploadedAt: data.uploadedAt
        });
      }
      
      // Refresh shipment data to show uploaded invoice
      queryClient.invalidateQueries({ queryKey: ["/api/shipments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shipments/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shipments/all"] });
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload invoice",
        variant: "destructive",
      });
    },
  });

  // Invoice delete mutation
  const deleteInvoiceMutation = useMutation({
    mutationFn: async (shipmentId: number) => {
      const response = await apiRequest(
        "DELETE",
        `/api/shipments/${shipmentId}/delete-invoice`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete invoice");
      }

      return response.json();
    },
    onSuccess: (data, shipmentId) => {
      toast({
        title: "Invoice Deleted",
        description: "Invoice has been deleted successfully",
      });
      
      // Update the selected shipment to remove invoice data
      if (selectedShipment && selectedShipment.id === shipmentId) {
        setSelectedShipment({
          ...selectedShipment,
          invoiceFilename: null,
          invoicePdf: null,
          invoiceUploadedAt: null
        });
      }
      
      // Refresh shipment data to remove deleted invoice
      queryClient.invalidateQueries({ queryKey: ["/api/shipments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shipments/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shipments/all"] });
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete invoice",
        variant: "destructive",
      });
    },
  });

  // Admin price adjustment mutation
  const updatePriceMutation = useMutation({
    mutationFn: async ({ shipmentId, newPrice }: { shipmentId: number; newPrice: number }) => {
      const response = await apiRequest(
        "PATCH",
        `/api/admin/shipments/${shipmentId}/price`,
        { newPrice }
      );
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Price Updated",
        description: `Price updated successfully. ${data.shipment.balanceAdjustment !== 0 ? `Balance adjusted by $${(Math.abs(data.shipment.balanceAdjustment) / 100).toFixed(2)}` : 'No balance adjustment needed.'}`,
      });
      setEditingPriceId(null);
      setEditedPrice("");
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/shipments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shipments/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shipments/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] }); // Refresh user balance
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update price",
        description: error.message || "An error occurred while updating the price",
        variant: "destructive",
      });
    },
  });

  // Dialog state for cancellation
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [shipmentToCancel, setShipmentToCancel] = useState<any>(null);
  const [trackingDialogOpen, setTrackingDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [contentsDialogOpen, setContentsDialogOpen] = useState(false);
  const [packageContents, setPackageContents] = useState<any[]>([]);
  const [loadingContents, setLoadingContents] = useState(false);
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  // Use external selection state if bulk selection is enabled, otherwise use internal state
  const [internalSelectedShipments, setInternalSelectedShipments] = useState<
    number[]
  >(() => {
    const savedSelections = localStorage.getItem("selectedShipments");
    return savedSelections ? JSON.parse(savedSelections) : [];
  });

  const selectedShipments = enableBulkSelection
    ? selectedShipmentIds
    : internalSelectedShipments;
  const setSelectedShipments = enableBulkSelection
    ? (newSelection: number[]) => {} // No-op when using external state
    : setInternalSelectedShipments;
  const [isPickupDialogOpen, setIsPickupDialogOpen] = useState(false);
  const [pickupDate, setPickupDate] = useState<Date | undefined>(undefined);
  const [pickupNotes, setPickupNotes] = useState("");
  const [isRequestingPickup, setIsRequestingPickup] = useState(false);
  const [isProcessingShipEntegra, setIsProcessingShipEntegra] = useState(false);

  // Admin price editing state
  const [editingPriceId, setEditingPriceId] = useState<number | null>(null);
  const [editedPrice, setEditedPrice] = useState<string>("");

  // itemsPerPage is now passed as a prop

  // Clear selected shipments when component unmounts or page changes
  useEffect(() => {
    // This effect will run when the component mounts

    // Return a cleanup function that runs when component unmounts
    return () => {
      // Clear the selected shipments from localStorage
      localStorage.removeItem("selectedShipments");
    };
  }, []);

  // File upload handlers
  const validateFile = (file: File): boolean => {
    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid File Type",
        description: "Please select a PDF file.",
        variant: "destructive",
      });
      return false;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "File size must be less than 10MB.",
        variant: "destructive",
      });
      return false;
    }
    
    return true;
  };

  const handleFileUpload = async (files: FileList | null, shipmentId: number) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    if (!validateFile(file)) return;
    
    setIsUploadingInvoice(true);
    
    try {
      await uploadInvoiceMutation.mutateAsync({ shipmentId, file });
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsUploadingInvoice(false);
    }
  };

  const handleDeleteInvoice = async (shipmentId: number) => {
    setIsDeletingInvoice(true);
    
    try {
      await deleteInvoiceMutation.mutateAsync(shipmentId);
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setIsDeletingInvoice(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent, shipmentId: number) => {
    e.preventDefault();
    setDragActive(false);
    handleFileUpload(e.dataTransfer.files, shipmentId);
  };

  // Sort shipments
  const sortedShipments = [...shipments].sort((a, b) => {
    let valueA = a[sortBy];
    let valueB = b[sortBy];

    // Handle date strings
    if (sortBy === "createdAt") {
      valueA = new Date(valueA).getTime();
      valueB = new Date(valueB).getTime();
    }

    // Compare values
    let comparison = 0;
    if (valueA > valueB) {
      comparison = 1;
    } else if (valueA < valueB) {
      comparison = -1;
    }

    // Reverse for descending order
    return sortOrder === "asc" ? comparison : -comparison;
  });

  // Handle sorting column click
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  // Use external pagination if provided, otherwise calculate internally
  let totalPages: number;
  let currentShipments: any[];

  if (externalTotalPages !== undefined) {
    // Use external pagination data (already paginated from server)
    totalPages = externalTotalPages;
    currentShipments = sortedShipments; // Data is already paginated from server
  } else {
    // Calculate pagination internally for components not using external pagination
    totalPages = Math.ceil(sortedShipments.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    currentShipments = sortedShipments.slice(
      startIndex,
      startIndex + itemsPerPage,
    );
  }

  const trackShipment = (shipment: any) => {
    setSelectedShipment(shipment);
    setTrackingDialogOpen(true);
  };

  const viewShipment = async (shipment: any) => {
    setSelectedShipment(shipment);
    setViewDialogOpen(true);

    // Fetch package items for this shipment
    try {
      const response = await fetch(`/api/shipments/${shipment.id}/items`);
      if (response.ok) {
        const items = await response.json();
        // Update the shipment object with the package items data
        setSelectedShipment((prev: any) => ({
          ...prev,
          packageItems: items,
          itemCount: items.length,
          totalItemQuantity: items.reduce(
            (total: number, item: any) =>
              total + (parseInt(item.quantity) || 1),
            0,
          ),
        }));
      }
    } catch (error) {}
  };

  // State for product catalog
  const [userProducts, setUserProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedItemForCatalog, setSelectedItemForCatalog] =
    useState<any>(null);
  const [addToCatalogDialogOpen, setAddToCatalogDialogOpen] = useState(false);

  // Admin price editing helper functions
  const handleStartPriceEdit = (shipmentId: number, currentPrice: number) => {
    setEditingPriceId(shipmentId);
    setEditedPrice((currentPrice / 100).toFixed(2)); // Convert from cents to dollars
  };

  const handleCancelPriceEdit = () => {
    setEditingPriceId(null);
    setEditedPrice("");
  };

  const handleSavePriceEdit = (shipmentId: number) => {
    const newPrice = parseFloat(editedPrice);
    if (isNaN(newPrice) || newPrice < 0) {
      toast({
        title: "Invalid Price",
        description: "Please enter a valid price",
        variant: "destructive",
      });
      return;
    }

    updatePriceMutation.mutate({ shipmentId, newPrice });
  };

  // Load user products when component mounts
  useEffect(() => {
    fetchUserProducts();
  }, []);

  // Function to fetch user's products
  const fetchUserProducts = async () => {
    setLoadingProducts(true);
    try {
      const response = await fetch("/api/products");
      if (!response.ok) {
        throw new Error("Failed to fetch products");
      }

      const data = await response.json();
      setUserProducts(data);
    } catch (error) {
    } finally {
      setLoadingProducts(false);
    }
  };

  // Function to check if an item exists in the product catalog
  const isItemInCatalog = (item: any) => {
    if (!userProducts || userProducts.length === 0) return false;
    return userProducts.some(
      (product) =>
        product.name.toLowerCase() === item.name.toLowerCase() ||
        (product.gtin && item.gtin && product.gtin === item.gtin),
    );
  };

  // Function to detect actual carrier from selected service
  const getActualCarrierFromService = (
    selectedService: string | null,
  ): string => {
    if (!selectedService) return "Standard";

    const service = selectedService.toLowerCase();

    if (service.includes("ups")) {
      return "UPS";
    } else if (service.includes("fedex")) {
      return "FedEx";
    } else if (service.includes("dhl")) {
      return "DHL";
    } else if (service.includes("ingiltere")) {
      return "ingiltere";
    } else if (
      service.includes("ecoafs") ||
      service.includes("afs-") ||
      service.includes("gls")
    ) {
      return "GLS";
    } else if (service.includes("eco")) {
      return "DHL E-Commerce";
    } else if (
      service.includes("standard") ||
      service.includes("standart") ||
      service.includes("widect")
    ) {
      return "MoogShip Standard";
    }

    return "Standard";
  };

  // Security: Only allow tracking for legitimate major carriers
  const isAllowedCarrier = (carrierName: string | null): boolean => {
    const allowedCarriers = [
      "ups",
      "usps",
      "dhl",
      "fedex",
      "aramex",
      "gls",
      "royal mail",
      "AFS Transport",
    ];
    return carrierName
      ? allowedCarriers.includes(carrierName.toLowerCase())
      : false;
  };

  // Function to generate carrier tracking URLs based on carrier name and tracking number
  const getCarrierTrackingUrl = (
    carrierName: string | null,
    selectedService: string | null,
    trackingNumber: string | null,
    isAdmin: boolean = false,
  ): string => {
    if (!trackingNumber) return "#";

    // First priority: Use explicit carrier name if available (from admin dropdown selection)
    if (carrierName) {
      const normalizedCarrierName = carrierName.toLowerCase();

      // Major international carriers
      if (normalizedCarrierName.includes("ups")) {
        return `https://www.ups.com/track?tracknum=${trackingNumber}`;
      } else if (normalizedCarrierName.includes("dhl")) {
        return `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${trackingNumber}&submit=1`;
      } else if (normalizedCarrierName.includes("fedex")) {
        return `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`;
      } else if (normalizedCarrierName.includes("gls")) {
        return `https://gls-group.eu/GROUP/en/parcel-tracking/`;
      } else if (normalizedCarrierName.includes("aramex")) {
        return `https://www.aramex.com/us/en/track/shipments?ShipmentNumber=${trackingNumber}`;
      } else if (normalizedCarrierName.includes("usps")) {
        return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`;
      } else if (normalizedCarrierName.includes("royal mail")) {
        return `https://www.royalmail.com/track-your-item#/details/${trackingNumber}`;
      } else if (normalizedCarrierName.includes("afs transport")) {
        return `hhttps://afstransport.com/tester_web.php?action=track&company=GLS&kod=${trackingNumber}`;
      }

      // Local Turkish carriers
      else if (normalizedCarrierName.includes("aras")) {
        return `https://kargotakip.aras.com.tr/track.aspx?guid=${trackingNumber}`;
      } else if (normalizedCarrierName.includes("mng")) {
        return `https://service.mngkargo.com.tr/kargom-nerede?code=${trackingNumber}`;
      } else if (
        normalizedCarrierName.includes("yurtici") ||
        normalizedCarrierName.includes("yurtiçi")
      ) {
        return `https://www.yurticikargo.com/tr/online-servisler/gonderi-sorgula?code=${trackingNumber}`;
      } else if (normalizedCarrierName.includes("ptt")) {
        return `https://gonderitakip.ptt.gov.tr/Track/Verify?q=${trackingNumber}`;
      }
    }

    // Second priority: Check service-based logic for automated shipments
    if (selectedService && selectedService.toLowerCase().includes("dhl")) {
      return `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${trackingNumber}&submit=1`;
    }

    // Determine actual carrier from selected service (for API-generated shipments)
    const actualCarrier = getActualCarrierFromService(selectedService);

    if (actualCarrier === "UPS") {
      return `https://www.ups.com/track?tracknum=${trackingNumber}`;
    } else if (actualCarrier === "FedEx") {
      return `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`;
    } else if (actualCarrier === "GLS") {
      return `https://afstransport.com/tester_web.php?action=track&company=GLS&kod=${trackingNumber}`;
    } else if (actualCarrier === "AFS Transport") {
      return `https://afstransport.com/tester_web.php?action=track&company=GLS&kod=${trackingNumber}`;
    } else if (actualCarrier === "DHL") {
      return `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${trackingNumber}`;
    }

    // Default to MoogShip tracking for unrecognized carriers
    return `/takip?q=${trackingNumber}`;
  };

  // Function to add an item to the catalog
  const addItemToCatalog = async () => {
    if (!selectedItemForCatalog) return;

    try {
      const response = await apiRequest("POST", "/api/products", {
        name: selectedItemForCatalog.name,
        description: selectedItemForCatalog.description || "",
        price: selectedItemForCatalog.price || 0,
        gtin: selectedItemForCatalog.gtin || null,
        hsCode: selectedItemForCatalog.hsCode || null,
        weight: selectedItemForCatalog.weight || null,
        height: selectedItemForCatalog.height || null,
        width: selectedItemForCatalog.width || null,
        length: selectedItemForCatalog.length || null,
        quantity: selectedItemForCatalog.quantity || 1,
        countryOfOrigin: selectedItemForCatalog.countryOfOrigin || null,
        manufacturer: selectedItemForCatalog.manufacturer || null,
      });

      if (!response.ok) {
        throw new Error("Failed to add item to catalog");
      }

      // Refresh product list
      await fetchUserProducts();

      toast({
        title: "Success",
        description: "Item has been added to your product catalog",
      });

      setSelectedItemForCatalog(null);
      setAddToCatalogDialogOpen(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add item to catalog. Please try again.",
      });
    }
  };

  // Function to view package contents
  const viewPackageContents = async (shipment: any) => {
    setSelectedShipment(shipment);
    setLoadingContents(true);

    try {
      // Fetch user products first
      await fetchUserProducts();

      // Then fetch package contents
      const response = await fetch(`/api/shipments/${shipment.id}/items`);
      if (!response.ok) {
        throw new Error("Failed to fetch package contents");
      }

      const data = await response.json();
      setPackageContents(data);
      setContentsDialogOpen(true);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load package contents. Please try again.",
      });
    } finally {
      setLoadingContents(false);
    }
  };

  // Generate tracking events based on status or use real tracking info if available
  const generateTrackingEvents = (shipment: any) => {
    const now = new Date(); // Define the 'now' variable for use later

    // Helper function to safely create Date objects
    const safeDate = (
      dateInput: string | Date | null | undefined,
    ): Date | null => {
      if (!dateInput) return null;

      try {
        const date = new Date(dateInput);
        return isNaN(date.getTime()) ? null : date;
      } catch (error) {
        return null;
      }
    };

    // Helper function to safely sort events by date
    const sortByDate = (a: { date: Date | null }, b: { date: Date | null }) => {
      if (!a.date) return 1; // Null dates go to the end
      if (!b.date) return -1;
      return b.date.getTime() - a.date.getTime();
    };

    // Check if we have real tracking information from carrier
    if (shipment.trackingInfo) {
      try {
        // Parse tracking info if it's a string
        const trackingData =
          typeof shipment.trackingInfo === "string"
            ? JSON.parse(shipment.trackingInfo)
            : shipment.trackingInfo;

        // If we have tracking events from the carrier, use those
        if (trackingData.events && trackingData.events.length > 0) {
          const events = trackingData.events
            .map(
              (event: {
                timestamp: string;
                status: string;
                location?: string;
              }) => {
                const date = safeDate(event.timestamp);
                return {
                  date: date,
                  status: event.status,
                  location: event.location || "Unknown location",
                };
              },
            )
            .filter((event: { date: Date | null }) => event.date !== null);

          return events.sort(sortByDate);
        }

        // If no events but we have status info
        if (trackingData.status) {
          const events = [];
          const statusDate = safeDate(trackingData.statusTime) || now;

          events.push({
            date: statusDate,
            status: trackingData.statusDescription || trackingData.status,
            location:
              trackingData.location ||
              `${shipment.receiverCity}, ${shipment.receiverCountry}`,
          });

          // Add package accepted event if we have a valid creation date
          const createdDate = safeDate(shipment.createdAt);
          if (createdDate) {
            events.push({
              date: createdDate,
              status: "Package accepted",
              location: "Istanbul, Turkey",
            });
          }

          return events.sort(sortByDate);
        }
      } catch (error) {
        // If parsing fails, fall back to generated events
      }
    }

    // If no real tracking data or parsing failed, generate mock events based on status
    const events = [];

    // Only add generated events if we have a valid creation date
    const createdDate = safeDate(shipment.createdAt);

    // Package accepted
    if (createdDate) {
      events.push({
        date: createdDate,
        status: "Package accepted",
        location: "Istanbul, Turkey",
      });

      // Package processed
      if (
        shipment.status !== ShipmentStatus.PENDING &&
        shipment.status !== ShipmentStatus.REJECTED
      ) {
        events.push({
          date: new Date(createdDate.getTime() + 6 * 60 * 60 * 1000),
          status: "Package processed",
          location: "Istanbul, Turkey",
        });
      }

      // In transit
      if (
        shipment.status === ShipmentStatus.IN_TRANSIT ||
        shipment.status === ShipmentStatus.DELIVERED
      ) {
        events.push({
          date: new Date(createdDate.getTime() + 24 * 60 * 60 * 1000),
          status: "In transit",
          location: "International shipment",
        });

        events.push({
          date: new Date(createdDate.getTime() + 72 * 60 * 60 * 1000),
          status: "Arrived at destination facility",
          location: `${shipment.receiverCity}, ${shipment.receiverCountry}`,
        });
      }

      // Delivered
      if (shipment.status === ShipmentStatus.DELIVERED) {
        events.push({
          date: now,
          status: "Delivered",
          location: `${shipment.receiverCity}, ${shipment.receiverCountry}`,
        });
      }
    } else {
      // If we don't have a valid creation date, add a generic event with the current date
      events.push({
        date: now,
        status: "Shipment registered",
        location: "System",
      });
    }

    // Sort by date descending
    return events.sort(sortByDate);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (shipments.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6 text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100">
          <AlertTriangle className="h-6 w-6 text-gray-400" />
        </div>
        <h3 className="mt-3 text-sm font-medium text-gray-900">
          No shipments found
        </h3>
        <p className="mt-2 text-sm text-gray-500">
          You haven't created any shipments yet. Click the "New Shipment" button
          to get started.
        </p>
      </div>
    );
  }

  // Handle checkbox change
  const handleSelectShipment = (shipmentId: number, checked: boolean) => {
    if (enableBulkSelection && onSelectShipment) {
      // Use external callback for bulk selection
      onSelectShipment(shipmentId, checked);
    } else {
      // Use internal state management

      let newSelection: number[] = [];

      if (checked) {
        // Add the shipment ID if it's not already in the selection
        if (!selectedShipments.includes(shipmentId)) {
          newSelection = [...selectedShipments, shipmentId];
        } else {
          newSelection = [...selectedShipments];
        }
      } else {
        // Remove the shipment ID from the selection
        newSelection = selectedShipments.filter((id) => id !== shipmentId);
      }

      // Save selection to localStorage for persistence
      localStorage.setItem("selectedShipments", JSON.stringify(newSelection));

      // Update state with new selection
      setInternalSelectedShipments(newSelection);
    }
  };

  // Select all shipments on the current page
  const handleSelectAll = (checked: boolean) => {
    if (enableBulkSelection && onSelectAll) {
      // Use external callback for bulk selection
      onSelectAll(checked);
    } else {
      // Use internal state management
      if (checked) {
        // Add all shipments on the current page to selection
        const allCurrentShipmentIds = currentShipments.map(
          (shipment) => shipment.id,
        );
        const newSelection = [...selectedShipments];

        // Add each shipment if not already in the selection
        allCurrentShipmentIds.forEach((id) => {
          if (!newSelection.includes(id)) {
            newSelection.push(id);
          }
        });

        // Save selection to localStorage for persistence
        localStorage.setItem("selectedShipments", JSON.stringify(newSelection));
        setInternalSelectedShipments(newSelection);
      } else {
        // Remove all current page items from selection
        const currentPageIds = currentShipments.map((shipment) => shipment.id);
        const newSelection = selectedShipments.filter(
          (id) => !currentPageIds.includes(id),
        );

        const removedCount = selectedShipments.length - newSelection.length;

        // Save selection to localStorage for persistence
        localStorage.setItem("selectedShipments", JSON.stringify(newSelection));
        setInternalSelectedShipments(newSelection);
      }
    }
  };

  // Handle batch printing of labels
  const handleBatchPrint = async () => {
    if (selectedShipments.length === 0) {
      toast({
        title: "No shipments selected",
        description: "Please select at least one shipment to print",
        variant: "destructive",
      });
      return;
    }

    try {
      // Show loading toast
      toast({
        title: "Generating combined label PDF",
        description: "Please wait while we combine your selected labels...",
      });

      // Use the selected shipment IDs directly
      const shipmentIds = selectedShipments;

      // Call the API to generate a combined PDF
      const response = await apiRequest("POST", "/api/shipments/batch-print", {
        shipmentIds,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to generate combined labels",
        );
      }

      const data = await response.json();

      if (data.labelUrl) {
        // Open the combined PDF in a new tab
        const baseUrl = window.location.origin;
        const fullUrl = `${baseUrl}${data.labelUrl}`;
        window.open(fullUrl, "_blank");

        toast({
          title: "Combined label PDF ready",
          description: `${selectedShipments.length} labels combined into a single PDF`,
        });
      } else {
        throw new Error("No label URL returned from server");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to generate combined labels",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  };

  // Handle batch pickup request
  const handleBatchPickupRequest = () => {
    if (selectedShipments.length === 0) {
      toast({
        title: "No shipments selected",
        description: "Please select at least one shipment to request pickup",
        variant: "destructive",
      });
      return;
    }

    setIsPickupDialogOpen(true);
  };

  // Submit batch pickup request
  const submitBatchPickupRequest = async () => {
    if (!pickupDate) {
      toast({
        variant: "destructive",
        title: "Pickup date required",
        description: "Please select a date for pickup.",
      });
      return;
    }

    try {
      setIsRequestingPickup(true);

      // Use the selected shipment IDs directly
      const shipmentIds = selectedShipments;

      const response = await apiRequest("POST", `/api/shipments/batch-pickup`, {
        shipmentIds,
        pickupDate: pickupDate.toISOString(),
        pickupNotes,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to request pickup");
      }

      toast({
        title: "Pickup requested",
        description: `Pickup requested for ${shipmentIds.length} shipments on ${format(pickupDate, "PPP")}`,
      });

      // Reset the form and close dialog
      setIsPickupDialogOpen(false);
      setPickupDate(undefined);
      setPickupNotes("");
      setSelectedShipments([]);

      // Refresh shipments data
      queryClient.invalidateQueries({ queryKey: ["/api/shipments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shipments/my"] });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Request Failed",
        description:
          error instanceof Error
            ? error.message
            : "There was an error requesting pickup. Please try again.",
      });
    } finally {
      setIsRequestingPickup(false);
    }
  };

  // Handle sending selected shipments to ShipEntegra
  const handleSendToShipEntegra = async () => {
    // Get only the approved shipments
    const approvedShipmentIds = selectedShipments.filter((id) =>
      shipments.find(
        (s) => s.id === id && s.status === ShipmentStatus.APPROVED,
      ),
    );

    if (approvedShipmentIds.length === 0) {
      toast({
        title: "No eligible shipments selected",
        description: "Please select approved shipments",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsProcessingShipEntegra(true);

      // Show loading toast
      toast({
        title: "Purchasing Shipping Labels",
        description: `Purchasing labels for ${approvedShipmentIds.length} shipments...`,
      });

      // Make the API request to purchase labels
      const response = await apiRequest(
        "POST",
        "/api/shipments/purchase-labels",
        {
          shipmentIds: approvedShipmentIds,
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to send shipments");
      }

      const data = await response.json();

      // Show success toast
      toast({
        title: "Labels purchased successfully",
        description: `${approvedShipmentIds.length} shipping labels have been generated${data.carrierTrackingNumbers ? " with carrier tracking numbers" : ""}`,
      });

      // Clear selection
      setSelectedShipments([]);
      localStorage.removeItem("selectedShipments");

      // Refresh shipments data
      queryClient.invalidateQueries({ queryKey: ["/api/shipments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shipments/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shipments/all"] });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to send shipments",
        description:
          error instanceof Error
            ? error.message
            : "There was an error sending shipments. Please try again.",
      });
    } finally {
      setIsProcessingShipEntegra(false);
    }
  };

  // Add to Catalog Dialog
  const addToCatalogDialog = (
    <Dialog
      open={addToCatalogDialogOpen}
      onOpenChange={setAddToCatalogDialogOpen}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Item to Catalog</DialogTitle>
          <DialogDescription>
            Add this item to your product catalog for easy reuse in future
            shipments.
          </DialogDescription>
        </DialogHeader>

        {selectedItemForCatalog && (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="itemName">Item Name</Label>
                <Input
                  id="itemName"
                  value={selectedItemForCatalog.name}
                  onChange={(e) =>
                    setSelectedItemForCatalog({
                      ...selectedItemForCatalog,
                      name: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="itemPrice">Price</Label>
                <Input
                  id="itemPrice"
                  type="number"
                  value={selectedItemForCatalog.price || 0}
                  onChange={(e) =>
                    setSelectedItemForCatalog({
                      ...selectedItemForCatalog,
                      price: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="itemDescription">Description</Label>
                <Textarea
                  id="itemDescription"
                  value={selectedItemForCatalog.description || ""}
                  onChange={(e) =>
                    setSelectedItemForCatalog({
                      ...selectedItemForCatalog,
                      description: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="itemQuantity">Default Quantity</Label>
                <Input
                  id="itemQuantity"
                  type="number"
                  value={selectedItemForCatalog.quantity || 1}
                  onChange={(e) =>
                    setSelectedItemForCatalog({
                      ...selectedItemForCatalog,
                      quantity: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="itemWeight">Weight (kg)</Label>
                <Input
                  id="itemWeight"
                  type="number"
                  step="0.01"
                  value={selectedItemForCatalog.weight || ""}
                  onChange={(e) =>
                    setSelectedItemForCatalog({
                      ...selectedItemForCatalog,
                      weight: parseFloat(e.target.value) || null,
                    })
                  }
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setAddToCatalogDialogOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={addItemToCatalog}
            disabled={!selectedItemForCatalog?.name}
          >
            Save to Catalog
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <>
      {addToCatalogDialog}
      {shipments.length > 0 && (
        <div className="mb-4 flex justify-between items-center">
          <div className="flex space-x-2">
            {selectedShipments.length > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBatchPrint}
                  className="flex items-center gap-2 bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                >
                  <Printer className="h-4 w-4" />
                  Print ({selectedShipments.length})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBatchPickupRequest}
                  className="flex items-center gap-2 bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                >
                  <Truck className="h-4 w-4" />
                  {t(
                    "shipmentTable.createPickupRequest",
                    "Toplama Talebi Oluştur",
                  )}{" "}
                  ({selectedShipments.length})
                </Button>
                {onRefundRequest && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRefundRequest}
                    className="flex items-center gap-2 bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100"
                  >
                    <DollarSign className="h-4 w-4" />
                    {t("shipmentTable.requestRefund", "Request Refund")} (
                    {selectedShipments.length})
                  </Button>
                )}
                {isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSendToShipEntegra}
                    disabled={isProcessingShipEntegra}
                    className="flex items-center gap-2 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                  >
                    {isProcessingShipEntegra ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t("shipmentTable.processing", "Processing...")}
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        {t("shipmentTable.purchaseLabels", "Purchase Labels")} (
                        {selectedShipments.length})
                      </>
                    )}
                  </Button>
                )}
                {isAdmin && onBulkStatusChange && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onBulkStatusChange}
                    className="flex items-center gap-2 bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Change Status ({selectedShipments.length})
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Pickup request dialog */}
      <Dialog open={isPickupDialogOpen} onOpenChange={setIsPickupDialogOpen}>
        <DialogContent className="sm:max-w-[475px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-green-500" />
              {t("shipmentTable.pickupDialog.title")}
            </DialogTitle>
            <DialogDescription>
              {t("shipmentTable.pickupDialog.description").replace(
                "{count}",
                selectedShipments.length.toString(),
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                {t("shipmentTable.pickupDialog.pickupDate")}
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !pickupDate && "text-muted-foreground",
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {pickupDate
                      ? format(pickupDate, "PPP")
                      : t("shipmentTable.pickupDialog.selectDate")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={pickupDate}
                    onSelect={setPickupDate}
                    initialFocus
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground mt-1">
                {t("shipmentTable.pickupDialog.sameDayNote")}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                {t("shipmentTable.pickupDialog.notes")}
              </label>
              <Textarea
                placeholder={t("shipmentTable.pickupDialog.notesPlaceholder")}
                value={pickupNotes}
                onChange={(e) => setPickupNotes(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t("shipmentTable.pickupDialog.alternativeAddressNote")}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPickupDialogOpen(false)}
            >
              {t("shipmentTable.pickupDialog.cancel")}
            </Button>
            <Button
              onClick={submitBatchPickupRequest}
              disabled={isRequestingPickup || !pickupDate}
            >
              {isRequestingPickup ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("shipmentTable.pickupDialog.requesting")}
                </>
              ) : (
                <>
                  <Truck className="mr-2 h-4 w-4" />
                  {t("shipmentTable.pickupDialog.submitRequest")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="flex flex-col h-full">
        {/* Create a flex container with sticky top actions */}
        <div className="flex flex-col h-full">
          {/* Table container with fixed height and scrolling */}
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full align-middle">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <div className="overflow-auto max-h-[calc(100vh-260px)]">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-10">
                      <TableRow>
                        <TableHead className="w-[50px]">
                          <div className="flex flex-col items-center gap-1">
                            <Checkbox
                              checked={
                                currentShipments.length > 0 &&
                                currentShipments.every((s) =>
                                  selectedShipments.includes(s.id),
                                )
                              }
                              onCheckedChange={(checked) =>
                                handleSelectAll(checked === true)
                              }
                              aria-label={t("shipmentTable.selectAll")}
                            />
                            <span className="text-xs text-gray-500">Bulk</span>
                          </div>
                        </TableHead>

                        <TableHead>{t("shipmentTable.shipmentId")}</TableHead>
                        {isAdmin && (
                          <TableHead
                            onClick={() => handleSort("userId")}
                            className="cursor-pointer hover:bg-gray-50"
                          >
                            <div className="flex items-center">
                              {t("shipmentTable.companyCustomer")}
                              {sortBy === "userId" &&
                                (sortOrder === "asc" ? (
                                  <ChevronUp className="ml-1 h-4 w-4" />
                                ) : (
                                  <ChevronDown className="ml-1 h-4 w-4" />
                                ))}
                              {sortBy !== "userId" && (
                                <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />
                              )}
                            </div>
                          </TableHead>
                        )}
                        <TableHead
                          onClick={() => handleSort("receiverCountry")}
                          className="cursor-pointer hover:bg-gray-50"
                        >
                          <div className="flex items-center">
                            {t("shipmentTable.recipient", "Recipient")}
                            {sortBy === "receiverCountry" &&
                              (sortOrder === "asc" ? (
                                <ChevronUp className="ml-1 h-4 w-4" />
                              ) : (
                                <ChevronDown className="ml-1 h-4 w-4" />
                              ))}
                            {sortBy !== "receiverCountry" && (
                              <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead>
                          <div className="flex items-center group relative">
                            {t("shipmentTable.trackingHeader")}
                            <HelpCircle className="ml-1 h-3 w-3 text-muted-foreground" />
                            <div className="absolute left-0 top-full mt-1 z-50 bg-white text-xs p-2 rounded shadow-md w-48 hidden group-hover:block">
                              <p className="mb-1">
                                <span className="font-bold">MG:</span>{" "}
                                {t("shipmentTable.internalTracking")}
                              </p>
                              <p className="mb-1">
                                <span className="font-bold">
                                  {t("shipmentTable.carrier")}:
                                </span>{" "}
                                {t("shipmentTable.externalTracking")}
                              </p>
                              <p className="text-gray-500">
                                {t("shipmentTable.labelErrorsNote")}
                              </p>
                            </div>
                          </div>
                        </TableHead>
                        <TableHead>{t("shipmentTable.price")}</TableHead>
                        {isAdmin && (
                          <TableHead>
                            {t("shipmentTable.originalPrice")}
                          </TableHead>
                        )}
                        <TableHead
                          onClick={() => handleSort("createdAt")}
                          className="cursor-pointer hover:bg-gray-50 hidden"
                        >
                          <div className="flex items-center">
                            {t("shipmentTable.createdDate")}
                            {sortBy === "createdAt" &&
                              (sortOrder === "asc" ? (
                                <ChevronUp className="ml-1 h-4 w-4" />
                              ) : (
                                <ChevronDown className="ml-1 h-4 w-4" />
                              ))}
                            {sortBy !== "createdAt" && (
                              <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead
                          onClick={() => handleSort("status")}
                          className="cursor-pointer hover:bg-gray-50 hidden"
                        >
                          <div className="flex items-center">
                            {t("shipmentTable.status", "Status")}
                            {sortBy === "status" &&
                              (sortOrder === "asc" ? (
                                <ChevronUp className="ml-1 h-4 w-4" />
                              ) : (
                                <ChevronDown className="ml-1 h-4 w-4" />
                              ))}
                            {sortBy !== "status" && (
                              <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead className="text-right">
                          {t("shipmentTable.actions")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentShipments.map((shipment) => (
                        <TableRow
                          key={shipment.id}
                          className={
                            shipment.priorityTracking ||
                            shipment.priorityTrackingRequestedAt ||
                            shipment.id === 67
                              ? "bg-amber-50 hover:bg-amber-100 border-l-2 border-l-amber-400"
                              : ""
                          }
                        >
                          <TableCell className="w-[50px]">
                            <Checkbox
                              checked={selectedShipments.includes(shipment.id)}
                              onCheckedChange={(checked) =>
                                handleSelectShipment(shipment.id, !!checked)
                              }
                              aria-label={`Select shipment ${formatShipmentId(shipment.id)}`}
                              disabled={false} // Allow all shipments to be selected for now
                            />
                          </TableCell>

                          <TableCell className="whitespace-nowrap py-4 font-medium text-gray-900">
                            <div className="flex justify-between items-center gap-4">
                              {/* Left column: Shipment info - centered */}
                              <div className="flex flex-col text-xs text-gray-900 items-center text-center">
                                <div className="flex items-center gap-1">
                                  <button
                                    className="text-primary-900 hover:text-primary-900 hover:underline focus:outline-none font-extrabold"
                                    onClick={() => viewShipment(shipment)}
                                    title="Click to view shipment details"
                                  >
                                    {formatShipmentId(shipment.id)}
                                  </button>
                                  {/* Invoice indicator - clickable download */}
                                  {(shipment as any).invoicePdf && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button
                                            className="cursor-pointer text-purple-600 hover:text-purple-800 transition-colors duration-200"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              window.open(`/api/shipments/${shipment.id}/invoice`, '_blank');
                                            }}
                                            title="Download Invoice PDF"
                                          >
                                            <FileText className="h-3 w-3" />
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">
                                          <p className="text-xs">Download Invoice</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                                <span className="text-center">
                                  {formatDate(shipment.createdAt)}
                                </span>
                                <span
                                  className={`inline-flex items-center gap-1 ${getStatusBadgeColor(shipment.status)} px-2 py-0.5 rounded-full w-fit`}
                                >
                                  {String(
                                    t(`shipments.status.${shipment.status}`) ||
                                      shipment.status.charAt(0).toUpperCase() +
                                        shipment.status
                                          .slice(1)
                                          .replace(/_/g, " "),
                                  )}
                                </span>
                              </div>
                              {/* Right column: Icons, stacked vertically */}
                              <div className="flex flex-col items-end gap-2">
                                {/* Edit button */}
                                <span
                                  className="cursor-pointer text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded p-0 transition-all duration-200 h-5 w-5 flex items-center justify-center"
                                  onClick={() =>
                                    setLocation(`/shipment-edit/${shipment.id}`)
                                  }
                                  title="Edit"
                                >
                                  <Pencil className="h-3 w-3" />
                                </span>

                                {/* Approve/Reject actions */}
                                {isAdmin &&
                                  shipment.status === "pending" &&
                                  idActions &&
                                  idActions(shipment)}
                              </div>
                            </div>
                          </TableCell>
                          {isAdmin && (
                            <TableCell className="whitespace-nowrap">
                              <div className="flex flex-col">
                                <span
                                  className="font-medium text-sm"
                                  title={
                                    shipment.companyName || shipment.senderName
                                  }
                                >
                                  {(
                                    shipment.companyName || shipment.senderName
                                  )?.substring(0, 15)}
                                  {(shipment.companyName || shipment.senderName)
                                    ?.length > 15
                                    ? "..."
                                    : ""}
                                </span>
                                {shipment.userId && (
                                  <span className="text-xs text-gray-500">
                                    User ID: {shipment.userId}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                          )}
                          <TableCell className="whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">
                                {shipment.receiverName}
                              </span>
                              <div className="flex items-center gap-2 text-xs text-gray-600">
                                <span>
                                  {shipment.receiverCity}
                                  {shipment.receiverState &&
                                    `, ${shipment.receiverState}`}
                                  {shipment.receiverCountry &&
                                    `, ${shipment.receiverCountry}`}
                                </span>
                                {shipment.receiverCountry && (
                                  <CountryFlag
                                    country={shipment.receiverCountry}
                                    size="md"
                                    className="flex-shrink-0"
                                  />
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <div className="flex flex-col">
                              {/* Shipping Terms Badge */}
                              <div className="flex items-center gap-2 mb-1">
                                {shipment.shippingTerms === 'ddp' ? (
                                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                                    DDP
                                  </span>
                                ) : (
                                  <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
                                    DAP
                                  </span>
                                )}
                              </div>
                              {/* Display all available tracking numbers */}
                              <div className="space-y-1">
                                {/* MoogShip Internal Tracking */}
                                {shipment.trackingNumber && (
                                  <div>
                                    <div className="flex items-center text-sm">
                                      <span className="font-medium mr-1">
                                        MG:
                                      </span>
                                      <span>{shipment.trackingNumber}</span>
                                    </div>
                                    {shipment.trackingInfo &&
                                      !shipment.carrierTrackingNumber &&
                                      !shipment.manualTrackingNumber && (
                                        <div className="text-xs text-green-600 mt-0.5">
                                          {(() => {
                                            try {
                                              const trackingData =
                                                typeof shipment.trackingInfo ===
                                                "string"
                                                  ? JSON.parse(
                                                      shipment.trackingInfo,
                                                    )
                                                  : shipment.trackingInfo;

                                              if (
                                                trackingData.currentStatus &&
                                                trackingData.currentStatus
                                                  .description
                                              ) {
                                                return trackingData.currentStatus
                                                  .description;
                                              } else if (
                                                trackingData.statusDescription
                                              ) {
                                                return trackingData.statusDescription;
                                              } else if (trackingData.status) {
                                                return trackingData.status;
                                              }
                                              return null;
                                            } catch (e) {
                                              return null;
                                            }
                                          })()}
                                        </div>
                                      )}
                                  </div>
                                )}

                                {/* Carrier Tracking (from label APIs) */}
                                {shipment.carrierTrackingNumber && (
                                  <div>
                                    <div className="flex items-center text-sm">
                                      <span className="font-medium mr-1 text-blue-600">
                                        {shipment.carrierName || "Carrier"}:
                                      </span>
                                      <span className="text-blue-800 font-mono">{shipment.carrierTrackingNumber}</span>
                                    </div>
                                  </div>
                                )}


                                {/* No tracking fallback */}
                                {!shipment.trackingNumber && 
                                 !shipment.carrierTrackingNumber && 
                                 !shipment.manualTrackingNumber && (
                                  <span className="text-gray-400 text-xs">
                                    {t(
                                      "shipmentTable.noTracking",
                                      "No tracking number",
                                    )}
                                  </span>
                                )}
                              </div>

                              {/* Manual Tracking Add Button for approved shipments without tracking - Only for admin users */}
                              {isAdmin &&
                                shipment.status === "approved" &&
                                !shipment.carrierTrackingNumber &&
                                onManualTrackingClick && (
                                  <div className="my-1 flex items-center gap-2">
                                    <span className="text-xs text-gray-600">
                                      No carrier tracking
                                    </span>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 w-6 p-0 rounded-md transition-all duration-200 text-green-600 hover:text-green-800 hover:bg-green-50 border border-green-200 hover:border-green-300 bg-green-50/50"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onManualTrackingClick(shipment);
                                            }}
                                          >
                                            <Plus className="h-3.5 w-3.5" />
                                            <span className="sr-only">
                                              Add Manual Tracking
                                            </span>
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent
                                          side="top"
                                          className="max-w-xs"
                                        >
                                          <p className="text-sm">
                                            Add Manual Tracking Number
                                          </p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                )}


                              {/* External carrier tracking number if available */}
                              {shipment.carrierTrackingNumber && (
                                <div className="my-1 bg-blue-50 p-1.5 rounded border border-blue-100">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <p className="text-xs font-medium text-blue-800">
                                          {t(
                                            "shipmentTable.carrierTracking",
                                            "Carrier Tracking",
                                          )}
                                          :
                                        </p>
                                        {shipment.carrierName && (
                                          <span className="bg-white px-1.5 py-0.5 rounded text-xs font-medium text-blue-600 border border-blue-200">
                                            {shipment.carrierName}
                                          </span>
                                        )}
                                      </div>

                                      {/* Check if this is an AFS shipment with dual tracking */}
                                      {(() => {
                                        const isAFSShipment =
                                          shipment.selectedService
                                            ?.toLowerCase()
                                            .includes("afs") ||
                                          shipment.selectedService
                                            ?.toLowerCase()
                                            .includes("gls") ||
                                          shipment.selectedService
                                            ?.toLowerCase()
                                            .startsWith("ecoafs");

                                        if (
                                          isAFSShipment &&
                                          (shipment.afsBarkod ||
                                            shipment.carrierTrackingNumber)
                                        ) {
                                          // AFS shipment with barkod and/or GLS tracking numbers
                                          return (
                                            <div className="space-y-1">
                                              {/* AFS Internal Tracking (Barkod) - show if available */}
                                              {shipment.afsBarkod && (
                                                <div className="flex items-center gap-1">
                                                  <span className="text-xs text-gray-600 font-medium">
                                                    AFS Barkod:
                                                  </span>
                                                  <span className="text-sm font-mono text-gray-700">
                                                    {shipment.afsBarkod}
                                                  </span>
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-4 w-4 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      navigator.clipboard.writeText(
                                                        shipment.afsBarkod ||
                                                          "",
                                                      );
                                                      toast({
                                                        title: t(
                                                          "common.copied",
                                                          "Kopyalandı",
                                                        ),
                                                        description:
                                                          "AFS barkod numarası panoya kopyalandı",
                                                        variant: "default",
                                                        duration: 2000,
                                                      });
                                                    }}
                                                    title="AFS Barkod Kopyala"
                                                  >
                                                    <Copy className="h-3 w-3" />
                                                  </Button>

                                                  {isAdmin &&
                                                    shipment.carrierTrackingNumber && (
                                                      <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50 ml-1"
                                                        title="View Carrier Label"
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          openCarrierLabel(shipment.id);
                                                        }}
                                                        disabled={isSecureLabelsLoading}
                                                      >
                                                        <div className="h-4 w-4 relative border border-blue-600 rounded-sm flex items-center justify-center">
                                                          <Plane className="h-2.5 w-2.5" />
                                                        </div>
                                                        <span className="sr-only">
                                                          Carrier Label
                                                        </span>
                                                      </Button>
                                                    )}
                                                </div>
                                              )}

                                              {/* GLS User Tracking Number - show if available */}
                                              {shipment.carrierTrackingNumber && (
                                                <div className="flex items-center gap-1">
                                                  <span className="text-xs text-blue-600 font-medium">
                                                    AFS Takip:
                                                  </span>
                                                  {isAllowedCarrier(
                                                    shipment.carrierName,
                                                  ) ? (
                                                    <a
                                                      href={getCarrierTrackingUrl(
                                                        shipment.carrierName,
                                                        shipment.selectedService,
                                                        shipment.carrierTrackingNumber,
                                                        userIsAdmin,
                                                      )}
                                                      target={
                                                        userIsAdmin
                                                          ? "_blank"
                                                          : "_self"
                                                      }
                                                      rel="noopener noreferrer"
                                                      className="text-sm font-mono text-blue-600 hover:text-blue-800 hover:underline"
                                                      onClick={(e) =>
                                                        e.stopPropagation()
                                                      }
                                                    >
                                                      {
                                                        shipment.carrierTrackingNumber
                                                      }
                                                    </a>
                                                  ) : (
                                                    <span className="text-sm font-mono text-blue-600">
                                                      {
                                                        shipment.carrierTrackingNumber
                                                      }
                                                    </span>
                                                  )}
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-4 w-4 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      navigator.clipboard.writeText(
                                                        shipment.carrierTrackingNumber ||
                                                          "",
                                                      );
                                                      toast({
                                                        title: t(
                                                          "common.copied",
                                                          "Kopyalandı",
                                                        ),
                                                        description:
                                                          "GLS takip numarası panoya kopyalandı",
                                                        variant: "default",
                                                        duration: 2000,
                                                      });
                                                    }}
                                                    title="GLS Takip Kopyala"
                                                  >
                                                    <Copy className="h-3 w-3" />
                                                  </Button>

                                                  {isAdmin &&
                                                    shipment.carrierTrackingNumber && (
                                                      <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50 ml-1"
                                                        title="View Carrier Label"
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          openCarrierLabel(shipment.id);
                                                        }}
                                                        disabled={isSecureLabelsLoading}
                                                      >
                                                        <div className="h-4 w-4 relative border border-blue-600 rounded-sm flex items-center justify-center">
                                                          <Plane className="h-2.5 w-2.5" />
                                                        </div>
                                                        <span className="sr-only">
                                                          Carrier Label
                                                        </span>
                                                      </Button>
                                                    )}

                                                  {/* Manual Tracking Edit Button for AFS shipments - Only for admin users */}
                                                  {isAdmin &&
                                                    shipment.status !==
                                                      "pending" &&
                                                    onManualTrackingClick && (
                                                      <TooltipProvider>
                                                        <Tooltip>
                                                          <TooltipTrigger
                                                            asChild
                                                          >
                                                            <Button
                                                              size="sm"
                                                              variant="ghost"
                                                              className={`h-6 w-6 p-0 ml-1 rounded-md transition-all duration-200 ${
                                                                shipment.status ===
                                                                  "approved" &&
                                                                !shipment.carrierTrackingNumber
                                                                  ? "text-green-600 hover:text-green-800 hover:bg-green-50 border border-green-200 hover:border-green-300 bg-green-50/50"
                                                                  : "text-amber-600 hover:text-amber-800 hover:bg-amber-50 border border-amber-200 hover:border-amber-300 bg-amber-50/50"
                                                              }`}
                                                              onClick={(e) => {
                                                                e.stopPropagation();
                                                                onManualTrackingClick(
                                                                  shipment,
                                                                );
                                                              }}
                                                            >
                                                              {shipment.status ===
                                                                "approved" &&
                                                              !shipment.carrierTrackingNumber ? (
                                                                <Plus className="h-3.5 w-3.5" />
                                                              ) : (
                                                                <Edit className="h-3.5 w-3.5" />
                                                              )}
                                                              <span className="sr-only">
                                                                {shipment.status ===
                                                                  "approved" &&
                                                                !shipment.carrierTrackingNumber
                                                                  ? "Add Manual Tracking"
                                                                  : "Edit Tracking Number"}
                                                              </span>
                                                            </Button>
                                                          </TooltipTrigger>
                                                          <TooltipContent
                                                            side="top"
                                                            className="max-w-xs"
                                                          >
                                                            <p className="text-sm">
                                                              {shipment.status ===
                                                                "approved" &&
                                                              !shipment.carrierTrackingNumber
                                                                ? "Add Manual Tracking Number"
                                                                : "Edit Tracking Number"}
                                                            </p>
                                                          </TooltipContent>
                                                        </Tooltip>
                                                      </TooltipProvider>
                                                    )}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        } else {
                                          // Non-AFS shipment or single tracking number - original behavior
                                          return (
                                            <div className="flex items-center gap-1">
                                              {isAllowedCarrier(
                                                shipment.carrierName,
                                              ) ? (
                                                <a
                                                  href={getCarrierTrackingUrl(
                                                    shipment.carrierName,
                                                    shipment.selectedService,
                                                    shipment.carrierTrackingNumber,
                                                    userIsAdmin,
                                                  )}
                                                  target={
                                                    userIsAdmin
                                                      ? "_blank"
                                                      : "_self"
                                                  }
                                                  rel="noopener noreferrer"
                                                  className="text-sm font-mono text-blue-600 hover:text-blue-800 hover:underline"
                                                  onClick={(e) =>
                                                    e.stopPropagation()
                                                  }
                                                >
                                                  {
                                                    shipment.carrierTrackingNumber
                                                  }
                                                </a>
                                              ) : (
                                                <span className="text-sm font-mono text-gray-600">
                                                  {
                                                    shipment.carrierTrackingNumber
                                                  }
                                                </span>
                                              )}
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-5 w-5 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  navigator.clipboard.writeText(
                                                    shipment.carrierTrackingNumber ||
                                                      "",
                                                  );
                                                  toast({
                                                    title: t(
                                                      "common.copied",
                                                      "Kopyalandı",
                                                    ),
                                                    description: t(
                                                      "shipmentTable.trackingCopied",
                                                      "Takip numarası panoya kopyalandı",
                                                    ),
                                                    variant: "default",
                                                    duration: 2000,
                                                  });
                                                }}
                                                title={t(
                                                  "common.copy",
                                                  "Kopyala",
                                                )}
                                              >
                                                <Copy className="h-3.5 w-3.5" />
                                                <span className="sr-only">
                                                  {t("common.copy", "Kopyala")}
                                                </span>
                                              </Button>

                                              {/* Carrier Label Button - show for admins with carrier tracking number */}
                                              {isAdmin &&
                                                shipment.carrierTrackingNumber && (
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50 ml-1"
                                                    title="View Carrier Label"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      openCarrierLabel(shipment.id);
                                                    }}
                                                    disabled={isSecureLabelsLoading}
                                                  >
                                                    <div className="h-4 w-4 relative border border-blue-600 rounded-sm flex items-center justify-center">
                                                      <Plane className="h-2.5 w-2.5" />
                                                    </div>
                                                    <span className="sr-only">
                                                      Carrier Label
                                                    </span>
                                                  </Button>
                                                )}

                                              {/* Manual Tracking Edit Button for regular shipments - Only for admin users */}
                                              {isAdmin &&
                                                shipment.status !== "pending" &&
                                                onManualTrackingClick && (
                                                  <TooltipProvider>
                                                    <Tooltip>
                                                      <TooltipTrigger asChild>
                                                        <Button
                                                          size="sm"
                                                          variant="ghost"
                                                          className={`h-6 w-6 p-0 ml-1 rounded-md transition-all duration-200 ${
                                                            shipment.status ===
                                                              "approved" &&
                                                            !shipment.carrierTrackingNumber
                                                              ? "text-green-600 hover:text-green-800 hover:bg-green-50 border border-green-200 hover:border-green-300 bg-green-50/50"
                                                              : "text-amber-600 hover:text-amber-800 hover:bg-amber-50 border border-amber-200 hover:border-amber-300 bg-amber-50/50"
                                                          }`}
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            onManualTrackingClick(
                                                              shipment,
                                                            );
                                                          }}
                                                        >
                                                          {shipment.status ===
                                                            "approved" &&
                                                          !shipment.carrierTrackingNumber ? (
                                                            <Plus className="h-3.5 w-3.5" />
                                                          ) : (
                                                            <Edit className="h-3.5 w-3.5" />
                                                          )}
                                                          <span className="sr-only">
                                                            {shipment.status ===
                                                              "approved" &&
                                                            !shipment.carrierTrackingNumber
                                                              ? "Add Manual Tracking"
                                                              : "Edit Tracking Number"}
                                                          </span>
                                                        </Button>
                                                      </TooltipTrigger>
                                                      <TooltipContent
                                                        side="top"
                                                        className="max-w-xs"
                                                      >
                                                        <p className="text-sm">
                                                          {shipment.status ===
                                                            "approved" &&
                                                          !shipment.carrierTrackingNumber
                                                            ? "Add Manual Tracking Number"
                                                            : "Edit Tracking Number"}
                                                        </p>
                                                      </TooltipContent>
                                                    </Tooltip>
                                                  </TooltipProvider>
                                                )}
                                            </div>
                                          );
                                        }
                                      })()}
                                      {shipment.trackingInfo && (
                                        <div className="text-xs mt-0.5">
                                          {(() => {
                                            try {
                                              const trackingData =
                                                typeof shipment.trackingInfo ===
                                                "string"
                                                  ? JSON.parse(
                                                      shipment.trackingInfo,
                                                    )
                                                  : shipment.trackingInfo;

                                              const statusCode =
                                                trackingData.statusCode ||
                                                trackingData.currentStatus
                                                  ?.code;
                                              let description = "";

                                              if (
                                                trackingData.currentStatus &&
                                                trackingData.currentStatus
                                                  .description
                                              ) {
                                                description =
                                                  trackingData.currentStatus
                                                    .description;
                                              } else if (
                                                trackingData.statusDescription
                                              ) {
                                                description =
                                                  trackingData.statusDescription;
                                              } else if (trackingData.status) {
                                                description =
                                                  trackingData.status;
                                              }

                                              // Check if this is an X status code (exception)
                                              if (
                                                statusCode &&
                                                statusCode.startsWith("X")
                                              ) {
                                                return (
                                                  <div className="text-amber-600">
                                                    <div className="font-medium">
                                                      Exception: {description}
                                                    </div>
                                                    {trackingData.exceptionDetails && (
                                                      <div className="text-amber-700 mt-1">
                                                        {
                                                          trackingData.exceptionDetails
                                                        }
                                                      </div>
                                                    )}
                                                  </div>
                                                );
                                              }

                                              return (
                                                <span className="text-blue-600">
                                                  {description}
                                                </span>
                                              );
                                            } catch (e) {
                                              return null;
                                            }
                                          })()}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Manual tracking information if available */}
                              {shipment.manualTrackingNumber && (
                                <div className="my-1 bg-green-50 p-1.5 rounded border border-green-100">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <p className="text-xs font-medium text-green-800">
                                          {t("shipmentTable.carrierTracking", "Carrier Tracking")}:
                                        </p>
                                        {shipment.manualCarrierName && (
                                          shipment.manualTrackingLink ? (
                                            <a
                                              href={shipment.manualTrackingLink}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="bg-white px-1.5 py-0.5 rounded text-xs font-medium text-green-600 border border-green-200 hover:bg-green-50 hover:border-green-300 hover:text-green-700 transition-colors cursor-pointer inline-flex items-center gap-1"
                                              onClick={(e) => e.stopPropagation()}
                                              title="Click to visit carrier tracking page"
                                            >
                                              {shipment.manualCarrierName}
                                              <ExternalLink className="h-3 w-3" />
                                            </a>
                                          ) : (
                                            <span className="bg-white px-1.5 py-0.5 rounded text-xs font-medium text-green-600 border border-green-200">
                                              {shipment.manualCarrierName}
                                            </span>
                                          )
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1 mt-1">
                                        {shipment.manualTrackingLink ? (
                                          <a
                                            href={shipment.manualTrackingLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm font-mono text-green-600 hover:text-green-800 hover:underline"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            {shipment.manualTrackingNumber}
                                            <ExternalLink className="h-3 w-3 inline ml-1" />
                                          </a>
                                        ) : (
                                          <span className="text-sm font-mono text-green-600">
                                            {shipment.manualTrackingNumber}
                                          </span>
                                        )}
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-4 w-4 p-0 text-green-500 hover:text-green-700 hover:bg-green-50"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            navigator.clipboard.writeText(
                                              shipment.manualTrackingNumber || "",
                                            );
                                            toast({
                                              title: t("common.copied", "Copied"),
                                              description: "Manual tracking number copied to clipboard",
                                              variant: "default",
                                              duration: 2000,
                                            });
                                          }}
                                          title="Copy Manual Tracking Number"
                                        >
                                          <Copy className="h-3 w-3" />
                                        </Button>

                                        {/* Manual Tracking Edit Button - Only for admin users */}
                                        {isAdmin && onManualTrackingClick && (
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 w-6 p-0 ml-1 rounded-md transition-all duration-200 text-amber-600 hover:text-amber-800 hover:bg-amber-50 border border-amber-200 hover:border-amber-300 bg-amber-50/50"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onManualTrackingClick(shipment);
                                            }}
                                          >
                                            <Edit className="h-3.5 w-3.5" />
                                            <span className="sr-only">
                                              Edit Manual Tracking
                                            </span>
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Show error message if there's a label error - Only for admin users when shipment is in pending or approved status */}
                              {isAdmin &&
                                shipment.labelError &&
                                (shipment.status === "pending" ||
                                  shipment.status === "approved") && (
                                  <div className="mt-1 space-y-1">
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="text-red-500 text-xs cursor-help flex items-center gap-1">
                                            <AlertTriangle className="h-3 w-3 inline-block" />
                                            <span className="break-words">
                                              {getErrorDescription(
                                                shipment.labelError,
                                              ).substring(0, 60)}
                                              {getErrorDescription(
                                                shipment.labelError,
                                              ).length > 60
                                                ? "..."
                                                : ""}
                                            </span>
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs bg-red-50 border border-red-200 text-red-800 p-2">
                                          <p className="text-xs whitespace-normal">
                                            {getErrorDescription(
                                              shipment.labelError,
                                            )}
                                          </p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                    {/* Show label attempts if greater than 0 */}
                                    {shipment.labelAttempts > 0 && (
                                      <div className="text-amber-500 text-xs">
                                        Attempts: {shipment.labelAttempts}
                                      </div>
                                    )}
                                  </div>
                                )}

                              {/* Show priority tracking indicator - Only for admin users */}
                              {isAdmin && shipment.priorityTracking && (
                                <div className="bg-amber-100 border border-amber-300 rounded px-2 py-1 text-amber-800 text-xs font-medium mt-1 flex items-center">
                                  <Zap className="h-3 w-3 mr-1 text-amber-600" />
                                  Hızlı Takip Talebi
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <div className="flex flex-col">
                              <div className="flex items-center">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      {isAdmin && editingPriceId === shipment.id ? (
                                        <div className="flex items-center gap-1">
                                          <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={editedPrice}
                                            onChange={(e) => setEditedPrice(e.target.value)}
                                            className="w-20 h-7 text-sm"
                                            data-testid={`input-price-${shipment.id}`}
                                          />
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 w-6 p-0 text-green-600 hover:text-green-800"
                                            onClick={() => handleSavePriceEdit(shipment.id)}
                                            disabled={updatePriceMutation.isPending}
                                            data-testid={`button-save-price-${shipment.id}`}
                                          >
                                            {updatePriceMutation.isPending ? (
                                              <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                              <DollarSign className="h-3 w-3" />
                                            )}
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 w-6 p-0 text-red-600 hover:text-red-800"
                                            onClick={handleCancelPriceEdit}
                                            data-testid={`button-cancel-price-${shipment.id}`}
                                          >
                                            <X className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      ) : (
                                        <div className="flex flex-col">
                                          <span 
                                            className={`text-sm font-medium transition-colors ${
                                              isAdmin 
                                                ? "cursor-pointer hover:text-blue-600 hover:bg-blue-50 px-1 rounded" 
                                                : "cursor-help hover:text-blue-600"
                                            }`}
                                            onClick={
                                              isAdmin 
                                                ? () => handleStartPriceEdit(shipment.id, shipment.totalPrice)
                                                : undefined
                                            }
                                            data-testid={`span-price-${shipment.id}`}
                                          >
                                            $
                                            {(shipment.totalPrice / 100).toFixed(2)}
                                            {isAdmin && (
                                              <Pencil className="h-3 w-3 inline ml-1 opacity-50" />
                                            )}
                                          </span>
                                          {/* Show insurance, taxes/duties under the price */}
                                          {(shipment.isInsured && shipment.insuranceCost) && (
                                            <span className="text-xs text-blue-600 mt-0.5 block" data-testid={`text-insurance-${shipment.id}`}>
                                              +${(shipment.insuranceCost / 100).toFixed(2)} insurance
                                            </span>
                                          )}
                                          {(shipment.ddpDutiesAmount || shipment.ddpBaseDutiesAmount || shipment.ddpTrumpTariffsAmount || shipment.ddpProcessingFee || shipment.taxes) && (
                                            <span className="text-xs text-orange-600 mt-0.5 block" data-testid={`text-duties-${shipment.id}`}>
                                              {(() => {
                                                // Debug logging for DDP display
                                                if (shipment.id >= 4000 && shipment.id <= 4004) {
                                                  console.log(`Shipment ${shipment.id} DDP check:`, {
                                                    ddpBaseDutiesAmount: shipment.ddpBaseDutiesAmount,
                                                    ddpTrumpTariffsAmount: shipment.ddpTrumpTariffsAmount,
                                                    ddpProcessingFee: shipment.ddpProcessingFee,
                                                    ddpDutiesAmount: shipment.ddpDutiesAmount,
                                                    willDisplay: !!(shipment.ddpBaseDutiesAmount || shipment.ddpTrumpTariffsAmount || shipment.ddpProcessingFee || shipment.ddpDutiesAmount)
                                                  });
                                                }
                                                return shipment.ddpBaseDutiesAmount || shipment.ddpTrumpTariffsAmount || shipment.ddpProcessingFee || shipment.ddpDutiesAmount;
                                              })() && (
                                                <TooltipProvider>
                                                  <Tooltip>
                                                    <TooltipTrigger asChild>
                                                      <span className="cursor-help">
                                                        +${(() => {
                                                          // Calculate total customs: HS tax + Trump tariffs + DDP processing fee
                                                          const hsCodeTax = shipment.ddpBaseDutiesAmount || 0;
                                                          const trumpTariffs = shipment.ddpTrumpTariffsAmount || 0;
                                                          const ddpProcessingFee = shipment.ddpProcessingFee || 0;
                                                          
                                                          // Always calculate total from all three components
                                                          // ddpDutiesAmount might not include the processing fee
                                                          const total = hsCodeTax + trumpTariffs + ddpProcessingFee;
                                                          
                                                          return (total / 100).toFixed(2);
                                                        })()
                                                        } customs
                                                      </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top" className="text-xs">
                                                      <div className="space-y-1">
                                                        <div className="font-semibold">Customs Breakdown:</div>
                                                        {shipment.ddpBaseDutiesAmount ? (
                                                          <div>HS Tax: ${(shipment.ddpBaseDutiesAmount / 100).toFixed(2)}</div>
                                                        ) : null}
                                                        {shipment.ddpTrumpTariffsAmount ? (
                                                          <div>Trump Tariffs: ${(shipment.ddpTrumpTariffsAmount / 100).toFixed(2)}</div>
                                                        ) : null}
                                                        {shipment.ddpProcessingFee ? (
                                                          <div>DDP Fee: ${(shipment.ddpProcessingFee / 100).toFixed(2)}</div>
                                                        ) : null}
                                                        <div className="border-t pt-1 font-semibold">
                                                          Total: ${(() => {
                                                            const hsCodeTax = shipment.ddpBaseDutiesAmount || 0;
                                                            const trumpTariffs = shipment.ddpTrumpTariffsAmount || 0;
                                                            const ddpProcessingFee = shipment.ddpProcessingFee || 0;
                                                            // Always calculate total from all three components
                                                            const total = hsCodeTax + trumpTariffs + ddpProcessingFee;
                                                            return (total / 100).toFixed(2);
                                                          })()}
                                                        </div>
                                                      </div>
                                                    </TooltipContent>
                                                  </Tooltip>
                                                </TooltipProvider>
                                              )}
                                              {(shipment.ddpDutiesAmount || shipment.ddpBaseDutiesAmount || shipment.ddpTrumpTariffsAmount || shipment.ddpProcessingFee) && shipment.taxes && <> • </>}
                                              {shipment.taxes && (
                                                <>Tax: ${(shipment.taxes / 100).toFixed(2)}</>
                                              )}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="top"
                                      className="max-w-xs"
                                    >
                                      <div className="space-y-1 text-xs">
                                        <div className="font-medium">
                                          Price Breakdown
                                        </div>
                                        {isAdmin ? (
                                          <>
                                            <div className="flex justify-between">
                                              <span>Base Price:</span>
                                              <span>
                                                $
                                                {(
                                                  shipment.basePrice / 100
                                                ).toFixed(2)}
                                              </span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span>Fuel Charge:</span>
                                              <span>
                                                $
                                                {(
                                                  shipment.fuelCharge / 100 || 0
                                                ).toFixed(2)}
                                              </span>
                                            </div>
                                            {shipment.additionalFee && shipment.additionalFee > 0 && (
                                              <div className="flex justify-between">
                                                <span>Additional Fee:</span>
                                                <span>
                                                  $
                                                  {(
                                                    shipment.additionalFee / 100
                                                  ).toFixed(2)}
                                                </span>
                                              </div>
                                            )}
                                            {shipment.taxes && (
                                              <div className="flex justify-between">
                                                <span>Tax:</span>
                                                <span>
                                                  $
                                                  {(
                                                    shipment.taxes / 100
                                                  ).toFixed(2)}
                                                </span>
                                              </div>
                                            )}
                                            <div className="flex justify-between pt-1 border-t">
                                              <span>Cargo:</span>
                                              <span>
                                                $
                                                {(
                                                  shipment.totalPrice / 100
                                                ).toFixed(2)}
                                              </span>
                                            </div>
                                            {shipment.isInsured &&
                                              shipment.insuranceCost && (
                                                <div className="flex justify-between text-green-600">
                                                  <span>Insurance:</span>
                                                  <span>
                                                    $
                                                    {(
                                                      shipment.insuranceCost /
                                                      100
                                                    ).toFixed(2)}
                                                  </span>
                                                </div>
                                              )}
                                            <div className="flex justify-between font-medium pt-1 border-t">
                                              <span>Total Cost:</span>
                                              <span>
                                                $
                                                {(
                                                  (shipment.totalPrice +
                                                    (shipment.insuranceCost ||
                                                      0)) /
                                                  100
                                                ).toFixed(2)}
                                              </span>
                                            </div>
                                          </>
                                        ) : (
                                          <>
                                            <div className="flex justify-between">
                                              <span>Service:</span>
                                              <span>
                                                {getMoogShipServiceName(
                                                  shipment.selectedService ||
                                                    "",
                                                )}
                                              </span>
                                            </div>
                                            <div className="flex justify-between pt-1 border-t">
                                              <span>Cargo:</span>
                                              <span>
                                                $
                                                {(
                                                  shipment.totalPrice / 100
                                                ).toFixed(2)}
                                              </span>
                                            </div>
                                            {shipment.isInsured &&
                                              shipment.insuranceCost && (
                                                <div className="flex justify-between text-green-600">
                                                  <span>Insurance:</span>
                                                  <span>
                                                    $
                                                    {(
                                                      shipment.insuranceCost /
                                                      100
                                                    ).toFixed(2)}
                                                  </span>
                                                </div>
                                              )}
                                            <div className="flex justify-between font-medium pt-1 border-t">
                                              <span>Total Cost:</span>
                                              <span>
                                                $
                                                {(
                                                  (shipment.totalPrice +
                                                    (shipment.insuranceCost ||
                                                      0)) /
                                                  100
                                                ).toFixed(2)}
                                              </span>
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 text-blue-600 hover:text-blue-900 ml-1"
                                    >
                                      <Info className="h-3 w-3" />
                                      <span className="sr-only">
                                        View Price Details
                                      </span>
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="sm:max-w-[600px] md:max-w-[700px] lg:max-w-[800px] max-h-[90vh] overflow-y-auto">
                                    <DialogHeader>
                                      <DialogTitle>Price Breakdown</DialogTitle>
                                      <DialogDescription>
                                        Shipment {formatShipmentId(shipment.id)}{" "}
                                        to {shipment.receiverCity}
                                        {shipment.receiverState &&
                                          `, ${shipment.receiverState}`}
                                        {shipment.receiverCountry &&
                                          `, ${shipment.receiverCountry}`}
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                      <div className="grid grid-cols-2 gap-2 border-b pb-2">
                                        <span className="font-medium">
                                          Carrier:
                                        </span>
                                        <span>
                                          {getMoogShipServiceName(
                                            shipment.selectedService ||
                                              shipment.serviceName ||
                                              "",
                                          )}
                                        </span>
                                      </div>

                                      {/* Show only total price for regular users, detailed breakdown for admins */}
                                      {isAdmin ? (
                                        /* Admin Price Section - Full Details */
                                        <div className="border-b pb-2 mb-2">
                                          <h3 className="font-bold text-sm mb-2">
                                            Price Breakdown
                                          </h3>
                                          <div className="grid grid-cols-2 gap-2">
                                            <span className="font-medium">
                                              Base Price:
                                            </span>
                                            <span>
                                              $
                                              {(
                                                shipment.basePrice / 100
                                              ).toFixed(2)}
                                            </span>
                                          </div>
                                          <div className="grid grid-cols-2 gap-2">
                                            <span className="font-medium">
                                              Fuel Surcharge:
                                            </span>
                                            <span>
                                              $
                                              {(
                                                shipment.fuelCharge / 100 || 0
                                              ).toFixed(2)}
                                            </span>
                                          </div>
                                          <div className="grid grid-cols-2 gap-2">
                                            <span className="font-medium">
                                              Tax:
                                            </span>
                                            <span>
                                              $
                                              {(
                                                shipment.taxes / 100 || 0
                                              ).toFixed(2)}
                                            </span>
                                          </div>
                                          <div className="grid grid-cols-2 gap-2 mt-1 pt-1 border-t">
                                            <span className="font-medium">
                                              Shipping Cost:
                                            </span>
                                            <span>
                                              $
                                              {(
                                                shipment.totalPrice / 100
                                              ).toFixed(2)}
                                            </span>
                                          </div>
                                          {shipment.isInsured &&
                                            shipment.insuranceCost && (
                                              <div className="grid grid-cols-2 gap-2">
                                                <span className="font-medium">
                                                  Insurance:
                                                </span>
                                                <span className="text-green-600">
                                                  $
                                                  {(
                                                    shipment.insuranceCost / 100
                                                  ).toFixed(2)}
                                                </span>
                                              </div>
                                            )}
                                          <div className="grid grid-cols-2 gap-2 font-bold mt-1 pt-1 border-t">
                                            <span>Total Cost:</span>
                                            <span>
                                              $
                                              {(
                                                (shipment.totalPrice +
                                                  (shipment.insuranceCost ||
                                                    0)) /
                                                100
                                              ).toFixed(2)}
                                            </span>
                                          </div>
                                        </div>
                                      ) : (
                                        /* Regular User Price Section - Shipping + Insurance Breakdown */
                                        <div className="border-b pb-2 mb-2">
                                          <h3 className="font-bold text-sm mb-2">
                                            Price Breakdown
                                          </h3>
                                          <div className="grid grid-cols-2 gap-2">
                                            <span className="font-medium">
                                              Shipping Cost:
                                            </span>
                                            <span>
                                              $
                                              {(
                                                shipment.totalPrice / 100
                                              ).toFixed(2)}
                                            </span>
                                          </div>
                                          {shipment.isInsured &&
                                            shipment.insuranceCost && (
                                              <div className="grid grid-cols-2 gap-2">
                                                <span className="font-medium">
                                                  Insurance:
                                                </span>
                                                <span className="text-green-600">
                                                  $
                                                  {(
                                                    shipment.insuranceCost / 100
                                                  ).toFixed(2)}
                                                </span>
                                              </div>
                                            )}
                                          <div className="grid grid-cols-2 gap-2 font-bold mt-1 pt-1 border-t">
                                            <span>Total Cost:</span>
                                            <span>
                                              $
                                              {(
                                                (shipment.totalPrice +
                                                  (shipment.insuranceCost ||
                                                    0)) /
                                                100
                                              ).toFixed(2)}
                                            </span>
                                          </div>
                                        </div>
                                      )}

                                      {/* Shipentegra Original Price Section - Only show for admins */}
                                      {isAdmin &&
                                        shipment.originalTotalPrice && (
                                          <div className="border-b pb-2 mb-2">
                                            <h3 className="font-bold text-sm mb-2">
                                              Original Price
                                            </h3>
                                            <div className="grid grid-cols-2 gap-2">
                                              <span className="font-medium">
                                                Original Base Price:
                                              </span>
                                              <span>
                                                $
                                                {(
                                                  shipment.originalBasePrice /
                                                    100 || 0
                                                ).toFixed(2)}
                                              </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                              <span className="font-medium">
                                                Original Fuel Surcharge:
                                              </span>
                                              <span>
                                                $
                                                {(
                                                  shipment.originalFuelCharge /
                                                    100 || 0
                                                ).toFixed(2)}
                                              </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 font-bold mt-1">
                                              <span>Original Total Price:</span>
                                              <span>
                                                $
                                                {(
                                                  shipment.originalTotalPrice /
                                                    100 || 0
                                                ).toFixed(2)}
                                              </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 mt-1 text-sm text-green-600">
                                              <span>Margin:</span>
                                              <span>
                                                $
                                                {(
                                                  (shipment.totalPrice -
                                                    shipment.originalTotalPrice) /
                                                    100 || 0
                                                ).toFixed(2)}
                                              </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 mt-1 text-sm">
                                              <span>Applied Multiplier:</span>
                                              <span>
                                                ×
                                                {shipment.priceMultiplier?.toFixed(
                                                  2,
                                                ) || "1.00"}
                                              </span>
                                            </div>
                                          </div>
                                        )}
                                      <div className="grid grid-cols-2 gap-2 pt-2">
                                        <span className="font-medium">
                                          Estimated Delivery:
                                        </span>
                                        <span>
                                          {shipment.estimatedDeliveryDays} days
                                        </span>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2 pt-2">
                                        <span className="font-medium">
                                          Package Weight:
                                        </span>
                                        <span>{shipment.packageWeight} kg</span>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2 pt-2">
                                        <span className="font-medium">
                                          Package Dimensions:
                                        </span>
                                        <span>
                                          {shipment.packageLength} ×{" "}
                                          {shipment.packageWidth} ×{" "}
                                          {shipment.packageHeight} cm
                                        </span>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2 pt-2">
                                        <span className="font-medium">
                                          Physical Packages:
                                        </span>
                                        <span>
                                          {shipment.pieceCount || 1}{" "}
                                          {(shipment.pieceCount || 1) > 1
                                            ? "packages"
                                            : "package"}
                                        </span>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </div>

                              {/* Insurance price display - only show if insurance is selected */}
                              {(shipment.isInsured ||
                                (shipment.insuranceValue &&
                                  shipment.insuranceValue > 0)) &&
                                shipment.insuranceCost && (
                                  <div className="text-xs text-green-600 mt-1">
                                    Insurance: $
                                    {(shipment.insuranceCost / 100).toFixed(2)}
                                  </div>
                                )}

                              {shipment.selectedService && (
                                <Badge
                                  variant="outline"
                                  className={`text-xs mt-1 w-fit ${(() => {
                                    const service =
                                      shipment.selectedService.toLowerCase();
                                    const serviceLevel =
                                      shipment.serviceLevel?.toLowerCase();

                                    // Use service level for more accurate coloring
                                    if (
                                      serviceLevel === "eco" ||
                                        serviceLevel === "gls_eco" ||
                                        service.includes("eco") ||
                                      service === "shipentegra-widect"
                                    ) {
                                      return "border-green-200 bg-green-50 text-green-700"; // Green for ECO
                                    } else if (service.includes("aramex")) {
                                      return "border-rose-200 bg-rose-50 text-rose-700"; // Soft red for ARAMEX
                                    } else if (
                                      serviceLevel === "express" ||
                                      service.includes("express") ||
                                      service.includes("ups")
                                    ) {
                                      return "border-yellow-200 bg-yellow-50 text-yellow-700"; // Yellow for EXPRESS
                                    } else if (service.includes("fedex")) {
                                      return "border-purple-200 bg-purple-50 text-purple-700"; // Purple for FEDEX
                                    } else if (
                                      serviceLevel === "standard" ||
                                      service.includes("standard") ||
                                      service.includes("standart") ||
                                      service.includes("worldwide")
                                    ) {
                                      return "border-blue-200 bg-blue-50 text-blue-700"; // Blue for STANDARD
                                    } else if (
                                      service.includes("gls") ||
                                      service.startsWith("afs-")
                                    ) {
                                      return "border-indigo-200 bg-indigo-50 text-indigo-700"; // Indigo for GLS
                                    } else {
                                      return "border-gray-200 bg-gray-50 text-gray-700"; // Gray fallback
                                    }
                                  })()}`}
                                >
                                  {(() => {
                                    const service =
                                      shipment.selectedService.toLowerCase();

                                    // Map specific service codes to proper MoogShip display names
                                    if (service.includes("eco-primary") || service.includes("eco")) {
                                      return "MoogShip Eco";
                                    } else if (
                                      service.includes("widect")
                                    ) {
                                      return "MoogShip Eco";
                                    } else if (
                                      service.includes("worldwide-standard")
                                    ) {
                                      return "MoogShip Worldwide Standard";
                                    } else if (
                                      service.includes("ups-express") ||
                                      service.includes("ups-ekspress")
                                    ) {
                                      return "MoogShip UPS Express";
                                    } else if (
                                      service.includes("fedex")
                                    ) {
                                      return "MoogShip FedEx";
                                    } else if (
                                      service === "ecoafs" ||
                                      service.startsWith("afs-")
                                    ) {
                                      return "MoogShip GLS Eco";
                                    } else if (
                                      service.includes("eco") &&
                                      service.includes("dhl")
                                    ) {
                                      return "MoogShip DHL E-Commerce";
                                    } else if (
                                      service.includes("eco") &&
                                      (service.includes("gls") ||
                                        service.startsWith("afs-"))
                                    ) {
                                      return "MoogShip GLS Eco";
                                    } else if (service.includes("eco")) {
                                      return "MoogShip Eco";
                                    } else if (
                                      service.includes("gls") ||
                                      service.startsWith("afs-")
                                    ) {
                                      return "MoogShip GLS";
                                    } else if (
                                      service.includes("ups") &&
                                      service.includes("express")
                                    ) {
                                      return "MoogShip UPS Express";
                                    } else if (
                                      service.includes("ups") &&
                                      (service.includes("standart") ||
                                        service.includes("standard"))
                                    ) {
                                      return "MoogShip UPS Standard";
                                    } else if (service.includes("ups")) {
                                      return "MoogShip UPS Express";
                                    } else if (
                                      service.includes("worldwide") &&
                                      service.includes("standard")
                                    ) {
                                      return "MoogShip Worldwide Standard";
                                    } else if (service.includes("widect")) {
                                      return "MoogShip-Eco";
                                    } else if (service.includes("fedex")) {
                                      return "MoogShip FedEx";
                                    } else if (service.includes("aramex")) {
                                      return "MoogShip Aramex Express";
                                    } else if (
                                      service.includes("ingiltere-eko")
                                    ) {
                                      return "MoogShip Ingiltere Eco";
                                    } else if (
                                      service.includes("standard") ||
                                      service.includes("standart")
                                    ) {
                                      return "MoogShip Standard";
                                    } else {
                                      // Fallback with clean display - remove all technical prefixes
                                      const cleanService =
                                        shipment.selectedService.replace(
                                          /^(shipentegra|afs|se)[-_]?/i,
                                          "",
                                        );
                                      return (
                                        cleanService.charAt(0).toUpperCase() +
                                        cleanService.slice(1)
                                      );
                                    }
                                  })()}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          {isAdmin && (
                            <TableCell className="whitespace-nowrap">
                              <div className="flex flex-col">
                                {shipment.originalTotalPrice ? (
                                  <div className="flex items-center">
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className="text-sm cursor-help hover:text-blue-600 transition-colors">
                                            $
                                            {(
                                              (shipment.originalTotalPrice + (shipment.originalAdditionalFee || 0)) / 100
                                            ).toFixed(2)}
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent
                                          side="top"
                                          className="max-w-xs"
                                        >
                                          <div className="space-y-1 text-xs">
                                            <div className="font-medium">
                                              Original Price Breakdown
                                            </div>
                                            <div className="flex justify-between">
                                              <span>Original Base:</span>
                                              <span>
                                                $
                                                {(
                                                  shipment.originalBasePrice /
                                                    100 || 0
                                                ).toFixed(2)}
                                              </span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span>Original Fuel:</span>
                                              <span>
                                                $
                                                {(
                                                  shipment.originalFuelCharge /
                                                    100 || 0
                                                ).toFixed(2)}
                                              </span>
                                            </div>
                                            {shipment.originalAdditionalFee && shipment.originalAdditionalFee > 0 && (
                                              <div className="flex justify-between">
                                                <span>Additional Fee:</span>
                                                <span>
                                                  $
                                                  {(
                                                    shipment.originalAdditionalFee / 100
                                                  ).toFixed(2)}
                                                </span>
                                              </div>
                                            )}
                                            <div className="flex justify-between font-medium pt-1 border-t">
                                              <span>Original Total:</span>
                                              <span>
                                                $
                                                {(
                                                  (shipment.originalTotalPrice + (shipment.originalAdditionalFee || 0)) /
                                                  100
                                                ).toFixed(2)}
                                              </span>
                                            </div>
                                            <div className="flex justify-between text-green-600">
                                              <span>Margin:</span>
                                              <span>
                                                $
                                                {(
                                                  (shipment.totalPrice -
                                                    (shipment.originalTotalPrice + (shipment.originalAdditionalFee || 0))) /
                                                    100 || 0
                                                ).toFixed(2)}
                                              </span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                              <span>Multiplier:</span>
                                              <span>
                                                ×
                                                {shipment.priceMultiplier?.toFixed(
                                                  2,
                                                ) || "1.00"}
                                              </span>
                                            </div>
                                          </div>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                    {(() => {
                                      // Calculate the difference and determine the display
                                      const difference =
                                        shipment.totalPrice -
                                        (shipment.originalTotalPrice + (shipment.originalAdditionalFee || 0));
                                      const formattedDiff = (
                                        Math.abs(difference) / 100
                                      ).toFixed(2);

                                      // Only show difference if it's significant (more than 1 cent)
                                      if (Math.abs(difference) > 1) {
                                        return (
                                          <span
                                            className={`ml-2 ${difference >= 0 ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"} text-xs px-1.5 py-0.5 rounded-full`}
                                          >
                                            {difference >= 0 ? "+" : "-"}$
                                            {formattedDiff}
                                          </span>
                                        );
                                      }
                                      return null; // No significant difference
                                    })()}
                                  </div>
                                ) : (
                                  <span className="text-gray-400 text-xs">
                                    Not available
                                  </span>
                                )}

                                {/* Insurance price display for admin - only show if insurance is selected */}
                                {(shipment.isInsured ||
                                  (shipment.insuranceValue &&
                                    shipment.insuranceValue > 0)) &&
                                  shipment.insuranceCost && (
                                    <div className="text-xs text-green-600 mt-1">
                                      Insurance: $
                                      {(shipment.insuranceCost / 100).toFixed(
                                        2,
                                      )}
                                    </div>
                                  )}

                                {shipment.selectedService ? (
                                  <Badge
                                    
                                    variant="outline"
                                    className={`text-xs mt-1 w-fit ${
                                      shipment.selectedService
                                      .toLowerCase()
                                      .includes("ingiltere-eko")
                                      ? "border-green-200 bg-green-50 text-green-700"
                                      :shipment.selectedService
                                        .toLowerCase()
                                        .includes("eco")
                                        ? "border-green-200 bg-green-50 text-green-700"
                                        : shipment.selectedService
                                              .toLowerCase()
                                              .includes("gls") ||
                                            shipment.selectedService
                                              .toLowerCase()
                                              .startsWith("afs-")
                                          ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                                          : shipment.selectedService
                                                .toLowerCase()
                                                .includes("ups") ||
                                              shipment.selectedService
                                                .toLowerCase()
                                                .includes("express")
                                            ? "border-yellow-200 bg-yellow-50 text-yellow-700"
                                            : shipment.selectedService
                                                  .toLowerCase()
                                                  .includes("fedex")
                                              ? "border-purple-200 bg-purple-50 text-purple-700"
                                              : shipment.selectedService
                                                    .toLowerCase()
                                                    .includes("aramex")
                                                ? "border-rose-200 bg-rose-50 text-rose-700"
                                                : shipment.selectedService
                                                      .toLowerCase()
                                                      .includes("standard") ||
                                                    shipment.selectedService
                                                      .toLowerCase()
                                                      .includes("standart") ||
                                                    shipment.selectedService
                                                      .toLowerCase()
                                                      .includes("widect")
                                                  ? "border-blue-200 bg-blue-50 text-blue-700"
                                                  : "border-gray-200 bg-gray-50 text-gray-700"
                                    }`}
                                  >
                                    {(() => {
                                      const service =
                                        shipment.selectedService.toLowerCase();

                                      // Map service codes to proper MoogShip display names
                                      if (
                                        service.includes("eco-primary") || service.includes("eco")
                                      ) {
                                        return "MoogShip Eco";
                                      } else if (
                                        service.includes("ingiltere-eko")
                                      ) {
                                        return "MoogShip Ingiltere Eco";
                                      }else if (
                                        service.includes("widect")
                                      ) {
                                        return "MoogShip Eco";
                                      } else if (
                                        service.includes("worldwide-standard")
                                      ) {
                                        return "MoogShip Worldwide Standard";
                                      } else if (
                                        service.includes("ups-express") ||
                                        service.includes("ups-ekspress")
                                      ) {
                                        return "MoogShip UPS Express";
                                      } else if (
                                        service.includes("fedex")
                                      ) {
                                        return "MoogShip FedEx";
                                      } else if (
                                        service === "ecoafs" ||
                                        service.startsWith("afs-")
                                      ) {
                                        return "MoogShip GLS Eco";
                                      } else if (
                                        service.includes("eco") &&
                                        service.includes("dhl")
                                      ) {
                                        return "MoogShip DHL E-Commerce";
                                      } else if (
                                        service.includes("eco") &&
                                        (service.includes("gls") ||
                                          service.startsWith("afs-"))
                                      ) {
                                        return "MoogShip GLS Eco";
                                      } else if (service.includes("eco")) {
                                        return "MoogShip Eco";
                                      } else if (
                                        service.includes("gls") ||
                                        service.startsWith("afs-")
                                      ) {
                                        return "MoogShip GLS";
                                      } else if (
                                        service.includes("ups") &&
                                        service.includes("express")
                                      ) {
                                        return "MoogShip UPS Express";
                                      } else if (
                                        service.includes("ups") &&
                                        (service.includes("standart") ||
                                          service.includes("standard"))
                                      ) {
                                        return "MoogShip UPS Standard";
                                      } else if (service.includes("ups")) {
                                        return "MoogShip UPS Express";
                                      } else if (
                                        service.includes("worldwide") &&
                                        service.includes("standard")
                                      ) {
                                        return "MoogShip Worldwide Standard";
                                      } else if (service.includes("widect")) {
                                        return "MoogShip-Eco";
                                      } else if (service.includes("fedex")) {
                                        return "MoogShip FedEx";
                                      } else if (service.includes("aramex")) {
                                        return "MoogShip Aramex Express";
                                      } else if (
                                        service === "express" &&
                                        shipment.serviceLevel?.toLowerCase() ===
                                          "express"
                                      ) {
                                        // Generic EXPRESS with express service level - default to UPS Express
                                        return "MoogShip UPS Express";
                                      } else if (service.includes("express")) {
                                        return "MoogShip UPS Express";
                                      } else if (
                                        service.includes("standard") ||
                                        service.includes("standart")
                                      ) {
                                        return "MoogShip Standard";
                                      } else {
                                        // Fallback with clean display - remove all technical prefixes
                                        const cleanService =
                                          shipment.selectedService.replace(
                                            /^(shipentegra|afs|se)[-_]?/i,
                                            "",
                                          );
                                        return (
                                          cleanService.charAt(0).toUpperCase() +
                                          cleanService.slice(1)
                                        );
                                      }
                                    })()}
                                  </Badge>
                                ) : (
                                  <span className="text-gray-400 text-xs mt-1">
                                    Service not specified
                                  </span>
                                )}
                              </div>
                            </TableCell>
                          )}
                          <TableCell className="whitespace-nowrap hidden">
                            {formatDate(shipment.createdAt)}
                          </TableCell>
                          <TableCell className="hidden">
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(shipment.status)}`}
                            >
                              {String(
                                t(`shipments.status.${shipment.status}`) ||
                                  shipment.status.charAt(0).toUpperCase() +
                                    shipment.status.slice(1).replace(/_/g, " "),
                              )}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {actions ? (
                              actions(shipment)
                            ) : (
                              <div className="flex flex-col space-y-1">
                                {/* First row of action buttons */}
                                <div className="flex justify-end space-x-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-900"
                                    onClick={() =>
                                      viewPackageContents(shipment)
                                    }
                                    title="View Package Contents"
                                  >
                                    <Package className="h-4 w-4" />
                                    <span className="sr-only">Contents</span>
                                  </Button>

                                  {/* Cancel button - only enabled for pending shipments */}
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className={`h-8 w-8 p-0 text-red-600 hover:text-red-900 ${
                                            shipment.status !==
                                            ShipmentStatus.PENDING
                                              ? "opacity-50 cursor-not-allowed"
                                              : ""
                                          }`}
                                          onClick={() => {
                                            if (
                                              shipment.status ===
                                              ShipmentStatus.PENDING
                                            ) {
                                              // Open the confirmation dialog
                                              setShipmentToCancel(shipment);
                                              setCancelDialogOpen(true);
                                            }
                                          }}
                                          disabled={
                                            shipment.status !==
                                            ShipmentStatus.PENDING
                                          }
                                          title="Cancel Shipment"
                                        >
                                          <X className="h-4 w-4" />
                                          <span className="sr-only">
                                            Cancel
                                          </span>
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent side="top">
                                        <p className="text-sm">
                                          Cancel Shipment
                                        </p>
                                        {shipment.status !==
                                          ShipmentStatus.PENDING && (
                                          <p className="text-xs text-muted-foreground">
                                            Only pending shipments can be
                                            cancelled
                                          </p>
                                        )}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>

                                  {/* Edit button - only enabled for pending or rejected shipments */}
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className={`h-8 w-8 p-0 text-blue-600 hover:text-blue-900 ${
                                            shipment.status !==
                                              ShipmentStatus.PENDING &&
                                            shipment.status !==
                                              ShipmentStatus.REJECTED
                                              ? "opacity-50 cursor-not-allowed"
                                              : ""
                                          }`}
                                          onClick={() => {
                                            if (
                                              shipment.status ===
                                                ShipmentStatus.PENDING ||
                                              shipment.status ===
                                                ShipmentStatus.REJECTED
                                            ) {
                                              // Navigate to the appropriate shipment edit page
                                              // The back button inside edit page handles return navigation correctly
                                              setLocation(
                                                `/shipment-edit/${shipment.id}`,
                                              );
                                            }
                                          }}
                                          disabled={
                                            shipment.status !==
                                              ShipmentStatus.PENDING &&
                                            shipment.status !==
                                              ShipmentStatus.REJECTED
                                          }
                                          title="Edit Shipment"
                                        >
                                          <Pencil className="h-4 w-4" />
                                          <span className="sr-only">Edit</span>
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent side="top">
                                        <p className="text-sm">Edit Shipment</p>
                                        {shipment.status !==
                                          ShipmentStatus.PENDING &&
                                          shipment.status !==
                                            ShipmentStatus.REJECTED && (
                                            <p className="text-xs text-muted-foreground">
                                              Only pending or rejected shipments
                                              can be edited
                                            </p>
                                          )}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>

                                {/* Second row of action buttons */}
                                <div className="flex justify-end space-x-1">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className={`h-8 w-8 p-0 text-secondary-600 hover:text-secondary-900 ${
                                            shipment.status ===
                                              ShipmentStatus.PENDING ||
                                            shipment.status ===
                                              ShipmentStatus.REJECTED
                                              ? "opacity-50 cursor-not-allowed"
                                              : ""
                                          }`}
                                          onClick={() => {
                                            if (
                                              shipment.status !==
                                                ShipmentStatus.PENDING &&
                                              shipment.status !==
                                                ShipmentStatus.REJECTED
                                            ) {
                                              trackShipment(shipment);
                                            }
                                          }}
                                          disabled={
                                            shipment.status ===
                                              ShipmentStatus.PENDING ||
                                            shipment.status ===
                                              ShipmentStatus.REJECTED
                                          }
                                        >
                                          <MapPin className="h-4 w-4" />
                                          <span className="sr-only">Track</span>
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent
                                        side="top"
                                        className="max-w-xs"
                                      >
                                        <p className="text-sm">
                                          Track Shipment
                                        </p>
                                        {shipment.trackingInfo && (
                                          <p className="text-xs text-blue-600 mt-1">
                                            {(() => {
                                              try {
                                                const trackingData =
                                                  typeof shipment.trackingInfo ===
                                                  "string"
                                                    ? JSON.parse(
                                                        shipment.trackingInfo,
                                                      )
                                                    : shipment.trackingInfo;

                                                if (
                                                  trackingData.currentStatus &&
                                                  trackingData.currentStatus
                                                    .description
                                                ) {
                                                  return trackingData
                                                    .currentStatus.description;
                                                } else if (
                                                  trackingData.statusDescription
                                                ) {
                                                  return trackingData.statusDescription;
                                                } else if (
                                                  trackingData.status
                                                ) {
                                                  return trackingData.status;
                                                }
                                                return null;
                                              } catch (e) {
                                                return null;
                                              }
                                            })()}
                                          </p>
                                        )}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>

                                  {/* Request Tracking Button - only for approved shipments without carrier tracking */}
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className={`h-8 w-8 p-0 text-amber-600 hover:text-amber-900 ${
                                            (shipment.status !==
                                              ShipmentStatus.APPROVED &&
                                              shipment.status !==
                                                ShipmentStatus.PENDING) ||
                                            shipment.carrierTrackingNumber
                                              ? "opacity-50 cursor-not-allowed"
                                              : ""
                                          }`}
                                          onClick={() => {
                                            if (
                                              (shipment.status ===
                                                ShipmentStatus.APPROVED ||
                                                shipment.status ===
                                                  ShipmentStatus.PENDING) &&
                                              !shipment.carrierTrackingNumber
                                            ) {
                                              setSelectedShipment(shipment);
                                              setShowTrackingRequestDialog(
                                                true,
                                              );
                                            }
                                          }}
                                          disabled={
                                            (shipment.status !==
                                              ShipmentStatus.APPROVED &&
                                              shipment.status !==
                                                ShipmentStatus.PENDING) ||
                                            Boolean(
                                              shipment.carrierTrackingNumber,
                                            )
                                          }
                                        >
                                          <Zap className="h-4 w-4" />
                                          <span className="sr-only">
                                            Request Tracking
                                          </span>
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent
                                        side="top"
                                        className="max-w-xs"
                                      >
                                        <p className="text-sm">
                                          {t(
                                            "shipmentTable.requestTracking",
                                            "Takip Numarası Talep Et",
                                          )}
                                        </p>
                                        {shipment.status !==
                                          ShipmentStatus.APPROVED && (
                                          <p className="text-xs text-muted-foreground">
                                            {t(
                                              "shipmentTable.onlyApprovedTracking",
                                              "Sadece onaylanmış gönderiler için takip numarası talep edilebilir",
                                            )}
                                          </p>
                                        )}
                                        {shipment.carrierTrackingNumber && (
                                          <p className="text-xs text-muted-foreground">
                                            {t(
                                              "shipmentTable.alreadyHasTracking",
                                              "Bu gönderi zaten bir takip numarasına sahip",
                                            )}
                                          </p>
                                        )}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>

                                  {/* MoogShip Label Download - Available for all shipments */}
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 w-8 p-0 text-green-600 hover:text-green-900"
                                          onClick={() => {
                                            openMoogshipLabel(shipment.id);
                                          }}
                                          disabled={isSecureLabelsLoading}
                                          title="Download MoogShip Label"
                                        >
                                          <div className="h-5 w-5 relative border border-green-600 rounded-sm flex items-center justify-center">
                                            <span className="text-xs font-bold">
                                              M
                                            </span>
                                          </div>
                                          <span className="sr-only">
                                            MoogShip Label
                                          </span>
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent side="top">
                                        <p className="text-sm">
                                          Download MoogShip Label
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>

                                  {/* Invoice Download - Available if shipment has invoice */}

                                </div>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Adding pagination inside container but after table content */}
        {showPagination && (
          <div className="mt-4 flex justify-between items-center border-t border-gray-200 pt-4 bg-white">
            {/* Items per page selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {t("pagination.itemsPerPage.label")}
              </span>
              <Select
                value={itemsPerPage.toString()}
                onValueChange={(value) => {
                  const newItemsPerPage = Number(value);
                  if (onItemsPerPageChange) {
                    onItemsPerPageChange(newItemsPerPage);
                  }
                }}
              >
                <SelectTrigger className="w-[90px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">
                    {t("pagination.itemsPerPage.25")}
                  </SelectItem>
                  <SelectItem value="50">
                    {t("pagination.itemsPerPage.50")}
                  </SelectItem>
                  <SelectItem value="100">
                    {t("pagination.itemsPerPage.100")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Only show page numbers if there are multiple pages */}
            {totalPages > 1 && (
              <Pagination>
                <PaginationContent>
                  {currentPage > 1 && (
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          const newPage = currentPage - 1;
                          setCurrentPage(newPage);
                          // Pass page change to parent component if available
                          if (onPageChange) {
                            onPageChange(newPage);
                          }
                        }}
                      />
                    </PaginationItem>
                  )}

                  {Array.from({ length: Math.min(5, totalPages) }).map(
                    (_, i) => {
                      let pageNum;

                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      if (pageNum > 0 && pageNum <= totalPages) {
                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              href="#"
                              isActive={pageNum === currentPage}
                              onClick={(e) => {
                                e.preventDefault();
                                setCurrentPage(pageNum);
                                // Pass page change to parent component if provided
                                if (onPageChange) {
                                  onPageChange(pageNum);
                                }
                              }}
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      }
                      return null;
                    },
                  )}

                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}

                  {currentPage < totalPages && (
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          const newPage = currentPage + 1;
                          setCurrentPage(newPage);
                          // Pass page change to parent component if provided
                          if (onPageChange) {
                            onPageChange(newPage);
                          }
                        }}
                      />
                    </PaginationItem>
                  )}
                </PaginationContent>
              </Pagination>
            )}
          </div>
        )}
      </div>

      {/* Package Contents Dialog */}
      <Dialog open={contentsDialogOpen} onOpenChange={setContentsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] md:max-w-[700px] lg:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Package Contents</DialogTitle>
            <DialogDescription>
              {selectedShipment && (
                <div className="text-sm">
                  Shipment ID: {formatShipmentId(selectedShipment.id)}
                  <div className="mt-1 text-xs text-blue-600">
                    Note: These are the individual items inside the physical
                    package(s). For package dimensions, weight, and count, see
                    the shipment details.
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          {loadingContents ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            </div>
          ) : packageContents.length > 0 ? (
            <div className="space-y-4 py-4">
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        {t("shipmentTable.packageContents.name")}
                      </TableHead>
                      <TableHead>
                        {t("shipmentTable.packageContents.quantity")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("shipmentTable.packageContents.price")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("shipmentTable.packageContents.actions")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {packageContents.map((item) => (
                      <TableRow
                        key={item.id}
                        className="cursor-pointer hover:bg-gray-50"
                      >
                        <TableCell className="font-medium">
                          {item.name}
                          {item.description && (
                            <div className="text-xs text-gray-500 mt-1">
                              {item.description}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{item.quantity || 1}</TableCell>
                        <TableCell className="text-right">
                          {item.price
                            ? `$${(item.price / 100).toFixed(2)}`
                            : "N/A"}
                        </TableCell>
                        <TableCell className="text-right">
                          {!isItemInCatalog(item) && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-1 text-xs"
                              onClick={() => {
                                setSelectedItemForCatalog(item);
                                setAddToCatalogDialogOpen(true);
                              }}
                            >
                              <Plus className="h-3 w-3" /> Add to Catalog
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Content Details Collapsible Section */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-700">
                  Content Details
                </h3>
                <div className="rounded-md border divide-y">
                  {packageContents.map((item) => (
                    <div key={`details-${item.id}`} className="p-3">
                      <div className="flex justify-between items-center">
                        <h4 className="text-sm font-medium">{item.name}</h4>
                        {!isItemInCatalog(item) && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-1 text-xs"
                            onClick={() => {
                              setSelectedItemForCatalog(item);
                              setAddToCatalogDialogOpen(true);
                            }}
                          >
                            <Plus className="h-3 w-3" /> Add to Catalog
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                        {item.sku && (
                          <div className="col-span-2">
                            <span className="font-medium">SKU:</span> {item.sku}
                          </div>
                        )}

                        {item.gtin && (
                          <div className="col-span-2">
                            <span className="font-medium">GTIN/EAN:</span>{" "}
                            {item.gtin}
                          </div>
                        )}

                        {item.hsCode && (
                          <div className="col-span-2">
                            <span className="font-medium">HS Code:</span>{" "}
                            {item.hsCode}
                          </div>
                        )}

                        {(item.width || item.height || item.length) && (
                          <div className="col-span-2">
                            <span className="font-medium">Dimensions:</span>
                            {item.length ? `${item.length} x ` : "- x "}
                            {item.width ? `${item.width} x ` : "- x "}
                            {item.height ? `${item.height} cm` : "- cm"}
                          </div>
                        )}

                        {item.weight && (
                          <div>
                            <span className="font-medium">Weight:</span>{" "}
                            {item.weight} kg
                          </div>
                        )}

                        {item.countryOfOrigin && (
                          <div>
                            <span className="font-medium">Origin:</span>{" "}
                            {item.countryOfOrigin}
                          </div>
                        )}

                        {item.manufacturer && (
                          <div className="col-span-2">
                            <span className="font-medium">Manufacturer:</span>{" "}
                            {item.manufacturer}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center">
              <p className="text-gray-500">
                No contents found for this shipment.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setContentsDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tracking Dialog */}
      <Dialog open={trackingDialogOpen} onOpenChange={setTrackingDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <MapPin className="mr-2 h-5 w-5" />
              {t("shipmentTable.tracking.title")}
            </DialogTitle>
            <DialogDescription>
              {selectedShipment && (
                <div className="text-sm">
                  {t("shipmentTable.tracking.shipment")}:{" "}
                  {formatShipmentId(selectedShipment.id)}
                  {selectedShipment.trackingNumber && (
                    <span className="block">
                      {t("shipmentTable.tracking.moogshipTracking")}:{" "}
                      {selectedShipment.trackingNumber}
                    </span>
                  )}
                  {selectedShipment.manualTrackingNumber && (
                    <div className="mb-2">
                      <span className="block text-purple-700 font-medium">
                        Manual Tracking: {selectedShipment.manualTrackingNumber}
                      </span>
                      {selectedShipment.manualCarrierName && (
                        <span className="block text-purple-600 text-sm">
                          Carrier: {selectedShipment.manualCarrierName}
                        </span>
                      )}
                      {selectedShipment.manualTrackingLink && (
                        <a
                          href={selectedShipment.manualTrackingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-600 hover:text-purple-800 text-sm underline"
                        >
                          View Tracking
                        </a>
                      )}
                    </div>
                  )}
                  {selectedShipment.carrierTrackingNumber && (
                    <div>
                      <span className="block">
                        {t("shipmentTable.tracking.carrierTracking")}:{" "}
                        {selectedShipment.carrierTrackingNumber}
                      </span>
                      {selectedShipment.trackingInfo && (
                        <div className="mt-1 text-xs text-blue-600 font-medium">
                          {(() => {
                            try {
                              const trackingData =
                                typeof selectedShipment.trackingInfo ===
                                "string"
                                  ? JSON.parse(selectedShipment.trackingInfo)
                                  : selectedShipment.trackingInfo;

                              if (
                                trackingData.currentStatus &&
                                trackingData.currentStatus.description
                              ) {
                                return `${t("shipmentTable.tracking.status")}: ${trackingData.currentStatus.description}`;
                              } else if (trackingData.statusDescription) {
                                return `${t("shipmentTable.tracking.status")}: ${trackingData.statusDescription}`;
                              } else if (trackingData.status) {
                                return `${t("shipmentTable.tracking.status")}: ${trackingData.status}`;
                              }
                              return null;
                            } catch (e) {
                              return null;
                            }
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedShipment && (
            <div className="space-y-4">
              {/* Status Badge and Tracking Summary */}
              <div className="flex justify-between items-center">
                {selectedShipment.status && (
                  <div
                    className={`text-sm rounded-md py-0.5 px-2 font-medium ${getStatusBadgeColor(selectedShipment.status)}`}
                  >
                    {selectedShipment.status}
                  </div>
                )}

                {/* Refresh Tracking Button */}
                {selectedShipment.carrierTrackingNumber && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (!selectedShipment) return;

                      try {
                        toast({
                          title: "Updating Tracking",
                          description:
                            "Fetching latest tracking information...",
                        });

                        const response = await apiRequest(
                          "POST",
                          `/api/shipments/${selectedShipment.id}/track`,
                        );

                        if (!response.ok) {
                          throw new Error(
                            "Failed to update tracking information",
                          );
                        }

                        // Refresh data
                        queryClient.invalidateQueries({
                          queryKey: isAdmin
                            ? ["/api/shipments/all"]
                            : ["/api/shipments/my"],
                        });

                        // If we have the specific shipment query key
                        queryClient.invalidateQueries({
                          queryKey: ["/api/shipments", selectedShipment.id],
                        });

                        // Re-fetch the selected shipment to get updated tracking info
                        const updatedShipment = await (
                          await fetch(`/api/shipments/${selectedShipment.id}`)
                        ).json();
                        setSelectedShipment(updatedShipment);

                        toast({
                          title: "Tracking Updated",
                          description:
                            "Latest tracking information has been retrieved.",
                        });
                      } catch (error) {
                        toast({
                          variant: "destructive",
                          title: "Update Failed",
                          description:
                            error instanceof Error
                              ? error.message
                              : "Failed to update tracking information",
                        });
                      }
                    }}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" /> Refresh Tracking
                  </Button>
                )}
              </div>

              {/* Tracking Data Parse Error */}
              {selectedShipment.trackingInfo &&
                (() => {
                  try {
                    // Just try to parse the tracking info to see if it's valid JSON
                    if (typeof selectedShipment.trackingInfo === "string") {
                      JSON.parse(selectedShipment.trackingInfo);
                    }
                    // If we get here, the parse succeeded
                    return null;
                  } catch (error) {
                    return (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                        <div className="flex items-start">
                          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 mr-2" />
                          <div>
                            <p className="text-sm font-medium text-amber-800">
                              Tracking data error
                            </p>
                            <p className="text-xs text-amber-700">
                              The tracking data could not be parsed correctly.
                              Please refresh tracking.
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  }
                })()}

              {/* Tracking Error Message */}
              {selectedShipment.trackingInfo &&
                (() => {
                  try {
                    // Parse tracking info if it's a string
                    const trackingData =
                      typeof selectedShipment.trackingInfo === "string"
                        ? JSON.parse(selectedShipment.trackingInfo)
                        : selectedShipment.trackingInfo;

                    // Check if there's an error message
                    if (trackingData.error) {
                      return (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                          <div className="flex items-start">
                            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 mr-2" />
                            <div>
                              <p className="text-sm font-medium text-red-800">
                                Tracking Error
                              </p>
                              <p className="text-xs text-red-700">
                                {getErrorDescription(
                                  trackingData.errorDescription ||
                                    trackingData.error,
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  } catch (error) {
                    return null;
                  }
                })()}

              {/* Only show tracking events if we have them */}
              {generateTrackingEvents(selectedShipment).length > 0 ? (
                <div className="border rounded-md overflow-hidden">
                  <div className="bg-primary-50 py-2 px-4 border-b">
                    <h3 className="text-sm font-medium text-primary-700">
                      Tracking Events
                    </h3>
                  </div>
                  <div className="divide-y max-h-[300px] overflow-y-auto">
                    {generateTrackingEvents(selectedShipment).map(
                      (
                        event: { status: string; location: string; date: Date },
                        index: number,
                      ) => (
                        <div key={index} className="p-4">
                          <div className="flex items-start">
                            <div className="flex-shrink-0">
                              <div className="h-2 w-2 rounded-full bg-primary-500 mt-2"></div>
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-900">
                                {event.status}
                              </p>
                              <p className="text-sm text-gray-500">
                                {event.location}
                              </p>
                              <p className="text-xs text-gray-400">
                                {formatDate(event.date)}{" "}
                                {event.date && !isNaN(event.date.getTime())
                                  ? `- ${event.date.toLocaleTimeString()}`
                                  : ""}
                              </p>
                            </div>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center p-6">
                  <Package className="mx-auto h-10 w-10 text-gray-400 mb-2" />
                  <p className="text-gray-500 mb-2">
                    No tracking events available.
                  </p>
                  {selectedShipment.carrierTrackingNumber ? (
                    <p className="text-sm text-gray-400">
                      This shipment has a carrier tracking number but no
                      tracking events yet. Click "Refresh Tracking" to check for
                      updates.
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400">
                      This shipment doesn't have a carrier tracking number yet.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setTrackingDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shipment Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[90vw] md:max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Shipment Details</DialogTitle>
            <DialogDescription>
              {selectedShipment && (
                <span className="text-sm">
                  Shipment ID: {formatShipmentId(selectedShipment.id)}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedShipment && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">
                      Sender Information
                    </h3>
                    <div className="rounded-md border border-gray-100 bg-gray-50 p-2 text-sm space-y-1 mt-1">
                      <p className="font-medium">Contact Details</p>
                      <p>Name: {selectedShipment.senderName}</p>
                      <p>Phone: {selectedShipment.senderPhone}</p>
                      {selectedShipment.senderEmail && (
                        <p>Email: {selectedShipment.senderEmail}</p>
                      )}
                    </div>

                    <div className="rounded-md border border-gray-100 bg-gray-50 p-2 text-sm space-y-1 mt-2">
                      <p className="font-medium">Pickup Address</p>
                      <p>{selectedShipment.senderAddress}</p>
                      <p>
                        {selectedShipment.senderCity},{" "}
                        {selectedShipment.senderCountry}
                      </p>
                      <p>Postal Code: {selectedShipment.senderPostalCode}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500">
                      Package Details
                    </h3>
                    <div className="rounded-md border border-gray-100 bg-gray-50 p-2 text-sm space-y-1 mt-1">
                      <div className="flex justify-between">
                        <p className="font-medium">Physical Packages</p>
                        <p className="text-xs text-gray-500">
                          Total: {selectedShipment.pieceCount || 1}{" "}
                          {(selectedShipment.pieceCount || 1) > 1
                            ? "packages"
                            : "package"}
                        </p>
                      </div>

                      {/* Check if we have individual packages data */}
                      {selectedShipment.packages &&
                      selectedShipment.packages.length > 0 ? (
                        <div className="space-y-2 mt-2">
                          {selectedShipment.packages.map(
                            (pkg: any, index: number) => (
                              <div
                                key={pkg.id || index}
                                className="border-t border-gray-100 pt-1 mt-1"
                              >
                                <div className="flex justify-between">
                                  <p className="font-medium">
                                    {pkg.name || `Package #${index + 1}`}
                                  </p>
                                  <span className="text-xs text-blue-600 px-1.5 py-0.5 bg-blue-50 rounded-full">
                                    #{index + 1}
                                  </span>
                                </div>
                                <p>
                                  Dimensions: {pkg.length} × {pkg.width} ×{" "}
                                  {pkg.height} cm
                                </p>
                                <p>Weight: {pkg.weight} kg</p>
                                {pkg.notes && (
                                  <p className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded mt-1">
                                    <span className="font-medium">
                                      Admin Notes:
                                    </span>{" "}
                                    {pkg.notes}
                                  </p>
                                )}
                                {pkg.description && (
                                  <p className="text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded mt-1">
                                    <span className="font-medium">
                                      Description:
                                    </span>{" "}
                                    {pkg.description}
                                  </p>
                                )}
                                <p className="text-xs text-gray-500">
                                  Debug: ID {pkg.id}
                                </p>
                              </div>
                            ),
                          )}
                        </div>
                      ) : (
                        // Fallback to main package dimensions if no individual packages are available
                        <div>
                          <p>
                            Dimensions: {selectedShipment.packageLength} ×{" "}
                            {selectedShipment.packageWidth} ×{" "}
                            {selectedShipment.packageHeight} cm
                          </p>
                          <p>Weight: {selectedShipment.packageWeight} kg</p>
                          {selectedShipment.volumetricWeight && (
                            <p>
                              Volumetric Weight:{" "}
                              {selectedShipment.volumetricWeight} kg
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="rounded-md border border-gray-100 bg-gray-50 p-2 text-sm space-y-1 mt-2">
                      <div className="flex justify-between">
                        <p className="font-medium">Package Contents</p>
                        {/* Display customs item count if available */}
                        {selectedShipment.packageItems && (
                          <p className="text-xs text-blue-600">
                            <span className="font-medium">Items:</span>{" "}
                            {selectedShipment.totalItemQuantity ||
                              selectedShipment.packageItems.length}{" "}
                            {(selectedShipment.totalItemQuantity ||
                              selectedShipment.packageItems.length) > 1
                              ? "items"
                              : "item"}
                          </p>
                        )}
                        {/* Display the customs value if available */}
                        {selectedShipment.customsItemCount &&
                          !selectedShipment.packageItems && (
                            <p className="text-xs text-blue-600">
                              <span className="font-medium">Items:</span>{" "}
                              {selectedShipment.customsItemCount}{" "}
                              {selectedShipment.customsItemCount > 1
                                ? "items"
                                : "item"}
                            </p>
                          )}
                      </div>
                      <p>
                        Contents:{" "}
                        {selectedShipment.description ||
                          "No description provided"}
                      </p>
                      {selectedShipment.gtip && (
                        <p>GTIP Code: {selectedShipment.gtip}</p>
                      )}
                      {selectedShipment.customsValue && (
                        <p>
                          Customs Value: $
                          {(selectedShipment.customsValue / 100).toFixed(2)}{" "}
                          {selectedShipment.currency || "USD"}
                        </p>
                      )}
                      {/* Show button to view detailed package items if available */}
                      {selectedShipment.packageItems &&
                        selectedShipment.packageItems.length > 0 && (
                          <div className="mt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => {
                                setPackageContents(
                                  selectedShipment.packageItems,
                                );
                                setContentsDialogOpen(true);
                              }}
                            >
                              <Package className="h-3.5 w-3.5 mr-1" />
                              View Item Details
                            </Button>
                          </div>
                        )}
                    </div>

                    <div className="rounded-md border border-gray-100 bg-gray-50 p-2 text-sm mt-2">
                      <p className="font-medium">Service Information</p>
                      <p>
                        Service:{" "}
                        {(() => {
                          // Map service codes to user-friendly MoogShip names
                          const serviceCode =
                            selectedShipment.selectedService ||
                            selectedShipment.providerServiceCode;
                          if (!serviceCode) return "Standard Service";

                          // Convert technical service codes to MoogShip branded names
                          if (
                            serviceCode.includes("eco") ||
                            serviceCode.includes("widect") ||
                            serviceCode.includes("EcoAFS")
                          ) {
                            return "MoogShip Eco";
                          }
                          if (
                            serviceCode.includes("ups") &&
                            serviceCode.includes("express")
                          ) {
                            return "MoogShip UPS Express";
                          }
                          if (serviceCode.includes("express")) {
                            return "MoogShip Express";
                          }
                          if (
                            serviceCode.includes("standard") ||
                            serviceCode.includes("worldwide")
                          ) {
                            return "MoogShip Worldwide Standard";
                          }
                          if (
                            serviceCode.includes("gls") ||
                            serviceCode.includes("afs")
                          ) {
                            return "MoogShip GLS";
                          }
                          if (serviceCode.includes("dhl")) {
                            return "MoogShip DHL E-Commerce";
                          }

                          // Fallback to clean up raw service codes - remove all technical prefixes
                          return serviceCode
                            .replace(/shipentegra-|afs-|se-/g, "")
                            .replace(/-/g, " ")
                            .split(" ")
                            .map(
                              (word: string) =>
                                word.charAt(0).toUpperCase() + word.slice(1),
                            )
                            .join(" ");
                        })()}
                      </p>
                      {selectedShipment.specialNotes && (
                        <p>Special Notes: {selectedShipment.specialNotes}</p>
                      )}

                      {/* Display insurance information if applicable */}
                      {selectedShipment.isInsured && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <p className="font-medium text-blue-700">
                            Insurance Information
                          </p>
                          <p className="text-blue-700">
                            <span className="font-medium">Declared Value:</span>{" "}
                            ${(selectedShipment.declaredValue / 100).toFixed(2)}
                          </p>
                          <p className="text-blue-700">
                            <span className="font-medium">Insurance Cost:</span>{" "}
                            ${(selectedShipment.insuranceCost / 100).toFixed(2)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">
                      Receiver Information
                    </h3>
                    <div className="rounded-md border border-gray-100 bg-gray-50 p-2 text-sm space-y-1 mt-1">
                      <p className="font-medium">Contact Details</p>
                      <p>Name: {selectedShipment.receiverName}</p>
                      <p>Phone: {selectedShipment.receiverPhone}</p>
                      {selectedShipment.receiverEmail && (
                        <p>Email: {selectedShipment.receiverEmail}</p>
                      )}
                    </div>

                    <div className="rounded-md border border-gray-100 bg-gray-50 p-2 text-sm space-y-1 mt-2">
                      <p className="font-medium">Delivery Address</p>
                      <p>
                        {/* Show complete address with both lines combined */}
                        {selectedShipment.receiverAddress}
                        {selectedShipment.receiverAddress2 &&
                          selectedShipment.receiverAddress2 !== null &&
                          !selectedShipment.receiverAddress.includes(
                            selectedShipment.receiverAddress2,
                          ) &&
                          `, ${selectedShipment.receiverAddress2}`}
                      </p>
                      <p>
                        {selectedShipment.receiverCity}
                        {selectedShipment.receiverState && (
                          <span>, {selectedShipment.receiverState}</span>
                        )}
                        {selectedShipment.receiverPostalCode && (
                          <span> {selectedShipment.receiverPostalCode}</span>
                        )}
                      </p>
                      <p>Country: {selectedShipment.receiverCountry}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500">
                      Shipping Information
                    </h3>

                    <div className="rounded-md border border-gray-100 bg-gray-50 p-2 text-sm space-y-1 mt-1">
                      <p className="font-medium">Status Information</p>
                      <p>
                        Status:{" "}
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(selectedShipment.status)}`}
                        >
                          {selectedShipment.status.charAt(0).toUpperCase() +
                            selectedShipment.status.slice(1).replace(/_/g, " ")}
                        </span>
                      </p>
                      <p>Created: {formatDate(selectedShipment.createdAt)}</p>
                      {selectedShipment.approvedAt && (
                        <p>
                          Approved: {formatDate(selectedShipment.approvedAt)}
                        </p>
                      )}
                      {selectedShipment.approvedBy && (
                        <p>Approved By: {selectedShipment.approvedBy}</p>
                      )}
                      {selectedShipment.updatedAt &&
                        selectedShipment.updatedAt !==
                          selectedShipment.createdAt && (
                          <p>
                            Last Updated:{" "}
                            {formatDate(selectedShipment.updatedAt)}
                          </p>
                        )}
                    </div>

                    <div className="rounded-md border border-gray-100 bg-gray-50 p-2 text-sm space-y-1 mt-2">
                      <p className="font-medium">Carrier & Tracking</p>
                      {selectedShipment.trackingNumber && (
                        <p>
                          MoogShip Tracking #:{" "}
                          <span className="font-mono">
                            {selectedShipment.trackingNumber}
                          </span>
                        </p>
                      )}
                      {selectedShipment.carrierTrackingNumber && (
                        <div className="bg-blue-50 p-2 rounded-md border border-blue-100 mt-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-blue-800">
                                External Carrier Tracking:
                              </p>
                              <p className="font-mono mt-1">
                                {selectedShipment.carrierTrackingNumber}
                              </p>
                            </div>
                            {selectedShipment.carrierName && (
                              <div className="bg-white px-2 py-1 rounded text-xs font-medium text-blue-600 border border-blue-200">
                                {selectedShipment.carrierName}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {/* Show label errors to admin users only */}
                      {isAdmin && selectedShipment.labelError && (
                        <div className="border-t border-red-300 mt-2 pt-2">
                          <p className="text-red-600 text-xs">
                            {getErrorDescription(selectedShipment.labelError)}
                          </p>
                          <p className="text-amber-600 text-xs">
                            Attempts: {selectedShipment.labelAttempts || 0}
                          </p>
                        </div>
                      )}
                      {selectedShipment.estimatedDeliveryDays && (
                        <p>
                          Est. Delivery:{" "}
                          {selectedShipment.estimatedDeliveryDays} days
                        </p>
                      )}
                    </div>

                    {(selectedShipment.etsyData?.orderID ||
                      selectedShipment.etsyData?.orderValue) && (
                      <div className="rounded-md border border-gray-100 bg-gray-50 p-2 text-sm space-y-1 mt-2">
                        <p className="font-medium">Order Information</p>
                        {selectedShipment.etsyData?.orderID && (
                          <p>
                            Etsy Order ID: {selectedShipment.etsyData.orderID}
                          </p>
                        )}
                        {selectedShipment.etsyData?.orderValue && (
                          <p>
                            Order Value: {selectedShipment.etsyData.orderValue}{" "}
                            {selectedShipment.etsyData?.currency || ""}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Invoice Information - Available for all users */}
                    <div className="rounded-md border border-purple-100 bg-purple-50 p-3 text-sm space-y-3 mt-2">
                      <p className="font-medium text-purple-800">
                        Invoice Information
                      </p>
                      
                      {(selectedShipment as any).invoicePdf ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p>Filename: {(selectedShipment as any).invoiceFilename}</p>
                              <p className="text-xs text-purple-600">
                                Uploaded: {(selectedShipment as any).invoiceUploadedAt 
                                  ? formatDate((selectedShipment as any).invoiceUploadedAt)
                                  : 'Date not available'}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  window.open(`/api/shipments/${selectedShipment.id}/invoice`, '_blank');
                                }}
                                className="flex items-center gap-2 bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200"
                              >
                                <FileText className="h-4 w-4" />
                                Download
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteInvoice(selectedShipment.id)}
                                disabled={isDeletingInvoice}
                                className="flex items-center gap-2 bg-red-100 text-red-700 border-red-200 hover:bg-red-200"
                              >
                                {isDeletingInvoice ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                                {isDeletingInvoice ? 'Deleting...' : 'Remove'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div
                          className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                            dragActive 
                              ? 'border-purple-400 bg-purple-100' 
                              : 'border-purple-200 hover:border-purple-300'
                          }`}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, selectedShipment.id)}
                        >
                          <div className="flex flex-col items-center gap-2">
                            {isUploadingInvoice ? (
                              <>
                                <Loader2 className="h-6 w-6 text-purple-500 animate-spin" />
                                <p className="text-purple-600">Uploading invoice...</p>
                              </>
                            ) : (
                              <>
                                <Upload className="h-6 w-6 text-purple-400" />
                                <p className="text-purple-600">
                                  Drag and drop a PDF invoice here, or{" "}
                                  <label className="text-purple-700 font-medium cursor-pointer hover:underline">
                                    browse files
                                    <input
                                      type="file"
                                      accept="application/pdf"
                                      onChange={(e) => handleFileUpload(e.target.files, selectedShipment.id)}
                                      className="hidden"
                                    />
                                  </label>
                                </p>
                                <p className="text-xs text-purple-500">PDF only, max 10MB</p>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Admin-only user and technical information */}
                    {isAdmin && (
                      <div className="rounded-md border border-amber-100 bg-amber-50 p-2 text-sm space-y-1 mt-2">
                        <p className="font-medium text-amber-800">
                          Administrative Information
                        </p>
                        {selectedShipment.userId && (
                          <p>User ID: {selectedShipment.userId}</p>
                        )}
                        {selectedShipment.userName && (
                          <p>User Name: {selectedShipment.userName}</p>
                        )}
                        {selectedShipment.userEmail && (
                          <p>User Email: {selectedShipment.userEmail}</p>
                        )}
                        {selectedShipment.shipmentNotes && (
                          <p>
                            Internal Notes: {selectedShipment.shipmentNotes}
                          </p>
                        )}
                        {selectedShipment.adminNotes && (
                          <p>Admin Notes: {selectedShipment.adminNotes}</p>
                        )}
                        {selectedShipment.labelAttempts &&
                          selectedShipment.labelAttempts > 0 && (
                            <p>
                              Label Generation Attempts:{" "}
                              {selectedShipment.labelAttempts}
                            </p>
                          )}
                        {selectedShipment.sentToShipEntegra && (
                          <p>
                            Sent to ShipEntegra:{" "}
                            {selectedShipment.sentToShipEntegraAt
                              ? formatDate(selectedShipment.sentToShipEntegraAt)
                              : "Yes"}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Delivery and processing information */}
                    {(selectedShipment.deliveryInstructions ||
                      selectedShipment.specialHandling) && (
                      <div className="rounded-md border border-green-100 bg-green-50 p-2 text-sm space-y-1 mt-2">
                        <p className="font-medium text-green-800">
                          Delivery Information
                        </p>
                        {selectedShipment.deliveryInstructions && (
                          <p>
                            Delivery Instructions:{" "}
                            {selectedShipment.deliveryInstructions}
                          </p>
                        )}
                        {selectedShipment.specialHandling && (
                          <p>
                            Special Handling: {selectedShipment.specialHandling}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  Price Information
                </h3>
                <div className="rounded-md border border-blue-100 bg-blue-50 p-3 text-sm">
                  <div className="grid grid-cols-2 gap-y-2">
                    <span>Base Price:</span>
                    <span className="text-right">
                      ${(selectedShipment.basePrice / 100).toFixed(2)}
                    </span>

                    <span>Fuel Surcharge:</span>
                    <span className="text-right">
                      ${(selectedShipment.fuelCharge / 100 || 0).toFixed(2)}
                    </span>

                    {/* Show insurance details if this shipment has insurance */}
                    {selectedShipment.isInsured &&
                      selectedShipment.insuranceCost > 0 && (
                        <>
                          <span>Insurance:</span>
                          <span className="text-right">
                            ${(selectedShipment.insuranceCost / 100).toFixed(2)}
                          </span>
                          <span className="text-xs text-blue-600 col-span-2">
                            Insurance coverage: $
                            {(selectedShipment.declaredValue / 100).toFixed(2)}
                          </span>
                        </>
                      )}

                    {selectedShipment.taxes > 0 && (
                      <>
                        <span>Taxes:</span>
                        <span className="text-right">
                          ${(selectedShipment.taxes / 100).toFixed(2)}
                        </span>
                      </>
                    )}

                    {/* Admin-only original cost information */}
                    {isAdmin && selectedShipment.originalTotalPrice && (
                      <>
                        <div className="col-span-2 border-t border-blue-200 my-1"></div>
                        <span className="text-xs text-gray-600">
                          Original Cost:
                        </span>
                        <span className="text-xs text-gray-600 text-right">
                          $
                          {(selectedShipment.originalTotalPrice / 100).toFixed(
                            2,
                          )}
                        </span>
                        {selectedShipment.priceMultiplier && (
                          <>
                            <span className="text-xs text-gray-600">
                              Price Multiplier:
                            </span>
                            <span className="text-xs text-gray-600 text-right">
                              {selectedShipment.priceMultiplier}x
                            </span>
                          </>
                        )}
                      </>
                    )}

                    <div className="col-span-2 border-t border-blue-200 my-1"></div>

                    <span className="font-medium text-blue-800">
                      Total Price:
                    </span>
                    <span className="font-medium text-blue-800 text-right">
                      ${(selectedShipment.totalPrice / 100).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {selectedShipment.rejectionReason && (
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-sm font-medium text-red-500 mb-2">
                    Rejection Reason
                  </h3>
                  <p className="text-sm bg-red-50 p-2 rounded border border-red-100">
                    {selectedShipment.rejectionReason}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setViewDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Use the new ShipmentCancelDialog component */}
      <ShipmentCancelDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        shipment={shipmentToCancel}
      />

      {/* Tracking Request Dialog */}
      <AlertDialog
        open={showTrackingRequestDialog}
        onOpenChange={setShowTrackingRequestDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t(
                "trackingRequestDialog.title",
                "Hızlandırılmış Takip Numarası Talebi",
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "trackingRequestDialog.description",
                "Bu gönderi için hızlandırılmış takip numarası talep etmek istediğinizden emin misiniz? Bu işlem, takip numarasının daha hızlı oluşturulması için yöneticilere bildirim gönderecektir.",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel", "İptal")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedShipment) {
                  requestTrackingMutation.mutate(selectedShipment.id);
                }
              }}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {t("trackingRequestDialog.confirm", "Takip Numarası Talep Et")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Simple Label Modal - Handles all labels */}
      <SimpleLabelModal
        isOpen={showLabelPreview}
        onClose={() => {
          setShowLabelPreview(false);
        }}
        shipmentId={labelPreviewShipmentId || 0}
        shipmentNumber={
          labelPreviewShipmentId
            ? `MOG${String(labelPreviewShipmentId).padStart(12, "0")}`
            : ""
        }
        labelType={labelPreviewType}
        selectedService={(() => {
          const shipmentId = labelPreviewShipmentId;
          const shipment = shipments.find((s) => s.id === shipmentId);
          return shipment?.selectedService || undefined;
        })()}
      />
    </>
  );
}
