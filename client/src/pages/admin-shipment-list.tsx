import { useState, useEffect } from "react";
import { useQuery, useMutation, QueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { usePaginatedShipments } from "@/hooks/usePaginatedShipments";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Search, Filter, Package, Edit, Check, X, AlertCircle, RefreshCw, Download, Plane, AlertTriangle, ChevronDown, FileDown, CreditCard } from "lucide-react";
import { ShipmentStatus, ShipmentStatusColors, ServiceLevelDetails, Shipment as ShipmentType } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { withAuth } from "@/lib/with-auth";
import { useToast } from "@/hooks/use-toast";
import { exportToExcel, formatShipmentForExport } from "@/lib/export-utils";
import { useSecureLabels } from "@/hooks/useSecureLabels";
import ShipmentTable from "@/components/shipment-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Layout from "@/components/layout";

// Schema for manual tracking number entry
const trackingNumberSchema = z.object({
  trackingNumber: z.string().min(5, "Tracking number must be at least 5 characters"),
  carrierName: z.string().min(2, "Carrier name is required").optional(),
  trackingLink: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
});

type ManualTrackingFormValues = z.infer<typeof trackingNumberSchema>;

// Refund calculation utilities
const shouldRequireRefund = (currentStatus: string, newStatus: string): boolean => {
  // Refund is required when moving from approved status to rejected/cancelled
  return currentStatus === ShipmentStatus.APPROVED && 
         (newStatus === ShipmentStatus.REJECTED || newStatus === ShipmentStatus.CANCELLED);
};

const calculateShipmentRefund = (shipment: Shipment, newStatus: string): number => {
  if (!shouldRequireRefund(shipment.status, newStatus)) {
    return 0;
  }
  return shipment.totalPrice || 0;
};

const calculateBulkRefunds = (shipments: Shipment[], newStatus: string): { 
  totalRefundAmount: number; 
  refundedShipmentCount: number;
  refundedShipments: Shipment[];
} => {
  const refundedShipments = shipments.filter(shipment => 
    shouldRequireRefund(shipment.status, newStatus) && shipment.totalPrice
  );
  
  const totalRefundAmount = refundedShipments.reduce((total, shipment) => 
    total + (shipment.totalPrice || 0), 0
  );
  
  return {
    totalRefundAmount,
    refundedShipmentCount: refundedShipments.length,
    refundedShipments
  };
};

const formatPrice = (priceInCents?: number): string => {
  if (!priceInCents && priceInCents !== 0) return "N/A";
  return `$${(priceInCents / 100).toFixed(2)}`;
};

// Type for shipment data
type Shipment = {
  id: number;
  userId: number;
  userName?: string;
  userEmail?: string;
  senderName: string;
  senderAddress: string;
  senderCity: string;
  senderPostalCode: string;
  senderCountry: string;
  senderPhone: string;
  senderEmail?: string;
  receiverName: string;
  receiverAddress: string;
  receiverAddress2?: string;
  receiverCity: string;
  receiverState?: string;
  receiverPostalCode: string;
  receiverCountry: string;
  receiverPhone: string;
  receiverEmail: string;
  packageWeight: number;
  packageLength: number;
  packageWidth: number;
  packageHeight: number;
  pieceCount?: number;
  description?: string;
  gtip?: string;
  customsValue?: number;
  currency?: string;
  volumetricWeight?: number;
  serviceLevel: string;
  status: ShipmentStatus;
  shippingTerms?: string;
  ddpDutiesAmount?: number;
  ddpBaseDutiesAmount?: number;
  ddpTrumpTariffsAmount?: number;
  ddpProcessingFee?: number;
  createdAt: string;
  trackingNumber?: string;
  carrierTrackingNumber?: string;
  manualTrackingNumber?: string;
  manualCarrierName?: string;
  manualTrackingLink?: string;
  basePrice?: number;
  taxes?: number;
  totalPrice?: number;
  originalTotalPrice?: number;
  fuelCharge?: number;
  carrierName?: string;
  labelUrl?: string;
  rejectionReason?: string;
  estimatedDeliveryDays?: number;
  sentToShipEntegra?: boolean;
  sentToShipEntegraAt?: string;
  etsyData?: {
    orderID?: string;
    orderValue?: number;
    currency?: string;
  };
};

type AdminShipmentListProps = {
  user: any;
};

// Rejection form schema
const rejectionSchema = z.object({
  rejectionReason: z.string().min(10, "Rejection reason must be at least 10 characters long")
});

