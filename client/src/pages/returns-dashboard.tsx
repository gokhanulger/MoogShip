import { useState, useEffect } from "react";
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
  Filter, 
  Download, 
  Plus, 
  Eye,
  RotateCcw,
  CheckCircle,
  Clock,
  AlertCircle
} from "lucide-react";
import { ReturnStatusColors, type Return } from "@shared/schema";

const returnFormSchema = z.object({
  sellerId: z.number(),
  orderNumber: z.string().min(1, "Sipariş numarası gerekli"),
  productName: z.string().min(1, "Ürün adı gerekli"),
  customerName: z.string().min(1, "Müşteri adı gerekli"),
  customerEmail: z.string().email("Geçerli email adresi gerekli").optional().or(z.literal("")),
  customerPhone: z.string().optional(),
  returnReason: z.string().min(1, "İade nedeni gerekli"),
  returnValue: z.number().optional(),
  notes: z.string().optional(),
});

type ReturnFormData = z.infer<typeof returnFormSchema>;

const statusOptions = [
  { value: "received", label: "Teslim Alındı", icon: Package },
  { value: "inspected", label: "İncelendi", icon: Eye },
  { value: "refund_initiated", label: "İade Başlatıldı", icon: RotateCcw },
  { value: "completed", label: "Tamamlandı", icon: CheckCircle },
];

export default function ReturnsDashboard() {
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterOrderNumber, setFilterOrderNumber] = useState<string>("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch returns
  const { data: returns, isLoading } = useQuery({
    queryKey: ["/api/returns"],
    retry: false,
  });

  // Create return mutation
  const createReturnMutation = useMutation({
    mutationFn: async (data: ReturnFormData) => {
      return await apiRequest("/api/returns", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "İade kaydı oluşturuldu",
      });
      setIsCreateDialogOpen(false);
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

  // Update return status mutation
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
        description: "İade durumu güncellendi",
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

  const form = useForm<ReturnFormData>({
    resolver: zodResolver(returnFormSchema),
    defaultValues: {
      sellerId: 1, // This would be set based on user selection in real app
      orderNumber: "",
      productName: "",
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      returnReason: "",
      notes: "",
    },
  });

  const onSubmit = (data: ReturnFormData) => {
    createReturnMutation.mutate(data);
  };

  const handleStatusUpdate = (returnId: number, status: string) => {
    updateReturnMutation.mutate({
      id: returnId,
      data: { status }
    });
  };

  const handlePhotoUpload = (returnId: number) => {
    if (photos.length > 0) {
      uploadPhotosMutation.mutate({ returnId, files: photos });
      setPhotos([]);
    }
  };

  const filteredReturns = returns?.data?.filter((returnItem: Return) => {
    if (filterStatus !== "all" && returnItem.status !== filterStatus) return false;
    if (filterOrderNumber && !returnItem.orderNumber.toLowerCase().includes(filterOrderNumber.toLowerCase())) return false;
    return true;
  }) || [];

  const getStatusIcon = (status: string) => {
    const option = statusOptions.find(opt => opt.value === status);
    return option?.icon || Clock;
  };

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return format(new Date(date), "dd MMMM yyyy", { locale: tr });
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "-";
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount / 100);
  };

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">İade Yönetimi</h1>
          <p className="text-muted-foreground">İade kayıtlarını görüntüleyin ve yönetin</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Yeni İade Kaydı
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Yeni İade Kaydı Oluştur</DialogTitle>
              <DialogDescription>
                İade edilen ürün bilgilerini girin
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                      <FormLabel>Notlar (Opsiyonel)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Ek notlar..."
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtreler
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div>
              <Label>Durum</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  {statusOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Sipariş Numarası</Label>
              <Input
                placeholder="Sipariş numarası ile ara..."
                value={filterOrderNumber}
                onChange={(e) => setFilterOrderNumber(e.target.value)}
                className="w-[250px]"
              />
            </div>
            
            <Button variant="outline" onClick={() => {
              setFilterStatus("all");
              setFilterOrderNumber("");
            }}>
              Filtreleri Temizle
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Returns Table */}
      <Card>
        <CardHeader>
          <CardTitle>İade Kayıtları</CardTitle>
          <CardDescription>
            Toplam {filteredReturns.length} kayıt
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Yükleniyor...</div>
          ) : filteredReturns.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Henüz iiade kaydı bulunmuyor
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sipariş No</TableHead>
                  <TableHead>Ürün</TableHead>
                  <TableHead>Müşteri</TableHead>
                  <TableHead>İade Nedeni</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead>İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReturns.map((returnItem: Return) => {
                  const StatusIcon = getStatusIcon(returnItem.status);
                  return (
                    <TableRow key={returnItem.id}>
                      <TableCell className="font-mono">
                        {returnItem.orderNumber}
                      </TableCell>
                      <TableCell>{returnItem.productName}</TableCell>
                      <TableCell>{returnItem.customerName}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {returnItem.returnReason}
                      </TableCell>
                      <TableCell>
                        <Badge className={ReturnStatusColors[returnItem.status as keyof typeof ReturnStatusColors]}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusOptions.find(opt => opt.value === returnItem.status)?.label}
                        </Badge>
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
                
                {selectedReturn.notes && (
                  <div>
                    <Label>Notlar</Label>
                    <p className="text-sm">{selectedReturn.notes}</p>
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label>Durum</Label>
                  <Badge className={ReturnStatusColors[selectedReturn.status as keyof typeof ReturnStatusColors]}>
                    {statusOptions.find(opt => opt.value === selectedReturn.status)?.label}
                  </Badge>
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
              </div>
            </div>
            
            {/* Photo Upload Section */}
            <div className="mt-6">
              <Label>Fotoğraf Yükle</Label>
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
                  <Camera className="w-4 h-4 mr-2" />
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