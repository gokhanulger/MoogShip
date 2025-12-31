import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Package, DollarSign, Clock, CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronUp, Eye } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import Layout from "@/components/layout";
import { RefundRequest, Shipment } from "@shared/schema";
import { insertRefundRequestSchema } from "@shared/schema";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";

// Custom translation object for bilingual support
const translations = {
  tr: {
    "Refund Requests": "İade Talepleri",
    "Request refunds for undelivered packages with tracking numbers": "Kargo takip numarası olan gönderilmemiş paketler için iade talep edin",
    "Your Refund Requests": "İade Talepleriniz",
    "No Refund Requests": "İade Talebi Yok", 
    "You haven't submitted any refund requests yet.": "Henüz hiç iade talebi göndermemisiniz.",
    "Refund Request": "İade Talebi",
    "Total Amount": "Toplam Tutar",
    "Shipments": "Gönderiler",
    "Date": "Tarih",
    "Destination Country": "Varış Ülkesi",
    "Tracking Numbers": "Takip Numaraları",
    "Loading...": "Yükleniyor...",
    "pending": "beklemede",
    "approved": "onaylandı", 
    "rejected": "reddedildi",
    "cancelled": "iptal edildi",
    "in_transit": "yolda",
    "delivered": "teslim edildi",
    "temporary": "geçici",
    "Detailed Shipment Information": "Detaylı Gönderi Bilgileri",
    "Shipment": "Gönderi",
    "From": "Gönderen",
    "Package Contents": "Paket İçeriği",
    "Tracking Number": "Takip Numarası",
    "To": "Alan",
    "Service": "Hizmet",
    "Value": "Tutar",
    "Reason": "Sebep",
    "Admin Response": "Admin Yanıtı",
    "Processing Information": "İşlem Bilgileri",
    "Processed by": "İşleyen",
    "Processed on": "İşlem Tarihi",
    "approved refunds": "onaylanan iadeler",
    "Total Refund Requests": "Toplam İade Talepleri",
    "Total Refunded": "Toplam İade Edilen",
    "Active Refund Request": "Aktif İade Talebi",
    "You can only have one shipping fee refund request at a time. Please wait for your current request to be processed.": "Aynı anda yalnızca bir nakliye ücreti iade talebiniz olabilir. Mevcut talebinizin işleme alınmasını bekleyin.",
    "Available for Refund": "İade İçin Uygun",
    "Already Requested": "Zaten Talep Edildi",
    "These shipments already have pending refund requests": "Bu gönderilerin zaten bekleyen iade talepleri var"
  },
  en: {
    "Your Refund Requests": "Your Refund Requests",
    "No Refund Requests": "No Refund Requests",
    "You haven't submitted any refund requests yet.": "You haven't submitted any refund requests yet.",
    "Refund Request": "Refund Request",
    "Total Amount": "Total Amount",
    "Shipments": "Shipments", 
    "Date": "Date",
    "Destination Country": "Destination Country",
    "Tracking Numbers": "Tracking Numbers",
    "Loading...": "Loading...",
    "pending": "pending",
    "approved": "approved",
    "rejected": "rejected", 
    "cancelled": "cancelled",
    "in_transit": "in transit",
    "delivered": "delivered",
    "temporary": "temporary",
    "Detailed Shipment Information": "Detailed Shipment Information",
    "Shipment": "Shipment",
    "From": "From",
    "Package Contents": "Package Contents",
    "Tracking Number": "Tracking Number",
    "To": "To",
    "Service": "Service",
    "Value": "Value",
    "Reason": "Reason",
    "Admin Response": "Admin Response", 
    "Processing Information": "Processing Information",
    "Processed by": "Processed by",
    "Processed on": "Processed on",
    "approved refunds": "approved refunds",
    "Total Refund Requests": "Total Refund Requests",
    "Total Refunded": "Total Refunded",
    "Active Refund Request": "Active Refund Request",
    "You can only have one shipping fee refund request at a time. Please wait for your current request to be processed.": "You can only have one shipping fee refund request at a time. Please wait for your current request to be processed.",
    "Available for Refund": "Available for Refund",
    "Already Requested": "Already Requested",
    "These shipments already have pending refund requests": "These shipments already have pending refund requests",
    "Status": "Status"
  }
};

