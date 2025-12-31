import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, FileText, Plus, Eye, Search, Calendar, User, Truck, Upload, Edit, Camera, Trash2 } from "lucide-react";
import { ReturnStatusColors, type Return } from "@shared/schema";
import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { apiRequest } from "@/lib/queryClient";
import Layout from "@/components/layout";

export default function AdminReturns() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedReturnId, setSelectedReturnId] = useState<number | null>(null);
  const [selectedReturnIdForNotes, setSelectedReturnIdForNotes] = useState<number | null>(null);
  const [selectedReturnIdForStatus, setSelectedReturnIdForStatus] = useState<number | null>(null);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [newStatus, setNewStatus] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [enlargedPhoto, setEnlargedPhoto] = useState<string | null>(null);

  // Fetch all returns (admin view)
  const { data: returnsData, isLoading } = useQuery({
    queryKey: ["/api/admin/returns"],
    retry: false,
  });

  // Fetch return photos
  const { data: photosData } = useQuery({
    queryKey: ["/api/returns", selectedReturnId, "photos"],
    queryFn: () => selectedReturnId ? fetch(`/api/returns/${selectedReturnId}/photos`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      }
    }).then(res => res.json()) : null,
    enabled: !!selectedReturnId && selectedReturnId > 0,
    retry: false,
  });

  // Update return status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (data: { id: number; status: string }) => {
      const response = await fetch(`/api/admin/returns/${data.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: data.status }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to update status");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "İade durumu güncellendi",
      });
      setIsStatusDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/returns"] });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Durum güncellenirken bir hata oluştu",
        variant: "destructive",
      });
    },
  });

  // Update admin notes mutation
  const updateNotesMutation = useMutation({
    mutationFn: async (data: { id: number; notes: string }) => {
      const response = await fetch(`/api/admin/returns/${data.id}/notes`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ adminNotes: data.notes }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to update notes");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Admin notları güncellendi",
      });
      setIsNotesDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/returns"] });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Notlar güncellenirken bir hata oluştu",
        variant: "destructive",
      });
    },
  });

  // Upload photos mutation
  const uploadPhotosMutation = useMutation({
    mutationFn: async (data: { returnId: number; files: FileList }) => {
      console.log('uploadPhotosMutation: Starting upload for return', data.returnId, 'with', data.files.length, 'files');
      
      const formData = new FormData();
      Array.from(data.files).forEach((file, index) => {
        console.log(`Adding file ${index}:`, file.name, file.type, file.size);
        formData.append('photos', file);
      });
      
      console.log('Making fetch request to:', `/api/admin/returns/${data.returnId}/photos`);
      
      // Use fetch directly for file upload since apiRequest expects JSON
      const response = await fetch(`/api/admin/returns/${data.returnId}/photos`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      console.log('Upload response status:', response.status, response.statusText);
      
      if (!response.ok) {
        const error = await response.text();
        console.error('Upload failed with error:', error);
        throw new Error(error || "Failed to upload photos");
      }
      
      const result = await response.json();
      console.log('Upload successful:', result);
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Fotoğraflar başarıyla yüklendi",
      });
      setUploadingPhotos(false);
      queryClient.invalidateQueries({ queryKey: ["/api/returns", selectedReturnId, "photos"] });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Fotoğraflar yüklenirken bir hata oluştu",
        variant: "destructive",
      });
      setUploadingPhotos(false);
    },
  });

  // Delete photo mutation
  const deletePhotoMutation = useMutation({
    mutationFn: async (photoId: number) => {
      const response = await fetch(`/api/returns/photos/${photoId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to delete photo");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Fotoğraf başarıyla silindi",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/returns", selectedReturnId, "photos"] });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Fotoğraf silinirken bir hata oluştu",
        variant: "destructive",
      });
    },
  });

  const handleStatusUpdate = () => {
    if (!selectedReturnIdForStatus || !newStatus) return;
    updateStatusMutation.mutate({ id: selectedReturnIdForStatus, status: newStatus });
  };

  const handleNotesUpdate = () => {
    if (!selectedReturnId) return;
    updateNotesMutation.mutate({ id: selectedReturnId, notes: adminNotes });
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    console.log('handlePhotoUpload called with files:', files?.length, 'selectedReturnId:', selectedReturnId);
    
    if (!files || files.length === 0 || !selectedReturnId) {
      console.log('Upload cancelled: missing files or returnId');
      return;
    }
    
    console.log('Starting photo upload for return:', selectedReturnId);
    setUploadingPhotos(true);
    uploadPhotosMutation.mutate({ returnId: selectedReturnId, files });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("tr-TR");
  };

  const getStatusBadge = (status: string) => {
    const colorClass = ReturnStatusColors[status as keyof typeof ReturnStatusColors] || "bg-gray-100 text-gray-800";
    const statusTexts = {
      pending: "Beklemede",
      received: "Alındı",
      completed: "Tamamlandı"
    };
    
    return (
      <Badge className={colorClass}>
        {statusTexts[status as keyof typeof statusTexts] || status}
      </Badge>
    );
  };

  const openStatusDialog = (returnId: number, currentStatus: string) => {
    setSelectedReturnIdForStatus(returnId);
    setNewStatus(currentStatus);
    setIsStatusDialogOpen(true);
  };

  const openNotesDialog = (returnId: number, currentNotes: string) => {
    setSelectedReturnId(returnId);
    setAdminNotes(currentNotes || "");
    setIsNotesDialogOpen(true);
  };

  const filteredReturns = returnsData?.data?.filter((returnItem: Return) => {
    const matchesSearch = 
      returnItem.senderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      returnItem.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (returnItem.orderNumber && returnItem.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || returnItem.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  return (
    <Layout>
      <div className="space-y-4 md:space-y-6">
        {/* Header - Mobile Optimized */}
        <div className="px-4 md:px-0">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">İade Yönetimi</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">Tüm iade kayıtlarını yönetin</p>
        </div>

        {/* Filters - Mobile Stack */}
        <div className="flex flex-col md:flex-row gap-3 md:gap-4 px-4 md:px-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="İade ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 md:h-10 text-base md:text-sm"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-48 h-12 md:h-10">
              <SelectValue placeholder="Durum filtresi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Durumlar</SelectItem>
              <SelectItem value="pending">Beklemede</SelectItem>
              <SelectItem value="received">Alındı</SelectItem>
              <SelectItem value="completed">Tamamlandı</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-3 text-gray-600">Yükleniyor...</p>
          </div>
        ) : filteredReturns.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">
              {searchTerm || statusFilter !== "all" 
                ? "Arama kriterlerine uygun iade kaydı bulunamadı"
                : "Henüz iade kaydı bulunmuyor"
              }
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="md:hidden space-y-3 px-4">
              {filteredReturns.map((returnItem: Return) => (
                <Card key={returnItem.id} className="shadow-sm border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-900 mb-1">
                          {returnItem.senderName}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Satıcı: {(returnItem as any).sellerName || `Satıcı #${returnItem.sellerId}`}
                        </p>
                      </div>
                      <div 
                        className="cursor-pointer ml-2"
                        onClick={() => openStatusDialog(returnItem.id, returnItem.status)}
                      >
                        {getStatusBadge(returnItem.status)}
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-gray-700">Takip No:</span>
                        <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">
                          {returnItem.trackingNumber}
                        </span>
                      </div>
                      
                      {returnItem.orderNumber && (
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-gray-700">Sipariş No:</span>
                          <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">
                            {returnItem.orderNumber}
                          </span>
                        </div>
                      )}
                      
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-gray-700">Kargo:</span>
                        <span className="text-gray-600">{returnItem.trackingCarrier || "Belirtilmemiş"}</span>
                      </div>
                      
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-gray-700">Oluşturulma:</span>
                        <span className="text-gray-600">
                          {formatDate(returnItem.createdAt)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedReturnId(returnItem.id)}
                        className="flex-1 h-10"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Detaylar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openNotesDialog(returnItem.id, returnItem.adminNotes || "")}
                        className="flex-1 h-10"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Notlar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    İade Kayıtları ({filteredReturns.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Satıcı</TableHead>
                        <TableHead>Gönderen</TableHead>
                        <TableHead>Kargo</TableHead>
                        <TableHead>Takip No</TableHead>
                        <TableHead>Sipariş No</TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead>Oluşturulma</TableHead>
                        <TableHead>İşlemler</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReturns.map((returnItem: Return) => (
                        <TableRow 
                          key={returnItem.id}
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => setSelectedReturnId(returnItem.id)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-500" />
                              {(returnItem as any).sellerName || `Satıcı #${returnItem.sellerId}`}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {returnItem.senderName}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Truck className="w-4 h-4 text-gray-500" />
                              {returnItem.trackingCarrier}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {returnItem.trackingNumber}
                          </TableCell>
                          <TableCell>
                            {returnItem.orderNumber || "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(returnItem.status)}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openStatusDialog(returnItem.id, returnItem.status);
                                }}
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>

                          <TableCell>
                            {formatDate(returnItem.createdAt)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedReturnId(returnItem.id);
                                }}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Detay
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </>
        )}

      {/* Status Update Dialog */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Durum Güncelle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="status">Yeni Durum</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Durum seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Beklemede</SelectItem>
                  <SelectItem value="received">Alındı</SelectItem>
                  <SelectItem value="completed">Tamamlandı</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsStatusDialogOpen(false)}
              >
                İptal
              </Button>
              <Button
                onClick={handleStatusUpdate}
                disabled={updateStatusMutation.isPending}
              >
                {updateStatusMutation.isPending ? "Güncelleniyor..." : "Güncelle"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Notes Dialog */}
      <Dialog open={isNotesDialogOpen} onOpenChange={setIsNotesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Admin Notları</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="notes">Notlar</Label>
              <Textarea
                id="notes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Admin notlarını buraya yazın..."
                rows={5}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsNotesDialogOpen(false)}
              >
                İptal
              </Button>
              <Button
                onClick={handleNotesUpdate}
                disabled={updateNotesMutation.isPending}
              >
                {updateNotesMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Return Details Dialog */}
      <Dialog open={!!selectedReturnId} onOpenChange={() => setSelectedReturnId(null)}>
        <DialogContent className="max-w-4xl max-h-[calc(100vh-70px)] overflow-y-auto fixed sm:top-[50%] top-[56px] sm:left-[50%] left-0 right-0 sm:right-auto sm:transform sm:translate-y-[-50%] sm:translate-x-[-50%] w-full sm:w-auto m-0 p-3 sm:p-6 rounded-none sm:rounded-lg border-0 sm:border">
          <DialogHeader className="relative z-10 pb-3 sm:pb-4 pt-2 sm:pt-4 sticky top-0 bg-white border-b">
            <DialogTitle className="text-lg sm:text-xl">İade Detayları</DialogTitle>
          </DialogHeader>
          {selectedReturnId && (
            <div className="space-y-4 sm:space-y-6 pt-3 sm:pt-4">
              {(() => {
                const returnItem = filteredReturns.find((r: Return) => r.id === selectedReturnId);
                if (!returnItem) return null;

                return (
                  <>
                    {/* Mobile: Single Column, Desktop: Two Columns */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h3 className="font-semibold mb-3 text-blue-900 text-base sm:text-lg flex items-center">
                          <Package className="w-5 h-5 mr-2" />
                          İade Bilgileri
                        </h3>
                        <div className="space-y-3">
                          <div className="flex justify-between items-start py-2 border-b border-blue-100">
                            <span className="text-sm font-medium text-gray-700">Satıcı ID:</span>
                            <span className="text-sm font-mono bg-white px-2 py-1 rounded">{returnItem.sellerId}</span>
                          </div>
                          <div className="flex justify-between items-start py-2 border-b border-blue-100">
                            <span className="text-sm font-medium text-gray-700">Gönderen:</span>
                            <span className="text-sm text-right max-w-[60%]">{returnItem.senderName}</span>
                          </div>
                          <div className="flex justify-between items-start py-2 border-b border-blue-100">
                            <span className="text-sm font-medium text-gray-700">Kargo:</span>
                            <span className="text-sm text-right">{returnItem.trackingCarrier}</span>
                          </div>
                          <div className="flex justify-between items-start py-2 border-b border-blue-100">
                            <span className="text-sm font-medium text-gray-700">Takip No:</span>
                            <span className="text-sm font-mono bg-white px-2 py-1 rounded text-right">{returnItem.trackingNumber}</span>
                          </div>
                          <div className="flex justify-between items-start py-2 border-b border-blue-100">
                            <span className="text-sm font-medium text-gray-700">Sipariş No:</span>
                            <span className="text-sm font-mono bg-white px-2 py-1 rounded">{returnItem.orderNumber || "-"}</span>
                          </div>
                          <div className="flex justify-between items-start py-2 border-b border-blue-100">
                            <span className="text-sm font-medium text-gray-700">Ürün:</span>
                            <span className="text-sm text-right max-w-[60%]">{returnItem.productName || "-"}</span>
                          </div>
                          <div className="flex justify-between items-center py-2">
                            <span className="text-sm font-medium text-gray-700">Durum:</span>
                            <span>{getStatusBadge(returnItem.status)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-green-50 p-4 rounded-lg">
                        <h3 className="font-semibold mb-3 text-green-900 text-base sm:text-lg flex items-center">
                          <Calendar className="w-5 h-5 mr-2" />
                          Tarihler
                        </h3>
                        <div className="space-y-3">
                          <div className="flex justify-between items-start py-2 border-b border-green-100">
                            <span className="text-sm font-medium text-gray-700">Oluşturulma:</span>
                            <span className="text-sm text-right">{formatDate(returnItem.createdAt)}</span>
                          </div>
                          <div className="flex justify-between items-start py-2 border-b border-green-100">
                            <span className="text-sm font-medium text-gray-700">Son Güncelleme:</span>
                            <span className="text-sm text-right">{formatDate(returnItem.updatedAt)}</span>
                          </div>
                          {returnItem.receivedAt && (
                            <div className="flex justify-between items-start py-2 border-b border-green-100">
                              <span className="text-sm font-medium text-gray-700">Alınma Tarihi:</span>
                              <span className="text-sm text-right">{formatDate(returnItem.receivedAt)}</span>
                            </div>
                          )}
                          {returnItem.completedAt && (
                            <div className="flex justify-between items-start py-2">
                              <span className="text-sm font-medium text-gray-700">Tamamlanma:</span>
                              <span className="text-sm text-right">{formatDate(returnItem.completedAt)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {returnItem.returnReason && (
                      <div className="bg-amber-50 p-4 rounded-lg">
                        <h3 className="font-semibold mb-3 text-amber-900 text-base sm:text-lg flex items-center">
                          <FileText className="w-5 h-5 mr-2" />
                          İade Nedeni
                        </h3>
                        <p className="text-sm text-gray-700 bg-white p-3 rounded border border-amber-200 leading-relaxed">
                          {returnItem.returnReason}
                        </p>
                      </div>
                    )}

                    {/* Admin Notes Section */}
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                        <h3 className="font-semibold text-purple-900 text-base sm:text-lg flex items-center">
                          <FileText className="w-5 h-5 mr-2" />
                          Admin Notları
                        </h3>
                        <Button
                          variant="outline"
                          size="lg"
                          onClick={() => {
                            setAdminNotes(returnItem.adminNotes || "");
                            setSelectedReturnIdForNotes(returnItem.id);
                            setIsNotesDialogOpen(true);
                          }}
                          className="w-full sm:w-auto h-12 text-base font-medium border-purple-300 hover:bg-purple-100"
                        >
                          <FileText className="w-5 h-5 mr-2" />
                          {returnItem.adminNotes ? "Düzenle" : "Not Ekle"}
                        </Button>
                      </div>
                      {returnItem.adminNotes ? (
                        <div className="bg-white p-4 rounded border border-purple-200 text-sm text-gray-700 leading-relaxed">
                          {returnItem.adminNotes}
                        </div>
                      ) : (
                        <div className="bg-white p-4 rounded border border-purple-200 text-center">
                          <FileText className="w-8 h-8 text-purple-300 mx-auto mb-2" />
                          <p className="text-sm text-purple-600 font-medium">Henüz admin notu eklenmemiş</p>
                          <p className="text-xs text-purple-500 mt-1">Yukarıdaki butonu kullanarak not ekleyebilirsiniz</p>
                        </div>
                      )}
                    </div>

                    {/* Photos Section - Mobile Optimized */}
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                        <h3 className="font-semibold text-lg">Fotoğraflar</h3>
                        <div className="flex items-center gap-2">
                          <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept="image/*"
                            capture="environment"
                            onChange={handlePhotoUpload}
                            className="hidden"
                          />
                          <Button
                            variant="outline"
                            size="lg"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingPhotos}
                            className="w-full sm:w-auto h-12 text-base font-medium"
                          >
                            {uploadingPhotos ? (
                              <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
                                Yükleniyor...
                              </>
                            ) : (
                              <>
                                <Camera className="w-5 h-5 mr-3" />
                                Fotoğraf Ekle
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                      {photosData?.data && photosData.data.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                          {photosData.data.map((photo: any) => (
                            <div key={photo.id} className="relative group bg-white rounded-lg border-2 border-gray-200 overflow-hidden shadow-sm">
                              <img
                                src={photo.url}
                                alt={photo.originalName}
                                className="w-full h-48 sm:h-32 object-cover cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => setEnlargedPhoto(photo.url)}
                              />
                              <Button
                                variant="destructive"
                                size="sm"
                                className="absolute top-2 right-2 h-8 w-8 p-0 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shadow-lg"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm('Bu fotoğrafı silmek istediğinizden emin misiniz?')) {
                                    deletePhotoMutation.mutate(photo.id);
                                  }
                                }}
                                disabled={deletePhotoMutation.isPending}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                              <div className="p-3 bg-gray-50">
                                <p className="text-sm text-gray-600 truncate font-medium">
                                  {photo.originalName}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                          <Camera className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-500 text-base font-medium">Henüz fotoğraf yüklenmemiş</p>
                          <p className="text-gray-400 text-sm mt-1">Yukarıdaki butonu kullanarak fotoğraf ekleyebilirsiniz</p>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Photo enlargement modal */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl w-full p-0">
          <div className="relative">
            {selectedPhoto && (
              <img
                src={selectedPhoto}
                alt="Enlarged photo"
                className="w-full h-auto max-h-[80vh] object-contain"
              />
            )}
            <Button
              variant="outline"
              size="sm"
              className="absolute top-4 right-4 bg-white/80 hover:bg-white"
              onClick={() => setSelectedPhoto(null)}
            >
              ✕
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Photo Enlargement Modal */}
      <Dialog open={!!enlargedPhoto} onOpenChange={() => setEnlargedPhoto(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-2">
          <div className="relative">
            <img
              src={enlargedPhoto || ""}
              alt="Enlarged photo"
              className="w-full h-auto max-h-[80vh] object-contain"
            />
            <button
              onClick={() => setEnlargedPhoto(null)}
              className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-75"
            >
              ✕
            </button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </Layout>
  );
}