const AdminShipmentListContent = ({ user }: AdminShipmentListProps) => {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { openMoogshipLabel, openCarrierLabel, isAnyLoading: isSecureLabelsLoading } = useSecureLabels();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentTab, setCurrentTab] = useState("pending");
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>(["all"]);
  const [customerFilterOpen, setCustomerFilterOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isTrackingDialogOpen, setIsTrackingDialogOpen] = useState(false);
  const [creditLimitCheck, setCreditLimitCheck] = useState<any>(null);
  const [selectedShipmentIds, setSelectedShipmentIds] = useState<number[]>([]);
  const [isBulkApproveDialogOpen, setIsBulkApproveDialogOpen] = useState(false);
  const [isBulkRejectDialogOpen, setIsBulkRejectDialogOpen] = useState(false);
  const [isBulkStatusChangeDialogOpen, setIsBulkStatusChangeDialogOpen] = useState(false);
  const [selectedNewStatus, setSelectedNewStatus] = useState<string>("");
  const [isSyncingStatus, setIsSyncingStatus] = useState(false);
  const [isOtherCarrier, setIsOtherCarrier] = useState(false);
  const [customCarrierName, setCustomCarrierName] = useState("");
  
  // Get page from URL query parameters on initial load
  const getInitialPage = () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const pageParam = urlParams.get('page');
      return pageParam ? parseInt(pageParam, 10) : 1;
    } catch (error) {
      console.error("Error parsing page parameter:", error);
      return 1;
    }
  };
  
  // Initialize pagination state from URL
  const [currentPage, setCurrentPage] = useState(getInitialPage());
  
  // Update URL when page changes to persist across refreshes
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('page', currentPage.toString());
    window.history.replaceState({}, '', url.toString());
  }, [currentPage]);
  
  // Form for rejection reason
  const rejectionForm = useForm({
    resolver: zodResolver(rejectionSchema),
    defaultValues: {
      rejectionReason: ""
    }
  });
  
  // Form for manual tracking number entry
  const trackingForm = useForm<ManualTrackingFormValues>({
    resolver: zodResolver(trackingNumberSchema),
    defaultValues: {
      trackingNumber: "",
      carrierName: "",
      trackingLink: ""
    }
  });

  // Query to fetch all users for customer filtering
  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    }
  });

  // Use optimized paginated shipments for dramatically improved performance
  const {
    shipments: originalShipments,
    pagination,
    counts,
    isLoading,
    isError,
    error,
    nextPage,
    prevPage,
    goToPage,
    changeLimit,
    currentPage: paginatedCurrentPage,
    currentLimit,
    refetch
  } = usePaginatedShipments({
    searchTerm,
    currentTab,
    customerId: selectedCustomerIds.includes("all") ? "" : selectedCustomerIds.join(",")
  });

  // Local state for instant UI updates during approval
  const [localRemovedShipmentIds, setLocalRemovedShipmentIds] = useState<Set<number>>(new Set());
  
  // Filter out locally removed shipments for instant UI feedback
  const shipments = originalShipments?.filter(s => !localRemovedShipmentIds.has(s.id)) || [];

  // State for credit limit warning dialog
  const [isCreditLimitWarningDialogOpen, setIsCreditLimitWarningDialogOpen] = useState(false);
  const [creditLimitWarningDetails, setCreditLimitWarningDetails] = useState<any>(null);
  
  // Separate mutation for approving with bypass
  const approveWithBypassMutation = useMutation({
    mutationFn: async (shipmentId: number) => {
      // Prevent duplicate approval attempts
      if (approvingShipmentIds.has(shipmentId)) {
        throw new Error("Approval already in progress for this shipment");
      }
      
      // Mark this shipment as being processed
      setApprovingShipmentIds(prev => new Set(prev).add(shipmentId));
      
      try {
        const response = await apiRequest("POST", `/api/shipments/approve/${shipmentId}`, {
          bypassCreditCheck: true
        });
        
        // Check for duplicate approval (409 status code)
        if (response.status === 409) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Shipment is already approved");
        }
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to approve shipment");
        }
        
        return response.json();
      } finally {
        // Always remove from processing set
        setApprovingShipmentIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(shipmentId);
          return newSet;
        });
      }
    },
    onSuccess: () => {
      // Server success - refresh data in background
      queryClient.invalidateQueries({ queryKey: ["/api/shipments/all"] });
      setIsCreditLimitWarningDialogOpen(false);
    },
    onError: (error: any) => {
      console.error("Approval with bypass error:", error);
      
      // Revert the optimistic update on error - restore shipment to pending list
      if (selectedShipment) {
        queryClient.setQueryData(["/api/shipments/all"], (oldData: any) => {
          if (oldData && oldData.shipments) {
            // Add the shipment back to the pending list
            const updatedShipment = { ...selectedShipment, status: 'pending' };
            return {
              ...oldData,
              shipments: [updatedShipment, ...oldData.shipments]
            };
          }
          return oldData;
        });
        
        // Force refresh to get correct server state
        queryClient.invalidateQueries({ queryKey: ["/api/shipments/all"] });
      }
      
      toast({
        title: "Approval Failed",
        description: error.message || "There was an error approving the shipment. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  // State to track approval in progress to prevent duplicate clicks
  const [approvingShipmentIds, setApprovingShipmentIds] = useState<Set<number>>(new Set());

  // Mutation for approving a shipment
  const approveMutation = useMutation({
    mutationFn: async (shipmentId: number) => {
      // Prevent duplicate approval attempts
      if (approvingShipmentIds.has(shipmentId)) {
        throw new Error("Approval already in progress for this shipment");
      }
      
      // Mark this shipment as being processed
      setApprovingShipmentIds(prev => new Set(prev).add(shipmentId));
      
      try {
        const response = await apiRequest("POST", `/api/shipments/approve/${shipmentId}`);
        
        // Check for duplicate approval (409 status code)
        if (response.status === 409) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Shipment is already approved");
        }
        
        // Check for credit limit error (400 status code)
        if (!response.ok) {
          const errorData = await response.json();
          
          // If this is a credit limit error, display a dialog instead of a toast
          if (response.status === 400 && errorData.creditDetails) {
            // Parse the credit details
            setCreditLimitWarningDetails({
              userBalance: errorData.creditDetails.userBalance,
              shipmentPrice: errorData.creditDetails.shipmentPrice,
              newBalance: errorData.creditDetails.newBalance,
              minimumBalance: errorData.creditDetails.minBalance,
              message: errorData.message
            });
            setIsCreditLimitWarningDialogOpen(true);
            throw new Error("CREDIT_LIMIT_DIALOG_SHOWN");
          }
          
          throw new Error(errorData.message || "Failed to approve shipment");
        }
        
        return response.json();
      } finally {
        // Always remove from processing set
        setApprovingShipmentIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(shipmentId);
          return newSet;
        });
      }
    },
    onSuccess: () => {
      // Server success - refresh data in background
      queryClient.invalidateQueries({ queryKey: ["/api/shipments/all"] });
    },
    onError: (error: any) => {
      console.error("Approval error:", error);
      
      // Don't show error toast if we're showing the credit limit dialog
      if (error.message === "CREDIT_LIMIT_DIALOG_SHOWN") {
        return;
      }
      
      // Revert the optimistic update on error - restore shipment to pending list
      if (selectedShipment) {
        queryClient.setQueryData(["/api/shipments/all"], (oldData: any) => {
          if (oldData && oldData.shipments) {
            // Add the shipment back to the pending list
            const updatedShipment = { ...selectedShipment, status: 'pending' };
            return {
              ...oldData,
              shipments: [updatedShipment, ...oldData.shipments]
            };
          }
          return oldData;
        });
        
        // Force refresh to get correct server state
        queryClient.invalidateQueries({ queryKey: ["/api/shipments/all"] });
      }
      
      toast({
        title: "Approval Failed",
        description: error.message || "There was an error approving the shipment. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Mutation for rejecting a shipment
  const rejectMutation = useMutation({
    mutationFn: async ({ shipmentId, rejectionReason }: { shipmentId: number; rejectionReason: string }) => {
      const response = await apiRequest("POST", `/api/shipments/reject/${shipmentId}`, { rejectionReason });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Shipment Rejected",
        description: "The shipment has been rejected with the provided reason.",
        variant: "default"
      });
      // Refresh shipments list
      queryClient.invalidateQueries({ queryKey: ["/api/shipments/all"] });
      setIsRejectDialogOpen(false);
      rejectionForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Rejection Failed",
        description: error.message || "There was an error rejecting the shipment. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  // Mutation for bulk approving shipments
  const bulkApproveMutation = useMutation({
    mutationFn: async (shipmentIds: number[]) => {
      // First, approve all shipments with skipEmail flag to prevent individual emails
      const promises = shipmentIds.map(id => 
        apiRequest("POST", `/api/shipments/approve/${id}`, { skipEmail: true })
      );
      const results = await Promise.all(promises);
      
      // Then send bulk summary email to users
      try {
        await apiRequest("POST", "/api/shipments/send-bulk-approval-emails", { 
          shipmentIds: shipmentIds 
        });
        console.log("📧 Bulk approval summary emails sent successfully");
      } catch (emailError) {
        console.error("⚠️ Failed to send bulk approval summary emails:", emailError);
        // Don't fail the entire operation if email sending fails
      }
      
      return results;
    },
    onSuccess: () => {
      toast({
        title: "Shipments Approved & Users Charged",
        description: `Successfully approved ${selectedShipmentIds.length} shipments and processed balance deductions.`,
        variant: "default"
      });
      // Force complete refresh by removing cache and refetching all shipment queries
      queryClient.removeQueries({ queryKey: ["/api/shipments"] });
      queryClient.removeQueries({ queryKey: ["/api/shipments/all"] });
      queryClient.removeQueries({ queryKey: ["/api/shipments", "pending"] });
      queryClient.removeQueries({ queryKey: ["/api/shipments", "approved"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shipments"] });
      
      // Force immediate refresh of the current hook's data
      refetch();
      
      // Also clear local removed shipments to reset UI state
      setLocalRemovedShipmentIds(new Set());
      setSelectedShipmentIds([]);
      setIsBulkApproveDialogOpen(false);
      // Also close the bulk status change dialog and reset state
      setIsBulkStatusChangeDialogOpen(false);
      setSelectedNewStatus("");
    },
    onError: (error: any) => {
      toast({
        title: "Bulk Approval Failed",
        description: error.message || "There was an error approving the shipments. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Mutation for bulk rejecting shipments
  const bulkRejectMutation = useMutation({
    mutationFn: async ({ shipmentIds, rejectionReason }: { shipmentIds: number[]; rejectionReason: string }) => {
      const promises = shipmentIds.map(id => 
        apiRequest("POST", `/api/shipments/reject/${id}`, { rejectionReason })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      toast({
        title: "Shipments Rejected",
        description: `Successfully rejected ${selectedShipmentIds.length} shipments.`,
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/shipments/all"] });
      setSelectedShipmentIds([]);
      setIsBulkRejectDialogOpen(false);
      rejectionForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Bulk Rejection Failed",
        description: error.message || "There was an error rejecting the shipments. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Mutation for bulk status change
  const bulkStatusChangeMutation = useMutation({
    mutationFn: async ({ shipmentIds, newStatus }: { shipmentIds: number[]; newStatus: string }) => {
      const response = await apiRequest("POST", "/api/shipments/bulk-status-change", { 
        shipmentIds, 
        newStatus 
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update shipment statuses");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      const updatedCount = data.updatedCount || selectedShipmentIds.length;
      let toastDescription = `Successfully updated status for ${updatedCount} shipments to ${getStatusDisplayName(selectedNewStatus)}.`;
      
      // Add refund information if refunds were processed
      if (data.refundsProcessed && data.refundsProcessed.count > 0) {
        const refundInfo = data.refundsProcessed;
        toastDescription += ` Refunded $${refundInfo.totalAmount.toFixed(2)} to ${refundInfo.count} users.`;
      }
      
      toast({
        title: "Status Updated",
        description: toastDescription,
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/shipments/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/balance"] }); // Refresh balance data
      setSelectedShipmentIds([]);
      setIsBulkStatusChangeDialogOpen(false);
      setSelectedNewStatus("");
    },
    onError: (error: any) => {
      toast({
        title: "Bulk Status Change Failed",
        description: error.message || "There was an error updating the shipment statuses. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Mutation for adding manual tracking number
  const addManualTrackingMutation = useMutation({
    mutationFn: async ({ shipmentId, data }: { shipmentId: number; data: ManualTrackingFormValues }) => {
      const response = await apiRequest("POST", `/api/shipments/add-tracking/${shipmentId}`, data);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add tracking number");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Tracking Number Added",
        description: "The manual tracking number has been added successfully and shipment status updated to 'In Transit'.",
        variant: "default"
      });
      // Reset form and close dialog
      trackingForm.reset({ trackingNumber: "", carrierName: "", trackingLink: "" });
      setIsOtherCarrier(false);
      setCustomCarrierName("");
      setIsTrackingDialogOpen(false);
      // Refresh shipments list
      queryClient.invalidateQueries({ queryKey: ["/api/shipments/all"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Add Tracking Number",
        description: error.message || "There was an error adding the tracking number. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Mutation for downloading missing carrier label PDFs
  const downloadMissingPdfsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/shipments/download-missing-carrier-pdfs");
      return response.json();
    },
    onSuccess: (data) => {
      const downloadCount = data.downloadedCount || data.successful || 0;
      const failedCount = data.failed || 0;
      
      toast({
        title: "Carrier Labels Downloaded",
        description: downloadCount > 0 
          ? `Successfully downloaded ${downloadCount} missing carrier label PDFs. ${failedCount > 0 ? `${failedCount} failed.` : ''}`
          : "No missing carrier label PDFs found to download.",
        variant: "default"
      });
      // Refresh shipments list to show updated PDF status
      queryClient.invalidateQueries({ queryKey: ["/api/shipments/all"] });
    },
    onError: (error: any) => {
      console.error("Download missing PDFs error:", error);
      toast({
        title: "Error Downloading PDFs",
        description: error.message || "An error occurred while downloading missing carrier label PDFs.",
        variant: "destructive"
      });
    }
  });

  // Export function to export ALL shipments across all statuses
  const handleExport = async () => {
    try {
      toast({
        title: "Preparing export",
        description: "Fetching all shipments for export...",
      });

      // Fetch ALL shipments without pagination or filters
      const response = await apiRequest("GET", "/api/shipments/all?export=true&limit=10000");
      if (!response.ok) {
        throw new Error("Failed to fetch shipments for export");
      }
      
      const data = await response.json();
      const allShipments = data.shipments || data || [];
      
      if (!allShipments || allShipments.length === 0) {
        toast({
          title: "No data to export",
          description: "There are no shipments to export to Excel",
          variant: "destructive",
        });
        return;
      }
      
      const formattedShipments = allShipments.map((shipment: Shipment) => formatShipmentForExport(shipment, true));
      exportToExcel(formattedShipments, `admin-all-shipments-export-${new Date().toISOString().split('T')[0]}`);
      
      toast({
        title: "Export successful",
        description: `Successfully exported ${allShipments.length} shipments to Excel`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export failed",
        description: "An error occurred while exporting shipments",
        variant: "destructive",
      });
    }
  };

  // Credit limit check query
  const creditLimitCheckQuery = useMutation({
    mutationFn: async (shipmentId: number) => {
      const response = await apiRequest("GET", `/api/shipments/check-credit-limit/${shipmentId}`);
      if (!response.ok) {
        throw new Error("Failed to check credit limit");
      }
      return response.json();
    },
    onSuccess: (data) => {
      setCreditLimitCheck(data);
    },
    onError: (error: any) => {
      console.error("Credit limit check error:", error);
      setCreditLimitCheck(null);
      toast({
        title: "Credit Limit Check Failed",
        description: "Could not verify user's credit limit. You can still proceed with approval.",
        variant: "default"
      });
    }
  });



  // Handle approve action
  const handleApproveClick = (shipment: Shipment) => {
    // Prevent clicking if already processing
    if (approvingShipmentIds.has(shipment.id)) {
      return;
    }
    
    setSelectedShipment(shipment);
    setIsApproveDialogOpen(true);
    
    // Check if this shipment would exceed the user's credit limit
    if (shipment.id) {
      creditLimitCheckQuery.mutate(shipment.id);
    }
  };

  // Handle reject action
  const handleRejectClick = (shipment: Shipment) => {
    setSelectedShipment(shipment);
    setIsRejectDialogOpen(true);
  };
  
  // Bulk action handlers
  const handleSelectShipment = (shipmentId: number, checked: boolean) => {
    if (checked) {
      setSelectedShipmentIds([...selectedShipmentIds, shipmentId]);
    } else {
      setSelectedShipmentIds(selectedShipmentIds.filter(id => id !== shipmentId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Select all shipments from the current results
      const selectableShipmentIds = shipments.map((shipment: ShipmentType) => shipment.id);
      setSelectedShipmentIds(selectableShipmentIds);
    } else {
      setSelectedShipmentIds([]);
    }
  };

  const handleBulkApprove = () => {
    setIsBulkApproveDialogOpen(true);
  };

  const handleBulkReject = () => {
    setIsBulkRejectDialogOpen(true);
  };

  const confirmBulkApprove = () => {
    bulkApproveMutation.mutate(selectedShipmentIds);
  };

  const confirmBulkReject = (data: { rejectionReason: string }) => {
    bulkRejectMutation.mutate({
      shipmentIds: selectedShipmentIds,
      rejectionReason: data.rejectionReason
    });
  };

  // Bulk status change handlers
  const handleBulkStatusChange = () => {
    setIsBulkStatusChangeDialogOpen(true);
  };

  const confirmBulkStatusChange = () => {
    if (selectedNewStatus) {
      // CRITICAL FIX: If changing status to "approved", use proper approval workflow with financial operations
      if (selectedNewStatus === "approved") {
        console.log(`🎯 BULK APPROVAL FIX: Using proper approval workflow for ${selectedShipmentIds.length} shipments`);
        bulkApproveMutation.mutate(selectedShipmentIds);
        // Keep dialog open to show transmission process - it will close via onSuccess handler
      } else {
        // For other status changes, use the simple status change
        bulkStatusChangeMutation.mutate({
          shipmentIds: selectedShipmentIds,
          newStatus: selectedNewStatus
        });
      }
    }
  };

  // Handle add/edit tracking button click
  const handleAddTrackingClick = (shipment: Shipment) => {
    setSelectedShipment(shipment);
    
    // If the shipment already has a tracking number, pre-fill the form with existing values
    if (shipment.carrierTrackingNumber) {
      trackingForm.reset({ 
        trackingNumber: shipment.carrierTrackingNumber,
        carrierName: shipment.carrierName || "",
        trackingLink: ""
      });
      // Reset other carrier state
      setIsOtherCarrier(false);
      setCustomCarrierName("");
    } else {
      trackingForm.reset({ trackingNumber: "", carrierName: "", trackingLink: "" });
      // Reset other carrier state
      setIsOtherCarrier(false);
      setCustomCarrierName("");
    }
    
    setIsTrackingDialogOpen(true);
  };

  // Reset credit limit check when dialog is closed
  useEffect(() => {
    if (!isApproveDialogOpen) {
      setCreditLimitCheck(null);
    }
  }, [isApproveDialogOpen]);
  
  // Handle confirm approve
  const handleConfirmApprove = () => {
    if (selectedShipment) {
      // INSTANT UI UPDATE: Remove from local state immediately for 0ms delay
      setLocalRemovedShipmentIds(prev => new Set(prev).add(selectedShipment.id));
      
      // Also remove from selected shipments if it's selected
      setSelectedShipmentIds(prev => prev.filter(id => id !== selectedShipment.id));
      
      // Close dialog immediately
      setIsApproveDialogOpen(false);
      
      // Show success toast immediately
      toast({
        title: "Shipment Approved",
        description: "The shipment has been approved and the user has been charged.",
        variant: "default"
      });
      
      // Background server call - no UI dependency
      approveMutation.mutate(selectedShipment.id);
    }
  };

  // Handle confirm reject
  const handleConfirmReject = (data: { rejectionReason: string }) => {
    if (selectedShipment) {
      rejectMutation.mutate({
        shipmentId: selectedShipment.id,
        rejectionReason: data.rejectionReason
      });
    }
  };

  // Handle credit limit override approve
  const handleCreditLimitOverrideApprove = () => {
    if (selectedShipment) {
      // Close credit limit warning dialog
      setIsCreditLimitWarningDialogOpen(false);
      
      // Start approval with bypass
      approveWithBypassMutation.mutate(selectedShipment.id);
    }
  };

  // Shipments are already filtered server-side by the paginated hook for optimal performance
  const filteredShipments = shipments;

  // Format price as currency
  const formatPrice = (price?: number) => {
    if (price === undefined) return "N/A";
    return `$${(price / 100).toFixed(2)}`;
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    }).format(date);
  };

  // Helper function to get status display name
  const getStatusDisplayName = (status: string) => {
    const statusMap: Record<string, string> = {
      "pending": "Pending",
      "approved": "Approved", 
      "pre_transit": "Pre-Transit",
      "in_transit": "In Transit",
      "delivered": "Delivered",
      "cancelled": "Cancelled",
      "rejected": "Rejected"
    };
    return statusMap[status] || status;
  };

  // Function to handle page changes from ShipmentTable
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <Card className="w-full shadow-sm border-blue-100/50">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="text-2xl font-bold">All Shipments</CardTitle>
                <CardDescription>
                  Manage and review all shipments across the platform
                </CardDescription>
              </div>
              
              <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
                <div className="flex gap-3 items-center">
                  <Link href="/admin-shipment-create">
                    <Button 
                      variant="default" 
                      className="bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap"
                    >
                      <Package className="mr-2 h-4 w-4" />
                      Create Shipment
                    </Button>
                  </Link>
                </div>
                <div className="flex gap-3 items-center">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search all shipments (ID, name, email, tracking...)..."
                      className="pl-8 w-full"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  
                  <div className="relative">
                    <Popover open={customerFilterOpen} onOpenChange={setCustomerFilterOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={customerFilterOpen}
                          className="pl-8 w-[250px] justify-between"
                        >
                          <Filter className="absolute left-2 h-4 w-4 text-gray-400" />
                          {selectedCustomerIds.includes("all") || selectedCustomerIds.length === 0
                            ? "All Customers"
                            : selectedCustomerIds.length === 1
                            ? (() => {
                                const user = users?.find((u: any) => u.id.toString() === selectedCustomerIds[0]);
                                return user ? `${user.companyName || user.name}` : "All Customers";
                              })()
                            : `${selectedCustomerIds.length} customers selected`}
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0" align="start" side="bottom" sideOffset={4}>
                        <Command>
                          <CommandInput placeholder="Search customers..." />
                          <CommandList>
                            <CommandEmpty>No customers found.</CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                value="all"
                                onSelect={() => {
                                  if (selectedCustomerIds.includes("all")) {
                                    setSelectedCustomerIds([]);
                                  } else {
                                    setSelectedCustomerIds(["all"]);
                                  }
                                }}
                                className="flex items-center space-x-2"
                              >
                                <Checkbox 
                                  checked={selectedCustomerIds.includes("all")} 
                                  onChange={() => {}} 
                                />
                                <span>All Customers</span>
                              </CommandItem>
                              {users?.map((user: any) => (
                                <CommandItem
                                  key={user.id}
                                  value={`${user.companyName || user.name} ${user.email}`}
                                  onSelect={() => {
                                    const userId = user.id.toString();
                                    setSelectedCustomerIds(prev => {
                                      const newSelection = prev.filter(id => id !== "all");
                                      if (newSelection.includes(userId)) {
                                        const filtered = newSelection.filter(id => id !== userId);
                                        return filtered.length === 0 ? ["all"] : filtered;
                                      } else {
                                        return [...newSelection, userId];
                                      }
                                    });
                                  }}
                                  className="flex items-center space-x-2"
                                >
                                  <Checkbox 
                                    checked={selectedCustomerIds.includes(user.id.toString())} 
                                    onChange={() => {}}
                                  />
                                  <span>{user.companyName || user.name} ({user.email})</span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                
                <Button
                  onClick={async () => {
                    setIsSyncingStatus(true);
                    try {
                      toast({
                        title: "Tracking Sync Started",
                        description: "Syncing with all carriers (UPS, DHL, FedEx, GLS, AFS)...",
                      });

                      const response = await apiRequest('POST', '/api/shipments/sync-status');

                      const result = await response.json();

                      if (result.success) {
                        toast({
                          title: "Tracking Sync Initiated",
                          description: "Syncing all shipments in background. Refresh the page in a few minutes to see updates.",
                        });
                      } else {
                        throw new Error(result.message || "Sync failed");
                      }

                      // Refresh the shipments data after a short delay
                      setTimeout(() => {
                        queryClient.invalidateQueries({ queryKey: ['/api/shipments/all'] });
                      }, 3000);
                    } catch (error) {
                      toast({
                        title: "Sync Failed",
                        description: "Failed to sync shipment statuses",
                        variant: "destructive"
                      });
                    } finally {
                      setIsSyncingStatus(false);
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className="whitespace-nowrap bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                  disabled={isSyncingStatus}
                >
                  {isSyncingStatus ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  {isSyncingStatus ? "Syncing..." : "Sync All Tracking"}
                </Button>
                

              </div>
            </div>
          </CardHeader>
          
          {/* Status Tabs */}
          <div className="px-6 border-b">
            <div className="flex space-x-8">
              {[
                { key: "pending", label: "Pending Approval", count: counts.pending || 0, color: "amber" },
                { key: "approved", label: "Approved", count: counts.approved || 0, color: "green" },
                { key: "pre_transit", label: "Pre-Transit", count: counts.pre_transit || 0, color: "blue" },
                { key: "in_transit", label: "In Transit", count: counts.in_transit || 0, color: "purple" },
                { key: "delivered", label: "Delivered", count: counts.delivered || 0, color: "emerald" },
                { key: "rejected", label: "Rejected", count: counts.rejected || 0, color: "red" },
                { key: "cancelled", label: "Cancelled", count: counts.cancelled || 0, color: "gray" }
              ].map((tab) => {
                const getTabColors = (color: string, isActive: boolean) => {
                  const colors = {
                    amber: {
                      active: "border-amber-500 text-amber-600",
                      inactive: "border-transparent text-amber-500 hover:text-amber-600 hover:border-amber-300",
                      badge: isActive ? "bg-amber-100 text-amber-600" : "bg-amber-50 text-amber-500"
                    },
                    green: {
                      active: "border-green-500 text-green-600",
                      inactive: "border-transparent text-green-500 hover:text-green-600 hover:border-green-300",
                      badge: isActive ? "bg-green-100 text-green-600" : "bg-green-50 text-green-500"
                    },
                    blue: {
                      active: "border-blue-500 text-blue-600",
                      inactive: "border-transparent text-blue-500 hover:text-blue-600 hover:border-blue-300",
                      badge: isActive ? "bg-blue-100 text-blue-600" : "bg-blue-50 text-blue-500"
                    },
                    purple: {
                      active: "border-purple-500 text-purple-600",
                      inactive: "border-transparent text-purple-500 hover:text-purple-600 hover:border-purple-300",
                      badge: isActive ? "bg-purple-100 text-purple-600" : "bg-purple-50 text-purple-500"
                    },
                    emerald: {
                      active: "border-emerald-500 text-emerald-600",
                      inactive: "border-transparent text-emerald-500 hover:text-emerald-600 hover:border-emerald-300",
                      badge: isActive ? "bg-emerald-100 text-emerald-600" : "bg-emerald-50 text-emerald-500"
                    },
                    red: {
                      active: "border-red-500 text-red-600",
                      inactive: "border-transparent text-red-500 hover:text-red-600 hover:border-red-300",
                      badge: isActive ? "bg-red-100 text-red-600" : "bg-red-50 text-red-500"
                    },
                    gray: {
                      active: "border-gray-500 text-gray-600",
                      inactive: "border-transparent text-gray-500 hover:text-gray-600 hover:border-gray-300",
                      badge: isActive ? "bg-gray-100 text-gray-600" : "bg-gray-50 text-gray-500"
                    }
                  };
                  return colors[color as keyof typeof colors] || colors.gray;
                };
                
                const tabColors = getTabColors(tab.color, currentTab === tab.key);
                
                return (
                  <button
                    key={tab.key}
                    onClick={() => {
                      setCurrentTab(tab.key);
                      setSelectedShipmentIds([]); // Clear selection when switching tabs
                    }}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      currentTab === tab.key
                        ? tabColors.active
                        : tabColors.inactive
                    }`}
                  >
                    {tab.label}
                    <span className={`ml-2 py-0.5 px-2 rounded-full text-xs transition-colors ${tabColors.badge}`}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Search Results Indicator */}
          {searchTerm && (
            <div className="px-6 py-3 bg-blue-50 border-b border-blue-200">
              <div className="flex items-center gap-2 text-sm text-blue-700">
                <Search className="h-4 w-4" />
                <span className="font-medium">
                  Searching all shipments for: "{searchTerm}"
                </span>
                <span className="text-blue-600">
                  • Results shown across all statuses
                </span>
              </div>
            </div>
          )}
          
          <CardContent>
            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4">
              <div className="flex space-x-2 mb-4 md:mb-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="font-medium"
                  onClick={() => refetch()}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  className="font-medium"
                  onClick={() => downloadMissingPdfsMutation.mutate()}
                  disabled={downloadMissingPdfsMutation.isPending}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {downloadMissingPdfsMutation.isPending ? 'Downloading...' : 'Download Missing Carrier PDFs'}
                </Button>
                
                <Button 
                  size="sm"
                  variant="outline" 
                  className="flex items-center bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:text-green-800 font-medium"
                  onClick={handleExport}
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  Export All Shipments
                </Button>
              </div>
            </div>
            
            {isLoading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <span className="ml-2 text-gray-500">Loading shipments...</span>
              </div>
            ) : isError ? (
              <div className="text-center py-10">
                <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-2" />
                <h3 className="text-lg font-medium text-gray-900">Error Loading Shipments</h3>
                <p className="text-gray-500 mt-1">
                  {error instanceof Error ? error.message : "There was a problem fetching the shipment data. Please try again."}
                </p>
                <div className="mt-4 flex justify-center gap-2">
                  <Button variant="outline" onClick={() => refetch()}>
                    Retry
                  </Button>
                  <Button variant="secondary" onClick={() => setLocation('/')}>
                    Return to Dashboard
                  </Button>
                </div>
              </div>
            ) : shipments.length === 0 ? (
              <div className="text-center py-10">
                <Package className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                <h3 className="text-lg font-medium text-gray-900">No Shipments Found</h3>
                <p className="text-gray-500 mt-1">
                  {searchTerm
                    ? "No shipments match your search criteria. Try adjusting your search terms."
                    : `No ${currentTab} shipments found.`}
                </p>
              </div>
            ) : (
              <ShipmentTable
                shipments={shipments}
                isLoading={isLoading}
                showFilters={false}
                showPagination={true}
                isAdmin={true}
                currentPage={paginatedCurrentPage}
                totalPages={pagination?.totalPages || 1}
                onPageChange={goToPage}
                canAccessCarrierLabels={true}
                enableBulkSelection={true}
                selectedShipmentIds={selectedShipmentIds}
                onSelectShipment={handleSelectShipment}
                onSelectAll={handleSelectAll}
                onBulkStatusChange={handleBulkStatusChange}
                onManualTrackingClick={handleAddTrackingClick}
                idActions={(shipment) => 
                  shipment.status === ShipmentStatus.PENDING ? (
                    <>
                      <button
                        className="h-5 w-5 p-0 text-green-600 hover:text-green-900 hover:bg-green-50 rounded flex items-center justify-center transition-all duration-200"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApproveClick(shipment);
                        }}
                        disabled={approvingShipmentIds.has(shipment.id)}
                        title="Approve"
                      >
                        {approvingShipmentIds.has(shipment.id) ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Check className="h-3 w-3" />
                        )}
                      </button>
                      <button
                        className="h-5 w-5 p-0 text-red-600 hover:text-red-900 hover:bg-red-50 rounded flex items-center justify-center transition-all duration-200"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRejectClick(shipment);
                        }}
                        disabled={approvingShipmentIds.has(shipment.id)}
                        title="Reject"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </>
                  ) : null
                }
                actions={(shipment) => (
                  <div className="flex justify-end gap-1">
                    {/* Label Buttons */}
                    {shipment.labelUrl && (
                      <>
                        {/* MoogShip Label */}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-green-600"
                          title="View MoogShip Label"
                          onClick={(e) => {
                            e.stopPropagation();
                            openMoogshipLabel(shipment.id);
                          }}
                          disabled={isSecureLabelsLoading}
                        >
                          <div className="h-5 w-5 relative border border-green-600 rounded-sm flex items-center justify-center">
                            <span className="text-xs font-bold">M</span>
                          </div>
                          <span className="sr-only">MoogShip Label</span>
                        </Button>
                        

                      </>
                    )}
                    

                    
                  </div>
                )}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Approve Shipment Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent className="sm:max-w-[600px] md:max-w-[700px] lg:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Approve Shipment</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this shipment? This will charge the user's account and generate a shipping label.
            </DialogDescription>
          </DialogHeader>
          
          {selectedShipment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="font-medium">ID:</div>
                <div>{selectedShipment.id}</div>
                <div className="font-medium">User:</div>
                <div>ID: {selectedShipment.userId} {selectedShipment.userName && `(${selectedShipment.userName})`}</div>
                
                <div className="font-medium">Receiver:</div>
                <div>{selectedShipment.receiverName}</div>
                <div className="font-medium">Address:</div>
                <div>{selectedShipment.receiverAddress}</div>
                <div className="font-medium">Location:</div>
                <div>
                  {selectedShipment.receiverCity}
                  {selectedShipment.receiverState && `, ${selectedShipment.receiverState}`}
                  {`, ${selectedShipment.receiverCountry}`}
                </div>
                <div className="font-medium">Postal Code:</div>
                <div>{selectedShipment.receiverPostalCode || 'N/A'}</div>
                <div className="font-medium">Contact:</div>
                <div>{selectedShipment.receiverPhone} {selectedShipment.receiverEmail && <span className="text-xs text-gray-500">({selectedShipment.receiverEmail})</span>}</div>
                
                <div className="font-medium">Package Dimensions:</div>
                <div className="grid grid-cols-1 gap-2 pb-1">
                  <div>
                    <span className="text-gray-600">Dimensions:</span> {selectedShipment.packageLength} × {selectedShipment.packageWidth} × {selectedShipment.packageHeight} cm
                  </div>
                  <div>
                    <span className="text-gray-600">Weight:</span> {selectedShipment.packageWeight} kg
                  </div>
                  <div>
                    <span className="text-gray-600">Physical Packages:</span> {selectedShipment.pieceCount || 1} {(selectedShipment.pieceCount || 1) > 1 ? 'packages' : 'package'}
                  </div>
                </div>
                
                {selectedShipment.description && (
                  <>
                    <div className="font-medium">Package Contents:</div>
                    <div className="text-xs pb-1">{selectedShipment.description}</div>
                  </>
                )}
                
                {selectedShipment.gtip && (
                  <>
                    <div className="font-medium">GTIP Code:</div>
                    <div>{selectedShipment.gtip}</div>
                  </>
                )}
                
                {selectedShipment.customsValue && (
                  <>
                    <div className="font-medium">Customs Value:</div>
                    <div>
                      ${(selectedShipment.customsValue / 100).toFixed(2)} 
                      {selectedShipment.currency ? ` ${selectedShipment.currency}` : 'USD'}
                    </div>
                  </>
                )}
                
                <div className="font-medium">Service Level:</div>
                <div className="capitalize">{selectedShipment.serviceLevel}</div>
                
                <div className="font-medium">Base Price (Customer):</div>
                <div>{formatPrice(selectedShipment.basePrice)}</div>
                
                <div className="font-medium">Original Cost Price:</div>
                <div className="text-gray-700">{formatPrice(selectedShipment.originalTotalPrice || selectedShipment.totalPrice)}</div>
                
                <div className="font-medium">Total Price (Customer):</div>
                <div className="font-bold">{formatPrice(selectedShipment.totalPrice)}</div>
                
                {(selectedShipment.ddpDutiesAmount || selectedShipment.ddpBaseDutiesAmount || 
                  selectedShipment.ddpTrumpTariffsAmount || selectedShipment.ddpProcessingFee) && (
                  <>
                    <div className="font-medium">DDP Customs Charges:</div>
                    <div className="text-orange-600 font-semibold">
                      ${(() => {
                        const hsCodeTax = selectedShipment.ddpBaseDutiesAmount || 0;
                        const trumpTariffs = selectedShipment.ddpTrumpTariffsAmount || 0;
                        const ddpProcessingFee = selectedShipment.ddpProcessingFee || 0;
                        const total = hsCodeTax + trumpTariffs + ddpProcessingFee;
                        return (total / 100).toFixed(2);
                      })()}
                      {(selectedShipment.ddpBaseDutiesAmount || selectedShipment.ddpTrumpTariffsAmount || 
                        selectedShipment.ddpProcessingFee) && (
                        <div className="text-xs text-gray-600 font-normal mt-1">
                          {selectedShipment.ddpBaseDutiesAmount ? 
                            `HS Tax: $${(selectedShipment.ddpBaseDutiesAmount / 100).toFixed(2)}` : ''}
                          {selectedShipment.ddpBaseDutiesAmount && selectedShipment.ddpTrumpTariffsAmount ? ' • ' : ''}
                          {selectedShipment.ddpTrumpTariffsAmount ? 
                            `Trump Tariffs: $${(selectedShipment.ddpTrumpTariffsAmount / 100).toFixed(2)}` : ''}
                          {(selectedShipment.ddpBaseDutiesAmount || selectedShipment.ddpTrumpTariffsAmount) && 
                           selectedShipment.ddpProcessingFee ? ' • ' : ''}
                          {selectedShipment.ddpProcessingFee ? 
                            `DDP Fee: $${(selectedShipment.ddpProcessingFee / 100).toFixed(2)}` : ''}
                        </div>
                      )}
                    </div>
                  </>
                )}
                
                {selectedShipment.estimatedDeliveryDays && (
                  <>
                    <div className="font-medium">Est. Delivery:</div>
                    <div>{selectedShipment.estimatedDeliveryDays} days</div>
                  </>
                )}
                
                {selectedShipment.carrierName && (
                  <>
                    <div className="font-medium">Carrier:</div>
                    <div>{selectedShipment.carrierName}</div>
                  </>
                )}
              </div>
              
              {/* Credit Limit Warning */}
              {creditLimitCheck && (
                <div className={`mt-4 p-4 ${creditLimitCheck.exceeds ? 'bg-red-50 border-2 border-red-300' : 'bg-green-50 border-2 border-green-300'} rounded-md shadow-md`}>
                  <div className="flex items-start gap-3">
                    {creditLimitCheck.exceeds ? (
                      <AlertTriangle className="h-7 w-7 text-red-500 mt-0.5 flex-shrink-0" />
                    ) : (
                      <Check className="h-7 w-7 text-green-500 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="w-full">
                      <h4 className={`text-lg font-bold ${creditLimitCheck.exceeds ? 'text-red-800' : 'text-green-800'}`}>
                        {creditLimitCheck.exceeds ? 'Credit Limit Warning' : 'Credit Limit Check Passed'}
                      </h4>
                      <p className={`text-sm ${creditLimitCheck.exceeds ? 'text-red-700' : 'text-green-700'} mt-1`}>
                        {creditLimitCheck.exceeds ? (
                          <>
                            <strong>⚠️ Attention:</strong> This approval would exceed the user's minimum balance limit by{' '}
                            <span className="font-bold underline">
                              {creditLimitCheck.formattedExceededAmount ? 
                                creditLimitCheck.formattedExceededAmount : 
                                formatPrice(Math.abs(creditLimitCheck.exceededAmount || 0))
                              }
                            </span>
                          </>
                        ) : (
                          <strong>✓ This shipment is within the user's credit limits</strong>
                        )}
                      </p>
                      <div className={`grid grid-cols-2 gap-x-4 gap-y-2 mt-3 text-sm border-t ${creditLimitCheck.exceeds ? 'border-red-200' : 'border-green-200'} pt-3 bg-white bg-opacity-50 p-3 rounded`}>
                        <div className={creditLimitCheck.exceeds ? 'text-red-800' : 'text-green-800'}>Current Balance:</div>
                        <div className={`${creditLimitCheck.exceeds ? 'text-red-900' : 'text-green-900'} font-medium`}>
                          {creditLimitCheck.formattedUserBalance || formatPrice(creditLimitCheck.userBalance)}
                        </div>
                        <div className={creditLimitCheck.exceeds ? 'text-red-800' : 'text-green-800'}>Shipment Cost:</div>
                        <div className={`${creditLimitCheck.exceeds ? 'text-red-900' : 'text-green-900'} font-medium`}>
                          - {creditLimitCheck.formattedShipmentPrice || formatPrice(Math.abs(creditLimitCheck.shipmentPrice))}
                        </div>
                        <div className={`${creditLimitCheck.exceeds ? 'text-red-800' : 'text-green-800'} font-semibold`}>New Balance:</div>
                        <div className={`${creditLimitCheck.exceeds ? 'text-red-900' : 'text-green-900'} font-semibold`}>
                          {creditLimitCheck.formattedNewBalance || formatPrice(creditLimitCheck.newBalance)}
                        </div>
                        <div className={creditLimitCheck.exceeds ? 'text-red-800' : 'text-green-800'}>Minimum Limit:</div>
                        <div className={`${creditLimitCheck.exceeds ? 'text-red-900' : 'text-green-900'} font-medium`}>
                          {creditLimitCheck.formattedMinBalance || formatPrice(creditLimitCheck.minBalance)}
                        </div>
                      </div>
                      {creditLimitCheck.exceeds && (
                        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-100 rounded text-sm text-yellow-800 shadow-sm">
                          <span className="font-medium">Note:</span> The system will prevent users from creating shipments that exceed their credit limit, but as an admin you can still approve if necessary.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {creditLimitCheckQuery.isPending && (
                <div className="mt-4 flex items-center justify-center py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500 mr-2" />
                  <span className="text-sm text-gray-500">Checking credit limit...</span>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter className="flex flex-row justify-end gap-2">
            <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleConfirmApprove}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Approve Shipment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Shipment Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="sm:max-w-[600px] md:max-w-[700px] lg:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reject Shipment</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this shipment. This information will be visible to the customer.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...rejectionForm}>
            <form onSubmit={rejectionForm.handleSubmit(handleConfirmReject)} className="space-y-4">
              <FormField
                control={rejectionForm.control}
                name="rejectionReason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rejection Reason</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter detailed reason for rejection..."
                        className="resize-none"
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Example: "Invalid destination address" or "Package dimensions exceed allowed limits"
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Refund Information Section */}
              {selectedShipment && shouldRequireRefund(selectedShipment.status, ShipmentStatus.REJECTED) && (
                <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-md">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <CreditCard className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-blue-900 mb-2">
                        💰 Automatic Refund Processing
                      </h4>
                      <p className="text-sm text-blue-800 mb-3">
                        This shipment has already been approved and the user has been charged. 
                        <strong className="text-blue-900"> Rejecting this shipment will automatically refund the user.</strong>
                      </p>
                      
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm bg-white bg-opacity-50 p-3 rounded border border-blue-200">
                        <div className="font-medium text-blue-800">Refund Amount:</div>
                        <div className="font-bold text-blue-900">{formatPrice(selectedShipment.totalPrice)}</div>
                        
                        <div className="font-medium text-blue-800">Customer:</div>
                        <div className="text-blue-900">{selectedShipment.userName || 'User'}</div>
                        
                        <div className="font-medium text-blue-800">Shipment ID:</div>
                        <div className="text-blue-900">#{selectedShipment.id}</div>
                        
                        {selectedShipment.trackingNumber && (
                          <>
                            <div className="font-medium text-blue-800">Tracking:</div>
                            <div className="text-blue-900 font-mono text-xs">{selectedShipment.trackingNumber}</div>
                          </>
                        )}
                      </div>
                      
                      <div className="mt-3 p-2 bg-blue-100 border border-blue-200 rounded text-xs text-blue-800">
                        <span className="font-medium">Note:</span> The refund will be automatically credited to the user's account balance 
                        and they will receive an email notification about the rejection and refund.
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <DialogFooter className="flex flex-row justify-end gap-2">
                <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)} type="button">
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  type="submit"
                  disabled={rejectMutation.isPending}
                >
                  {rejectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Reject Shipment
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Credit Limit Warning Dialog */}
      <Dialog open={isCreditLimitWarningDialogOpen} onOpenChange={setIsCreditLimitWarningDialogOpen}>
        <DialogContent className="sm:max-w-[600px] md:max-w-[700px] lg:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Credit Limit Warning
            </DialogTitle>
            <DialogDescription>
              This shipment cannot be approved automatically because it would exceed the user's credit limit.
            </DialogDescription>
          </DialogHeader>
          
          {creditLimitWarningDetails && (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border-2 border-red-200 rounded-md">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div className="font-medium text-red-800">Current Balance:</div>
                  <div className="font-medium text-red-900">{formatPrice(creditLimitWarningDetails.userBalance)}</div>
                  
                  <div className="font-medium text-red-800">Shipment Cost:</div>
                  <div className="font-medium text-red-900">- {formatPrice(creditLimitWarningDetails.shipmentPrice)}</div>
                  
                  <div className="font-semibold text-red-800">New Balance:</div>
                  <div className="font-semibold text-red-900">{formatPrice(creditLimitWarningDetails.newBalance)}</div>
                  
                  <div className="font-medium text-red-800">Minimum Limit:</div>
                  <div className="font-medium text-red-900">{formatPrice(creditLimitWarningDetails.minimumBalance)}</div>
                </div>
              </div>
              
              <div className="bg-amber-50 p-3 rounded-md border border-amber-200">
                <p className="text-sm text-amber-800">
                  <span className="font-medium">Note:</span> As an admin, you can choose to override the credit limit and approve the shipment anyway.
                </p>
              </div>
              
              <DialogFooter className="flex flex-row justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setIsCreditLimitWarningDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="default"
                  onClick={handleCreditLimitOverrideApprove}
                  disabled={approveWithBypassMutation.isPending}
                >
                  {approveWithBypassMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Override and Approve
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Manual Tracking Number Dialog */}
      <Dialog open={isTrackingDialogOpen} onOpenChange={setIsTrackingDialogOpen}>
        <DialogContent className="sm:max-w-[600px] md:max-w-[700px] lg:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedShipment?.carrierTrackingNumber ? "Edit Tracking Number" : "Add Manual Tracking Number"}
            </DialogTitle>
            <DialogDescription>
              {selectedShipment?.carrierTrackingNumber 
                ? "Update the tracking number and carrier information. Admins can modify tracking numbers for shipments in any status."
                : "Enter a tracking number for this shipment without purchasing from carrier API. Admins can add tracking numbers to shipments regardless of their current status."}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...trackingForm}>
            <form onSubmit={trackingForm.handleSubmit((data) => {
              if (selectedShipment) {
                addManualTrackingMutation.mutate({
                  shipmentId: selectedShipment.id,
                  data
                });
              }
            })} className="space-y-4">
              <FormField
                control={trackingForm.control}
                name="trackingNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tracking Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter tracking number..."
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Enter the tracking number provided by the shipping carrier
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={trackingForm.control}
                name="carrierName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Carrier Name</FormLabel>
                    <FormControl>
                      <Select value={isOtherCarrier ? "Other" : field.value || ""} onValueChange={(value) => {
                        if (value === "Other") {
                          setIsOtherCarrier(true);
                          // Don't change the field value immediately, let the user type first
                        } else {
                          setIsOtherCarrier(false);
                          setCustomCarrierName("");
                          field.onChange(value);
                        }
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select carrier..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DHL">DHL</SelectItem>
                          <SelectItem value="UPS">UPS</SelectItem>
                          <SelectItem value="FedEx">FedEx</SelectItem>
                          <SelectItem value="GLS">GLS</SelectItem>
                          <SelectItem value="Aramex">Aramex</SelectItem>
                          <SelectItem value="USPS">USPS</SelectItem>
                          <SelectItem value="Royal Mail">Royal Mail</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormDescription>
                      Select the carrier for this shipment or choose "Other" to enter a custom carrier name
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {isOtherCarrier && (
                <FormItem>
                  <FormLabel>Custom Carrier Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter custom carrier name..."
                      value={customCarrierName}
                      onChange={(e) => {
                        setCustomCarrierName(e.target.value);
                        trackingForm.setValue("carrierName", e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter the name of the shipping carrier
                  </FormDescription>
                </FormItem>
              )}
              
              <FormField
                control={trackingForm.control}
                name="trackingLink"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tracking Link (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://example.com/track?number=..."
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Enter the direct tracking URL where customers can track this shipment
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="flex flex-row justify-end gap-2">
                <Button variant="outline" onClick={() => setIsTrackingDialogOpen(false)} type="button">
                  Cancel
                </Button>
                <Button
                  variant="default"
                  type="submit"
                  disabled={addManualTrackingMutation.isPending}
                >
                  {addManualTrackingMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {selectedShipment?.carrierTrackingNumber ? "Update Tracking Number" : "Add Tracking Number"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Bulk Approve Confirmation Dialog */}
      <Dialog open={isBulkApproveDialogOpen} onOpenChange={setIsBulkApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Approve Shipments</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve {selectedShipmentIds.length} selected shipments? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkApproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmBulkApprove}
              disabled={bulkApproveMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {bulkApproveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Approve {selectedShipmentIds.length} Shipments
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Reject Confirmation Dialog */}
      <Dialog open={isBulkRejectDialogOpen} onOpenChange={setIsBulkRejectDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Bulk Reject Shipments</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting {selectedShipmentIds.length} selected shipments. This reason will be visible to all affected customers.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...rejectionForm}>
            <form onSubmit={rejectionForm.handleSubmit(confirmBulkReject)} className="space-y-4">
              <FormField
                control={rejectionForm.control}
                name="rejectionReason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rejection Reason</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter detailed reason for bulk rejection..."
                        className="resize-none"
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      This reason will be sent to all {selectedShipmentIds.length} customers.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsBulkRejectDialogOpen(false)} type="button">
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  type="submit"
                  disabled={bulkRejectMutation.isPending}
                >
                  {bulkRejectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Reject {selectedShipmentIds.length} Shipments
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Bulk Status Change Dialog */}
      <Dialog open={isBulkStatusChangeDialogOpen} onOpenChange={setIsBulkStatusChangeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Status for Selected Shipments</DialogTitle>
            <DialogDescription>
              Select a new status for {selectedShipmentIds.length} selected shipment(s).
            </DialogDescription>
          </DialogHeader>
          
          {(bulkApproveMutation.isPending) && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-6 my-4 shadow-lg">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                  <div className="absolute inset-0 h-8 w-8 rounded-full border-2 border-green-200 animate-pulse"></div>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-lg text-green-800">🎯 Processing Bulk Approval</p>
                  <p className="text-sm text-green-700 mt-1">⚡ Charging users and approving {selectedShipmentIds.length} shipments</p>
                  <p className="text-xs text-green-600 mt-2">💰 Balance deductions • 📧 Email notifications • 🏷️ Tracking numbers</p>
                </div>
              </div>
              <div className="mt-4 w-full bg-green-200 rounded-full h-2">
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full animate-pulse w-3/4"></div>
              </div>
            </div>
          )}
          
          {(bulkStatusChangeMutation.isPending) && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl p-6 my-4 shadow-lg">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <div className="absolute inset-0 h-8 w-8 rounded-full border-2 border-blue-200 animate-pulse"></div>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-lg text-blue-800">📝 Updating Status</p>
                  <p className="text-sm text-blue-700 mt-1">🔄 Changing status for {selectedShipmentIds.length} shipments to "{getStatusDisplayName(selectedNewStatus)}"</p>
                  <p className="text-xs text-blue-600 mt-2">⚡ Processing status updates in database</p>
                </div>
              </div>
              <div className="mt-4 w-full bg-blue-200 rounded-full h-2">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full animate-pulse w-2/3"></div>
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">New Status</label>
              <Select value={selectedNewStatus} onValueChange={setSelectedNewStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="pre_transit">Pre-Transit</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Bulk Refund Information Section */}
          {selectedNewStatus && shipments && (selectedNewStatus === ShipmentStatus.REJECTED || selectedNewStatus === ShipmentStatus.CANCELLED) && (() => {
            const selectedShipments = shipments.filter((shipment: Shipment) => 
              selectedShipmentIds.includes(shipment.id)
            );
            const refundInfo = calculateBulkRefunds(selectedShipments, selectedNewStatus);
            
            if (refundInfo.refundedShipmentCount > 0) {
              return (
                <div className="mt-4 p-4 bg-red-50 border-2 border-red-200 rounded-md">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <CreditCard className="h-5 w-5 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-red-900 mb-2">
                        💰 Bulk Refund Processing
                      </h4>
                      <p className="text-sm text-red-800 mb-3">
                        <strong>{refundInfo.refundedShipmentCount} out of {selectedShipmentIds.length} selected shipments</strong> have already been approved and charged. 
                        <strong className="text-red-900"> These shipments will be automatically refunded.</strong>
                      </p>
                      
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm bg-white bg-opacity-50 p-3 rounded border border-red-200">
                        <div className="font-medium text-red-800">Total Refund Amount:</div>
                        <div className="font-bold text-red-900 text-lg">{formatPrice(refundInfo.totalRefundAmount)}</div>
                        
                        <div className="font-medium text-red-800">Shipments to Refund:</div>
                        <div className="text-red-900">{refundInfo.refundedShipmentCount} shipments</div>
                        
                        <div className="font-medium text-red-800">Non-refundable:</div>
                        <div className="text-red-900">{selectedShipmentIds.length - refundInfo.refundedShipmentCount} shipments</div>
                      </div>
                      
                      <div className="mt-3 p-2 bg-red-100 border border-red-200 rounded text-xs text-red-800">
                        <span className="font-medium">Affected Shipments:</span> {refundInfo.refundedShipments
                          .map(s => `#${s.id}${s.trackingNumber ? ` (${s.trackingNumber})` : ''}`)
                          .join(', ')
                        }
                      </div>
                      
                      <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded text-xs text-red-800">
                        <span className="font-medium">Note:</span> Refunds will be automatically credited to users' account balances 
                        and email notifications will be sent to affected customers.
                      </div>
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })()}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkStatusChangeDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmBulkStatusChange}
              disabled={!selectedNewStatus || bulkStatusChangeMutation.isPending || bulkApproveMutation.isPending}
              className={selectedNewStatus === "approved" ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"}
            >
              {(bulkStatusChangeMutation.isPending || bulkApproveMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {bulkApproveMutation.isPending ? "Charging Users & Approving..." : 
               bulkStatusChangeMutation.isPending ? "Updating Status..." :
               selectedNewStatus === "approved" ? "Approve & Charge Users" : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

// Export the component with withAuth HOC
export default withAuth(AdminShipmentListContent);