// Define separate object for main translations to avoid conflicts
const mainTranslations = {
  tr: {
    "Refund Requests": "Refund Requests",
    "Request refunds for undelivered packages with tracking numbers": "Request refunds for undelivered packages with tracking numbers",
    "Your Refund Requests": "Your Refund Requests",
    "No Refund Requests": "No Refund Requests", 
    "You haven't submitted any refund requests yet.": "You haven't submitted any refund requests yet.",
    "Refund Request": "Refund Request",
    "Total Amount": "Total Amount",
    "Shipments": "Shipments",
    "Date": "Date",
    "Destination Country": "Destination Country",
    "Tracking Numbers": "Tracking Numbers",
    "Loading...": "Loading...",
    "Status": "Status",
    "Reason": "Reason",
    "Admin Response": "Admin Response", 
    "Processing Information": "Processing Information",
    "Processed by": "Processed by",
    "Processed on": "Processed on"
  }
};

// Custom translation hook that detects current language
const useCustomTranslation = () => {
  const { i18n } = useTranslation();
  const [currentLang, setCurrentLang] = useState(i18n.language || 'tr');
  
  useEffect(() => {
    const handleLanguageChange = () => {
      setCurrentLang(i18n.language || 'tr');
    };
    
    i18n.on('languageChanged', handleLanguageChange);
    return () => i18n.off('languageChanged', handleLanguageChange);
  }, [i18n]);
  
  const getText = (key: string) => {
    const lang = currentLang.startsWith('en') ? 'en' : 'tr';
    return translations[lang][key as keyof typeof translations['en']] || key;
  };
  
  return { getText, currentLang };
};

type RefundRequestForm = z.infer<typeof refundRequestSchema>;

const refundRequestSchema = insertRefundRequestSchema.pick({
  reason: true
}).extend({
  shipmentIds: z.array(z.number()).min(1, "Please select at least one shipment")
});

