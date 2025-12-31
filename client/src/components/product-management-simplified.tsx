import { useState, useEffect, useRef } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Pencil, Trash2, PackageOpen, Plus, Search, FileUp, FileSpreadsheet, Check, AlertTriangle, FileX, UploadCloud, Download } from "lucide-react";

interface UserProduct {
  id: number;
  name: string;
  sku: string | null;
  description: string | null;
  hsCode: string;
  price: number;
  quantity: number;
  countryOfOrigin: string;
  userId: number;
  createdAt: Date | null;
  updatedAt: Date | null;
}

interface ProductFormData {
  id?: number;
  name: string;
  sku: string;
  description: string;
  hsCode: string;
  price: string;
  quantity: string;
  countryOfOrigin: string;
}

// Schema will use dynamic translation inside form component
const getProductFormSchema = (t: any) => z.object({
  name: z.string().min(1, { message: t('productsData.form.validation.nameRequired') }),
  sku: z.string().optional(),
  description: z.string().optional(),
  hsCode: z.string().min(1, { message: t('productsData.form.validation.hsCodeRequired') }),
  price: z.string().min(1, { message: t('productsData.form.validation.priceRequired') }),
  quantity: z.string().min(1, { message: t('productsData.form.validation.quantityRequired') }),
  countryOfOrigin: z.string().min(1, { message: t('productsData.form.validation.countryRequired') }),
});

const emptyFormData: ProductFormData = {
  name: '',
  sku: '',
  description: '',
  hsCode: '',
  price: '',
  quantity: '1',
  countryOfOrigin: ''
};

