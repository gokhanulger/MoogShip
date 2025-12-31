import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import Layout from "@/components/layout";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Package, 
  Camera, 
  Plus, 
  Upload,
  Eye,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  X
} from "lucide-react";
import { ReturnStatusColors, type Return } from "@shared/schema";

const warehouseReturnSchema = z.object({
  sellerId: z.number().min(1, "Satıcı seçimi gerekli"),
  orderNumber: z.string().min(1, "Sipariş numarası gerekli"),
  productName: z.string().min(1, "Ürün adı gerekli"),
  customerName: z.string().min(1, "Müşteri adı gerekli"),
  customerEmail: z.string().email("Geçerli email adresi gerekli").optional().or(z.literal("")),
  customerPhone: z.string().optional(),
  returnReason: z.string().min(1, "İade nedeni gerekli"),
  returnValue: z.number().min(0, "İade değeri 0'dan büyük olmalı").optional(),
  refundAmount: z.number().min(0, "İade tutarı 0'dan büyük olmalı").optional(),
  status: z.enum(["received", "inspected", "refund_initiated", "completed"]),
  notes: z.string().optional(),
});

type WarehouseReturnData = z.infer<typeof warehouseReturnSchema>;

const statusOptions = [
  { value: "received", label: "Teslim Alındı", icon: Package, color: "bg-blue-100 text-blue-800" },
  { value: "inspected", label: "İncelendi", icon: Eye, color: "bg-yellow-100 text-yellow-800" },
  { value: "refund_initiated", label: "İade Başlatıldı", icon: DollarSign, color: "bg-orange-100 text-orange-800" },
  { value: "completed", label: "Tamamlandı", icon: CheckCircle, color: "bg-green-100 text-green-800" },
];

