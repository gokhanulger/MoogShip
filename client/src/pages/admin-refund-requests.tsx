import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { RefundRequest, RefundRequestStatusColors } from "@shared/schema";
import { AlertCircle, Package, DollarSign, Clock, CheckCircle, XCircle, User, Calendar, FileText, ChevronDown, ChevronRight, Settings } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import Layout from "@/components/layout";

const processRefundSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  processedAmount: z.number().optional(),
  adminNotes: z.string().optional()
});

const trackingSchema = z.object({
  adminTrackingStatus: z.enum(['not_started', 'submitted_to_carrier', 'processing', 'completed', 'failed']),
  carrierRefundReference: z.string().optional(),
  submittedToCarrierAt: z.string().optional(),
  carrierResponseAt: z.string().optional(),
  expectedRefundDate: z.string().optional(),
  internalNotes: z.string().optional()
});

type ProcessRefundForm = z.infer<typeof processRefundSchema>;
type TrackingForm = z.infer<typeof trackingSchema>;

interface RefundRequestWithUser extends RefundRequest {
  user?: {
    id: number;
    name: string;
    email: string;
    username?: string;
    companyName?: string;
    companyType?: string;
    role?: string;
    balance?: number;
    isApproved?: boolean;
    isEmailVerified?: boolean;
    createdAt?: string;
  };
  shipmentDetails?: any[];
}

