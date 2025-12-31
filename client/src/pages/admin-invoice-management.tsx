import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FileText, DollarSign, Package, AlertCircle, CheckCircle2, Clock, User, Building } from "lucide-react";
import { useTranslation } from "react-i18next";
import Layout from "@/components/layout";

interface Owner {
  id: number;
  username: string;
  name: string;
  email: string;
  companyName: string | null;
}

interface EligibleShipment {
  id: number;
  userId: number;
  receiverName: string;
  receiverCountry: string;
  carrierTrackingNumber: string;
  totalPrice: number;
  status: string;
  createdAt: string;
  owner: Owner | null;
}

interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  companyName: string | null;
}

export default function AdminInvoiceManagement() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [singleShipmentId, setSingleShipmentId] = useState("");
  const [selectedShipments, setSelectedShipments] = useState<number[]>([]);
  const [forceCreate, setForceCreate] = useState(false);

  const { data: eligibleData, isLoading: isLoadingEligible, refetch: refetchEligible } = useQuery({
    queryKey: ["/api/bizimhesap/eligible-shipments"],
    refetchInterval: 30000
  });

  const { data: usersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["/api/bizimhesap/users"],
    refetchInterval: 60000
  });

  const createSingleInvoice = useMutation({
    mutationFn: async ({ shipmentId, forceCreate }: { shipmentId: number; forceCreate: boolean }) => {
      const response = await fetch("/api/bizimhesap/create-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shipmentId, forceCreate })
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: t('invoiceManagement.messages.success'),
          description: t('invoiceManagement.messages.invoiceCreated', { invoiceId: data.invoiceId || t('invoiceManagement.messages.invoiceIdNotAvailable') }),
        });
        refetchEligible();
        setSingleShipmentId("");
      } else {
        toast({
          title: t('invoiceManagement.messages.error'),
          description: data.message || t('invoiceManagement.messages.createFailed'),
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: t('invoiceManagement.messages.error'),
        description: t('invoiceManagement.messages.createFailed'),
        variant: "destructive",
      });
    }
  });

  const createBulkInvoices = useMutation({
    mutationFn: async ({ shipmentIds, forceCreate }: { shipmentIds: number[]; forceCreate: boolean }) => {
      const response = await fetch("/api/bizimhesap/bulk-create-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shipmentIds, forceCreate })
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: t('invoiceManagement.messages.success'),
          description: t('invoiceManagement.messages.bulkCreated', { count: data.results?.successful || 0 }),
        });
        refetchEligible();
        setSelectedShipments([]);
      } else {
        toast({
          title: t('invoiceManagement.messages.error'),
          description: data.message || t('invoiceManagement.messages.bulkCreateFailed'),
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: t('invoiceManagement.messages.error'),
        description: t('invoiceManagement.messages.bulkCreateFailed'),
        variant: "destructive",
      });
    }
  });

  const reassignOwner = useMutation({
    mutationFn: async ({ shipmentId, newUserId }: { shipmentId: number; newUserId: number }) => {
      const response = await fetch("/api/bizimhesap/reassign-owner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shipmentId, newUserId })
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Owner Reassigned",
          description: `Shipment #${data.shipmentId} reassigned to ${data.newOwner.name}`,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/bizimhesap/eligible-shipments"] });
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to reassign owner",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to reassign owner",
        variant: "destructive",
      });
    }
  });

  const handleSelectAll = () => {
    const shipments = (eligibleData as any)?.shipments || [];
    if (selectedShipments.length === shipments.length) {
      setSelectedShipments([]);
    } else {
      setSelectedShipments(shipments.map((s: EligibleShipment) => s.id));
    }
  };

  const handleShipmentSelect = (shipmentId: number) => {
    setSelectedShipments(prev => 
      prev.includes(shipmentId) 
        ? prev.filter(id => id !== shipmentId)
        : [...prev, shipmentId]
    );
  };

  const formatPrice = (priceInCents: number) => {
    return `$${(priceInCents / 100).toFixed(2)}`;
  };

  const shipments = (eligibleData as any)?.shipments || [];
  const totalCount = (eligibleData as any)?.count || 0;

  if (isLoadingEligible) {
    return (
      <Layout>
        <div className="container mx-auto py-8">
          <div className="flex items-center justify-center h-64">
            <Clock className="h-8 w-8 animate-spin" />
            <span className="ml-2">{t('invoiceManagement.loading')}</span>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('invoiceManagement.title')}</h1>
            <p className="text-muted-foreground mt-2">
              {t('invoiceManagement.description')}
            </p>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            <FileText className="h-4 w-4 mr-2" />
            {totalCount} {t('invoiceManagement.eligibleShipments')}
          </Badge>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('invoiceManagement.overview.totalEligible')}</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCount}</div>
              <p className="text-xs text-muted-foreground">
                {t('invoiceManagement.overview.shipmentsWithTracking')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('invoiceManagement.overview.selected')}</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{selectedShipments.length}</div>
              <p className="text-xs text-muted-foreground">
                {t('invoiceManagement.overview.readyForBulk')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('invoiceManagement.overview.totalValue')}</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatPrice(shipments.reduce((sum: number, s: EligibleShipment) => sum + s.totalPrice, 0))}
              </div>
              <p className="text-xs text-muted-foreground">
                {t('invoiceManagement.overview.combinedValue')}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t('invoiceManagement.singleInvoice.title')}
              </CardTitle>
              <CardDescription>
                {t('invoiceManagement.singleInvoice.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="shipmentId">{t('invoiceManagement.singleInvoice.shipmentIdLabel')}</Label>
                <Input
                  id="shipmentId"
                  type="number"
                  placeholder={t('invoiceManagement.singleInvoice.shipmentIdPlaceholder')}
                  value={singleShipmentId}
                  onChange={(e) => setSingleShipmentId(e.target.value)}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="forceSingle"
                  checked={forceCreate}
                  onCheckedChange={(checked) => setForceCreate(!!checked)}
                />
                <Label htmlFor="forceSingle" className="text-sm">
                  {t('invoiceManagement.singleInvoice.forceCreate')}
                </Label>
              </div>

              <Button 
                onClick={() => {
                  const shipmentId = parseInt(singleShipmentId);
                  if (shipmentId) {
                    createSingleInvoice.mutate({ shipmentId, forceCreate });
                  }
                }}
                disabled={!singleShipmentId || createSingleInvoice.isPending}
                className="w-full"
              >
                {createSingleInvoice.isPending ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    {t('invoiceManagement.singleInvoice.creating')}
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    {t('invoiceManagement.singleInvoice.createButton')}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {t('invoiceManagement.bulkInvoice.title')}
              </CardTitle>
              <CardDescription>
                {t('invoiceManagement.bulkInvoice.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>{t('invoiceManagement.bulkInvoice.selectedShipments')}</Label>
                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                  {selectedShipments.length === shipments.length ? t('invoiceManagement.bulkInvoice.deselectAll') : t('invoiceManagement.bulkInvoice.selectAll')}
                </Button>
              </div>

              <div className="text-sm text-muted-foreground">
                {t('invoiceManagement.bulkInvoice.selectedCount', { count: selectedShipments.length, total: shipments.length })}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="forceBulk"
                  checked={forceCreate}
                  onCheckedChange={(checked) => setForceCreate(!!checked)}
                />
                <Label htmlFor="forceBulk" className="text-sm">
                  {t('invoiceManagement.bulkInvoice.forceCreate')}
                </Label>
              </div>

              <Button 
                onClick={() => {
                  if (selectedShipments.length > 0) {
                    createBulkInvoices.mutate({ shipmentIds: selectedShipments, forceCreate });
                  }
                }}
                disabled={selectedShipments.length === 0 || createBulkInvoices.isPending}
                className="w-full"
              >
                {createBulkInvoices.isPending ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    {t('invoiceManagement.singleInvoice.creating')}
                  </>
                ) : (
                  <>
                    <Package className="h-4 w-4 mr-2" />
                    {t('invoiceManagement.bulkInvoice.createButton', { count: selectedShipments.length })}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('invoiceManagement.shipmentsList.title')}</CardTitle>
            <CardDescription>
              {t('invoiceManagement.shipmentsList.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {shipments.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t('invoiceManagement.shipmentsList.noShipments.title')}</h3>
                <p className="text-muted-foreground">
                  {t('invoiceManagement.shipmentsList.noShipments.description')}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {shipments.map((shipment: EligibleShipment) => (
                  <div key={shipment.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                    <Checkbox
                      checked={selectedShipments.includes(shipment.id)}
                      onCheckedChange={() => handleShipmentSelect(shipment.id)}
                    />
                    
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-4">
                      <div>
                        <div className="font-medium">#{shipment.id}</div>
                        <div className="text-sm text-muted-foreground">{shipment.receiverName}</div>
                      </div>
                      
                      <div>
                        <div className="font-medium">{shipment.receiverCountry}</div>
                        <div className="text-sm text-muted-foreground">
                          {shipment.carrierTrackingNumber}
                        </div>
                      </div>
                      
                      <div>
                        <div className="font-medium">{formatPrice(shipment.totalPrice)}</div>
                        <Badge variant="secondary" className="text-xs">
                          {shipment.status}
                        </Badge>
                      </div>
                      
                      <div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(shipment.createdAt).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {shipment.owner?.name || 'Unknown'}
                          </span>
                        </div>
                        {shipment.owner?.companyName && (
                          <div className="flex items-center gap-1">
                            <Building className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {shipment.owner.companyName}
                            </span>
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {shipment.owner?.email}
                        </div>
                      </div>

                      <div>
                        <Select
                          value={shipment.userId.toString()}
                          onValueChange={(newUserId) => {
                            if (parseInt(newUserId) !== shipment.userId) {
                              reassignOwner.mutate({
                                shipmentId: shipment.id,
                                newUserId: parseInt(newUserId)
                              });
                            }
                          }}
                          disabled={reassignOwner.isPending || isLoadingUsers}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Reassign..." />
                          </SelectTrigger>
                          <SelectContent>
                            {(usersData as any)?.users?.map((user: User) => (
                              <SelectItem key={user.id} value={user.id.toString()}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{user.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {user.companyName || user.email}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}