export default function WarehouseReturns() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [selectedSeller, setSelectedSeller] = useState<number | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all sellers for dropdown
  const { data: sellers } = useQuery({
    queryKey: ["/api/users"],
    retry: false,
  });

  // Fetch returns for warehouse staff (all returns)
  const { data: returns, isLoading } = useQuery({
    queryKey: ["/api/returns"],
    retry: false,
  });

  // Create return mutation
  const createReturnMutation = useMutation({
    mutationFn: async (data: WarehouseReturnData) => {
      return await apiRequest("/api/returns", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: async (result) => {
      toast({
        title: "Başarılı",
        description: "İade kaydı oluşturuldu ve satıcıya bildirim gönderildi",
      });
      
      // Upload photos if any
      if (photos.length > 0) {
        await uploadPhotosMutation.mutateAsync({ 
          returnId: result.data.id, 
          files: photos 
        });
      }
      
      setIsCreateDialogOpen(false);
      setPhotos([]);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/returns"] });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "İade kaydı oluşturulamadı",
        variant: "destructive",
      });
    },
  });

  // Update return mutation
  const updateReturnMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Return> }) => {
      return await apiRequest(`/api/returns/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "İade durumu güncellendi ve satıcıya bildirim gönderildi",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/returns"] });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "İade güncellenemedi",
        variant: "destructive",
      });
    },
  });

  // Upload photos mutation
  const uploadPhotosMutation = useMutation({
    mutationFn: async ({ returnId, files }: { returnId: number; files: File[] }) => {
      const formData = new FormData();
      files.forEach(file => formData.append('photos', file));
      
      const response = await fetch(`/api/returns/${returnId}/photos`, {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error("Fotoğraflar yüklenemedi");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Fotoğraflar yüklendi",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/returns"] });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Fotoğraflar yüklenemedi",
        variant: "destructive",
      });
    },
  });

  // Assignment mutations
  const assignMutation = useMutation({
    mutationFn: async ({ returnId, userId }: { returnId: number; userId: number }) => {
      return await apiRequest(`/api/returns/${returnId}/assign`, {
        method: "POST",
        body: JSON.stringify({ userId }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "İade başarıyla atandı",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/returns"] });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "İade atanamadı",
        variant: "destructive",
      });
    },
  });

  const unassignMutation = useMutation({
    mutationFn: async (returnId: number) => {
      return await apiRequest(`/api/returns/${returnId}/unassign`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "İade ataması kaldırıldı",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/returns"] });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "İade ataması kaldırılamadı",
        variant: "destructive",
      });
    },
  });

  const form = useForm<WarehouseReturnData>({
    resolver: zodResolver(warehouseReturnSchema),
    defaultValues: {
      sellerId: 0,
      orderNumber: "",
      productName: "",
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      returnReason: "",
      status: "received",
      notes: "",
    },
  });

  const onSubmit = (data: WarehouseReturnData) => {
    createReturnMutation.mutate(data);
  };

  const handleStatusUpdate = (returnId: number, status: string, notes?: string) => {
    const updateData: Partial<Return> = { status };
    if (notes) updateData.notes = notes;
    
    updateReturnMutation.mutate({
      id: returnId,
      data: updateData
    });
  };

  const handlePhotoUpload = (returnId: number) => {
    if (photos.length > 0) {
      uploadPhotosMutation.mutate({ returnId, files: photos });
      setPhotos([]);
    }
  };

  const handleAssignReturn = (returnId: number, userId: number) => {
    assignMutation.mutate({ returnId, userId });
  };

  const handleUnassignReturn = (returnId: number) => {
    unassignMutation.mutate(returnId);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return format(new Date(date), "dd MMMM yyyy HH:mm", { locale: tr });
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "-";
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount / 100);
  };

  const getSellerName = (sellerId: number) => {
    const seller = sellers?.data?.find((s: any) => s.id === sellerId);
    return seller ? seller.name : `Satıcı #${sellerId}`;
  };

  const filteredReturns = selectedSeller 
    ? returns?.data?.filter((r: Return) => r.sellerId === selectedSeller) || []
    : returns?.data || [];

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Depo İade Yönetimi</h1>
          <p className="text-muted-foreground">İade kayıtları oluşturun ve yönetin</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Yeni İade Kaydı
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Yeni İade Kaydı Oluştur</DialogTitle>
              <DialogDescription>
                İade edilen ürün bilgilerini girin ve fotoğrafları yükleyin
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="sellerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Satıcı</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Satıcı seçin" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {sellers?.data?.map((seller: any) => (
                            <SelectItem key={seller.id} value={seller.id.toString()}>
                              {seller.name} ({seller.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="orderNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sipariş Numarası</FormLabel>
                        <FormControl>
                          <Input placeholder="ORD-2024-001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="productName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ürün Adı</FormLabel>
                        <FormControl>
                          <Input placeholder="Ürün adını girin" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="customerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Müşteri Adı</FormLabel>
                        <FormControl>
                          <Input placeholder="Müşteri adını girin" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="customerEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email (Opsiyonel)</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="email@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="returnValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>İade Değeri (kuruş)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="0" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Durum</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {statusOptions.map(option => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="returnReason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>İade Nedeni</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="İade nedenini detaylı olarak açıklayın"
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Depo Notları</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="İnceleme notları, hasar durumu vb..."
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Photo Upload Section */}
                <div className="space-y-2">
                  <Label>Fotoğraflar</Label>
                  <div className="flex gap-4 items-center">
                    <Input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files) {
                          setPhotos(Array.from(e.target.files));
                        }
                      }}
                      className="flex-1"
                    />
                    <Badge variant="secondary">
                      {photos.length} fotoğraf seçildi
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    İade edilen ürünün fotoğraflarını yükleyin (maksimum 5 adet)
                  </p>
                </div>

                <DialogFooter>
                  <Button type="submit" disabled={createReturnMutation.isPending}>
                    {createReturnMutation.isPending ? "Oluşturuluyor..." : "İade Kaydı Oluştur"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Seller Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Filtreler</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            <div>
              <Label>Satıcı</Label>
              <Select 
                value={selectedSeller?.toString() || "all"} 
                onValueChange={(value) => setSelectedSeller(value === "all" ? null : parseInt(value))}
              >
                <SelectTrigger className="w-[300px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Satıcılar</SelectItem>
                  {sellers?.data?.map((seller: any) => (
                    <SelectItem key={seller.id} value={seller.id.toString()}>
                      {seller.name} ({seller.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={() => setSelectedSeller(null)}>
              Filtreyi Temizle
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Returns Table */}
      <Card>
        <CardHeader>
          <CardTitle>İade Kayıtları</CardTitle>
          <CardDescription>
            {selectedSeller ? getSellerName(selectedSeller) + " için " : ""}
            Toplam {filteredReturns.length} kayıt
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Yükleniyor...</div>
          ) : filteredReturns.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {selectedSeller ? "Bu satıcı için " : ""}İade kaydı bulunamadı
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sipariş No</TableHead>
                  <TableHead>Satıcı</TableHead>
                  <TableHead>Ürün</TableHead>
                  <TableHead>Müşteri</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>İade Değeri</TableHead>
                  <TableHead>Atanan Kişi</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead>İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReturns.map((returnItem: Return) => {
                  const status = statusOptions.find(s => s.value === returnItem.status);
                  const StatusIcon = status?.icon || Clock;
                  
                  return (
                    <TableRow key={returnItem.id}>
                      <TableCell className="font-mono">
                        {returnItem.orderNumber}
                      </TableCell>
                      <TableCell>
                        {getSellerName(returnItem.sellerId)}
                      </TableCell>
                      <TableCell>{returnItem.productName}</TableCell>
                      <TableCell>{returnItem.customerName}</TableCell>
                      <TableCell>
                        <Badge className={status?.color || "bg-gray-100 text-gray-800"}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {status?.label || returnItem.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatCurrency(returnItem.returnValue)}
                      </TableCell>
                      <TableCell>
                        {returnItem.assignedToUserId ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm">
                              {sellers?.data?.find((s: any) => s.id === returnItem.assignedToUserId)?.name || `Kullanıcı #${returnItem.assignedToUserId}`}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUnassignReturn(returnItem.id)}
                              disabled={unassignMutation.isPending}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <Select onValueChange={(userId) => handleAssignReturn(returnItem.id, parseInt(userId))}>
                            <SelectTrigger className="w-[120px]">
                              <SelectValue placeholder="Ata" />
                            </SelectTrigger>
                            <SelectContent>
                              {sellers?.data?.map((seller: any) => (
                                <SelectItem key={seller.id} value={seller.id.toString()}>
                                  {seller.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell>
                        {formatDate(returnItem.returnDate)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Select
                            value={returnItem.status}
                            onValueChange={(status) => handleStatusUpdate(returnItem.id, status)}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {statusOptions.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedReturn(returnItem)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Return Details Dialog */}
      {selectedReturn && (
        <Dialog open={!!selectedReturn} onOpenChange={() => setSelectedReturn(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>İade Detayları - {selectedReturn.orderNumber}</DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label>Satıcı</Label>
                  <p className="font-medium">{getSellerName(selectedReturn.sellerId)}</p>
                </div>
                
                <div>
                  <Label>Ürün</Label>
                  <p className="font-medium">{selectedReturn.productName}</p>
                </div>
                
                <div>
                  <Label>Müşteri</Label>
                  <p className="font-medium">{selectedReturn.customerName}</p>
                  {selectedReturn.customerEmail && (
                    <p className="text-sm text-muted-foreground">{selectedReturn.customerEmail}</p>
                  )}
                </div>
                
                <div>
                  <Label>İade Nedeni</Label>
                  <p className="text-sm">{selectedReturn.returnReason}</p>
                </div>
                
                <div>
                  <Label>İade Değeri</Label>
                  <p className="font-medium">{formatCurrency(selectedReturn.returnValue)}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label>Durum</Label>
                  <div className="mt-1">
                    <Badge className={statusOptions.find(s => s.value === selectedReturn.status)?.color}>
                      {statusOptions.find(s => s.value === selectedReturn.status)?.label}
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <Label>İade Tarihi</Label>
                  <p>{formatDate(selectedReturn.returnDate)}</p>
                </div>
                
                {selectedReturn.inspectionDate && (
                  <div>
                    <Label>İnceleme Tarihi</Label>
                    <p>{formatDate(selectedReturn.inspectionDate)}</p>
                  </div>
                )}
                
                {selectedReturn.refundInitiatedDate && (
                  <div>
                    <Label>İade Başlatma Tarihi</Label>
                    <p>{formatDate(selectedReturn.refundInitiatedDate)}</p>
                  </div>
                )}
                
                {selectedReturn.completedDate && (
                  <div>
                    <Label>Tamamlanma Tarihi</Label>
                    <p>{formatDate(selectedReturn.completedDate)}</p>
                  </div>
                )}
                
                {selectedReturn.notes && (
                  <div>
                    <Label>Depo Notları</Label>
                    <p className="text-sm">{selectedReturn.notes}</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Photo Upload Section for existing returns */}
            <div className="mt-6">
              <Label>Ek Fotoğraf Yükle</Label>
              <div className="mt-2 flex gap-4 items-center">
                <Input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files) {
                      setPhotos(Array.from(e.target.files));
                    }
                  }}
                />
                <Button
                  onClick={() => handlePhotoUpload(selectedReturn.id)}
                  disabled={photos.length === 0 || uploadPhotosMutation.isPending}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploadPhotosMutation.isPending ? "Yükleniyor..." : "Yükle"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      </div>
    </Layout>
  );
}