export default function AdminRefundRequestsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<RefundRequestWithUser | null>(null);
  const [isProcessDialogOpen, setIsProcessDialogOpen] = useState(false);
  const [isTrackingDialogOpen, setIsTrackingDialogOpen] = useState(false);
  const [expandedShipments, setExpandedShipments] = useState<Record<number, boolean>>({});
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const form = useForm<ProcessRefundForm>({
    resolver: zodResolver(processRefundSchema),
    defaultValues: {
      status: 'approved',
      processedAmount: undefined,
      adminNotes: ""
    }
  });

  const trackingForm = useForm<TrackingForm>({
    resolver: zodResolver(trackingSchema),
    defaultValues: {
      adminTrackingStatus: 'not_started',
      carrierRefundReference: "",
      submittedToCarrierAt: "",
      carrierResponseAt: "",
      expectedRefundDate: "",
      internalNotes: ""
    }
  });

  // Get all refund requests for admin with automatic refresh
  const { data: refundRequests = [], isLoading } = useQuery({
    queryKey: ['/api/refund-requests'],
    refetchInterval: 30000, // Refresh every 30 seconds
    refetchIntervalInBackground: true
  });

  // Get all shipments for admin to match with refund requests
  const { data: allShipments = [] } = useQuery({
    queryKey: ['/api/shipments/all']
  });

  // Helper function to get shipment details for a refund request
  const getShipmentDetails = (request: RefundRequestWithUser) => {
    const shipmentIds = JSON.parse(request.shipmentIds);
    return allShipments.filter((shipment: any) => shipmentIds.includes(shipment.id));
  };

  // Helper function to toggle expanded state
  const toggleExpanded = (requestId: number) => {
    setExpandedShipments(prev => ({
      ...prev,
      [requestId]: !prev[requestId]
    }));
  };

  // Process refund request mutation
  const processRefundMutation = useMutation({
    mutationFn: async (data: { id: number; status: string; processedAmount?: number; adminNotes?: string }) => {
      const response = await fetch(`/api/refund-requests/admin/${data.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: data.status,
          processedAmount: data.processedAmount,
          adminNotes: data.adminNotes
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to process refund request');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t("Refund request processed"),
        description: t("The refund request has been processed successfully.")
      });
      queryClient.invalidateQueries({ queryKey: ['/api/refund-requests'] });
      setIsProcessDialogOpen(false);
      setSelectedRequest(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: t("Error"),
        description: error.message || t("Failed to process refund request"),
        variant: "destructive"
      });
    }
  });

  // Update tracking status mutation
  const updateTrackingMutation = useMutation({
    mutationFn: async (data: { id: number } & TrackingForm) => {
      const response = await fetch(`/api/refund-requests/${data.id}/tracking`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminTrackingStatus: data.adminTrackingStatus,
          carrierRefundReference: data.carrierRefundReference,
          submittedToCarrierAt: data.submittedToCarrierAt,
          carrierResponseAt: data.carrierResponseAt,
          expectedRefundDate: data.expectedRefundDate,
          internalNotes: data.internalNotes
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update tracking');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Tracking updated",
        description: "Refund tracking status has been updated successfully."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/refund-requests'] });
      setIsTrackingDialogOpen(false);
      setSelectedRequest(null);
      trackingForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update tracking status",
        variant: "destructive"
      });
    }
  });

  const handleProcessRequest = (request: RefundRequestWithUser) => {
    setSelectedRequest(request);
    
    // Calculate actual refund amount based on shipment payment amounts
    const shipmentIds = JSON.parse(request.shipmentIds);
    let totalPaidAmount = 0;
    
    if (request.shipmentDetails && Array.isArray(request.shipmentDetails)) {
      totalPaidAmount = request.shipmentDetails.reduce((sum, shipment) => 
        sum + (shipment.totalPrice || 0), 0
      );
    } else {
      // Fallback: calculate from available shipment data if available
      const relatedShipments = allShipments?.filter((s: any) => 
        shipmentIds.includes(s.id)
      ) || [];
      totalPaidAmount = relatedShipments.reduce((sum: number, shipment: any) => 
        sum + (shipment.totalPrice || 0), 0
      );
    }
    
    // Set the calculated amount (convert from cents to dollars)
    form.setValue('processedAmount', totalPaidAmount / 100);
    setIsProcessDialogOpen(true);
  };

  const handleTrackingUpdate = (request: RefundRequestWithUser) => {
    setSelectedRequest(request);
    // Pre-populate form with existing tracking data
    trackingForm.setValue('adminTrackingStatus', request.adminTrackingStatus || 'not_started');
    trackingForm.setValue('carrierRefundReference', request.carrierRefundReference || '');
    trackingForm.setValue('submittedToCarrierAt', request.submittedToCarrierAt ? new Date(request.submittedToCarrierAt).toISOString().split('T')[0] : '');
    trackingForm.setValue('carrierResponseAt', request.carrierResponseAt ? new Date(request.carrierResponseAt).toISOString().split('T')[0] : '');
    trackingForm.setValue('expectedRefundDate', request.expectedRefundDate ? new Date(request.expectedRefundDate).toISOString().split('T')[0] : '');
    trackingForm.setValue('internalNotes', request.internalNotes || '');
    setIsTrackingDialogOpen(true);
  };

  const onSubmit = async (data: ProcessRefundForm) => {
    if (!selectedRequest) return;

    await processRefundMutation.mutateAsync({
      id: selectedRequest.id,
      status: data.status,
      processedAmount: data.processedAmount ? Math.round(data.processedAmount * 100) : undefined,
      adminNotes: data.adminNotes
    });
  };

  const onTrackingSubmit = async (data: TrackingForm) => {
    if (!selectedRequest) return;

    await updateTrackingMutation.mutateAsync({
      id: selectedRequest.id,
      ...data
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getTrackingStatusBadge = (status: string | null) => {
    const statusMap = {
      'not_started': { label: 'Not Started', color: 'bg-gray-100 text-gray-800' },
      'submitted_to_carrier': { label: 'Submitted', color: 'bg-blue-100 text-blue-800' },
      'processing': { label: 'Processing', color: 'bg-yellow-100 text-yellow-800' },
      'completed': { label: 'Completed', color: 'bg-green-100 text-green-800' },
      'failed': { label: 'Failed', color: 'bg-red-100 text-red-800' }
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap['not_started'];
    
    return (
      <Badge className={`${statusInfo.color} border-0`}>
        {statusInfo.label}
      </Badge>
    );
  };

  const getStatusCounts = () => {
    const pending = refundRequests.filter(r => r.status === 'pending').length;
    const approved = refundRequests.filter(r => r.status === 'approved').length;
    const rejected = refundRequests.filter(r => r.status === 'rejected').length;
    return { pending, approved, rejected };
  };

  const statusCounts = getStatusCounts();
  
  // Filter refund requests based on selected status
  const filteredRefundRequests = statusFilter === 'all' 
    ? refundRequests 
    : refundRequests.filter(r => r.status === statusFilter);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('common.adminRefundRequests')}</h1>
          <p className="text-gray-600 mt-2">
            {t('common.reviewProcessRefundRequests')}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={statusFilter} onValueChange={(value: 'all' | 'pending' | 'approved' | 'rejected') => setStatusFilter(value)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder={t('common.filterByStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              <SelectItem value="pending">{t('common.pending')}</SelectItem>
              <SelectItem value="approved">{t('common.approved')}</SelectItem>
              <SelectItem value="rejected">{t('common.rejected')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-lg mr-4">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{statusCounts.pending}</p>
              <p className="text-gray-600">{t("common.pendingRequests")}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mr-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{statusCounts.approved}</p>
              <p className="text-gray-600">{t("common.approved")}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-lg mr-4">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{statusCounts.rejected}</p>
              <p className="text-gray-600">{t("common.rejected")}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Refund Requests List */}
      {filteredRefundRequests.length > 0 ? (
        <div className="space-y-4">
          {filteredRefundRequests.map((request: RefundRequestWithUser) => {
            const shipmentIds = JSON.parse(request.shipmentIds);
            
            return (
              <Card key={request.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      {getStatusIcon(request.status)}
                      <span>{t("common.refundRequests")} #{request.id}</span>
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge className={RefundRequestStatusColors[request.status]}>
                        {t(`common.${request.status}`)}
                      </Badge>
                      {request.adminTrackingStatus && getTrackingStatusBadge(request.adminTrackingStatus)}
                      {request.status === 'pending' && (
                        <Button
                          onClick={() => handleProcessRequest(request)}
                          size="sm"
                        >
                          {t("common.processed")}
                        </Button>
                      )}
                      <Button
                        onClick={() => handleTrackingUpdate(request)}
                        size="sm"
                        variant="outline"
                      >
                        <Settings className="h-3 w-3 mr-1" />
                        {t("common.track")}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-600">{t("common.customer")}</p>
                        <div className="relative group">
                          <p className="font-semibold cursor-pointer">{request.user?.name || 'Unknown'}</p>
                          
                          {/* Hover tooltip with detailed user information */}
                          <div className="absolute left-0 top-6 invisible group-hover:visible bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-10 min-w-80">
                            <div className="space-y-3">
                              <div>
                                <p className="font-semibold text-gray-900">{request.user?.name || 'Unknown'}</p>
                                <p className="text-sm text-gray-500">{request.user?.email}</p>
                                <p className="text-xs text-gray-400">ID: {request.user?.id} | @{request.user?.username}</p>
                              </div>
                              
                              {(request.user?.companyName || request.user?.companyType) && (
                                <div>
                                  <p className="text-xs font-medium text-gray-600">Company Information</p>
                                  {request.user?.companyName && (
                                    <p className="text-sm text-gray-700">{request.user.companyName}</p>
                                  )}
                                  {request.user?.companyType && (
                                    <p className="text-xs text-gray-500">{request.user.companyType}</p>
                                  )}
                                </div>
                              )}
                              
                              <div className="flex items-center space-x-2">
                                {request.user?.isApproved && (
                                  <Badge variant="secondary" className="text-xs">Approved</Badge>
                                )}
                                {request.user?.isEmailVerified && (
                                  <Badge variant="outline" className="text-xs">Verified</Badge>
                                )}
                                {request.user?.role && (
                                  <Badge variant="default" className="text-xs capitalize">{request.user.role}</Badge>
                                )}
                              </div>
                              
                              {(request.user?.balance !== undefined || request.user?.createdAt) && (
                                <div className="text-xs text-gray-500 border-t pt-2">
                                  {request.user?.balance !== undefined && (
                                    <p>Account Balance: ${(request.user.balance / 100).toFixed(2)}</p>
                                  )}
                                  {request.user?.createdAt && (
                                    <p>Member since: {new Date(request.user.createdAt).toLocaleDateString()}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-600">{t("Requested Amount")}</p>
                        <p className="font-semibold text-lg">
                          ${(() => {
                            if (!allShipments || allShipments.length === 0) return '0.00';
                            const shipmentDetails = getShipmentDetails(request);
                            if (!shipmentDetails || shipmentDetails.length === 0) return '0.00';
                            const totalValue = shipmentDetails.reduce((sum: number, shipment: any) => {
                              // Use total_price field which is in cents, convert to dollars
                              const priceInCents = shipment.totalPrice || shipment.total_price || 0;
                              return sum + (priceInCents / 100);
                            }, 0);
                            return totalValue.toFixed(2);
                          })()}
                        </p>
                        {request.processedAmount && (
                          <p className="text-sm text-green-600">
                            {t("Processed")}: ${(request.processedAmount / 100).toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Package className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-600">{t("Shipments")}</p>
                        <p className="font-semibold">
                          {shipmentIds.length} {shipmentIds.length === 1 ? 'shipment' : 'shipments'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-600">{t("Date")}</p>
                        <p className="font-semibold">
                          {new Date(request.createdAt).toLocaleDateString()}
                        </p>
                        {request.processedAt && (
                          <p className="text-sm text-gray-500">
                            {t("Processed")}: {new Date(request.processedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600 mb-2 flex items-center">
                      <FileText className="h-4 w-4 mr-1" />
                      {t("Customer Reason")}
                    </p>
                    <p className="text-sm bg-gray-50 p-3 rounded">{request.reason}</p>
                  </div>
                  
                  {request.adminNotes && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">{t("Admin Notes")}</p>
                      <p className="text-sm bg-blue-50 p-3 rounded border border-blue-200">{request.adminNotes}</p>
                    </div>
                  )}

                  {/* Expandable Shipment Details */}
                  <Collapsible 
                    open={expandedShipments[request.id]} 
                    onOpenChange={() => toggleExpanded(request.id)}
                    className="border-t pt-4"
                  >
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                        <h4 className="font-semibold text-gray-900 flex items-center">
                          <Package className="h-4 w-4 mr-2" />
                          {t("Detailed Shipment Information")}
                        </h4>
                        {expandedShipments[request.id] ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-3">
                      {(() => {
                        const shipmentDetails = getShipmentDetails(request);
                        if (shipmentDetails.length === 0) {
                          return <p className="text-gray-500 italic">{t("No shipment details available")}</p>;
                        }
                        
                        return (
                          <div className="space-y-4">
                            {shipmentDetails.map((shipment: any) => (
                              <div key={shipment.id} className="bg-gray-50 border rounded-lg p-4">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                  {/* Basic Shipment Info */}
                                  <div>
                                    <h5 className="font-semibold text-gray-900 mb-3 border-b pb-2">
                                      Shipment #{shipment.id}
                                    </h5>
                                    <div className="space-y-2 text-sm">
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">Status:</span>
                                        <Badge variant="outline">{shipment.status}</Badge>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">Value:</span>
                                        <span className="font-medium">${(shipment.shipmentValue || 0).toFixed(2)}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">Weight:</span>
                                        <span>{shipment.weight || 'N/A'}kg</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">Dimensions:</span>
                                        <span>{shipment.length || 'N/A'}×{shipment.width || 'N/A'}×{shipment.height || 'N/A'} cm</span>
                                      </div>
                                      {shipment.carrierTrackingNumber && (
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">Tracking:</span>
                                          <span className="font-mono text-xs bg-gray-200 px-2 py-1 rounded">
                                            {shipment.carrierTrackingNumber}
                                          </span>
                                        </div>
                                      )}
                                      {shipment.createdAt && (
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">Created:</span>
                                          <span>{new Date(shipment.createdAt).toLocaleDateString()}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Recipient Information */}
                                  <div>
                                    <h6 className="font-semibold text-gray-900 mb-3 border-b pb-2">
                                      Recipient Details
                                    </h6>
                                    <div className="space-y-2 text-sm">
                                      <div>
                                        <span className="text-gray-600">Name:</span>
                                        <p className="font-medium">{shipment.receiverName || 'N/A'}</p>
                                      </div>
                                      <div>
                                        <span className="text-gray-600">Address:</span>
                                        <div className="mt-1">
                                          <p>{shipment.receiverAddress1 || 'N/A'}</p>
                                          {shipment.receiverAddress2 && <p>{shipment.receiverAddress2}</p>}
                                          <p>{shipment.receiverCity || 'N/A'}, {shipment.receiverState || 'N/A'} {shipment.receiverPostalCode || 'N/A'}</p>
                                          <p className="font-medium">{shipment.receiverCountry || 'N/A'}</p>
                                        </div>
                                      </div>
                                      {shipment.receiverPhone && (
                                        <div>
                                          <span className="text-gray-600">Phone:</span>
                                          <p>{shipment.receiverPhone}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Package Contents */}
                                  <div>
                                    <h6 className="font-semibold text-gray-900 mb-3 border-b pb-2">
                                      Package Contents
                                    </h6>
                                    <div className="space-y-2 text-sm">
                                      <div>
                                        <span className="text-gray-600">Description:</span>
                                        <p className="mt-1 bg-white p-2 rounded border">
                                          {shipment.packageDescription || 'No description available'}
                                        </p>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">Quantity:</span>
                                        <span>{shipment.packageQuantity || 'N/A'}</span>
                                      </div>
                                      {shipment.reference1 && (
                                        <div>
                                          <span className="text-gray-600">Reference:</span>
                                          <p className="font-mono text-xs">{shipment.reference1}</p>
                                        </div>
                                      )}
                                      {shipment.isAmazonShipment && (
                                        <div className="flex items-center">
                                          <Badge variant="secondary">Amazon Shipment</Badge>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </CollapsibleContent>
                  </Collapsible>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <DollarSign className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              {t("No Refund Requests")}
            </h3>
            <p className="text-gray-500 text-center max-w-md">
              {t("No refund requests have been submitted yet.")}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Process Refund Dialog */}
      <Dialog open={isProcessDialogOpen} onOpenChange={setIsProcessDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t("Process Refund Request")} #{selectedRequest?.id}
            </DialogTitle>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-2">{t("Request Details")}</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">{t("Customer")}:</span>
                    <span className="ml-2 font-medium">{selectedRequest.user?.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">{t("Company")}:</span>
                    <span className="ml-2 font-medium">{selectedRequest.user?.companyName || 'Individual'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">{t("Total Shipment Value")}:</span>
                    <span className="ml-2 font-medium">
                      ${(() => {
                        if (!allShipments || allShipments.length === 0) return '0.00';
                        const shipmentDetails = getShipmentDetails(selectedRequest);
                        if (!shipmentDetails || shipmentDetails.length === 0) return '0.00';
                        const totalValue = shipmentDetails.reduce((sum: number, shipment: any) => {
                          const priceInCents = shipment.totalPrice || shipment.total_price || 0;
                          return sum + (priceInCents / 100);
                        }, 0);
                        return totalValue.toFixed(2);
                      })()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">{t("Shipments")}:</span>
                    <div className="mt-2 space-y-2">
                      {(() => {
                        const shipmentDetails = getShipmentDetails(selectedRequest);
                        if (!shipmentDetails || shipmentDetails.length === 0) {
                          return <span className="text-sm text-gray-500 italic">No shipment details available</span>;
                        }
                        
                        return shipmentDetails.map((shipment: any, index: number) => (
                          <div key={shipment.id} className="bg-gray-50 p-3 rounded border text-sm">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="font-medium">Shipment #{shipment.id}</span>
                                <span className="ml-2 text-gray-600">• {shipment.status}</span>
                              </div>
                              <span className="font-medium text-blue-600">
                                ${(shipment.totalPrice ? shipment.totalPrice / 100 : shipment.total_price ? shipment.total_price / 100 : 0).toFixed(2)}
                              </span>
                            </div>
                            {shipment.carrierTrackingNumber && (
                              <div className="mt-1">
                                <span className="text-gray-600">Tracking: </span>
                                <span className="font-mono text-xs bg-blue-100 px-2 py-1 rounded text-blue-800">
                                  {shipment.carrierTrackingNumber}
                                </span>
                              </div>
                            )}
                            <div className="mt-1">
                              <span className="text-gray-600">To: </span>
                              <span className="text-sm">{shipment.receiverName || 'N/A'} • {shipment.receiverCity || 'N/A'}, {shipment.receiverCountry || 'N/A'}</span>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-gray-600">{t("Reason")}:</span>
                  <p className="mt-1 text-sm">{selectedRequest.reason}</p>
                </div>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("Decision")}</FormLabel>
                        <FormControl>
                          <div className="flex space-x-4">
                            <label className="flex items-center space-x-2">
                              <input
                                type="radio"
                                value="approved"
                                checked={field.value === 'approved'}
                                onChange={() => field.onChange('approved')}
                                className="text-green-600"
                              />
                              <span className="text-green-600 font-medium">{t("Approve")}</span>
                            </label>
                            <label className="flex items-center space-x-2">
                              <input
                                type="radio"
                                value="rejected"
                                checked={field.value === 'rejected'}
                                onChange={() => field.onChange('rejected')}
                                className="text-red-600"
                              />
                              <span className="text-red-600 font-medium">{t("Reject")}</span>
                            </label>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {form.watch('status') === 'approved' && (
                    <FormField
                      control={form.control}
                      name="processedAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("Refund Amount")} ($)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="adminNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("Admin Notes")} ({t("Optional")})</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={t("Add any notes for the customer...")}
                            className="min-h-[80px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsProcessDialogOpen(false)}
                    >
                      {t("Cancel")}
                    </Button>
                    <Button
                      type="submit"
                      disabled={processRefundMutation.isPending}
                      className={form.watch('status') === 'approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                    >
                      {processRefundMutation.isPending 
                        ? t("Processing...") 
                        : form.watch('status') === 'approved' 
                          ? t("Approve Refund") 
                          : t("Reject Request")
                      }
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Admin Tracking Dialog */}
      <Dialog open={isTrackingDialogOpen} onOpenChange={setIsTrackingDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t("Admin Tracking")} - Request #{selectedRequest?.id}
            </DialogTitle>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-2">{t("Current Status")}</h4>
                <div className="flex items-center space-x-3">
                  <Badge className={RefundRequestStatusColors[selectedRequest.status]}>
                    {t(selectedRequest.status)}
                  </Badge>
                  {selectedRequest.adminTrackingStatus && getTrackingStatusBadge(selectedRequest.adminTrackingStatus)}
                </div>
              </div>

              <Form {...trackingForm}>
                <form onSubmit={trackingForm.handleSubmit(onTrackingSubmit)} className="space-y-4">
                  <FormField
                    control={trackingForm.control}
                    name="adminTrackingStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("Admin Tracking Status")}</FormLabel>
                        <FormControl>
                          <select {...field} className="w-full p-2 border rounded-md">
                            <option value="not_started">{t("Not Started")}</option>
                            <option value="submitted_to_carrier">{t("Submitted to Carrier")}</option>
                            <option value="processing">{t("Processing")}</option>
                            <option value="completed">{t("Completed")}</option>
                            <option value="failed">{t("Failed")}</option>
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={trackingForm.control}
                    name="carrierRefundReference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("Carrier Refund Reference")}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t("Enter carrier reference number...")}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={trackingForm.control}
                      name="submittedToCarrierAt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("Submitted to Carrier Date")}</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={trackingForm.control}
                      name="carrierResponseAt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("Carrier Response Date")}</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={trackingForm.control}
                      name="expectedRefundDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("Expected Refund Date")}</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={trackingForm.control}
                    name="internalNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("Internal Notes")}</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={t("Add internal tracking notes (not visible to customer)...")}
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsTrackingDialogOpen(false)}
                    >
                      {t("Cancel")}
                    </Button>
                    <Button
                      type="submit"
                      disabled={updateTrackingMutation.isPending}
                    >
                      {updateTrackingMutation.isPending 
                        ? t("Updating...") 
                        : t("Update Tracking")
                      }
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </Layout>
  );
}