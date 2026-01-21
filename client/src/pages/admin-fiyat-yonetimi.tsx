/**
 * Admin External Prices Page
 *
 * Manage External scraped prices:
 * - Review and approve/reject batches
 * - View and edit active prices
 * - Configure service visibility settings
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle, Package, Globe, Settings, RefreshCcw, Eye, EyeOff, Trash2, Edit, ChevronLeft, ChevronRight } from "lucide-react";

// Types
interface ExternalBatch {
  id: number;
  countryCode: string | null;
  totalPrices: number;
  approvedPrices: number;
  status: string;
  source: string;
  notes: string | null;
  scrapedAt: string;
  processedAt: string | null;
  processedBy: number | null;
  createdAt: string;
}

interface ExternalPrice {
  id: number;
  countryCode: string;
  countryName: string;
  weight: number;
  carrier: string;
  service: string;
  priceUsd: number;
  transitDays: string | null;
  status: string;
  isVisibleToCustomers: boolean;
  scrapedAt: string | null;
  approvedAt: string | null;
  approvedBy: number | null;
  batchId: number | null;
  createdAt: string;
  updatedAt: string;
}

interface ExternalServiceSetting {
  id: number;
  carrier: string;
  service: string;
  displayName: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface PriceStats {
  totalActive: number;
  totalPending: number;
  totalCountries: number;
  totalCarriers: number;
  lastUpdated: string | null;
}

interface Country {
  countryCode: string;
  countryName: string;
  priceCount: number;
}

export default function AdminExternalPrices() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("batches");
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [priceFilters, setPriceFilters] = useState({
    countryCode: "",
    carrier: "",
    minWeight: "",
    maxWeight: ""
  });
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 100;
  const [editingPrice, setEditingPrice] = useState<ExternalPrice | null>(null);
  const [newServiceSetting, setNewServiceSetting] = useState({
    carrier: "",
    service: "",
    displayName: "",
    isActive: true,
    sortOrder: 0
  });

  // ============================================
  // QUERIES
  // ============================================

  // Get price statistics
  const { data: stats, isLoading: statsLoading } = useQuery<{ success: boolean; stats: PriceStats }>({
    queryKey: ["/api/external-pricing/admin/stats"],
    staleTime: 30000
  });

  // Get batches
  const { data: batchesData, isLoading: batchesLoading } = useQuery<{ success: boolean; batches: ExternalBatch[] }>({
    queryKey: ["/api/external-pricing/admin/batches"],
    enabled: activeTab === "batches"
  });

  // Get batch prices when a batch is selected
  const { data: batchPricesData, isLoading: batchPricesLoading } = useQuery<{ success: boolean; prices: ExternalPrice[] }>({
    queryKey: [`/api/external-pricing/admin/batches/${selectedBatchId}/prices`],
    enabled: !!selectedBatchId
  });

  // Get active prices with pagination
  const { data: pricesData, isLoading: pricesLoading } = useQuery<{
    success: boolean;
    prices: ExternalPrice[];
    total: number;
    page: number;
    totalPages: number;
    limit: number;
  }>({
    queryKey: ["/api/external-pricing/admin/prices", priceFilters, currentPage],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (priceFilters.countryCode) params.set("countryCode", priceFilters.countryCode);
      if (priceFilters.carrier) params.set("carrier", priceFilters.carrier);
      if (priceFilters.minWeight) params.set("minWeight", priceFilters.minWeight);
      if (priceFilters.maxWeight) params.set("maxWeight", priceFilters.maxWeight);
      params.set("page", currentPage.toString());
      params.set("limit", pageSize.toString());
      const res = await fetch(`/api/external-pricing/admin/prices?${params.toString()}`, {
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to fetch prices");
      return res.json();
    },
    enabled: activeTab === "prices"
  });

  // Reset page when filters change
  const handleFilterChange = (newFilters: typeof priceFilters) => {
    setPriceFilters(newFilters);
    setCurrentPage(1);
  };

  // Get service settings
  const { data: servicesData, isLoading: servicesLoading } = useQuery<{ success: boolean; settings: ExternalServiceSetting[] }>({
    queryKey: ["/api/external-pricing/admin/services"],
    enabled: activeTab === "services"
  });

  // Get countries
  const { data: countriesData } = useQuery<{ success: boolean; countries: Country[] }>({
    queryKey: ["/api/external-pricing/admin/countries"],
    enabled: activeTab === "prices"
  });

  // Get carriers
  const { data: carriersData } = useQuery<{ success: boolean; carriers: string[] }>({
    queryKey: ["/api/external-pricing/admin/carriers"],
    enabled: activeTab === "prices"
  });

  // ============================================
  // MUTATIONS
  // ============================================

  // Approve batch
  const approveBatchMutation = useMutation({
    mutationFn: async (batchId: number) => {
      const res = await fetch(`/api/external-pricing/admin/batches/${batchId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ replaceExisting: true })
      });
      if (!res.ok) throw new Error("Failed to approve batch");
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Batch Approved",
        description: `${data.approvedCount} prices activated successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/external-pricing/admin/batches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/external-pricing/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/external-pricing/admin/prices"] });
      setSelectedBatchId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve batch",
        variant: "destructive"
      });
    }
  });

  // Reject batch
  const rejectBatchMutation = useMutation({
    mutationFn: async ({ batchId, reason }: { batchId: number; reason?: string }) => {
      const res = await fetch(`/api/external-pricing/admin/batches/${batchId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason })
      });
      if (!res.ok) throw new Error("Failed to reject batch");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Batch Rejected",
        description: "Batch has been rejected",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/external-pricing/admin/batches"] });
      setSelectedBatchId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject batch",
        variant: "destructive"
      });
    }
  });

  // Update price
  const updatePriceMutation = useMutation({
    mutationFn: async ({ priceId, updates }: { priceId: number; updates: any }) => {
      const res = await fetch(`/api/external-pricing/admin/prices/${priceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updates)
      });
      if (!res.ok) throw new Error("Failed to update price");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Price Updated",
        description: "Price has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/external-pricing/admin/prices"] });
      setEditingPrice(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update price",
        variant: "destructive"
      });
    }
  });

  // Delete price
  const deletePriceMutation = useMutation({
    mutationFn: async (priceId: number) => {
      const res = await fetch(`/api/external-pricing/admin/prices/${priceId}`, {
        method: "DELETE",
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to delete price");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Price Deleted",
        description: "Price has been deleted",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/external-pricing/admin/prices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/external-pricing/admin/stats"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete price",
        variant: "destructive"
      });
    }
  });

  // Toggle service
  const toggleServiceMutation = useMutation({
    mutationFn: async ({ settingId, isActive }: { settingId: number; isActive: boolean }) => {
      const res = await fetch(`/api/external-pricing/admin/services/${settingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive })
      });
      if (!res.ok) throw new Error("Failed to update service");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Service Updated",
        description: "Service visibility has been updated",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/external-pricing/admin/services"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update service",
        variant: "destructive"
      });
    }
  });

  // Create service setting
  const createServiceMutation = useMutation({
    mutationFn: async (data: typeof newServiceSetting) => {
      const res = await fetch("/api/external-pricing/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Failed to create service");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Service Created",
        description: "New service setting has been created",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/external-pricing/admin/services"] });
      setNewServiceSetting({
        carrier: "",
        service: "",
        displayName: "",
        isActive: true,
        sortOrder: 0
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create service setting",
        variant: "destructive"
      });
    }
  });

  // Bulk approve all pending batches
  const [bulkApproving, setBulkApproving] = useState(false);
  const handleBulkApprove = async () => {
    const pendingBatches = batchesData?.batches?.filter(b => b.status === "pending") || [];
    if (pendingBatches.length === 0) {
      toast({ title: "Bilgi", description: "Onaylanacak batch yok" });
      return;
    }

    setBulkApproving(true);
    let approved = 0;
    let failed = 0;

    for (const batch of pendingBatches) {
      try {
        const res = await fetch(`/api/external-pricing/admin/batches/${batch.id}/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ replaceExisting: true })
        });
        if (res.ok) {
          approved++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    setBulkApproving(false);
    queryClient.invalidateQueries({ queryKey: ["/api/external-pricing/admin/batches"] });
    queryClient.invalidateQueries({ queryKey: ["/api/external-pricing/admin/stats"] });
    queryClient.invalidateQueries({ queryKey: ["/api/external-pricing/admin/prices"] });

    toast({
      title: "Toplu Onay Tamamlandı",
      description: `${approved} batch onaylandı${failed > 0 ? `, ${failed} başarısız` : ""}`,
    });
  };

  // ============================================
  // HELPERS
  // ============================================

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD"
    }).format(cents / 100);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString();
  };

  const getBatchStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-green-100 text-green-800">Approved</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-100 text-red-800">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriceStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "active":
        return <Badge variant="outline" className="bg-green-100 text-green-800">Active</Badge>;
      case "disabled":
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">Disabled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">External Fiyat Yönetimi</h1>
            <p className="text-muted-foreground">Scrape edilen fiyatları yönetin ve onaylayın</p>
          </div>

          {/* Stats Cards */}
          {stats?.stats && (
            <div className="flex gap-4 flex-wrap">
              <Card className="px-4 py-2">
                <div className="text-2xl font-bold text-green-600">{stats.stats.totalActive}</div>
                <div className="text-xs text-muted-foreground">Aktif Fiyat</div>
              </Card>
              <Card className="px-4 py-2">
                <div className="text-2xl font-bold text-yellow-600">{stats.stats.totalPending}</div>
                <div className="text-xs text-muted-foreground">Bekleyen</div>
              </Card>
              <Card className="px-4 py-2">
                <div className="text-2xl font-bold text-blue-600">{stats.stats.totalCountries}</div>
                <div className="text-xs text-muted-foreground">Ülke</div>
              </Card>
              <Card className="px-4 py-2">
                <div className="text-2xl font-bold text-purple-600">{stats.stats.totalCarriers}</div>
                <div className="text-xs text-muted-foreground">Taşıyıcı</div>
              </Card>
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="batches" className="gap-2">
              <Package className="h-4 w-4" />
              Batch'ler
            </TabsTrigger>
            <TabsTrigger value="prices" className="gap-2">
              <Globe className="h-4 w-4" />
              Aktif Fiyatlar
            </TabsTrigger>
            <TabsTrigger value="services" className="gap-2">
              <Settings className="h-4 w-4" />
              Servis Ayarları
            </TabsTrigger>
          </TabsList>

          {/* Batches Tab */}
          <TabsContent value="batches" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Scrape Batch'leri</CardTitle>
                  <CardDescription>Chrome extension'dan gelen fiyat paketlerini inceleyin ve onaylayın</CardDescription>
                </div>
                {batchesData?.batches?.some(b => b.status === "pending") && (
                  <Button
                    onClick={handleBulkApprove}
                    disabled={bulkApproving}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {bulkApproving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                    )}
                    Tümünü Onayla ({batchesData?.batches?.filter(b => b.status === "pending").length})
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {batchesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Tarih</TableHead>
                        <TableHead>Kaynak</TableHead>
                        <TableHead>Fiyat Sayısı</TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead>İşlemler</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {batchesData?.batches?.map((batch) => (
                        <TableRow key={batch.id}>
                          <TableCell className="font-mono">#{batch.id}</TableCell>
                          <TableCell>{formatDate(batch.scrapedAt)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{batch.source}</Badge>
                          </TableCell>
                          <TableCell>{batch.totalPrices}</TableCell>
                          <TableCell>{getBatchStatusBadge(batch.status)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedBatchId(batch.id)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                İncele
                              </Button>
                              {batch.status === "pending" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="default"
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() => approveBatchMutation.mutate(batch.id)}
                                    disabled={approveBatchMutation.isPending}
                                  >
                                    {approveBatchMutation.isPending ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <CheckCircle2 className="h-4 w-4 mr-1" />
                                    )}
                                    Onayla
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => rejectBatchMutation.mutate({ batchId: batch.id })}
                                    disabled={rejectBatchMutation.isPending}
                                  >
                                    {rejectBatchMutation.isPending ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <XCircle className="h-4 w-4 mr-1" />
                                    )}
                                    Reddet
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!batchesData?.batches || batchesData.batches.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            Henüz batch yok
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Batch Detail Dialog */}
            <Dialog open={!!selectedBatchId} onOpenChange={() => setSelectedBatchId(null)}>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
                <DialogHeader>
                  <DialogTitle>Batch #{selectedBatchId} - Fiyatlar</DialogTitle>
                  <DialogDescription>Bu batch'teki tüm fiyatları inceleyin</DialogDescription>
                </DialogHeader>

                {batchPricesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ülke</TableHead>
                        <TableHead>Ağırlık</TableHead>
                        <TableHead>Taşıyıcı</TableHead>
                        <TableHead>Servis</TableHead>
                        <TableHead>Fiyat</TableHead>
                        <TableHead>Süre</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {batchPricesData?.prices?.map((price) => (
                        <TableRow key={price.id}>
                          <TableCell>
                            {price.countryName} ({price.countryCode})
                          </TableCell>
                          <TableCell>{price.weight} kg</TableCell>
                          <TableCell>{price.carrier}</TableCell>
                          <TableCell>{price.service}</TableCell>
                          <TableCell className="font-mono">{formatPrice(price.priceUsd)}</TableCell>
                          <TableCell>{price.transitDays || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                <DialogFooter>
                  <Button variant="outline" onClick={() => setSelectedBatchId(null)}>
                    Kapat
                  </Button>
                  {batchesData?.batches?.find(b => b.id === selectedBatchId)?.status === "pending" && (
                    <>
                      <Button
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => approveBatchMutation.mutate(selectedBatchId!)}
                        disabled={approveBatchMutation.isPending}
                      >
                        {approveBatchMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                        )}
                        Tüm Fiyatları Onayla
                      </Button>
                    </>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Prices Tab */}
          <TabsContent value="prices" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Aktif Fiyatlar</CardTitle>
                <CardDescription>Onaylanmış ve aktif fiyatları görüntüleyin ve düzenleyin</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filters */}
                <div className="flex flex-wrap gap-4">
                  <div className="w-48">
                    <Label>Ülke</Label>
                    <Select
                      value={priceFilters.countryCode}
                      onValueChange={(v) => handleFilterChange({ ...priceFilters, countryCode: v === "all" ? "" : v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Tüm Ülkeler" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tüm Ülkeler</SelectItem>
                        {countriesData?.countries?.map((c) => (
                          <SelectItem key={c.countryCode} value={c.countryCode}>
                            {c.countryName} ({c.priceCount})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-48">
                    <Label>Taşıyıcı</Label>
                    <Select
                      value={priceFilters.carrier}
                      onValueChange={(v) => handleFilterChange({ ...priceFilters, carrier: v === "all" ? "" : v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Tüm Taşıyıcılar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tüm Taşıyıcılar</SelectItem>
                        {carriersData?.carriers?.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-32">
                    <Label>Min Ağırlık</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={priceFilters.minWeight}
                      onChange={(e) => handleFilterChange({ ...priceFilters, minWeight: e.target.value })}
                    />
                  </div>

                  <div className="w-32">
                    <Label>Max Ağırlık</Label>
                    <Input
                      type="number"
                      placeholder="30"
                      value={priceFilters.maxWeight}
                      onChange={(e) => handleFilterChange({ ...priceFilters, maxWeight: e.target.value })}
                    />
                  </div>

                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      onClick={() => handleFilterChange({ countryCode: "", carrier: "", minWeight: "", maxWeight: "" })}
                    >
                      <RefreshCcw className="h-4 w-4 mr-1" />
                      Temizle
                    </Button>
                  </div>
                </div>

                {/* Info bar */}
                {pricesData && (
                  <div className="text-sm text-muted-foreground">
                    Toplam {pricesData.total.toLocaleString()} fiyat
                    {pricesData.totalPages > 1 && ` • Sayfa ${pricesData.page}/${pricesData.totalPages}`}
                  </div>
                )}

                {/* Prices Table */}
                {pricesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ülke</TableHead>
                        <TableHead>Ağırlık</TableHead>
                        <TableHead>Taşıyıcı</TableHead>
                        <TableHead>Servis</TableHead>
                        <TableHead>Fiyat</TableHead>
                        <TableHead>Süre</TableHead>
                        <TableHead>Görünürlük</TableHead>
                        <TableHead>İşlemler</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pricesData?.prices?.map((price) => (
                        <TableRow key={price.id}>
                          <TableCell>
                            {price.countryName} ({price.countryCode})
                          </TableCell>
                          <TableCell>{price.weight} kg</TableCell>
                          <TableCell>{price.carrier}</TableCell>
                          <TableCell>{price.service}</TableCell>
                          <TableCell className="font-mono">{formatPrice(price.priceUsd)}</TableCell>
                          <TableCell>{price.transitDays || "-"}</TableCell>
                          <TableCell>
                            {price.isVisibleToCustomers ? (
                              <Badge variant="outline" className="bg-green-100 text-green-800">
                                <Eye className="h-3 w-3 mr-1" />
                                Görünür
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-gray-100 text-gray-800">
                                <EyeOff className="h-3 w-3 mr-1" />
                                Gizli
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingPrice(price)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-800"
                                onClick={() => {
                                  if (confirm("Bu fiyatı silmek istediğinize emin misiniz?")) {
                                    deletePriceMutation.mutate(price.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!pricesData?.prices || pricesData.prices.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                            Aktif fiyat bulunamadı
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}

                {/* Pagination */}
                {pricesData && pricesData.totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, pricesData.total)} / {pricesData.total.toLocaleString()}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                      >
                        İlk
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="px-3 py-1 text-sm font-medium">
                        {currentPage} / {pricesData.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(pricesData.totalPages, p + 1))}
                        disabled={currentPage === pricesData.totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(pricesData.totalPages)}
                        disabled={currentPage === pricesData.totalPages}
                      >
                        Son
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Edit Price Dialog */}
            <Dialog open={!!editingPrice} onOpenChange={() => setEditingPrice(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Fiyat Düzenle</DialogTitle>
                  <DialogDescription>
                    {editingPrice?.countryName} - {editingPrice?.carrier} {editingPrice?.service} ({editingPrice?.weight}kg)
                  </DialogDescription>
                </DialogHeader>

                {editingPrice && (
                  <div className="space-y-4">
                    <div>
                      <Label>Fiyat (USD cents)</Label>
                      <Input
                        type="number"
                        value={editingPrice.priceUsd}
                        onChange={(e) => setEditingPrice({ ...editingPrice, priceUsd: parseInt(e.target.value) || 0 })}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        = {formatPrice(editingPrice.priceUsd)}
                      </p>
                    </div>

                    <div>
                      <Label>Teslimat Süresi</Label>
                      <Input
                        value={editingPrice.transitDays || ""}
                        onChange={(e) => setEditingPrice({ ...editingPrice, transitDays: e.target.value })}
                        placeholder="2-4 iş günü"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editingPrice.isVisibleToCustomers}
                        onCheckedChange={(checked) => setEditingPrice({ ...editingPrice, isVisibleToCustomers: checked })}
                      />
                      <Label>Müşterilere Görünür</Label>
                    </div>
                  </div>
                )}

                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditingPrice(null)}>
                    İptal
                  </Button>
                  <Button
                    onClick={() => {
                      if (editingPrice) {
                        updatePriceMutation.mutate({
                          priceId: editingPrice.id,
                          updates: {
                            priceUsd: editingPrice.priceUsd,
                            transitDays: editingPrice.transitDays,
                            isVisibleToCustomers: editingPrice.isVisibleToCustomers
                          }
                        });
                      }
                    }}
                    disabled={updatePriceMutation.isPending}
                  >
                    {updatePriceMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Kaydet
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Services Tab */}
          <TabsContent value="services" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Servis Ayarları</CardTitle>
                <CardDescription>Hangi taşıyıcı/servis kombinasyonlarının müşterilere gösterileceğini belirleyin</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Add New Service */}
                <div className="p-4 border rounded-lg space-y-4">
                  <h3 className="font-semibold">Yeni Servis Ekle</h3>
                  <div className="grid grid-cols-5 gap-4">
                    <div>
                      <Label>Taşıyıcı</Label>
                      <Input
                        value={newServiceSetting.carrier}
                        onChange={(e) => setNewServiceSetting({ ...newServiceSetting, carrier: e.target.value })}
                        placeholder="UPS"
                      />
                    </div>
                    <div>
                      <Label>Servis</Label>
                      <Input
                        value={newServiceSetting.service}
                        onChange={(e) => setNewServiceSetting({ ...newServiceSetting, service: e.target.value })}
                        placeholder="Express"
                      />
                    </div>
                    <div>
                      <Label>Görünür İsim</Label>
                      <Input
                        value={newServiceSetting.displayName}
                        onChange={(e) => setNewServiceSetting({ ...newServiceSetting, displayName: e.target.value })}
                        placeholder="MoogShip Express"
                      />
                    </div>
                    <div>
                      <Label>Sıra</Label>
                      <Input
                        type="number"
                        value={newServiceSetting.sortOrder}
                        onChange={(e) => setNewServiceSetting({ ...newServiceSetting, sortOrder: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        onClick={() => createServiceMutation.mutate(newServiceSetting)}
                        disabled={!newServiceSetting.carrier || !newServiceSetting.service || !newServiceSetting.displayName || createServiceMutation.isPending}
                      >
                        {createServiceMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        Ekle
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Services Table */}
                {servicesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Taşıyıcı</TableHead>
                        <TableHead>Servis</TableHead>
                        <TableHead>Görünür İsim</TableHead>
                        <TableHead>Sıra</TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead>İşlemler</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {servicesData?.settings?.map((setting) => (
                        <TableRow key={setting.id}>
                          <TableCell className="font-semibold">{setting.carrier}</TableCell>
                          <TableCell>{setting.service}</TableCell>
                          <TableCell>{setting.displayName}</TableCell>
                          <TableCell>{setting.sortOrder}</TableCell>
                          <TableCell>
                            {setting.isActive ? (
                              <Badge variant="outline" className="bg-green-100 text-green-800">Aktif</Badge>
                            ) : (
                              <Badge variant="outline" className="bg-gray-100 text-gray-800">Pasif</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={setting.isActive}
                              onCheckedChange={(checked) =>
                                toggleServiceMutation.mutate({ settingId: setting.id, isActive: checked })
                              }
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!servicesData?.settings || servicesData.settings.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            Henüz servis ayarı yok
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
