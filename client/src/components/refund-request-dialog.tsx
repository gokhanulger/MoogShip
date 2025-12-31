import { useState, useMemo, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, DollarSign, Package, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatShipmentId } from "@/lib/shipment-utils";

// Custom translation object for bilingual support
const translations = {
  tr: {
    "Request Refund": "İade Talep Et",
    "Submit a refund request for unshipped packages with carrier tracking numbers.": "Kargo takip numarası olan gönderilmemiş paketler için iade talep edin.",
    "Available for Refund": "İade İçin Uygun",
    "Already Requested": "Zaten Talep Edildi",
    "Tracking": "Takip",
    "Already has refund request": "Zaten iade talebi var",
    "These shipments already have existing refund requests and cannot be requested again.": "Bu gönderilerin zaten mevcut iade talepleri var ve tekrar talep edilemez.",
    "Reason for Refund Request *": "İade Talebi Sebebi *",
    "Please explain why you're requesting a refund for these unshipped packages...": "Bu gönderilmemiş paketler için neden iade talep ettiğinizi açıklayın...",
    "Minimum 10 characters required": "En az 10 karakter gerekli",
    "Cancel": "İptal",
    "Submitting...": "Gönderiliyor...",
    "Submit Refund Request": "İade Talebi Gönder"
  },
  en: {
    "Request Refund": "Request Refund",
    "Submit a refund request for unshipped packages with carrier tracking numbers.": "Submit a refund request for unshipped packages with carrier tracking numbers.",
    "Available for Refund": "Available for Refund",
    "Already Requested": "Already Requested",
    "Tracking": "Tracking",
    "Already has refund request": "Already has refund request",
    "These shipments already have existing refund requests and cannot be requested again.": "These shipments already have existing refund requests and cannot be requested again.",
    "Reason for Refund Request *": "Reason for Refund Request *",
    "Please explain why you're requesting a refund for these unshipped packages...": "Please explain why you're requesting a refund for these unshipped packages...",
    "Minimum 10 characters required": "Minimum 10 characters required",
    "Cancel": "Cancel",
    "Submitting...": "Submitting...",
    "Submit Refund Request": "Submit Refund Request"
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

interface RefundRequestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedShipments: any[];
}

export function RefundRequestDialog({
  isOpen,
  onClose,
  selectedShipments
}: RefundRequestDialogProps) {
  const { t } = useTranslation();
  const { getText } = useCustomTranslation();
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  // Fetch existing refund requests to check for duplicates
  const { data: refundRequestsData, isLoading: isLoadingRefunds } = useQuery({
    queryKey: ['/api/refund-requests'],
    enabled: isOpen,
  });

  

  // Build set of shipment IDs that already have refund requests
  const existingRefundShipmentIds = useMemo(() => {
    const shipmentIds = new Set<number>();
    
    if (Array.isArray(refundRequestsData) && refundRequestsData.length > 0) {
      
      refundRequestsData.forEach((request: any) => {
        if (request.shipmentIds) {
          try {
            const ids = Array.isArray(request.shipmentIds) 
              ? request.shipmentIds 
              : JSON.parse(request.shipmentIds);
            
            ids.forEach((id: number) => shipmentIds.add(id));
          } catch (e) {
            console.error("DIALOG DEBUG - Error parsing shipment IDs:", e);
          }
        }
      });
    }
    
    
    return shipmentIds;
  }, [refundRequestsData]);

  // Separate shipments into available and already requested
  const { availableShipments, alreadyRequestedShipments } = useMemo(() => {
    if (isLoadingRefunds) return { availableShipments: [], alreadyRequestedShipments: [] };
    
   
    
    const available: any[] = [];
    const alreadyRequested: any[] = [];
    
    selectedShipments.forEach((shipment: any) => {
      const isExcluded = existingRefundShipmentIds.has(shipment.id);
      
      
      if (isExcluded) {
        alreadyRequested.push(shipment);
      } else {
        available.push(shipment);
      }
    });
    
    
    return { availableShipments: available, alreadyRequestedShipments: alreadyRequested };
  }, [selectedShipments, existingRefundShipmentIds, isLoadingRefunds]);

  const submitRefundRequest = useMutation({
    mutationFn: async (data: { shipmentIds: number[]; reason: string }) => {
      return apiRequest('POST', '/api/refund-requests', data);
    },
    onSuccess: () => {
      toast({
        title: "Refund Request Submitted",
        description: `Refund request for ${selectedShipments.length} shipment(s) has been submitted successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/refund-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shipments/my'] });
      onClose();
      setReason("");
    },
    onError: (error: any) => {
      toast({
        title: "Request Failed",
        description: error.message || "Failed to submit refund request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for the refund request.",
        variant: "destructive",
      });
      return;
    }

    if (availableShipments.length === 0) {
      toast({
        title: "No Available Shipments",
        description: "Please select at least one available shipment for refund.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await submitRefundRequest.mutateAsync({
        shipmentIds: availableShipments.map(s => s.id),
        reason: reason.trim(),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            {getText('Request Refund')}
          </DialogTitle>
          <DialogDescription>
            {getText('Submit a refund request for unshipped packages with carrier tracking numbers.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Available Shipments */}
          {availableShipments.length > 0 && (
            <div>
              <Label className="text-sm font-medium text-green-700">
                {getText('Available for Refund')} ({availableShipments.length})
              </Label>
              <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                {availableShipments.map((shipment: any) => (
                  <div
                    key={shipment.id}
                    className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Package className="h-4 w-4 text-green-600" />
                      <div>
                        <div className="font-medium text-sm">
                          {formatShipmentId(shipment.id)}
                        </div>
                        <div className="text-xs text-gray-600">
                          {shipment.receiverCity}, {shipment.receiverCountry}
                        </div>
                        <div className="text-xs text-gray-500">
                          {getText('Tracking')}: {shipment.trackingNumber}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-green-100 text-green-800">
                      {shipment.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Already Requested Shipments */}
          {alreadyRequestedShipments.length > 0 && (
            <div>
              <Label className="text-sm font-medium text-yellow-700">
                {getText('Already Requested')} ({alreadyRequestedShipments.length})
              </Label>
              <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                {alreadyRequestedShipments.map((shipment: any) => (
                  <div
                    key={shipment.id}
                    className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <div>
                        <div className="font-medium text-sm">
                          {formatShipmentId(shipment.id)}
                        </div>
                        <div className="text-xs text-gray-600">
                          {shipment.receiverCity}, {shipment.receiverCountry}
                        </div>
                        <div className="text-xs text-yellow-600">
                          {getText('Already has refund request')}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                      {shipment.status}
                    </Badge>
                  </div>
                ))}
              </div>
              <p className="text-xs text-yellow-600 mt-2">
                {getText('These shipments already have existing refund requests and cannot be requested again.')}
              </p>
            </div>
          )}

          {/* Reason Input */}
          {availableShipments.length > 0 && (
            <div>
              <Label htmlFor="reason" className="text-sm font-medium">
                {getText('Reason for Refund Request *')}
              </Label>
              <Textarea
                id="reason"
                placeholder={getText('Please explain why you\'re requesting a refund for these unshipped packages...')}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1"
                rows={4}
              />
              <p className="text-xs text-gray-500 mt-1">
                {getText('Minimum 10 characters required')}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-row justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            {getText('Cancel')}
          </Button>
          {availableShipments.length > 0 && (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !reason.trim() || reason.trim().length < 10}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {getText('Submitting...')}
                </>
              ) : (
                <>
                  <DollarSign className="mr-2 h-4 w-4" />
                  {getText('Submit Refund Request')} ({availableShipments.length})
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}