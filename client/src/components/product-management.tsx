import { useState, useEffect } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl, getAuthHeaders } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Pencil, Trash2, PackageOpen, Plus, Search } from "lucide-react";

interface UserProduct {
  id: number;
  name: string;
  sku: string | null;
  description: string | null;
  hsCode: string;
  price: number;
  quantity: number;
  countryOfOrigin: string;
  // Legacy fields kept for backward compatibility
  weight: number | null;
  length: number | null;
  width: number | null;
  height: number | null;
  manufacturer: string | null;
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

const productFormSchema = z.object({
  name: z.string().min(1, { message: "Product name is required" }),
  sku: z.string().optional(),
  description: z.string().optional(),
  hsCode: z.string().min(1, { message: "HS Code is required" }),
  price: z.string().min(1, { message: "Price is required" }),
  quantity: z.string().min(1, { message: "Quantity is required" }),
  countryOfOrigin: z.string().min(1, { message: "Country of origin is required" }),
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
  const [products, setProducts] = useState<UserProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<UserProduct | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  // Product form using react-hook-form
  const form = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: emptyFormData,
  });

  // Load user products on mount
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await fetch(getApiUrl('/api/products'), {
        credentials: 'include',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      } else {
        toast({
          title: "Error",
          description: "Failed to load products. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to connect to the server.",
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
      
      const response = await fetch(getApiUrl('/api/products'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
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
          title: "Success",
          description: "Product created successfully!",
        });
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create product');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create product.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateProduct = async (data: ProductFormData) => {
    if (!selectedProduct) return;
    
    try {
      // Convert price string to cents (integer)
      const priceInCents = Math.round(parseFloat(data.price) * 100);
      
      const response = await fetch(getApiUrl(`/api/products/${selectedProduct.id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
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
          // Keep legacy fields as they were before or null
          weight: selectedProduct.weight,
          length: selectedProduct.length,
          width: selectedProduct.width,
          height: selectedProduct.height,
          manufacturer: selectedProduct.manufacturer
        }),
      });
      
      if (response.ok) {
        const updatedProduct = await response.json();
        setProducts(products.map(p => p.id === updatedProduct.id ? updatedProduct : p));
        setIsEditDialogOpen(false);
        
        toast({
          title: "Success",
          description: "Product updated successfully!",
        });
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update product');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update product.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteProduct = async () => {
    if (!selectedProduct) return;
    
    try {
      const response = await fetch(getApiUrl(`/api/products/${selectedProduct.id}`), {
        method: 'DELETE',
        credentials: 'include',
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        setProducts(products.filter(p => p.id !== selectedProduct.id));
        setIsDeleteDialogOpen(false);
        
        toast({
          title: "Success",
          description: "Product deleted successfully!",
        });
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete product');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete product.",
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Product Catalog</h2>
          <p className="text-muted-foreground">
            Manage your product inventory for shipments
          </p>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="mr-2 h-4 w-4" /> Add Product
        </Button>
      </div>

      <div className="flex w-full max-w-sm items-center space-x-2 mb-4">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search" 
            placeholder="Search products..." 
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
          <h3 className="text-lg font-medium">No products yet</h3>
          <p className="text-muted-foreground mb-4">You haven't added any products to your catalog yet.</p>
          <Button onClick={openAddDialog}>
            <Plus className="mr-2 h-4 w-4" /> Add Your First Product
          </Button>
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>HS Code</TableHead>
                <TableHead>Country of Origin</TableHead>
                <TableHead className="text-right">Actions</TableHead>
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
                  <TableCell>{product.sku || <span className="text-muted-foreground text-xs">No SKU</span>}</TableCell>
                  <TableCell>${(product.price / 100).toFixed(2)}</TableCell>
                  <TableCell>{product.hsCode || <span className="text-muted-foreground text-xs">Not specified</span>}</TableCell>
                  <TableCell>{product.countryOfOrigin || <span className="text-muted-foreground text-xs">Not specified</span>}</TableCell>
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
            <DialogTitle>Add New Product</DialogTitle>
            <DialogDescription>
              Add a new product to your catalog for use in shipments.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreateProduct)} className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="dimensions">Dimensions</TabsTrigger>
                  <TabsTrigger value="customs">Customs Info</TabsTrigger>
                </TabsList>
                
                <TabsContent value="basic" className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Name*</FormLabel>
                        <FormControl>
                          <Input placeholder="Product Name" {...field} />
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
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Product Description" {...field} />
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
                          <FormLabel>Price ($)*</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="0.00" {...field} />
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
                          <FormLabel>Quantity*</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" placeholder="0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="dimensions" className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="weight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Weight (kg)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="length"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Length (cm)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.1" placeholder="0.0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="width"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Width (cm)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.1" placeholder="0.0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="height"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Height (cm)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.1" placeholder="0.0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="customs" className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="gtin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>GTIN / UPC</FormLabel>
                        <FormControl>
                          <Input placeholder="Global Trade Item Number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="hsCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>HS Code</FormLabel>
                        <FormControl>
                          <Input placeholder="Harmonized System Code" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="countryOfOrigin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country of Origin</FormLabel>
                          <FormControl>
                            <Input placeholder="Country Code (e.g., US)" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="manufacturer"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Manufacturer</FormLabel>
                          <FormControl>
                            <Input placeholder="Manufacturer Name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
              </Tabs>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add Product</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update product details for your catalog.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdateProduct)} className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="dimensions">Dimensions</TabsTrigger>
                  <TabsTrigger value="customs">Customs Info</TabsTrigger>
                </TabsList>
                
                <TabsContent value="basic" className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Name*</FormLabel>
                        <FormControl>
                          <Input placeholder="Product Name" {...field} />
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
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Product Description" {...field} />
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
                          <FormLabel>Price ($)*</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="0.00" {...field} />
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
                          <FormLabel>Quantity*</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" placeholder="0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="dimensions" className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="weight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Weight (kg)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="length"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Length (cm)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.1" placeholder="0.0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="width"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Width (cm)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.1" placeholder="0.0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="height"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Height (cm)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.1" placeholder="0.0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="customs" className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="gtin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>GTIN / UPC</FormLabel>
                        <FormControl>
                          <Input placeholder="Global Trade Item Number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="hsCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>HS Code</FormLabel>
                        <FormControl>
                          <Input placeholder="Harmonized System Code" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="countryOfOrigin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country of Origin</FormLabel>
                          <FormControl>
                            <Input placeholder="Country Code (e.g., US)" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="manufacturer"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Manufacturer</FormLabel>
                          <FormControl>
                            <Input placeholder="Manufacturer Name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
              </Tabs>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Update Product</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the product "{selectedProduct?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProduct} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}