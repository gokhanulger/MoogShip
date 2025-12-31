import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { RefundRequest, Shipment, RefundRequestStatusColors, ShipmentStatusColors } from "@shared/schema";
import { AlertCircle, Package, DollarSign, Clock, CheckCircle, XCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import Layout from "@/components/layout";

const refundRequestSchema = z.object({
  reason: z.string().min(10, "Please provide a detailed reason (at least 10 characters)"),
  selectedShipments: z.array(z.number()).min(1, "Please select at least one shipment")
});

type RefundRequestForm = z.infer<typeof refundRequestSchema>;

interface RefundRequestWithShipments extends RefundRequest {
  shipmentDetails?: Shipment[];
}

// Component to fetch and display shipment details for a refund request
const RefundRequestCard = ({ request }: { request: RefundRequest }) => {
  const { t } = useTranslation();
  const [requestShipments, setRequestShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);

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

        if (response.ok) {
          const data = await response.json();
          console.log('RefundRequestCard: Received shipment data:', data);
          setRequestShipments(data);
        } else {
          const errorText = await response.text();
          console.log('RefundRequestCard: API error:', response.status, errorText);
          console.log('RefundRequestCard: Error fetching shipment details:', {});
        }
      } catch (error) {
        console.log('RefundRequestCard: Error fetching shipment details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchShipments();
  }, [request.shipmentIds]);

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

  return (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getStatusIcon(request.status)}
            <CardTitle className="text-lg">
              {t("refundRequests")} #{request.id}
            </CardTitle>
            <Badge className={RefundRequestStatusColors[request.status as keyof typeof RefundRequestStatusColors]}>
              {t(request.status)}
            </Badge>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold text-green-600">
              ${((request.requestedAmount || 0) / 100).toFixed(2)}
            </div>
            <div className="text-sm text-gray-500">
              {t("requestedAmount")}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Request Details */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">
              {t("common.reason")}
            </h4>
            <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
              {request.reason}
            </p>
          </div>

          {/* Processing Information */}
          {request.status !== 'pending' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h4 className="font-semibold text-blue-900 mb-2">
                {t("Processing Information")}
              </h4>
              {request.processedBy && (
                <p className="text-sm text-blue-700">
                  <strong>{t("Processed by")}:</strong> {request.processedBy}
                </p>
              )}
              {request.processedAt && (
                <p className="text-sm text-blue-700">
                  <strong>{t("Processed on")}:</strong> {new Date(request.processedAt).toLocaleString()}
                </p>
              )}
              {request.adminNotes && (
                <p className="text-sm text-red-700 mt-2">
                  <strong>{t("common.reason")}:</strong> {request.adminNotes}
                </p>
              )}
            </div>
          )}

          {/* Detailed Shipment Information */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">
              {t("common.detailedShipmentInformation")}
            </h4>
            {loading ? (
              <div className="text-sm text-gray-500">{t("common.loading")}</div>
            ) : requestShipments.length === 0 ? (
              <div className="text-sm text-gray-500">{t("common.noShipmentDetailsAvailable")}</div>
            ) : (
              <div className="space-y-3">
                {requestShipments.map((shipment) => (
                  <div key={shipment.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Package className="h-4 w-4 text-gray-500" />
                          <span className="font-medium text-gray-900">
                            {t("common.shipment")} #{shipment.trackingNumber || shipment.id}
                          </span>
                          <Badge className={ShipmentStatusColors[shipment.status as keyof typeof ShipmentStatusColors]}>
                            {t(shipment.status)}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          {/* Recipient Information */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                            <div>
                              <strong>{t("common.recipient")}:</strong> {shipment.receiverName}
                            </div>
                            <div>
                              <strong>{t("common.destination")}:</strong> {shipment.receiverCity}, {shipment.receiverCountry}
                            </div>
                          </div>
                          
                          {/* Tracking Information */}
                          {shipment.carrierTrackingNumber && (
                            <div className="text-sm text-gray-600">
                              <strong>{t("common.trackingNumber")}:</strong> 
                              <span className="font-mono ml-1 text-blue-600">
                                {shipment.carrierTrackingNumber}
                              </span>
                            </div>
                          )}
                          
                          {/* Package Details */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                            <div>
                              <strong>{t("common.weight")}:</strong> {shipment.packageWeight}kg
                            </div>
                            <div>
                              <strong>{t("common.dimensionDetails.length")}×{t("common.dimensionDetails.width")}×{t("common.dimensionDetails.height")}:</strong> {shipment.packageLength}×{shipment.packageWidth}×{shipment.packageHeight}cm
                            </div>
                            <div>
                              <strong>{t("common.totalPrice")}:</strong> ${((shipment.totalPrice || 0) / 100).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-gray-200">
            <div className="text-sm text-gray-500">
              {t("common.submittedOn")}: {new Date(request.createdAt!).toLocaleDateString()}
            </div>
            <div className="text-sm text-gray-500">
              {t("common.status")}: {t(request.status)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function RefundRequestsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedShipments, setSelectedShipments] = useState<number[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<RefundRequestForm>({
    resolver: zodResolver(refundRequestSchema),
    defaultValues: {
      reason: "",
      selectedShipments: []
    }
  });

  // Fetch user's shipments
  const { data: shipments = [], isLoading: shipmentsLoading } = useQuery({
    queryKey: ['/api/shipments'],
    enabled: true
  });

  // Fetch user's refund requests
  const { data: refundRequests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ['/api/refund-requests'],
    enabled: true
  });

  // Create refund request mutation
  const createRefundMutation = useMutation({
    mutationFn: async (data: RefundRequestForm) => {
      return apiRequest('/api/refund-requests', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/refund-requests'] });
      setIsDialogOpen(false);
      form.reset();
      setSelectedShipments([]);
      toast({
        title: t("common.success"),
        description: t("refundRequestSubmittedSuccessfully"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || t("failedToSubmitRefundRequest"),
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (data: RefundRequestForm) => {
    createRefundMutation.mutate({
      ...data,
      selectedShipments
    });
  };

  const handleShipmentSelect = (shipmentId: number, checked: boolean) => {
    if (checked) {
      setSelectedShipments(prev => [...prev, shipmentId]);
    } else {
      setSelectedShipments(prev => prev.filter(id => id !== shipmentId));
    }
  };

  // Filter eligible shipments (delivered status)
  const eligibleShipments = Array.isArray(shipments) ? shipments.filter((s: Shipment) => 
    s.status === 'delivered' || s.status === 'in_transit'
  ) : [];

  // Calculate total approved refund amount
  const totalApprovedAmount = Array.isArray(refundRequests) 
    ? refundRequests
        .filter((r: RefundRequest) => r.status === 'approved')
        .reduce((sum: number, r: RefundRequest) => sum + (r.requestedAmount || 0), 0)
    : 0;

  if (shipmentsLoading || requestsLoading) {
    return (
      <Layout>
        <div className="p-6">
          <div className="text-center">{t("common.loading")}</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {t("yourRefundRequests")}
            </h1>
            <p className="text-gray-600 mt-2">
              {t("viewAndManageYourRefundRequests")}
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <DollarSign className="h-4 w-4 mr-2" />
                {t("requestRefund")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t("createRefundRequest")}</DialogTitle>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                  {/* Shipment Selection */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">
                      {t("selectShipmentsForRefund")}
                    </h3>
                    {eligibleShipments.length === 0 ? (
                      <p className="text-gray-500 text-sm">
                        {t("noEligibleShipmentsForRefund")}
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {eligibleShipments.map((shipment: Shipment) => (
                          <div key={shipment.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
                            <Checkbox
                              checked={selectedShipments.includes(shipment.id)}
                              onCheckedChange={(checked) => handleShipmentSelect(shipment.id, checked as boolean)}
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="font-medium">
                                    {t("common.shipment")} #{shipment.trackingNumber || shipment.id}
                                  </span>
                                  <Badge className={`ml-2 ${ShipmentStatusColors[shipment.status as keyof typeof ShipmentStatusColors]}`}>
                                    {t(shipment.status)}
                                  </Badge>
                                </div>
                                <div className="text-right">
                                  <div className="font-semibold text-green-600">
                                    ${((shipment.totalPrice || 0) / 100).toFixed(2)}
                                  </div>
                                </div>
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                {shipment.receiverName} → {shipment.receiverCity}, {shipment.receiverCountry}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Reason Field */}
                  <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("common.reason")}</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder={t("pleaseProvideDetailedReason")}
                            className="min-h-[120px]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      {t("common.cancel")}
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createRefundMutation.isPending || selectedShipments.length === 0}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {createRefundMutation.isPending ? t("common.submitting") : t("submitRefundRequest")}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{t("totalRefundRequests")}</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {Array.isArray(refundRequests) ? refundRequests.length : 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{t("pendingRequests")}</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {Array.isArray(refundRequests) ? refundRequests.filter((r: RefundRequest) => r.status === 'pending').length : 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{t("totalApprovedAmount")}</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${(totalApprovedAmount / 100).toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Refund Requests List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {t("yourRefundRequests")}
            </h2>
          </div>
          
          {Array.isArray(refundRequests) && refundRequests.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {t("noRefundRequestsYet")}
              </h3>
              <p className="text-gray-500 mb-6">
                {t("youHaventSubmittedAnyRefundRequests")}
              </p>
            </div>
          ) : (
            Array.isArray(refundRequests) && refundRequests.map((request: RefundRequest) => (
              <RefundRequestCard key={request.id} request={request} />
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}