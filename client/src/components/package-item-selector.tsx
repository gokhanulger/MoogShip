import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { PackageTemplateSelect } from './package-template-select';
import { Library, Search } from 'lucide-react';
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
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from '@/hooks/use-toast';
import { Pencil, Plus, Package, Trash2, Box, Save, BoxSelect, CheckCircle2 } from 'lucide-react';

// Interfaces
interface UserProduct {
  id: number;
  name: string;
  description: string | null;
  gtin: string | null;
  hsCode: string | null;
  weight: number | null;
  length: number | null;
  width: number | null;
  height: number | null;
  price: number;
  quantity: number;
  countryOfOrigin: string | null;
  manufacturer: string | null;
  userId: number;
  createdAt: Date | null;
  updatedAt: Date | null;
}

interface PackageTemplate {
  id: number;
  name: string;
  description: string | null;
  weight: number;
  length: number;
  width: number;
  height: number;
  isDefault: boolean;
  userId: number;
  createdAt: Date | null;
  updatedAt: Date | null;
}

interface PackageItem {
  id?: number;
  name: string;
  description: string;
  quantity: string;
  price: string;
  gtin: string;
  hsCode: string;
  weight: string;
  length: string;
  width: string;
  height: string;
  countryOfOrigin: string;
  manufacturer: string;
  packageId?: number; // Reference to which package this item belongs to
}

interface PackageData {
  id: number;
  name: string;
  description: string | null;
  weight: number;
  length: number;
  width: number;
  height: number;
  items: PackageItem[];
}

interface PackageItemSelectorProps {
  items: PackageItem[];
  setItems: React.Dispatch<React.SetStateAction<PackageItem[]>>;
  packages: PackageData[];
  setPackages: React.Dispatch<React.SetStateAction<PackageData[]>>;
  userId: number;
}

// Default empty item
const emptyItem: PackageItem = {
  name: '',
  description: '',
  quantity: '1',
  price: '0',
  gtin: '',
  hsCode: '',
  weight: '0',
  length: '0',
  width: '0',
  height: '0',
  countryOfOrigin: '',
  manufacturer: '',
};