// Component to fetch and display shipment details for a refund request
const RefundRequestCard = ({ request }: { request: RefundRequest }) => {
  const { t } = useTranslation();
  const { getText } = useCustomTranslation();
  const [requestShipments, setRequestShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const fetchShipments = async () => {
      try {
        const shipmentIds = JSON.parse(request.shipmentIds);
        console.log('RefundRequestCard: Fetching shipments for IDs:', shipmentIds);
        
        const response = await fetch('/api/refund-requests/shipments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ shipmentIds })
        });
        
        console.log('RefundRequestCard: Response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('RefundRequestCard: API error:', response.status, errorText);
          throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        console.log('RefundRequestCard: Received shipment data:', data);
        setRequestShipments(data);
      } catch (error) {
        console.error('RefundRequestCard: Error fetching shipment details:', error);
        setRequestShipments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchShipments();
  }, [request.shipmentIds]);

  const shipmentIds = JSON.parse(request.shipmentIds);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const RefundRequestStatusColors = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    approved: "bg-green-100 text-green-800 border-green-200",
    rejected: "bg-red-100 text-red-800 border-red-200"
  };

  const ShipmentStatusColors = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    approved: "bg-green-100 text-green-800 border-green-200",
    rejected: "bg-red-100 text-red-800 border-red-200",
    cancelled: "bg-gray-100 text-gray-800 border-gray-200",
    in_transit: "bg-blue-100 text-blue-800 border-blue-200",
    delivered: "bg-green-100 text-green-800 border-green-200",
    temporary: "bg-purple-100 text-purple-800 border-purple-200"
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              {getStatusIcon(request.status)}
              <span>{getText('Refund Request')} #{request.id}</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Badge className={RefundRequestStatusColors[request.status as keyof typeof RefundRequestStatusColors]}>
                {getText(request.status)}
              </Badge>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
          
          {/* Summary Section - Always Visible */}
          <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <div>
                  <span className="font-medium text-gray-700">{getText('Total Amount')}:</span>
                  <span className="ml-1 font-semibold text-green-600">
                    {!loading && requestShipments.length > 0 ? (
                      `$${(requestShipments.reduce((sum, s) => sum + (s.totalPrice || 0), 0) / 100).toFixed(2)}`
                    ) : (
                      getText('Loading...')
                    )}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Package className="h-4 w-4 text-blue-600" />
                <div>
                  <span className="font-medium text-gray-700">{getText('Shipments')}:</span>
                  <span className="ml-1 font-semibold text-blue-600">
                    {shipmentIds.length}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-600" />
                <div>
                  <span className="font-medium text-gray-700">{getText('Date')}:</span>
                  <span className="ml-1 text-gray-600">
                    {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Additional Summary Information */}
            {!loading && requestShipments.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">{getText('Destination Country')}:</span>
                    <span className="ml-2 text-gray-600">
                      {Array.from(new Set(requestShipments.map(s => s.receiverCountry))).join(', ')}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">{getText('Tracking Numbers')}:</span>
                    <div className="ml-2 text-gray-600">
                      {requestShipments.map((s, index) => (
                        <span key={s.id}>
                          {s.carrierTrackingNumber ? (
                            <span className="font-mono text-blue-600">{s.carrierTrackingNumber}</span>
                          ) : (
                            <span className="text-gray-400">#{s.trackingNumber || s.id}</span>
                          )}
                          {index < requestShipments.length - 1 && ', '}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Detailed Shipment Information */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">
                Detaylı Gönderi Bilgileri
              </h4>
              <div className="space-y-4">
                {requestShipments.map((shipment, index) => (
                  <div key={shipment.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-medium text-gray-900">
                        Gönderi #{index + 1} (ID: {shipment.id})
                      </h5>
                      <Badge className={ShipmentStatusColors[shipment.status as keyof typeof ShipmentStatusColors]}>
                        {shipment.status === 'pending' ? 'beklemede' : 
                         shipment.status === 'approved' ? 'onaylandı' : 
                         shipment.status === 'rejected' ? 'reddedildi' :
                         shipment.status === 'cancelled' ? 'iptal edildi' :
                         shipment.status === 'in_transit' ? 'yolda' :
                         shipment.status === 'delivered' ? 'teslim edildi' :
                         shipment.status === 'temporary' ? 'geçici' : shipment.status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <div>
                          <span className="font-medium text-gray-700">Gönderen:</span>
                          <div className="text-gray-600">
                            {shipment.senderName}<br />
                            {shipment.senderAddress1}<br />
                            {shipment.senderCity}, {shipment.senderPostalCode}
                          </div>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Paket İçeriği:</span>
                          <div className="text-gray-600">{shipment.packageContents}</div>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Takip Numarası:</span>
                          <div className="text-gray-600">
                            {shipment.carrierTrackingNumber ? (
                              <span className="font-mono text-blue-600">{shipment.carrierTrackingNumber}</span>
                            ) : (
                              <span className="text-gray-400">#{shipment.trackingNumber || shipment.id}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div>
                          <span className="font-medium text-gray-700">Alan:</span>
                          <div className="text-gray-600">
                            {shipment.receiverName}<br />
                            {shipment.receiverAddress}<br />
                            {shipment.receiverCity}, {shipment.receiverPostalCode}<br />
                            {shipment.receiverCountry}
                          </div>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Hizmet:</span>
                          <div className="text-gray-600">{shipment.carrierName || 'N/A'}</div>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Tutar:</span>
                          <div className="text-gray-600 font-semibold text-green-600">
                            ${((shipment.totalPrice || 0) / 100).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Reason */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Sebep</h4>
              <div className="bg-gray-50 border border-gray-200 rounded p-3 text-sm text-gray-700">
                {request.reason}
              </div>
            </div>

            {/* Additional Details for Rejected Requests */}
            {request.status === 'rejected' && request.adminResponse && (
              <div>
                <h4 className="font-semibold text-red-900 mb-2">Admin Yanıtı</h4>
                <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
                  {request.adminResponse}
                </div>
              </div>
            )}

            {/* Processing Information */}
            {(request.processedAt || request.processedBy) && (
              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-900 mb-2">İşlem Bilgileri</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  {request.processedBy && (
                    <p>İşleyen: Admin #{request.processedBy}</p>
                  )}
                  {request.processedAt && (
                    <p>İşlem Tarihi: {new Date(request.processedAt).toLocaleString()}</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export default function RefundRequestsPage() {
  const { t } = useTranslation();
  const { getText } = useCustomTranslation();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedShipments, setSelectedShipments] = useState<number[]>([]);

  const form = useForm<RefundRequestForm>({
    resolver: zodResolver(refundRequestSchema),
    defaultValues: {
      reason: "",
      shipmentIds: []
    }
  });

  const { data: shipments = [], isLoading: shipmentsLoading } = useQuery({
    queryKey: ['/api/shipments'],
  });

  const { data: refundRequests = [], isLoading: refundRequestsLoading } = useQuery({
    queryKey: ['/api/refund-requests'],
    staleTime: 0, // Always fetch fresh data
    cacheTime: 0, // Don't cache
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });

  const isLoading = shipmentsLoading || refundRequestsLoading;

  // Calculate comprehensive statistics
  const allShipments = shipments as any[];
  const allRefundRequests = refundRequests as any[];
  
  const stats = {
    // Shipment statistics
    totalShipments: allShipments.length,
    pendingShipments: allShipments.filter(s => s.status === 'pending').length,
    approvedShipments: allShipments.filter(s => s.status === 'approved').length,
    inTransitShipments: allShipments.filter(s => s.status === 'in_transit').length,
    deliveredShipments: allShipments.filter(s => s.status === 'delivered').length,
    
    // Value statistics
    totalShipmentValue: allShipments.reduce((sum, s) => sum + (s.totalPrice || 0), 0),
    pendingValue: allShipments.filter(s => s.status === 'pending').reduce((sum, s) => sum + (s.totalPrice || 0), 0),
    approvedValue: allShipments.filter(s => s.status === 'approved').reduce((sum, s) => sum + (s.totalPrice || 0), 0),
    deliveredValue: allShipments.filter(s => s.status === 'delivered').reduce((sum, s) => sum + (s.totalPrice || 0), 0),
    
    // Refund statistics
    totalRefundRequests: allRefundRequests.length,
    pendingRefunds: allRefundRequests.filter(r => r.status === 'pending').length,
    approvedRefunds: allRefundRequests.filter(r => r.status === 'approved').length,
    rejectedRefunds: allRefundRequests.filter(r => r.status === 'rejected').length,
    totalRefundedValue: 0, // Will be calculated below
  };

  // Calculate total refunded amount from approved refund requests
  const approvedRefunds = allRefundRequests.filter(r => r.status === 'approved');
  const totalRefundedValue = approvedRefunds.reduce((sum, refund) => {
    return sum + (refund.processedAmount || 0);
  }, 0);
  
  // Add to stats object
  (stats as any).totalRefundedValue = totalRefundedValue;

  const createRefundMutation = useMutation({
    mutationFn: async (data: RefundRequestForm) => {
      return apiRequest('/api/refund-requests', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/refund-requests'] });
      setIsCreateDialogOpen(false);
      form.reset();
      setSelectedShipments([]);
      toast({
        title: t("Success"),
        description: t("Refund request submitted successfully"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("Error"),
        description: error.message || t("Failed to submit refund request"),
        variant: "destructive"
      });
    }
  });

  // Only process filtering when data is loaded
  const eligibleShipments = isLoading ? [] : shipments.filter((shipment: any) => 
    (shipment.status === 'approved' || shipment.status === 'in_transit' || shipment.status === 'cancelled') &&
    shipment.carrierTrackingNumber
  );

  // Get shipment IDs that are already included in active (pending/approved) refund requests
  const existingRefundShipmentIds = new Set();
  if (!isLoading && refundRequests.length > 0) {
    console.log("Debug - Processing refund requests:", refundRequests);
    refundRequests.forEach((request: any) => {
      console.log("Debug - Request status:", request.status, "shipmentIds:", request.shipmentIds);
      // Only consider pending or approved refund requests
      if (request.status === 'pending' || request.status === 'approved') {
        try {
          const shipmentIds = JSON.parse(request.shipmentIds);
          console.log("Debug - Adding shipment IDs to exclusion set:", shipmentIds);
          shipmentIds.forEach((id: number) => existingRefundShipmentIds.add(id));
        } catch (e) {
          console.error("Error parsing shipment IDs from refund request:", e);
        }
      }
    });
  }
  
  console.log("MAIN DEBUG - Final exclusion set:", Array.from(existingRefundShipmentIds));
  console.log("MAIN DEBUG - isLoading:", isLoading);
  console.log("MAIN DEBUG - eligibleShipments count:", eligibleShipments.length);
  console.log("MAIN DEBUG - availableShipments will be computed now...");

  // Separate shipments into available and already requested
  const { availableShipments, alreadyRequestedShipments } = useMemo(() => {
    if (isLoading) return { availableShipments: [], alreadyRequestedShipments: [] };
    
    console.log("FILTERING DEBUG - Starting filter process");
    console.log("FILTERING DEBUG - eligibleShipments count:", eligibleShipments.length);
    console.log("FILTERING DEBUG - eligibleShipments IDs:", eligibleShipments.map((s: any) => s.id));
    console.log("FILTERING DEBUG - exclusion set:", Array.from(existingRefundShipmentIds));
    
    const available: any[] = [];
    const alreadyRequested: any[] = [];
    
    eligibleShipments.forEach((shipment: any) => {
      const isExcluded = existingRefundShipmentIds.has(shipment.id);
      console.log(`FILTERING DEBUG - Shipment ${shipment.id}: excluded=${isExcluded}`);
      
      if (isExcluded) {
        alreadyRequested.push(shipment);
      } else {
        available.push(shipment);
      }
    });
    
    console.log("FILTERING DEBUG - Available count:", available.length);
    console.log("FILTERING DEBUG - Available IDs:", available.map((s: any) => s.id));
    console.log("FILTERING DEBUG - Already requested count:", alreadyRequested.length);
    console.log("FILTERING DEBUG - Already requested IDs:", alreadyRequested.map((s: any) => s.id));
    
    return { availableShipments: available, alreadyRequestedShipments: alreadyRequested };
  }, [isLoading, eligibleShipments, existingRefundShipmentIds]);

  const handleShipmentToggle = (shipmentId: number, checked: boolean) => {
    if (checked) {
      setSelectedShipments(prev => [...prev, shipmentId]);
    } else {
      setSelectedShipments(prev => prev.filter(id => id !== shipmentId));
    }
  };

  const totalRefundAmount = selectedShipments.reduce((total, id) => {
    const shipment = eligibleShipments.find((s: any) => s.id === id);
    return total + (shipment?.totalPrice || 0);
  }, 0);

  const onSubmit = async (data: RefundRequestForm) => {
    const submitData = {
      ...data,
      shipmentIds: selectedShipments,
      requestedAmount: totalRefundAmount
    };
    createRefundMutation.mutate(submitData);
  };

  const RefundRequestStatusColors = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    approved: "bg-green-100 text-green-800 border-green-200",
    rejected: "bg-red-100 text-red-800 border-red-200"
  };

  const ShipmentStatusColors = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    approved: "bg-green-100 text-green-800 border-green-200",
    rejected: "bg-red-100 text-red-800 border-red-200",
    cancelled: "bg-gray-100 text-gray-800 border-gray-200",
    in_transit: "bg-blue-100 text-blue-800 border-blue-200",
    delivered: "bg-green-100 text-green-800 border-green-200",
    temporary: "bg-purple-100 text-purple-800 border-purple-200"
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <Layout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{getText("Refund Requests")}</h1>
            <p className="text-muted-foreground">
              {getText("Request refunds for undelivered packages with tracking numbers")}
            </p>
          </div>
          {!isLoading && availableShipments.length > 0 && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <DollarSign className="mr-2 h-4 w-4" />
                  {t("requestRefund")}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{t("Create Refund Request")}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">{t("Select Shipments")}</h3>
                      
                      {/* Available Shipments Section */}
                      {availableShipments.length > 0 && (
                        <div className="mb-6">
                          <div className="space-y-3 max-h-64 overflow-y-auto border border-green-200 bg-green-50 rounded-lg p-4">
                            <p className="text-sm font-medium text-green-700 mb-2">
                              {t("Available for Refund")} ({availableShipments.length})
                            </p>

                            {availableShipments.map((shipment: any) => (
                              <div key={shipment.id} className="flex items-start space-x-3 p-3 border border-green-300 bg-white rounded-lg">
                                <Checkbox
                                  checked={selectedShipments.includes(shipment.id)}
                                  onCheckedChange={(checked) => handleShipmentToggle(shipment.id, checked)}
                                />
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium">
                                      {t("Shipment")} #{shipment.id}
                                    </span>
                                    <Badge className={ShipmentStatusColors[shipment.status as keyof typeof ShipmentStatusColors]}>
                                      {t(shipment.status)}
                                    </Badge>
                                  </div>
                                  <div className="text-sm text-gray-600 space-y-1">
                                    <div>
                                      <strong>{t("Tracking")}:</strong> {shipment.carrierTrackingNumber}
                                    </div>
                                    <div>
                                      <strong>{t("To")}:</strong> {shipment.receiverCity}, {shipment.receiverCountry}
                                    </div>
                                    <div>
                                      <strong>{t("Value")}:</strong> ${((shipment.totalPrice || 0) / 100).toFixed(2)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Already Requested Shipments Section */}
                      {alreadyRequestedShipments.length > 0 && (
                        <div className="mb-6">
                          <div className="space-y-3 max-h-40 overflow-y-auto border border-yellow-200 bg-yellow-50 rounded-lg p-4">
                            <p className="text-sm font-medium text-yellow-700 mb-2">
                              {t("Already Requested")} ({alreadyRequestedShipments.length})
                            </p>
                            <p className="text-xs text-yellow-600 mb-2">
                              {t("These shipments already have pending refund requests")}
                            </p>

                            {alreadyRequestedShipments.map((shipment: any) => (
                              <div key={shipment.id} className="flex items-start space-x-3 p-3 border border-yellow-300 bg-yellow-100 rounded-lg opacity-75">
                                <div className="flex items-center gap-3">
                                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="font-medium">
                                        {t("Shipment")} #{shipment.id}
                                      </span>
                                      <Badge variant="outline" className="bg-yellow-200 text-yellow-800">
                                        {t("Already Requested")}
                                      </Badge>
                                    </div>
                                    <div className="text-sm text-gray-600 space-y-1">
                                      <div>
                                        <strong>{t("Tracking")}:</strong> {shipment.carrierTrackingNumber}
                                      </div>
                                      <div>
                                        <strong>{t("To")}:</strong> {shipment.receiverCity}, {shipment.receiverCountry}
                                      </div>
                                      <div>
                                        <strong>{t("Value")}:</strong> ${((shipment.totalPrice || 0) / 100).toFixed(2)}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {selectedShipments.length > 0 && (
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">
                              {t("Selected")}: {selectedShipments.length} {t("shipments")}
                            </span>
                            <span className="font-bold text-lg">
                              {t("Total")}: ${(totalRefundAmount / 100).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <FormField
                      control={form.control}
                      name="reason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("Reason for Refund Request")}</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder={t("Please explain why you are requesting a refund for these shipments...")}
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
                        onClick={() => setIsCreateDialogOpen(false)}
                      >
                        {t("Cancel")}
                      </Button>
                      <Button
                        type="submit"
                        disabled={createRefundMutation.isPending || selectedShipments.length === 0}
                      >
                        {createRefundMutation.isPending ? t("Submitting...") : t("Submit Request")}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Statistics Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
          {/* Refund Overview */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">{t("Refund Overview")}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-purple-600">{t("Total Refund Requests")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">{stats.totalRefundRequests}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {stats.pendingRefunds} {getText("pending")}, {stats.approvedRefunds} {getText("approved")}, {stats.rejectedRefunds} {getText("rejected")}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-green-600">{t("Total Refunded")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    ${((stats as any).totalRefundedValue / 100).toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {stats.approvedRefunds} {t("approved refunds")}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>



        {refundRequests.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">{getText('Your Refund Requests')}</h2>
            {refundRequests.map((request: RefundRequest) => (
              <RefundRequestCard key={request.id} request={request} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <DollarSign className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                {getText('No Refund Requests')}
              </h3>
              <p className="text-gray-500 text-center max-w-md">
                {getText('You haven\'t submitted any refund requests yet.')}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}