export default function ProductManagement() {
  const { t, i18n } = useTranslation();
  const [products, setProducts] = useState<UserProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBulkUploadDialogOpen, setIsBulkUploadDialogOpen] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadResults, setUploadResults] = useState<any>(null);
  const [selectedProduct, setSelectedProduct] = useState<UserProduct | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);
  const { toast } = useToast();

  // Product form using react-hook-form
  // Re-initialize form with new translations when language changes
  const form = useForm<ProductFormData>({
    resolver: zodResolver(getProductFormSchema(t)),
    defaultValues: emptyFormData,
  });
  
  // Update form validation when language changes
  useEffect(() => {
    form.clearErrors();
    form.setError = form.setError; // Trigger re-validation with new language
  }, [i18n.language]);

  // Load user products on mount and when language changes
  useEffect(() => {
    fetchProducts();
  }, []);
  
  // Re-render component when language changes
  useEffect(() => {

    
    // This will force component to re-render when language changes
    fetchProducts();
    
    // Force update form validation schema with new translations
    form.reset(form.getValues());
    
    // Update current language with timestamp to force re-render
    setCurrentLanguage(`${i18n.language}-${Date.now()}`);
    
    // Force rerender by setting a timeout
    const timer = setTimeout(() => {
      console.log("Delayed language update applied:", i18n.language);
      setCurrentLanguage(prevLang => {
        // This forces a state update even if the language is the same
        return `${i18n.language}-${Date.now()}`;
      });
    }, 50);
    
    return () => clearTimeout(timer);
  }, [i18n.language]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/products', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      } else {
        toast({
          title: t('common.error'),
          description: t('productsData.alerts.loadError'),
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('productsData.alerts.connectionError'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async (data: ProductFormData) => {
    try {
      // Convert price string to cents (integer)
      const priceInCents = Math.round(parseFloat(data.price) * 100);
      
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: data.name,
          sku: data.sku || null,
          description: data.description || null,
          hsCode: data.hsCode,
          price: priceInCents,
          quantity: parseInt(data.quantity),
          countryOfOrigin: data.countryOfOrigin,
          // Keep legacy fields as null for backward compatibility
          weight: null,
          length: null, 
          width: null,
          height: null,
          manufacturer: null
        }),
      });
      
      if (response.ok) {
        const newProduct = await response.json();
        setProducts([...products, newProduct]);
        setIsAddDialogOpen(false);
        form.reset(emptyFormData);
        
        toast({
          title: t('common.success'),
          description: t('productsData.alerts.createSuccess'),
        });
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create product');
      }
    } catch (error) {
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('productsData.alerts.createError'),
        variant: "destructive",
      });
    }
  };

  const handleUpdateProduct = async (data: ProductFormData) => {
    if (!selectedProduct) return;
    
    try {
      // Convert price string to cents (integer)
      const priceInCents = Math.round(parseFloat(data.price) * 100);
      
      const response = await fetch(`/api/products/${selectedProduct.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: data.name,
          sku: data.sku || null,
          description: data.description || null,
          hsCode: data.hsCode,
          price: priceInCents,
          quantity: parseInt(data.quantity),
          countryOfOrigin: data.countryOfOrigin
        }),
      });
      
      if (response.ok) {
        const updatedProduct = await response.json();
        setProducts(products.map(p => p.id === updatedProduct.id ? updatedProduct : p));
        setIsEditDialogOpen(false);
        
        toast({
          title: t('common.success'),
          description: t('productsData.alerts.updateSuccess'),
        });
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update product');
      }
    } catch (error) {
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('productsData.alerts.updateError'),
        variant: "destructive",
      });
    }
  };

  const handleDeleteProduct = async () => {
    if (!selectedProduct) return;
    
    try {
      const response = await fetch(`/api/products/${selectedProduct.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        setProducts(products.filter(p => p.id !== selectedProduct.id));
        setIsDeleteDialogOpen(false);
        
        toast({
          title: t('common.success'),
          description: t('productsData.alerts.deleteSuccess'),
        });
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete product');
      }
    } catch (error) {
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('productsData.alerts.deleteError'),
        variant: "destructive",
      });
    }
  };

  const openAddDialog = () => {
    form.reset(emptyFormData);
    setIsAddDialogOpen(true);
  };

  const openEditDialog = (product: UserProduct) => {
    setSelectedProduct(product);
    form.reset({
      name: product.name,
      sku: product.sku || '',
      description: product.description || '',
      hsCode: product.hsCode || '',
      // Convert cents back to dollars for display in the form
      price: (product.price / 100).toFixed(2),
      quantity: product.quantity.toString(),
      countryOfOrigin: product.countryOfOrigin || '',
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (product: UserProduct) => {
    setSelectedProduct(product);
    setIsDeleteDialogOpen(true);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (product.hsCode && product.hsCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (product.countryOfOrigin && product.countryOfOrigin.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // This key forces a complete remount when language changes
  return (
    <div className="space-y-6" key={`product-catalog-${currentLanguage}`}>
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {/* Direct access to translation with language as parameter */}
            {i18n.t('productsData.catalog.title', { lng: currentLanguage.split('-')[0] })}
          </h2>
          <p className="text-muted-foreground">
            {i18n.t('productsData.catalog.subtitle', { lng: currentLanguage.split('-')[0] })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsBulkUploadDialogOpen(true)}>
            <UploadCloud className="mr-2 h-4 w-4" /> {i18n.t('productsData.actions.bulkUpload', { lng: currentLanguage.split('-')[0] })}
          </Button>
          <Button onClick={openAddDialog}>
            <Plus className="mr-2 h-4 w-4" /> {i18n.t('productsData.actions.addProduct', { lng: currentLanguage.split('-')[0] })}
          </Button>
        </div>
      </div>

      <div className="flex w-full max-w-sm items-center space-x-2 mb-4">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search" 
            placeholder={i18n.t('productsData.search.placeholder', { lng: currentLanguage.split('-')[0] })}
            className="pl-8"
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center border rounded-lg p-8 bg-muted/50">
          <PackageOpen className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">{t('productsData.empty.title')}</h3>
          <p className="text-muted-foreground mb-4">{t('productsData.empty.description')}</p>
          <Button onClick={openAddDialog}>
            <Plus className="mr-2 h-4 w-4" /> {t('productsData.actions.addFirstProduct')}
          </Button>
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{i18n.t('productsData.table.productName', { lng: currentLanguage.split('-')[0] })}</TableHead>
                <TableHead>{i18n.t('productsData.table.sku', { lng: currentLanguage.split('-')[0] })}</TableHead>
                <TableHead>{i18n.t('productsData.table.price', { lng: currentLanguage.split('-')[0] })}</TableHead>
                <TableHead>{i18n.t('productsData.table.hsCode', { lng: currentLanguage.split('-')[0] })}</TableHead>
                <TableHead>{i18n.t('productsData.table.countryOfOrigin', { lng: currentLanguage.split('-')[0] })}</TableHead>
                <TableHead className="text-right">{i18n.t('productsData.table.actions', { lng: currentLanguage.split('-')[0] })}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">
                    <div>
                      {product.name}
                      {product.description && (
                        <p className="text-xs text-muted-foreground truncate max-w-[250px]">
                          {product.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{product.sku || <span className="text-muted-foreground text-xs">{i18n.t('productsData.table.noSku', { lng: currentLanguage.split('-')[0] })}</span>}</TableCell>
                  <TableCell>${(product.price / 100).toFixed(2)}</TableCell>
                  <TableCell>{product.hsCode || <span className="text-muted-foreground text-xs">{i18n.t('productsData.table.notSpecified', { lng: currentLanguage.split('-')[0] })}</span>}</TableCell>
                  <TableCell>{product.countryOfOrigin || <span className="text-muted-foreground text-xs">{i18n.t('productsData.table.notSpecified', { lng: currentLanguage.split('-')[0] })}</span>}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(product)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openDeleteDialog(product)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Product Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{t('productsData.form.addTitle')}</DialogTitle>
            <DialogDescription>
              {t('productsData.form.addDescription')}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreateProduct)} className="space-y-6">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('productsData.form.productName')}*</FormLabel>
                      <FormControl>
                        <Input placeholder={t('productsData.form.placeholders.productName')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('productsData.form.productSku')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('productsData.form.placeholders.productSku')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('productsData.form.description')}</FormLabel>
                      <FormControl>
                        <Textarea placeholder={t('productsData.form.placeholders.description')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('productsData.form.price')}*</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder={t('productsData.form.placeholders.price')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('productsData.form.quantity')}*</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" placeholder={t('productsData.form.placeholders.quantity')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="hsCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('productsData.form.hsCode')}*</FormLabel>
                      <FormControl>
                        <Input placeholder={t('productsData.form.placeholders.hsCode')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="countryOfOrigin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('productsData.form.countryOfOrigin')}*</FormLabel>
                      <FormControl>
                        <Input placeholder={t('productsData.form.placeholders.countryOfOrigin')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  {t('productsData.actions.cancel')}
                </Button>
                <Button type="submit">{t('productsData.actions.addProduct')}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{t('productsData.form.editTitle')}</DialogTitle>
            <DialogDescription>
              {t('productsData.form.editDescription')}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdateProduct)} className="space-y-6">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('productsData.form.productName')}*</FormLabel>
                      <FormControl>
                        <Input placeholder={t('productsData.form.placeholders.productName')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('productsData.form.productSku')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('productsData.form.placeholders.productSku')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('productsData.form.description')}</FormLabel>
                      <FormControl>
                        <Textarea placeholder={t('productsData.form.placeholders.description')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('productsData.form.price')}*</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder={t('productsData.form.placeholders.price')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('productsData.form.quantity')}*</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" placeholder={t('productsData.form.placeholders.quantity')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="hsCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('productsData.form.hsCode')}*</FormLabel>
                      <FormControl>
                        <Input placeholder={t('productsData.form.placeholders.hsCode')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="countryOfOrigin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('productsData.form.countryOfOrigin')}*</FormLabel>
                      <FormControl>
                        <Input placeholder={t('productsData.form.placeholders.countryOfOrigin')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  {t('productsData.actions.cancel')}
                </Button>
                <Button type="submit">{t('productsData.actions.update')}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('productsData.deleteConfirmation.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('productsData.deleteConfirmation.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('productsData.deleteConfirmation.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProduct} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('productsData.deleteConfirmation.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Bulk Upload Dialog */}
      <Dialog open={isBulkUploadDialogOpen} onOpenChange={setIsBulkUploadDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{t('productsData.bulkUpload.title')}</DialogTitle>
            <DialogDescription>
              {t('productsData.bulkUpload.description')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Download Template Button */}
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Use fetch API with proper error handling for file downloads
                  fetch('/api/template/product-import', {
                    method: 'GET',
                    credentials: 'include',
                  })
                  .then(response => {
                    if (!response.ok) {
                      throw new Error('Network response was not ok');
                    }
                    return response.blob();
                  })
                  .then(blob => {
                    // Create a download link and trigger it
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = url;
                    a.download = 'product-import-template.xlsx';
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    
                    toast({
                      title: t('common.success'),
                      description: t('productsData.alerts.templateDownloadSuccess'),
                    });
                  })
                  .catch(error => {
                    console.error('Error downloading template:', error);
                    toast({
                      title: t('common.error'),
                      description: t('productsData.alerts.templateDownloadError'),
                      variant: "destructive",
                    });
                  });
                }}
                className="gap-1"
              >
                <Download className="h-4 w-4" />
                {t('productsData.bulkUpload.downloadTemplate')}
              </Button>
            </div>
            
            <div className="space-y-4">
              {!uploadingFile && !uploadResults && (
                <div className="border-2 border-dashed rounded-lg p-8 text-center space-y-4">
                  <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <h3 className="text-lg font-medium">{t('productsData.bulkUpload.dragDrop')}</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {t('productsData.bulkUpload.instructions')}
                      <span className="block mt-1 font-medium">{t('productsData.bulkUpload.fileTypes')}</span>
                    </p>
                    <Input 
                      type="file" 
                      accept=".csv,.xlsx,.xls"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const formData = new FormData();
                          formData.append('file', file);
                          
                          setUploadingFile(true);
                          setUploadResults(null);
                          
                          fetch('/api/products/bulk-upload', {
                            method: 'POST',
                            credentials: 'include',
                            body: formData
                          })
                          .then(response => response.json())
                          .then(data => {
                            setUploadResults(data);
                            if (data.success) {
                              toast({
                                title: t('common.success'),
                                description: `${data.added} ${t('productsData.bulkUpload.productsAdded')}!`,
                              });
                              fetchProducts(); // Reload products
                            } else {
                              toast({
                                title: t('common.error'),
                                description: data.message || t('productsData.alerts.createError'),
                                variant: "destructive",
                              });
                            }
                          })
                          .catch(error => {
                            toast({
                              title: t('common.error'),
                              description: t('productsData.alerts.loadError') + ": " + (error.message || "Unknown error"),
                              variant: "destructive",
                            });
                            setUploadResults({ success: false, error: error.message });
                          })
                          .finally(() => {
                            setUploadingFile(false);
                          });
                        }
                      }}
                    />
                  </div>
                </div>
              )}
              
              {uploadingFile && (
                <div className="space-y-4 p-4">
                  <h3 className="text-lg font-medium flex items-center">
                    <FileUp className="mr-2 h-5 w-5 animate-pulse" />
                    {t('productsData.bulkUpload.uploadingStatus')}
                  </h3>
                  <Progress value={75} className="h-2" />
                  <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
                </div>
              )}
              
              {uploadResults && uploadResults.success && (
                <Alert className="bg-green-50 text-green-800 border-green-200">
                  <Check className="h-4 w-4" />
                  <AlertTitle>{t('common.success')}</AlertTitle>
                  <AlertDescription>
                    {t('productsData.alerts.createSuccess')} {uploadResults.added} {t('productsData.bulkUpload.productsAdded')}.
                    {uploadResults.skipped > 0 && ` (${uploadResults.skipped} ${t('productsData.bulkUpload.duplicatesCount')})`}
                  </AlertDescription>
                </Alert>
              )}
              
              {uploadResults && !uploadResults.success && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>{t('common.error')}</AlertTitle>
                  <AlertDescription>
                    {uploadResults.message || t('productsData.alerts.createError')}
                  </AlertDescription>
                </Alert>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsBulkUploadDialogOpen(false);
                setUploadingFile(false);
                setUploadResults(null);
              }}>
                {t('productsData.bulkUpload.close')}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}