const PackageItemSelector = ({ items, setItems, packages, setPackages, userId }: PackageItemSelectorProps) => {
  const [itemBeingEdited, setItemBeingEdited] = useState<PackageItem | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<UserProduct | null>(null);
  const [currentPackage, setCurrentPackage] = useState<PackageData | null>(null);
  const [showPackageDialog, setShowPackageDialog] = useState(false);
  const [showProductsDialog, setShowProductsDialog] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<{[key: string]: boolean}>({});
  
  // Fetch user's products for search
  const { data: searchResults, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['/api/products/search', searchQuery],
    queryFn: async () => {
      if (!searchQuery) return [];
      const res = await fetch(`/api/products/search?q=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) throw new Error('Failed to fetch products');
      return res.json();
    },
    enabled: searchQuery.length > 0,
  });
  
  // Fetch all user's products
  const { data: allUserProducts, isLoading: isLoadingAllProducts } = useQuery({
    queryKey: ['/api/products'],
    queryFn: async () => {
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error('Failed to fetch all products');
      return res.json();
    },
  });

  // Handle product selection
  const handleProductSelect = (index: number, product: UserProduct) => {
    // Create a new array with the updated item
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      name: product.name || '',
      description: product.description || '',
      price: product.price ? (product.price / 100).toFixed(2) : '0',
      gtin: product.gtin || '',
      hsCode: product.hsCode || '',
      weight: product.weight?.toString() || '0',
      length: product.length?.toString() || '0',
      width: product.width?.toString() || '0',
      height: product.height?.toString() || '0',
      countryOfOrigin: product.countryOfOrigin || '',
      manufacturer: product.manufacturer || '',
    };
    
    setItems(newItems);
    setSelectedProduct(null);
    setSearchQuery('');
  };

  // Handle adding a new item
  const handleAddItem = () => {
    setItemBeingEdited({ ...emptyItem });
    setIsAddingItem(true);
  };
  
  // Handle adding products from catalog
  const handleAddFromCatalog = () => {
    setSelectedProductIds({});
    setShowProductsDialog(true);
  };
  
  // Handle toggling product selection in catalog
  const handleToggleProductSelection = (productId: number) => {
    setSelectedProductIds(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };
  
  // Handle adding selected products from catalog
  const handleAddSelectedProducts = () => {
    if (!allUserProducts) return;
    
    const selectedProducts = allUserProducts.filter(product => selectedProductIds[product.id]);
    
    if (selectedProducts.length === 0) {
      toast({
        title: "No products selected",
        description: "Please select at least one product to add",
        variant: "destructive"
      });
      return;
    }
    
    // Convert products to package items
    const newItems = selectedProducts.map(product => ({
      name: product.name || '',
      description: product.description || '',
      quantity: '1',
      price: product.price ? (product.price / 100).toFixed(2) : '0',
      gtin: product.gtin || '',
      hsCode: product.hsCode || '',
      weight: product.weight?.toString() || '0',
      length: product.length?.toString() || '0',
      width: product.width?.toString() || '0',
      height: product.height?.toString() || '0',
      countryOfOrigin: product.countryOfOrigin || '',
      manufacturer: product.manufacturer || '',
    }));
    
    // Add new items
    setItems([...items, ...newItems]);
    setShowProductsDialog(false);
    setSelectedProductIds({});
    
    toast({
      title: "Products added",
      description: `Added ${selectedProducts.length} products to your items list`,
    });
  };

  // Handle editing an existing item
  const handleEditItem = (index: number) => {
    setItemBeingEdited({ ...items[index] });
    setEditingItemIndex(index);
    setIsAddingItem(false);
  };

  // Handle removing an item
  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    
    // Also remove the item from any package it might belong to
    const updatedPackages = packages.map(pkg => ({
      ...pkg,
      items: pkg.items.filter(item => 
        !items[index] || item.name !== items[index].name || item.description !== items[index].description
      )
    }));
    setPackages(updatedPackages);
  };

  // Handle saving an item (adding new or updating existing)
  const handleSaveItem = () => {
    if (!itemBeingEdited) return;
    
    // Validate required fields
    if (!itemBeingEdited.name || !itemBeingEdited.hsCode) {
      toast({
        title: "Missing required fields",
        description: "Product name and HS Code are required",
        variant: "destructive"
      });
      return;
    }

    if (isAddingItem) {
      // Adding a new item
      setItems([...items, itemBeingEdited]);
    } else if (editingItemIndex !== null) {
      // Updating an existing item
      const newItems = [...items];
      newItems[editingItemIndex] = itemBeingEdited;
      setItems(newItems);
      
      // Update the item in any package it might belong to
      const oldItem = items[editingItemIndex];
      const updatedPackages = packages.map(pkg => ({
        ...pkg,
        items: pkg.items.map(item => 
          (item.name === oldItem.name && item.description === oldItem.description) 
            ? itemBeingEdited 
            : item
        )
      }));
      setPackages(updatedPackages);
    }
    
    // Reset state
    setItemBeingEdited(null);
    setEditingItemIndex(null);
    setIsAddingItem(false);
  };

  // Handle canceling item edit/add
  const handleCancelEdit = () => {
    setItemBeingEdited(null);
    setEditingItemIndex(null);
    setIsAddingItem(false);
  };

  // Handle field changes for the item being edited
  const handleItemChange = (field: keyof PackageItem, value: string) => {
    if (!itemBeingEdited) return;
    
    setItemBeingEdited({
      ...itemBeingEdited,
      [field]: value
    });
  };

  // Handle package template selection
  const handlePackageTemplateSelect = (template: PackageTemplate) => {
    // Create a new package based on the template
    const newPackage: PackageData = {
      id: Date.now(), // Temporary ID until saved to the server
      name: template.name,
      description: template.description,
      weight: template.weight,
      length: template.length,
      width: template.width,
      height: template.height,
      items: [] // Start with no items
    };
    
    setCurrentPackage(newPackage);
    setShowPackageDialog(true);
  };

  // State for tracking selected items for packaging
  const [selectedItemsForPackage, setSelectedItemsForPackage] = useState<{[key: string]: boolean}>({});

  // Handle adding selected items to a package
  const handleAddItemsToPackage = () => {
    if (!currentPackage) return;
    
    // Get items that are selected and not already in a package
    const selectedItemsList = items.filter((item, index) => {
      const itemKey = `item-${index}`;
      const isSelected = selectedItemsForPackage[itemKey] === true;
      const isAlreadyInPackage = packages.some(pkg => 
        pkg.items.some(pkgItem => 
          pkgItem.name === item.name && pkgItem.description === item.description
        )
      );
      
      return isSelected && !isAlreadyInPackage;
    });
    
    if (selectedItemsList.length === 0) {
      toast({
        title: "No items selected",
        description: "Please select at least one item to add to this package",
        variant: "destructive"
      });
      return;
    }
    
    // Add selected items to the current package
    const updatedPackage = {
      ...currentPackage,
      items: [...selectedItemsList]
    };
    
    // Add the new package to the packages list
    setPackages([...packages, updatedPackage]);
    setCurrentPackage(null);
    setShowPackageDialog(false);
    
    // Clear selections
    setSelectedItemsForPackage({});
    
    toast({
      title: "Package created",
      description: `Created package "${updatedPackage.name}" with ${selectedItemsList.length} items`,
    });
  };

  // Handle removing a package
  const handleRemovePackage = (packageId: number) => {
    setPackages(packages.filter(pkg => pkg.id !== packageId));
  };

  // Calculate total dimensions and weight
  const getTotalMetrics = () => {
    let totalWeight = 0;
    let totalItems = 0;
    
    // Sum up all item weights
    items.forEach(item => {
      const weight = parseFloat(item.weight) || 0;
      const quantity = parseInt(item.quantity) || 1;
      totalWeight += weight * quantity;
      totalItems += quantity;
    });
    
    return {
      totalWeight,
      totalItems
    };
  };

  const { totalWeight, totalItems } = getTotalMetrics();

  // Count items assigned to packages
  const getAssignedItemsCount = () => {
    const assignedItems = new Set();
    
    packages.forEach(pkg => {
      pkg.items.forEach(item => {
        // Create a unique identifier for each item
        const itemId = `${item.name}-${item.description}`;
        assignedItems.add(itemId);
      });
    });
    
    return assignedItems.size;
  };

  const assignedItemsCount = getAssignedItemsCount();
  const unassignedItemsCount = items.length - assignedItemsCount;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Package Items</h3>
          <p className="text-sm text-muted-foreground">Add items to be shipped</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleAddFromCatalog}
            className="flex items-center gap-1"
          >
            <Library className="h-4 w-4" />
            Add from Catalog
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleAddItem}
            className="flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            Add Custom Item
          </Button>
        </div>
      </div>

      {/* Items Table */}
      {items.length > 0 ? (
        <Card>
          <CardHeader className="py-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base">Items ({items.length})</CardTitle>
              <CardDescription>
                Total: {totalItems} items, {totalWeight.toFixed(2)} kg
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Dimensions</TableHead>
                  <TableHead>HS Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => {
                  // Check if this item is in any package
                  const isInPackage = packages.some(pkg => 
                    pkg.items.some(pkgItem => 
                      pkgItem.name === item.name && pkgItem.description === item.description
                    )
                  );
                  
                  return (
                    <TableRow key={index}>
                      <TableCell className="font-medium max-w-[200px] truncate" title={item.name}>
                        {item.name}
                      </TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>${parseFloat(item.price).toFixed(2)}</TableCell>
                      <TableCell>{parseFloat(item.weight).toFixed(2)} kg</TableCell>
                      <TableCell>
                        {parseFloat(item.length).toFixed(1)} × {parseFloat(item.width).toFixed(1)} × {parseFloat(item.height).toFixed(1)} cm
                      </TableCell>
                      <TableCell>{item.hsCode}</TableCell>
                      <TableCell>
                        {isInPackage ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Packaged
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Unpackaged
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditItem(index)}
                            className="h-8 w-8"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(index)}
                            className="h-8 w-8 text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <div className="flex items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <div>
            <Package className="h-10 w-10 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium mb-1">No items added</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add items to be packaged and shipped
            </p>
            <Button onClick={handleAddItem}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Item
            </Button>
          </div>
        </div>
      )}

      {/* Packages Section */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-medium">Packages</h3>
            <p className="text-sm text-muted-foreground">
              Group items into packages for shipping
            </p>
          </div>
          <div className="flex gap-2">
            {items.length > 0 && assignedItemsCount < items.length && (
              <div className="text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-md">
                {unassignedItemsCount} item{unassignedItemsCount !== 1 ? 's' : ''} not packaged
              </div>
            )}
            <PackageTemplateSelect 
              onSelect={handlePackageTemplateSelect}
              userId={userId}
            />
          </div>
        </div>

        {/* Packages List */}
        {packages.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {packages.map((pkg) => (
              <Card key={pkg.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center">
                      <Box className="h-4 w-4 mr-2 text-primary" />
                      {pkg.name}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemovePackage(pkg.id)}
                      className="h-6 w-6 text-destructive ml-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {pkg.length} × {pkg.width} × {pkg.height} cm | {pkg.weight} kg
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-sm">
                    <div className="font-medium mb-1">Items ({pkg.items.length})</div>
                    <ul className="space-y-1 max-h-32 overflow-y-auto pr-2 text-xs">
                      {pkg.items.map((item, idx) => (
                        <li key={idx} className="flex justify-between items-center border-b border-gray-100 pb-1">
                          <span className="truncate max-w-[180px]" title={item.name}>
                            {item.name}
                          </span>
                          <span className="text-muted-foreground">
                            {item.quantity}x
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-lg border border-dashed p-8 text-center">
            <div>
              <BoxSelect className="h-10 w-10 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium mb-1">No packages created</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Select a package template to group your items
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Item Edit/Add Dialog */}
      <Dialog open={!!itemBeingEdited} onOpenChange={(open) => !open && handleCancelEdit()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isAddingItem ? 'Add New Item' : 'Edit Item'}</DialogTitle>
            <DialogDescription>
              Enter the item details for your shipment
            </DialogDescription>
          </DialogHeader>

          {itemBeingEdited && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Name*</Label>
                <Input
                  className="col-span-3"
                  value={itemBeingEdited.name}
                  onChange={(e) => handleItemChange('name', e.target.value)}
                  placeholder="Product name"
                />
              </div>

              {/* Product search for autofill */}
              {isAddingItem && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Search</Label>
                  <div className="col-span-3 relative">
                    <Input
                      placeholder="Search your products..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery.length > 0 && searchResults && searchResults.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-md max-h-60 overflow-y-auto">
                        {searchResults.map((product: UserProduct) => (
                          <div
                            key={product.id}
                            className="p-2 hover:bg-gray-100 cursor-pointer border-b"
                            onClick={() => {
                              handleProductSelect(
                                editingItemIndex !== null ? editingItemIndex : items.length,
                                product
                              );
                              setSearchQuery('');
                            }}
                          >
                            <div className="font-medium">{product.name}</div>
                            <div className="text-xs text-gray-500 truncate">
                              {product.description || 'No description'}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Description</Label>
                <Input
                  className="col-span-3"
                  value={itemBeingEdited.description}
                  onChange={(e) => handleItemChange('description', e.target.value)}
                  placeholder="Item description"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Quantity</Label>
                <Input
                  className="col-span-3"
                  type="number"
                  min="1"
                  value={itemBeingEdited.quantity}
                  onChange={(e) => handleItemChange('quantity', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Price ($)</Label>
                <Input
                  className="col-span-3"
                  type="number"
                  min="0"
                  step="0.01"
                  value={itemBeingEdited.price}
                  onChange={(e) => handleItemChange('price', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">HS Code*</Label>
                <Input
                  className="col-span-3"
                  value={itemBeingEdited.hsCode}
                  onChange={(e) => handleItemChange('hsCode', e.target.value)}
                  placeholder="Harmonized System Code"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">GTIN/EAN</Label>
                <Input
                  className="col-span-3"
                  value={itemBeingEdited.gtin}
                  onChange={(e) => handleItemChange('gtin', e.target.value)}
                  placeholder="Global Trade Item Number"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Weight (kg)</Label>
                <Input
                  className="col-span-3"
                  type="number"
                  min="0"
                  step="0.01"
                  value={itemBeingEdited.weight}
                  onChange={(e) => handleItemChange('weight', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Dimensions (cm)</Label>
                <div className="col-span-3 grid grid-cols-3 gap-2">
                  <Input
                    placeholder="Length"
                    type="number"
                    min="0"
                    step="0.1"
                    value={itemBeingEdited.length}
                    onChange={(e) => handleItemChange('length', e.target.value)}
                  />
                  <Input
                    placeholder="Width"
                    type="number"
                    min="0"
                    step="0.1"
                    value={itemBeingEdited.width}
                    onChange={(e) => handleItemChange('width', e.target.value)}
                  />
                  <Input
                    placeholder="Height"
                    type="number"
                    min="0"
                    step="0.1"
                    value={itemBeingEdited.height}
                    onChange={(e) => handleItemChange('height', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Country of Origin</Label>
                <Select 
                  value={itemBeingEdited.countryOfOrigin}
                  onValueChange={(value) => handleItemChange('countryOfOrigin', value)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TR">Turkey</SelectItem>
                    <SelectItem value="US">United States</SelectItem>
                    <SelectItem value="CN">China</SelectItem>
                    <SelectItem value="DE">Germany</SelectItem>
                    <SelectItem value="UK">United Kingdom</SelectItem>
                    <SelectItem value="FR">France</SelectItem>
                    <SelectItem value="IT">Italy</SelectItem>
                    <SelectItem value="JP">Japan</SelectItem>
                    <SelectItem value="KR">South Korea</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Manufacturer</Label>
                <Input
                  className="col-span-3"
                  value={itemBeingEdited.manufacturer}
                  onChange={(e) => handleItemChange('manufacturer', e.target.value)}
                  placeholder="Item manufacturer"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleCancelEdit}>Cancel</Button>
            <Button onClick={handleSaveItem}>
              <Save className="h-4 w-4 mr-2" />
              {isAddingItem ? 'Add Item' : 'Update Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Package Creation Dialog */}
      <Dialog open={showPackageDialog} onOpenChange={setShowPackageDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Package</DialogTitle>
            <DialogDescription>
              {currentPackage?.name} ({currentPackage?.length}×{currentPackage?.width}×{currentPackage?.height} cm)
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm mb-4">
              Select items to add to this package:
            </p>

            <div className="border rounded-md max-h-60 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">Select</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Weight</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items
                    .filter(item => 
                      !packages.some(pkg => pkg.items.some(pkgItem => 
                        pkgItem.name === item.name && pkgItem.description === item.description
                      ))
                    )
                    .map((item, index) => {
                      const itemKey = `item-${index}`;
                      return (
                        <TableRow 
                          key={index} 
                          className={selectedItemsForPackage[itemKey] ? "bg-primary/5" : ""}
                          onClick={() => {
                            setSelectedItemsForPackage(prev => ({
                              ...prev, 
                              [itemKey]: !prev[itemKey]
                            }));
                          }}
                        >
                          <TableCell className="p-2">
                            <div className="flex items-center justify-center">
                              <input 
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                checked={selectedItemsForPackage[itemKey] || false}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  setSelectedItemsForPackage(prev => ({
                                    ...prev, 
                                    [itemKey]: e.target.checked
                                  }));
                                }}
                              />
                            </div>
                          </TableCell>
                          <TableCell className="font-medium max-w-[150px] truncate" title={item.name}>
                            {item.name}
                          </TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{parseFloat(item.weight).toFixed(2)} kg</TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
            
            <div className="mt-4 text-sm text-right">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  // Get all unpackaged items
                  const unpackagedItems = items.filter(item => 
                    !packages.some(pkg => pkg.items.some(pkgItem => 
                      pkgItem.name === item.name && pkgItem.description === item.description
                    ))
                  );
                  
                  // Create a new object with all items selected
                  const allSelected = {};
                  unpackagedItems.forEach((_, index) => {
                    allSelected[`item-${index}`] = true;
                  });
                  
                  setSelectedItemsForPackage(allSelected);
                }}
              >
                Select All
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedItemsForPackage({})}
              >
                Clear Selection
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPackageDialog(false)}>Cancel</Button>
            <Button onClick={handleAddItemsToPackage}>
              <Box className="h-4 w-4 mr-2" />
              Create Package
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Package Items</h3>
          <p className="text-sm text-muted-foreground">Add items to be shipped</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleAddFromCatalog}
            className="flex items-center gap-1"
          >
            <Library className="h-4 w-4" />
            Add from Catalog
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleAddItem}
            className="flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            Add Custom Item
          </Button>
        </div>
      </div>

      {/* Items Table */}
      {items.length > 0 ? (
        <Card>
          <CardHeader className="py-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base">Items ({items.length})</CardTitle>
              <CardDescription>
                Total: {totalItems} items, {totalWeight.toFixed(2)} kg
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Dimensions</TableHead>
                  <TableHead>HS Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => {
                  // Check if this item is in any package
                  const isInPackage = packages.some(pkg => 
                    pkg.items.some(pkgItem => 
                      pkgItem.name === item.name && pkgItem.description === item.description
                    )
                  );
                  
                  return (
                    <TableRow key={index}>
                      <TableCell className="font-medium max-w-[200px] truncate" title={item.name}>
                        {item.name}
                      </TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>${parseFloat(item.price).toFixed(2)}</TableCell>
                      <TableCell>{parseFloat(item.weight).toFixed(2)} kg</TableCell>
                      <TableCell>
                        {parseFloat(item.length).toFixed(1)} × {parseFloat(item.width).toFixed(1)} × {parseFloat(item.height).toFixed(1)} cm
                      </TableCell>
                      <TableCell>{item.hsCode}</TableCell>
                      <TableCell>
                        {isInPackage ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Packaged
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Unpackaged
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditItem(index)}
                            className="h-8 w-8"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(index)}
                            className="h-8 w-8 text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <div className="flex items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <div>
            <Package className="h-10 w-10 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium mb-1">No items added</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add items to be packaged and shipped
            </p>
            <Button onClick={handleAddItem}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Item
            </Button>
          </div>
        </div>
      )}

      {/* Packages Section */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-medium">Packages</h3>
            <p className="text-sm text-muted-foreground">
              Group items into packages for shipping
            </p>
          </div>
          <div className="flex gap-2">
            {items.length > 0 && assignedItemsCount < items.length && (
              <div className="text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-md">
                {unassignedItemsCount} item{unassignedItemsCount !== 1 ? 's' : ''} not packaged
              </div>
            )}
            <PackageTemplateSelect 
              onSelect={handlePackageTemplateSelect}
              userId={userId}
            />
          </div>
        </div>

        {/* Packages List */}
        {packages.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {packages.map((pkg) => (
              <Card key={pkg.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center">
                      <Box className="h-4 w-4 mr-2 text-primary" />
                      {pkg.name}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemovePackage(pkg.id)}
                      className="h-6 w-6 text-destructive ml-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {pkg.length} × {pkg.width} × {pkg.height} cm | {pkg.weight} kg
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="text-sm">
                    <div className="font-medium mb-1">Items ({pkg.items.length})</div>
                    <ul className="space-y-1 max-h-32 overflow-y-auto pr-2 text-xs">
                      {pkg.items.map((item, idx) => (
                        <li key={idx} className="flex justify-between items-center border-b border-gray-100 pb-1">
                          <span className="truncate max-w-[180px]" title={item.name}>
                            {item.name}
                          </span>
                          <span className="text-muted-foreground">
                            {item.quantity}x
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-lg border border-dashed p-8 text-center">
            <div>
              <BoxSelect className="h-10 w-10 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium mb-1">No packages created</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Select a package template to group your items
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Item Edit/Add Dialog */}
      <Dialog open={!!itemBeingEdited} onOpenChange={(open) => !open && handleCancelEdit()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isAddingItem ? 'Add New Item' : 'Edit Item'}</DialogTitle>
            <DialogDescription>
              Enter the item details for your shipment
            </DialogDescription>
          </DialogHeader>

          {itemBeingEdited && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Name*</Label>
                <Input
                  className="col-span-3"
                  value={itemBeingEdited.name}
                  onChange={(e) => handleItemChange('name', e.target.value)}
                  placeholder="Product name"
                />
              </div>

              {/* Product search for autofill */}
              {isAddingItem && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Search</Label>
                  <div className="col-span-3 relative">
                    <Input
                      placeholder="Search your products..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery.length > 0 && searchResults && searchResults.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-md max-h-60 overflow-y-auto">
                        {searchResults.map((product: UserProduct) => (
                          <div
                            key={product.id}
                            className="p-2 hover:bg-gray-100 cursor-pointer border-b"
                            onClick={() => {
                              handleProductSelect(
                                editingItemIndex !== null ? editingItemIndex : items.length,
                                product
                              );
                              setSearchQuery('');
                            }}
                          >
                            <div className="font-medium">{product.name}</div>
                            <div className="text-xs text-gray-500 truncate">
                              {product.description || 'No description'}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Description</Label>
                <Input
                  className="col-span-3"
                  value={itemBeingEdited.description}
                  onChange={(e) => handleItemChange('description', e.target.value)}
                  placeholder="Item description"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Quantity</Label>
                <Input
                  className="col-span-3"
                  type="number"
                  min="1"
                  value={itemBeingEdited.quantity}
                  onChange={(e) => handleItemChange('quantity', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Price ($)</Label>
                <Input
                  className="col-span-3"
                  type="number"
                  min="0"
                  step="0.01"
                  value={itemBeingEdited.price}
                  onChange={(e) => handleItemChange('price', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">HS Code*</Label>
                <Input
                  className="col-span-3"
                  value={itemBeingEdited.hsCode}
                  onChange={(e) => handleItemChange('hsCode', e.target.value)}
                  placeholder="Harmonized System Code"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">GTIN/EAN</Label>
                <Input
                  className="col-span-3"
                  value={itemBeingEdited.gtin}
                  onChange={(e) => handleItemChange('gtin', e.target.value)}
                  placeholder="Global Trade Item Number"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Weight (kg)</Label>
                <Input
                  className="col-span-3"
                  type="number"
                  min="0"
                  step="0.01"
                  value={itemBeingEdited.weight}
                  onChange={(e) => handleItemChange('weight', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Dimensions (cm)</Label>
                <div className="col-span-3 grid grid-cols-3 gap-2">
                  <Input
                    placeholder="Length"
                    type="number"
                    min="0"
                    step="0.1"
                    value={itemBeingEdited.length}
                    onChange={(e) => handleItemChange('length', e.target.value)}
                  />
                  <Input
                    placeholder="Width"
                    type="number"
                    min="0"
                    step="0.1"
                    value={itemBeingEdited.width}
                    onChange={(e) => handleItemChange('width', e.target.value)}
                  />
                  <Input
                    placeholder="Height"
                    type="number"
                    min="0"
                    step="0.1"
                    value={itemBeingEdited.height}
                    onChange={(e) => handleItemChange('height', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Country of Origin</Label>
                <Select 
                  value={itemBeingEdited.countryOfOrigin}
                  onValueChange={(value) => handleItemChange('countryOfOrigin', value)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TR">Turkey</SelectItem>
                    <SelectItem value="US">United States</SelectItem>
                    <SelectItem value="CN">China</SelectItem>
                    <SelectItem value="DE">Germany</SelectItem>
                    <SelectItem value="UK">United Kingdom</SelectItem>
                    <SelectItem value="FR">France</SelectItem>
                    <SelectItem value="IT">Italy</SelectItem>
                    <SelectItem value="JP">Japan</SelectItem>
                    <SelectItem value="KR">South Korea</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Manufacturer</Label>
                <Input
                  className="col-span-3"
                  value={itemBeingEdited.manufacturer}
                  onChange={(e) => handleItemChange('manufacturer', e.target.value)}
                  placeholder="Item manufacturer"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleCancelEdit}>Cancel</Button>
            <Button onClick={handleSaveItem}>
              <Save className="h-4 w-4 mr-2" />
              {isAddingItem ? 'Add Item' : 'Update Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Package Creation Dialog */}
      <Dialog open={showPackageDialog} onOpenChange={setShowPackageDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Package</DialogTitle>
            <DialogDescription>
              {currentPackage?.name} ({currentPackage?.length}×{currentPackage?.width}×{currentPackage?.height} cm)
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm mb-4">
              Select items to add to this package:
            </p>

            <div className="border rounded-md max-h-60 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">Select</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Weight</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items
                    .filter(item => 
                      !packages.some(pkg => pkg.items.some(pkgItem => 
                        pkgItem.name === item.name && pkgItem.description === item.description
                      ))
                    )
                    .map((item, index) => {
                      const itemKey = `item-${index}`;
                      return (
                        <TableRow 
                          key={index} 
                          className={selectedItemsForPackage[itemKey] ? "bg-primary/5" : ""}
                          onClick={() => {
                            setSelectedItemsForPackage(prev => ({
                              ...prev, 
                              [itemKey]: !prev[itemKey]
                            }));
                          }}
                        >
                          <TableCell className="p-2">
                            <div className="flex items-center justify-center">
                              <input 
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                checked={selectedItemsForPackage[itemKey] || false}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  setSelectedItemsForPackage(prev => ({
                                    ...prev, 
                                    [itemKey]: e.target.checked
                                  }));
                                }}
                              />
                            </div>
                          </TableCell>
                          <TableCell className="font-medium max-w-[150px] truncate" title={item.name}>
                            {item.name}
                          </TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{parseFloat(item.weight).toFixed(2)} kg</TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
            
            <div className="mt-4 text-sm text-right">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  // Get all unpackaged items
                  const unpackagedItems = items.filter(item => 
                    !packages.some(pkg => pkg.items.some(pkgItem => 
                      pkgItem.name === item.name && pkgItem.description === item.description
                    ))
                  );
                  
                  // Create a new object with all items selected
                  const allSelected = {};
                  unpackagedItems.forEach((_, index) => {
                    allSelected[`item-${index}`] = true;
                  });
                  
                  setSelectedItemsForPackage(allSelected);
                }}
              >
                Select All
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedItemsForPackage({})}
              >
                Clear Selection
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPackageDialog(false)}>Cancel</Button>
            <Button onClick={handleAddItemsToPackage}>
              <Box className="h-4 w-4 mr-2" />
              Create Package
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Products Catalog Dialog - Instant Search Implementation */}
      <Dialog open={showProductsDialog} onOpenChange={(open) => {
        if (!open) {
          // When closing the dialog, if there are selected products, add them to the shipment
          const selectedCount = Object.keys(selectedProductIds).filter(id => selectedProductIds[id]).length;
          if (selectedCount > 0) {
            handleAddSelectedProducts();
          }
        }
        setShowProductsDialog(open);
      }}>
        <DialogContent className="max-w-2xl p-0 max-h-[90vh] flex flex-col">
          <div className="px-4 pt-4 pb-2 sticky top-0 bg-white z-10 border-b">
            <DialogTitle className="text-lg mb-2">Products Catalog</DialogTitle>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <Input
                placeholder="Type to instantly filter products..."
                className="pl-10 pr-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              {searchQuery && (
                <button 
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-500"
                  onClick={() => setSearchQuery('')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              )}
            </div>
            
            {/* Selection count indicator */}
            <div className="flex justify-between items-center mt-2">
              <div className="flex items-center">
                {Object.keys(selectedProductIds).filter(id => selectedProductIds[id]).length > 0 ? (
                  <span className="text-xs text-primary font-medium">
                    {Object.keys(selectedProductIds).filter(id => selectedProductIds[id]).length} product(s) selected
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Click items to select • Press ESC when done
                  </span>
                )}
              </div>
              {Object.keys(selectedProductIds).filter(id => selectedProductIds[id]).length > 0 && (
                <button 
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setSelectedProductIds({})}
                >
                  Clear selection
                </button>
              )}
            </div>
          </div>
          
          <div className="flex-1 overflow-auto min-h-[50vh]">
            {isLoadingAllProducts ? (
              <div className="flex items-center justify-center h-20">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : allUserProducts && allUserProducts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-gray-200">
                {(searchQuery.length > 0 ? searchResults || [] : allUserProducts).map((product: UserProduct) => (
                  <div 
                    key={product.id} 
                    className={`p-3 bg-white hover:bg-gray-50 cursor-pointer ${selectedProductIds[product.id] ? "bg-primary/5 border-l-4 border-primary" : ""}`}
                    onClick={() => handleToggleProductSelection(product.id)}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0">
                        <input 
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary mt-1"
                          checked={selectedProductIds[product.id] || false}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleToggleProductSelection(product.id);
                          }}
                        />
                      </div>
                      <div className="flex-grow min-w-0">
                        <div className="flex justify-between items-start">
                          <h4 className="font-medium text-sm truncate pr-2" title={product.name}>
                            {product.name}
                          </h4>
                          <span className="text-sm font-medium whitespace-nowrap">${product.price?.toFixed(2) || "0.00"}</span>
                        </div>
                        
                        {product.description && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-1">{product.description}</p>
                        )}
                        
                        <div className="flex flex-wrap gap-1 mt-2">
                          {product.hsCode && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700">
                              HS: {product.hsCode}
                            </span>
                          )}
                          {product.weight && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                              {product.weight} kg
                            </span>
                          )}
                          {product.countryOfOrigin && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs bg-amber-50 text-amber-700">
                              {product.countryOfOrigin}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                {searchQuery.length > 0 ? 'No matching products found' : 'No products in your catalog'}
              </div>
            )}
          </div>
          
          <div className="px-4 py-3 border-t bg-gray-50 flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              {searchQuery.length > 0 ? 
                `Showing ${(searchResults || []).length} of ${allUserProducts?.length || 0} products` : 
                `${allUserProducts?.length || 0} products in catalog`}
            </span>
            <div className="flex gap-2 items-center">
              <Button variant="outline" size="sm" onClick={() => setShowProductsDialog(false)}>
                Cancel
              </Button>
              {Object.keys(selectedProductIds).filter(id => selectedProductIds[id]).length > 0 && (
                <Button size="sm" onClick={handleAddSelectedProducts}>
                  Add {Object.keys(selectedProductIds).filter(id => selectedProductIds[id]).length} to Shipment
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PackageItemSelector;