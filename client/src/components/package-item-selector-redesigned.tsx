import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { getApiUrl, getAuthHeaders } from '@/lib/queryClient';
import { PackageTemplateSelect } from './package-template-select';
import { PackageTemplateSelector } from './package-template-selector';
import { ProductNameTranslator } from './product-name-translator';
import { Library, Search, Pencil, Plus, Package, Trash2, Box, Save, BoxSelect, CheckCircle2, Sparkles, Copy, HelpCircle, Languages, Loader2, AlertCircle, Edit3, Hash, DollarSign, Tag, Settings, FileText, Ruler, Weight } from 'lucide-react';
import useAchievements from '@/hooks/use-achievements';
import { useShippingAssistant } from '@/components/shipping-assistant-provider';
import { PopIn } from '@/components/animated-elements';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from '@/hooks/use-toast';
import { HSCodeInput } from './hs-code-input';
import { HSCodeInputWithTax } from './hs-code-input-with-tax';

// Redefine interfaces that were in the original component
interface UserProduct {
  id: number;
  name: string;
  description: string | null;
  gtin: string | null;
  hsCode: string | null;
  // weight: number | null; // Removed as per requirements
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
  currency?: string; // Currency for the price value
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
  onPackageChange?: () => void; // Callback for when package details change
  destinationCountry?: string; // Country code for tax calculation (e.g., 'US', 'GB', 'DE')
}

// Utility function to validate product name has at least 2 words
const isValidProductName = (name: string): boolean => {
  if (!name || typeof name !== 'string') return false;
  
  // Split by whitespace and filter out empty strings
  const words = name.trim().split(/\s+/).filter(word => word.length > 0);
  return words.length >= 2;
};

// Default empty item
const emptyItem: PackageItem = {
  name: '',
  description: '',
  quantity: '1',
  price: '0',
  currency: 'USD', // Default currency
  gtin: '',
  hsCode: '',
  weight: '', // Empty by default to force user input
  length: '10', // Default minimal dimensions
  width: '10',
  height: '10',
  countryOfOrigin: '',
  manufacturer: '',
};

const PackageItemSelectorRedesigned = ({ items, setItems, packages, setPackages, userId, onPackageChange, destinationCountry = 'US' }: PackageItemSelectorProps) => {
  const { t } = useTranslation();
  const [itemBeingEdited, setItemBeingEdited] = useState<PackageItem | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<UserProduct | null>(null);
  const [currentPackage, setCurrentPackage] = useState<PackageData | null>(null);
  const [showPackageDialog, setShowPackageDialog] = useState(false);
  const [showProductsDialog, setShowProductsDialog] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<{[key: string]: boolean}>({});
  const [quickSearchQuery, setQuickSearchQuery] = useState('');
  const [quickSearchResults, setQuickSearchResults] = useState<UserProduct[]>([]);
  const [quickAddQuery, setQuickAddQuery] = useState('');
  const [quickAddResults, setQuickAddResults] = useState<UserProduct[]>([]);
  const [quickAddHsCode, setQuickAddHsCode] = useState('');
  const [quickAddQuantity, setQuickAddQuantity] = useState('1');
  const [quickAddPrice, setQuickAddPrice] = useState('');
  const [quickAddSelectedProduct, setQuickAddSelectedProduct] = useState<UserProduct | null>(null);
  const [packageLength, setPackageLength] = useState('');
  const [packageWidth, setPackageWidth] = useState('');
  const [packageHeight, setPackageHeight] = useState('');
  const [editingCell, setEditingCell] = useState<{packageIndex: number, field: string} | null>(null);
  const [editValue, setEditValue] = useState('');
  const [packageWeight, setPackageWeight] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  
  // Initialize the achievement and shipping assistant hooks
  let { earnAchievement, checkMultiplePackages, markTemplateUsed } = { 
    earnAchievement: () => {}, 
    checkMultiplePackages: () => {},
    markTemplateUsed: () => {} 
  };
  
  let { triggerEvent } = { 
    triggerEvent: () => {} 
  };
  
  // Safely try to use the achievement system
  try {
    const achievements = useAchievements();
    earnAchievement = achievements.earnAchievement;
    checkMultiplePackages = achievements.checkMultiplePackages;
    markTemplateUsed = achievements.markTemplateUsed;
    
    const assistant = useShippingAssistant();
    triggerEvent = assistant.triggerEvent;
  } catch (error) {
    console.log("Achievements or shipping assistant not available", error);
  }
  
  // Available currencies for price selection
  const currencies = ['USD', 'EUR', 'GBP', 'TRY', 'JPY'];
  
  // Fetch user's products for search
  const { data: searchResults, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['/api/products/search', searchQuery],
    queryFn: async () => {
      if (!searchQuery) return [];
      const res = await fetch(getApiUrl(`/api/products/search?q=${encodeURIComponent(searchQuery)}`), {
        credentials: 'include',
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed to fetch products');
      return res.json();
    },
    enabled: searchQuery.length > 0,
  });

  // Fetch all user's products
  const { data: allUserProducts, isLoading: isLoadingAllProducts } = useQuery({
    queryKey: ['/api/products'],
    queryFn: async () => {
      const res = await fetch(getApiUrl('/api/products'), {
        credentials: 'include',
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed to fetch all products');
      return res.json();
    },
  });

  // Handle product selection
  const handleProductSelect = (product: UserProduct) => {
    const newItem: PackageItem = {
      name: product.name || '',
      description: product.description || '',
      quantity: '1',
      price: product.price ? (product.price / 100).toFixed(2) : '0',
      gtin: product.gtin || '',
      hsCode: product.hsCode || '',
      weight: '', // User will enter weight manually
      length: product.length?.toString() || '0',
      width: product.width?.toString() || '0',
      height: product.height?.toString() || '0',
      countryOfOrigin: product.countryOfOrigin || '',
      manufacturer: product.manufacturer || '',
    };
    
    setItems([...items, newItem]);
    setSelectedProduct(null);
    setSearchQuery('');
  };

  // Handle adding a new item from the search bar
  const handleAddItem = () => {
    // If there's text in the search box, use that as the item name
    const customName = searchQuery.trim() || "New Item";
    const customItem = { 
      ...emptyItem,
      name: customName
    };
    
    setItemBeingEdited(customItem);
    setIsAddingItem(true);
    setSearchQuery('');
  };

  // Handle quick search for existing products
  const handleQuickSearch = async (query: string) => {
    if (!query || query.length < 2) {
      setQuickSearchResults([]);
      return;
    }

    try {
      const res = await fetch(getApiUrl(`/api/products/search?q=${encodeURIComponent(query)}`), {
        credentials: 'include',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const results = await res.json();
        setQuickSearchResults(results);
      } else {
        setQuickSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching products:', error);
      setQuickSearchResults([]);
    }
  };

  // Handle search for quick add form
  const handleQuickAddSearch = async (query: string) => {
    if (!query || query.length < 2) {
      setQuickAddResults([]);
      return;
    }

    try {
      const res = await fetch(getApiUrl(`/api/products/search?q=${encodeURIComponent(query)}`), {
        credentials: 'include',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const results = await res.json();
        setQuickAddResults(results);
      } else {
        setQuickAddResults([]);
      }
    } catch (error) {
      console.error('Error searching products:', error);
      setQuickAddResults([]);
    }
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
    
    const selectedProducts = allUserProducts.filter((product: UserProduct) => selectedProductIds[product.id]);
    
    if (selectedProducts.length === 0) {
      toast({
        title: t('products.toast.noProductsSelected'),
        description: t('products.toast.noProductsSelectedDesc'),
        variant: "destructive"
      });
      return;
    }
    
    // Validate all currently added items before adding new ones
    const invalidItems = items.filter(item => 
      (item.name && !isValidProductName(item.name)) || (!item.hsCode || item.hsCode.length < 6)
    );
    
    if (invalidItems.length > 0) {
      // Find the first invalid item to show specific error
      const firstInvalid = invalidItems[0];
      if (firstInvalid.name && !isValidProductName(firstInvalid.name)) {
        toast({
          title: t('products.toast.productNameTooShort'),
          description: t('products.toast.productNameTooShortDesc'),
          variant: "destructive"
        });
      } else if (firstInvalid.hsCode && firstInvalid.hsCode.length < 6) {
        toast({
          title: t('products.toast.hsCodeTooShort'),
          description: t('products.toast.hsCodeTooShortDesc'),
          variant: "destructive"
        });
      }
      return;
    }
    
    // Convert products to package items
    const newItems = selectedProducts.map((product: UserProduct) => ({
      name: product.name || '',
      description: product.description || '',
      quantity: '1',
      price: product.price ? (product.price / 100).toFixed(2) : '0',
      gtin: product.gtin || '',
      hsCode: product.hsCode || '',
      weight: '', // User will enter weight manually
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
      title: t('products.toast.productsAdded'),
      description: t('products.toast.productsAddedDesc', { count: selectedProducts.length }),
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
  const handleCellClick = (packageIndex: number, field: string, currentValue: string | number) => {
    setEditingCell({ packageIndex, field });
    setEditValue(String(currentValue));
  };

  const handleCellSave = () => {
    if (!editingCell) return;
    
    const { packageIndex, field } = editingCell;
    const updatedPackages = [...packages];
    const pkg = updatedPackages[packageIndex];
    
    // Convert to appropriate type
    let value: string | number = editValue;
    if (field === 'length' || field === 'width' || field === 'height' || field === 'weight') {
      value = parseFloat(editValue) || 0;
    }
    
    updatedPackages[packageIndex] = {
      ...pkg,
      [field]: value
    };
    
    setPackages(updatedPackages);
    setEditingCell(null);
    setEditValue('');
    onPackageChange?.();
  };

  const handleCellCancel = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCellSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCellCancel();
    }
  };

  const handleSaveItem = () => {
    if (!itemBeingEdited) return;
    
    // Validate required fields
    if (!itemBeingEdited.name || !itemBeingEdited.hsCode || !itemBeingEdited.quantity || !itemBeingEdited.price) {
      toast({
        title: t('products.toast.missingFields'),
        description: t('products.toast.missingFieldsDesc'),
        variant: "destructive"
      });
      return;
    }

    // Validate item name length (1-100 characters for ShipEntegra)
    if (itemBeingEdited.name.trim().length < 1 || itemBeingEdited.name.trim().length > 100) {
      toast({
        title: "Invalid Item Name",
        description: "Item name must be between 1 and 100 characters for shipping compliance.",
        variant: "destructive"
      });
      return;
    }
    
    // Weight validation removed as weight field is no longer required
    
    // Set default values for dimensions and weight if not provided
    const updatedItem = {
      ...itemBeingEdited,
      length: itemBeingEdited.length || '10',  // Default minimal dimensions
      width: itemBeingEdited.width || '10',
      height: itemBeingEdited.height || '10',
      weight: itemBeingEdited.weight || '0.5'  // Default minimum weight of 0.5kg
    };

    if (isAddingItem) {
      // Adding a new item
      setItems([...items, updatedItem]);
    } else if (editingItemIndex !== null) {
      // Updating an existing item
      const newItems = [...items];
      newItems[editingItemIndex] = updatedItem;
      setItems(newItems);
      
      // Update the item in any package it might belong to
      const oldItem = items[editingItemIndex];
      const updatedPackages = packages.map(pkg => ({
        ...pkg,
        items: pkg.items.map(item => 
          (item.name === oldItem.name && item.description === oldItem.description) 
            ? updatedItem 
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

  // Calculate total dimensions and weight
  const getTotalMetrics = () => {
    let totalWeight = 0;
    let totalItems = 0;
    let totalPrice = 0;
    
    // Sum up all item weights and prices
    items.forEach(item => {
      const weight = parseFloat(item.weight) || 0;
      const quantity = parseInt(item.quantity) || 1;
      const price = parseFloat(item.price) || 0;
      totalWeight += weight * quantity;
      totalItems += quantity;
      totalPrice += price * quantity;
    });
    
    return {
      totalWeight,
      totalItems,
      totalPrice
    };
  };

  const { totalWeight, totalItems, totalPrice } = getTotalMetrics();

  return (
    <div className="space-y-4">
      {/* Package Items - Redesigned */}
      <div>
        <Card className="border-none shadow-none">
          <CardHeader className="p-0 mb-4">
            <CardTitle className="text-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BoxSelect className="h-5 w-5 text-primary" /> {t('products.packageItemsTitle')}
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isTranslating}
                      onClick={async () => {
                        // Set loading state
                        setIsTranslating(true);
                        
                        try {
                          // Translate all product names that need translation
                          const itemsToTranslate = items.filter(item => 
                            item.name && item.name.trim().length > 0
                          );
                          
                          if (itemsToTranslate.length === 0) {
                            toast({
                              title: "No Products to Translate",
                              description: "Add some products first, then use translation.",
                              variant: "default"
                            });
                            return;
                          }
                          
                          let translatedCount = 0;
                          const updatedItems = [...items];
                          
                          for (let i = 0; i < updatedItems.length; i++) {
                            const item = updatedItems[i];
                            if (item.name && item.name.trim().length > 0) {
                              try {
                                const response = await fetch('/api/translate', {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                  },
                                  body: JSON.stringify({ text: item.name.trim() }),
                                });
                                
                                if (response.ok) {
                                  const result = await response.json();
                                  if (result.data && result.data.needsTranslation && result.data.translatedText) {
                                    updatedItems[i] = {
                                      ...item,
                                      name: result.data.translatedText
                                    };
                                    translatedCount++;
                                  }
                                }
                              } catch (error) {
                                console.error('Translation failed for:', item.name, error);
                              }
                            }
                          }
                          
                          if (translatedCount > 0) {
                            setItems(updatedItems);
                            toast({
                              title: `Translated ${translatedCount} Product Names`,
                              description: "Foreign product names have been translated to English.",
                            });
                          } else {
                            toast({
                              title: "No Translation Needed",
                              description: "All product names are already in English.",
                              variant: "default"
                            });
                          }
                        } finally {
                          // Always reset loading state
                          setIsTranslating(false);
                        }
                      }}
                      className="h-8 px-3 text-xs"
                    >
                      {isTranslating ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <Languages className="h-3 w-3 mr-1" />
                      )}
                      {isTranslating ? t('products.translating') : t('products.translateAll')}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('products.tooltips.translateAll')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
            <CardDescription>
              {t('products.packageItemsDescription')}
            </CardDescription>
            
            {/* Searchable Interface with inline custom item functionality */}
            <div className="mt-3 space-y-2">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <Input
                  placeholder={t('products.searchProducts')}
                  className="pl-10 pr-24"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  // Don't show the separate dialog anymore
                  // onClick={() => setShowProductsDialog(true)}
                />

              </div>
              
              {/* Dropdown for search results */}
              {searchQuery && searchResults && searchResults.length > 0 && (
                <div className="relative z-50">
                  <div className="absolute z-50 w-full mt-1 bg-white rounded-md shadow-lg overflow-hidden max-h-60 overflow-y-auto border">
                    {searchResults.map((product: UserProduct) => (
                      <div 
                        key={product.id}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center"
                        onClick={() => {
                          // Create new item based on selected product
                          const newItem: PackageItem = {
                            name: product.name || '',
                            description: product.description || '',
                            quantity: '1',
                            price: product.price ? (product.price / 100).toFixed(2) : '0',
                            currency: 'USD', // Default currency
                            gtin: product.gtin || '',
                            hsCode: product.hsCode || '',
                            weight: '0.5', // Default weight
                            length: product.length?.toString() || '10',
                            width: product.width?.toString() || '10',
                            height: product.height?.toString() || '10',
                            countryOfOrigin: product.countryOfOrigin || '',
                            manufacturer: product.manufacturer || '',
                          };
                          
                          setItems([...items, newItem]);
                          setSearchQuery('');
                        }}
                      >
                        <div>
                          <div className="font-medium">{product.name}</div>
                          {product.description && (
                            <div className="text-xs text-muted-foreground">{product.description}</div>
                          )}
                        </div>
                        <div className="text-sm">${(product.price / 100).toFixed(2)}</div>
                      </div>
                    ))}
                    
                    {/* Option to add custom product if search doesn't match */}
                    <div 
                      className="px-4 py-2 bg-gray-50 hover:bg-gray-100 cursor-pointer border-t"
                      onClick={() => {
                        // Clear search and focus on the product addition form
                        setSearchQuery('');
                        
                        // Set the product name in the quick add form
                        setQuickAddQuery(searchQuery);
                        
                        // Focus on the quick add product name input
                        setTimeout(() => {
                          const quickAddInput = document.getElementById('quickProductName');
                          if (quickAddInput) {
                            quickAddInput.focus();
                            quickAddInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            
                            // Add a brief highlight effect to draw attention
                            quickAddInput.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.3)';
                            setTimeout(() => {
                              quickAddInput.style.boxShadow = '';
                            }, 2000);
                          }
                        }, 100);
                      }}
                    >
                      <div className="flex items-center text-primary">
                        <Plus className="h-4 w-4 mr-2" />
                        <div>{t('products.addAsNewProduct', { productName: searchQuery })}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Product Addition Form - Always visible at top */}
            <div className="border rounded-md mb-4 overflow-visible">
              {/* Desktop Table header - hidden on mobile */}
              <div className="hidden md:grid grid-cols-12 gap-2 p-2 bg-muted/50 border-b text-sm">
                <div className="col-span-3 font-medium text-muted-foreground flex items-center gap-1">
                  {t('productsData.table.productName')}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-3 w-3 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t('products.tooltips.productName')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="col-span-2 font-medium text-muted-foreground">{t('common.quantity')}</div>
                <div className="col-span-2 font-medium text-muted-foreground">{t('productsData.table.price')}</div>
                <div className="col-span-3 font-medium text-muted-foreground flex items-center gap-1">
                  {t('productsData.table.hsCode')}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-3 w-3 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t('products.tooltips.hsCode')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="col-span-2 font-medium text-muted-foreground text-right">{t('common.actions')}</div>
              </div>
              
              {/* Mobile header - visible only on mobile */}
              <div className="md:hidden p-3 bg-muted/50 border-b">
                <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add New Product
                </div>
              </div>
              
              {/* Product form row - responsive layout */}
              <div className="md:grid md:grid-cols-12 gap-2 p-3 md:p-2 bg-gray-50 border-b space-y-3 md:space-y-0">
                {/* Product Name Field */}
                <div className="md:col-span-3 relative">
                  <label className="md:hidden text-xs text-muted-foreground font-medium flex items-center gap-1 mb-1.5">
                    {t('productsData.table.productName')}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3 w-3 text-muted-foreground/60" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{t('products.tooltips.productName')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </label>
                  <ProductNameTranslator
                    value={quickAddQuery}
                    onChange={(value) => {
                      setQuickAddQuery(value);
                      handleQuickAddSearch(value);
                    }}
                    placeholder={t('products.placeholders.productName')}
                    className="h-10 md:h-9 w-full"
                    onTranslation={(translation) => {
                      // Store the translation result for reference
                      console.log('Product name translated:', translation);
                    }}
                    onHSCodeSelect={(hsCode) => {
                      // Auto-fill HS code when selected from product name search
                      setQuickAddHsCode(hsCode);
                    }}
                  />
                  
                  {quickAddQuery && quickAddResults && quickAddResults.length > 0 && (
                    <div className="absolute z-[9999] w-full mt-1 bg-white rounded-md shadow-xl overflow-hidden max-h-60 overflow-y-auto border-2 border-gray-200">
                      {quickAddResults.map((product: UserProduct) => (
                        <div 
                          key={product.id}
                          className="px-4 py-3 hover:bg-gray-100 cursor-pointer border-b last:border-0"
                          onClick={() => {
                            // Automatically add the product when clicked
                            const newItem: PackageItem = {
                              id: Date.now(),
                              name: product.name,
                              description: product.description || '',
                              quantity: '1',
                              price: product.price ? (product.price / 100).toFixed(2) : '0',
                              currency: 'USD',
                              gtin: product.gtin || '',
                              hsCode: product.hsCode || '',
                              countryOfOrigin: product.countryOfOrigin || '',
                              weight: product.weight?.toString() || '0.5',
                              length: product.length?.toString() || '10',
                              width: product.width?.toString() || '10', 
                              height: product.height?.toString() || '10',
                              manufacturer: product.manufacturer || ''
                            };
                            
                            setItems([...items, newItem]);
                            
                            // Clear the form and results
                            setQuickAddQuery('');
                            setQuickAddHsCode('');
                            setQuickAddQuantity('1');
                            setQuickAddPrice('');
                            setQuickAddSelectedProduct(null);
                            setQuickAddResults([]);
                            
                            toast({
                              title: "Product Added",
                              description: `${product.name} has been added to your package.`
                            });
                          }}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="font-medium text-sm">{product.name}</div>
                              {product.description && (
                                <div className="text-xs text-muted-foreground mt-1">{product.description}</div>
                              )}
                            </div>
                            <div className="text-sm font-medium ml-3">${(product.price / 100).toFixed(2)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Quantity and Price in a row on mobile */}
                <div className="md:hidden flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground font-medium block mb-1.5">
                      {t('common.quantity')}
                    </label>
                    <Input
                      type="number"
                      min="1"
                      value={quickAddQuantity}
                      onChange={(e) => setQuickAddQuantity(e.target.value)}
                      className="h-10 w-full"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground font-medium block mb-1.5">
                      {t('productsData.table.price')}
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={quickAddPrice}
                      onChange={(e) => setQuickAddPrice(e.target.value)}
                      placeholder={t('products.placeholders.price')}
                      className="h-10 w-full"
                    />
                  </div>
                </div>
                
                {/* Desktop Quantity Field */}
                <div className="hidden md:block md:col-span-2">
                  <Input
                    type="number"
                    min="1"
                    value={quickAddQuantity}
                    onChange={(e) => setQuickAddQuantity(e.target.value)}
                    className="h-9"
                  />
                </div>
                
                {/* Desktop Price Field */}
                <div className="hidden md:block md:col-span-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={quickAddPrice}
                    onChange={(e) => setQuickAddPrice(e.target.value)}
                    placeholder={t('products.placeholders.price')}
                    className="h-9"
                  />
                </div>
                
                {/* HS Code Field - Full width on mobile */}
                <div className="md:col-span-3">
                  <label className="md:hidden text-xs text-muted-foreground font-medium flex items-center gap-1 mb-1.5">
                    {t('productsData.table.hsCode')}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3 w-3 text-muted-foreground/60" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{t('products.tooltips.hsCode')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </label>
                  <HSCodeInput
                    value={quickAddHsCode}
                    onChange={setQuickAddHsCode}
                    placeholder={t('products.placeholders.hsCode')}
                    productName={quickAddQuery}
                    className="h-10 md:h-9 w-full"
                  />
                </div>
                
                {/* Add Button - Full width on mobile */}
                <div className="md:col-span-2 flex justify-end">
                  <Button
                    className="h-11 md:h-9 w-full text-base md:text-sm font-medium"
                    onClick={() => {
                      // Get values from the quick form state
                      const productName = quickAddQuery.trim();
                      const quantity = quickAddQuantity || '1';
                      const price = quickAddPrice || '0';
                      const hsCode = quickAddHsCode;
                      const selectedProduct = quickAddSelectedProduct;
                      
                      if (!productName) {
                        toast({
                          title: "Product Name Required",
                          description: "Please enter a product name.",
                          variant: "destructive"
                        });
                        return;
                      }
                      
                      if (!isValidProductName(productName)) {
                        toast({
                          title: t('products.toast.productNameTooShort'),
                          description: t('products.toast.productNameTooShortDesc'),
                          variant: "destructive"
                        });
                        return;
                      }
                      
                      // HS code validation - make it optional for now since lookup is disabled
                      if (hsCode && hsCode.length > 0 && hsCode.length < 6) {
                        toast({
                          title: t('products.toast.hsCodeTooShort'),
                          description: t('products.toast.hsCodeTooShortDesc'),
                          variant: "destructive"
                        });
                        return;
                      }
                      
                      const priceValue = parseFloat(price);
                      if (!price || priceValue <= 0) {
                        toast({
                          title: t('products.toast.priceRequired'),
                          description: t('products.toast.priceRequiredDesc'),
                          variant: "destructive"
                        });
                        return;
                      }
                      
                      // Create and add the item (use selected product data if available)
                      const newItem: PackageItem = {
                        id: Date.now(),
                        name: productName,
                        description: selectedProduct?.description || '',
                        quantity: quantity,
                        price: price,
                        currency: 'USD',
                        gtin: selectedProduct?.gtin || '',
                        hsCode: hsCode || selectedProduct?.hsCode || '',
                        countryOfOrigin: selectedProduct?.countryOfOrigin || '',
                        weight: selectedProduct?.weight?.toString() || '0.5',
                        length: selectedProduct?.length?.toString() || '10',
                        width: selectedProduct?.width?.toString() || '10', 
                        height: selectedProduct?.height?.toString() || '10',
                        manufacturer: selectedProduct?.manufacturer || ''
                      };
                      setItems([...items, newItem]);
                      
                      // Clear the form
                      setQuickAddQuery('');
                      setQuickAddHsCode('');
                      setQuickAddQuantity('1');
                      setQuickAddPrice('');
                      setQuickAddSelectedProduct(null);
                      setQuickAddResults([]);
                      
                      toast({
                        title: "Product Added",
                        description: `${productName} has been added to your package.`
                      });
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('common.add')}
                  </Button>
                </div>
              </div>
            </div>

            {/* Added Products List - Enhanced Excel-like table */}
            {items.length > 0 ? (
              <div className="mb-4">
                {/* Desktop Table View */}
                <div className="hidden md:block border border-gray-300 bg-white shadow-sm rounded-lg overflow-hidden">
                <table className="w-full border-collapse">
                  {/* Enhanced Excel-style header */}
                  <thead>
                    <tr className="bg-gradient-to-r from-slate-50 to-gray-100 border-b-2 border-gray-200">
                      <th className="border-r border-gray-300 px-3 py-2 text-left text-xs font-semibold text-gray-800 w-40 bg-slate-50">
                        <div className="flex items-center gap-1">
                          <Package className="h-3 w-3 text-blue-600" />
                          {t('productsData.table.productName')}
                        </div>
                      </th>
                      <th className="border-r border-gray-300 px-3 py-2 text-center text-xs font-semibold text-gray-800 w-20 bg-blue-50">
                        <div className="flex items-center justify-center gap-1">
                          <Hash className="h-3 w-3 text-blue-600" />
                          {t('common.quantity')}
                        </div>
                      </th>
                      <th className="border-r border-gray-300 px-3 py-2 text-left text-xs font-semibold text-gray-800 w-32 bg-green-50">
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3 text-green-600" />
                          {t('productsData.table.price')}
                        </div>
                      </th>
                      <th className="border-r border-gray-300 px-3 py-2 text-left text-xs font-semibold text-gray-800 w-20 bg-purple-50">
                        <div className="flex items-center gap-1">
                          <Tag className="h-3 w-3 text-purple-600" />
                          {t('productsData.table.sku')}
                        </div>
                      </th>
                      <th className="border-r border-gray-300 px-3 py-2 text-left text-xs font-semibold text-gray-800 w-40 bg-orange-50">
                        <div className="flex items-center gap-1">
                          <FileText className="h-3 w-3 text-orange-600" />
                          {t('productsData.table.hsCode')}
                        </div>
                      </th>
                      <th className="border-gray-300 px-2 py-2 text-center text-xs font-semibold text-gray-800 w-12 bg-red-50">
                        <div className="flex items-center justify-center">
                          <Settings className="h-3 w-3 text-red-600" />
                        </div>
                      </th>
                    </tr>
                  </thead>
                  
                  {/* Enhanced Excel-style body */}
                  <tbody>
                    {items.map((item, index) => {
                      // Check if this item is in any package
                      const isInPackage = packages.some(pkg => 
                        pkg.items && pkg.items.some(pkgItem => 
                          pkgItem.name === item.name && pkgItem.description === item.description
                        )
                      );
                      
                      return (
                        <tr key={index} className={`transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:shadow-sm ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                          {/* Product Name */}
                          <td className="border-r border-gray-200 px-2 py-2 relative group bg-slate-50/30 hover:bg-slate-100/50 transition-colors cursor-text">
                            <Input 
                              value={item.name} 
                              onChange={(e) => {
                                const newItems = [...items];
                                newItems[index] = {...newItems[index], name: e.target.value};
                                setItems(newItems);
                              }}
                              placeholder=""
                              className="border border-gray-300 bg-white hover:bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:shadow-sm text-xs h-7 px-2 rounded-sm cursor-text"
                              title="Click to edit product name"
                            />
                          </td>
                          
                          {/* Quantity */}
                          <td className="border-r border-gray-200 px-2 py-2 relative group bg-blue-50/30 hover:bg-blue-100/50 transition-colors cursor-text">
                            <Input 
                              type="text" 
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={item.quantity} 
                              onChange={(e) => {
                                // Only allow numeric input
                                const value = e.target.value.replace(/[^0-9]/g, '');
                                const newItems = [...items];
                                newItems[index] = {...newItems[index], quantity: value};
                                setItems(newItems);
                              }}
                              onBlur={(e) => {
                                // Set default value of 1 when field is empty and loses focus
                                if (!e.target.value.trim()) {
                                  const newItems = [...items];
                                  newItems[index] = {...newItems[index], quantity: '1'};
                                  setItems(newItems);
                                }
                              }}
                              placeholder=""
                              className="border border-gray-300 bg-white hover:bg-blue-50/50 focus:bg-white focus:border-blue-500 focus:shadow-sm text-center text-xs h-7 px-2 rounded-sm font-medium cursor-text [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              title="Click to edit quantity"
                            />
                          </td>
                          
                          {/* Price */}
                          <td className="border-r border-gray-200 px-2 py-2 relative group bg-green-50/30 hover:bg-green-100/50 transition-colors cursor-text">
                            <div className="flex items-center">
                              <Input 
                                type="text"
                                inputMode="decimal"
                                value={item.price} 
                                onChange={(e) => {
                                  // Allow numbers and decimal point
                                  const value = e.target.value.replace(/[^0-9.]/g, '');
                                  // Ensure only one decimal point
                                  const parts = value.split('.');
                                  const formattedValue = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : value;
                                  const newItems = [...items];
                                  newItems[index] = {...newItems[index], price: formattedValue};
                                  setItems(newItems);
                                }}
                                placeholder=""
                                className="border border-gray-300 bg-white hover:bg-green-50/50 focus:bg-white focus:border-green-500 focus:shadow-sm text-xs h-7 px-2 flex-1 rounded-sm font-medium text-green-800 cursor-text [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                title="Click to edit price"
                              />
                              <Select
                                value={item.currency || 'USD'}
                                onValueChange={(value) => {
                                  const newItems = [...items];
                                  newItems[index] = {...newItems[index], currency: value};
                                  setItems(newItems);
                                }}
                              >
                                <SelectTrigger className="w-12 h-6 text-xs border-0 bg-transparent px-0 text-green-700 font-medium hover:bg-green-50/50 rounded-sm hover:border hover:border-dashed hover:border-green-300" title="Click to change currency">
                                  <SelectValue placeholder="USD" />
                                </SelectTrigger>
                                <SelectContent>
                                  {currencies.map((currency) => (
                                    <SelectItem key={currency} value={currency}>
                                      {currency}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </td>
                          
                          {/* SKU */}
                          <td className="border-r border-gray-200 px-2 py-2 relative group bg-purple-50/30 hover:bg-purple-100/50 transition-colors cursor-text">
                            <Input 
                              value={item.gtin || ''} 
                              onChange={(e) => {
                                const newItems = [...items];
                                newItems[index] = {...newItems[index], gtin: e.target.value};
                                setItems(newItems);
                              }}
                              placeholder=""
                              className="border border-gray-300 bg-white hover:bg-purple-50/50 focus:bg-white focus:border-purple-500 focus:shadow-sm text-xs h-7 px-2 rounded-sm font-mono cursor-text"
                              title="Click to edit SKU/GTIN"
                            />
                          </td>
                          
                          {/* HS Code with Tax Rate */}
                          <td className="border-r border-gray-200 px-2 py-2 relative group bg-orange-50/30 hover:bg-orange-100/50 transition-colors cursor-text">
                            <div className="relative">
                              <HSCodeInputWithTax
                                value={item.hsCode || ''}
                                onChange={(value) => {
                                  const newItems = [...items];
                                  newItems[index] = {...newItems[index], hsCode: value};
                                  setItems(newItems);
                                }}
                                placeholder=""
                                productName={item.name || ''}
                                className="text-xs h-9 px-2 rounded-sm font-mono"
                                showRapidAPIToggle={true}
                                destinationCountry={destinationCountry}
                                showTaxRate={true}
                              />
                            </div>
                          </td>
                          
                          {/* Actions */}
                          <td className="border-gray-200 px-1 py-2 text-center bg-red-50/30 hover:bg-red-100/50 transition-colors w-12">
                            <div className="flex items-center justify-center gap-0.5">
                              {isInPackage && (
                                <div className="flex items-center">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600 drop-shadow-sm" />
                                  <span className="text-xs text-green-600 font-medium ml-1">✓</span>
                                </div>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveItem(index)}
                                className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-100 p-0 rounded-md transition-all duration-200 hover:scale-105"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  
                  {/* Enhanced Excel-style footer */}
                  {totalItems > 0 && (
                    <tfoot>
                      <tr className="bg-gradient-to-r from-slate-100 to-gray-200 border-t-2 border-gray-300">
                        <td colSpan={3} className="border-r border-gray-300 px-3 py-2 text-xs font-bold text-gray-800">
                          <div className="flex items-center gap-1">
                            <Package className="h-3.5 w-3.5 text-blue-600" />
                            Total: <span className="text-blue-700">{totalItems} items</span>
                          </div>
                        </td>
                        <td colSpan={3} className="border-gray-300 px-3 py-2 text-xs font-bold text-gray-800 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <DollarSign className="h-3.5 w-3.5 text-green-600" />
                            Total Price: <span className="text-green-700 text-sm">${totalPrice.toFixed(2)}</span>
                          </div>
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
                </div>
                
                {/* Mobile Card View */}
                <div className="md:hidden space-y-2">
                  {items.map((item, index) => {
                    const isInPackage = packages.some(pkg => 
                      pkg.items && pkg.items.some(pkgItem => 
                        pkgItem.name === item.name && pkgItem.description === item.description
                      )
                    );
                    
                    return (
                      <div key={index} className="border rounded-lg bg-white p-3 shadow-sm">
                        {/* Header with actions */}
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-start gap-2">
                            <span className="text-xs font-medium text-muted-foreground">#{index + 1}</span>
                            {isInPackage && (
                              <div className="flex items-center">
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                                <span className="text-xs text-green-600 font-medium ml-1">In Package</span>
                              </div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(index)}
                            className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-100 p-0 rounded-md"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        
                        {/* Product Name */}
                        <div className="space-y-1 mb-2">
                          <label className="text-xs text-muted-foreground flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {t('productsData.table.productName')}
                          </label>
                          <Input 
                            value={item.name} 
                            onChange={(e) => {
                              const newItems = [...items];
                              newItems[index] = {...newItems[index], name: e.target.value};
                              setItems(newItems);
                            }}
                            placeholder="Enter product name"
                            className="text-sm"
                          />
                        </div>
                        
                        {/* Quantity and Price Row */}
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground flex items-center gap-1">
                              <Hash className="h-3 w-3" />
                              {t('common.quantity')}
                            </label>
                            <Input 
                              type="text" 
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={item.quantity} 
                              onChange={(e) => {
                                const value = e.target.value.replace(/[^0-9]/g, '');
                                const newItems = [...items];
                                newItems[index] = {...newItems[index], quantity: value};
                                setItems(newItems);
                              }}
                              onBlur={(e) => {
                                if (!e.target.value.trim()) {
                                  const newItems = [...items];
                                  newItems[index] = {...newItems[index], quantity: '1'};
                                  setItems(newItems);
                                }
                              }}
                              placeholder="1"
                              className="text-sm text-center"
                            />
                          </div>
                          
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              {t('productsData.table.price')}
                            </label>
                            <div className="flex gap-1">
                              <Input 
                                type="text"
                                inputMode="decimal"
                                value={item.price} 
                                onChange={(e) => {
                                  const value = e.target.value.replace(/[^0-9.]/g, '');
                                  const parts = value.split('.');
                                  const formattedValue = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : value;
                                  const newItems = [...items];
                                  newItems[index] = {...newItems[index], price: formattedValue};
                                  setItems(newItems);
                                }}
                                placeholder="0.00"
                                className="text-sm flex-1"
                              />
                              <Select
                                value={item.currency || 'USD'}
                                onValueChange={(value) => {
                                  const newItems = [...items];
                                  newItems[index] = {...newItems[index], currency: value};
                                  setItems(newItems);
                                }}
                              >
                                <SelectTrigger className="w-16 text-xs">
                                  <SelectValue placeholder="USD" />
                                </SelectTrigger>
                                <SelectContent>
                                  {currencies.map((currency) => (
                                    <SelectItem key={currency} value={currency}>
                                      {currency}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                        
                        {/* SKU */}
                        <div className="space-y-1 mb-2">
                          <label className="text-xs text-muted-foreground flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            {t('productsData.table.sku')}
                          </label>
                          <Input 
                            value={item.gtin || ''} 
                            onChange={(e) => {
                              const newItems = [...items];
                              newItems[index] = {...newItems[index], gtin: e.target.value};
                              setItems(newItems);
                            }}
                            placeholder="Enter SKU/GTIN"
                            className="text-sm font-mono"
                          />
                        </div>
                        
                        {/* HS Code */}
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {t('productsData.table.hsCode')}
                          </label>
                          <HSCodeInputWithTax
                            value={item.hsCode || ''}
                            onChange={(value) => {
                              const newItems = [...items];
                              newItems[index] = {...newItems[index], hsCode: value};
                              setItems(newItems);
                            }}
                            placeholder="0000.00.00"
                            productName={item.name || ''}
                            showRapidAPIToggle={true}
                            destinationCountry={destinationCountry}
                            showTaxRate={true}
                          />
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Mobile totals */}
                  {totalItems > 0 && (
                    <div className="border rounded-lg bg-gradient-to-r from-slate-100 to-gray-200 p-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1 text-sm font-bold">
                          <Package className="h-4 w-4 text-blue-600" />
                          <span>Total: <span className="text-blue-700">{totalItems} items</span></span>
                        </div>
                        <div className="flex items-center gap-1 text-sm font-bold">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <span className="text-green-700">${totalPrice.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
      
      {/* Package Selection Section - Appears as a separate, equal section */}
      {items.length > 0 && (
        <div className="mt-8">
          <Card className="border-none shadow-none">
            <CardHeader className="p-0 mb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" /> {t('products.packaging.title')}
              </CardTitle>
              <CardDescription>
                {t('products.packaging.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {/* Table style layout matching the items table */}
              <div className="border rounded-md overflow-hidden mb-4">
                {/* Package Templates Selector */}
                <div className="p-3 bg-blue-50 border-b">
                  <div className="flex items-center gap-2 mb-2">
                    <BoxSelect className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">{t('common.packageTemplates')}</span>
                  </div>
                  <PackageTemplateSelector
                    userId={userId}
                    onTemplateSelect={(template) => {
                      setPackageLength(template.length.toString());
                      setPackageWidth(template.width.toString());
                      setPackageHeight(template.height.toString());
                      setPackageWeight(template.weight.toString());
                      onPackageChange?.();
                      
                      toast({
                        title: t('products.packageDialog.toast.templateApplied'),
                        description: t('products.packageDialog.toast.templateAppliedDescription', { name: template.name })
                      });
                    }}
                    showSaveCurrentDimensions={true}
                    currentDimensions={{
                      length: parseFloat(packageLength) || 0,
                      width: parseFloat(packageWidth) || 0,
                      height: parseFloat(packageHeight) || 0,
                      weight: parseFloat(packageWeight) || 0
                    }}
                  />
                </div>

                {/* Table header */}
                <div className="grid grid-cols-12 gap-2 p-2 bg-muted/50 border-b text-sm">
                  <div className="col-span-4 font-medium text-muted-foreground flex items-center gap-1">
                    {t('products.packageDialog.packageName')}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3 w-3 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{t('products.tooltips.packageName')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="col-span-2 font-medium text-muted-foreground flex items-center gap-1">
                    {t('products.packageDialog.length')}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3 w-3 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{t('products.tooltips.packageLength')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="col-span-2 font-medium text-muted-foreground flex items-center gap-1">
                    {t('products.packageDialog.width')}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3 w-3 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{t('products.tooltips.packageWidth')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="col-span-2 font-medium text-muted-foreground flex items-center gap-1">
                    {t('products.packageDialog.height')}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3 w-3 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{t('products.tooltips.packageHeight')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="col-span-1 font-medium text-muted-foreground flex items-center gap-1">
                    {t('products.packageDialog.weight')}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3 w-3 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{t('products.tooltips.packageWeight')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="col-span-1 font-medium text-muted-foreground text-right">{t('common.actions')}</div>
                </div>
                
                {/* Package form row */}
                <div className="grid grid-cols-12 gap-2 p-2 bg-gray-50 border-b">
                  <div className="col-span-4">
                    <PackageTemplateSelect 
                      onSelect={(template) => {
                        // Create a new package based on the template
                        const newPackage: PackageData = {
                          id: Date.now(),
                          name: template.name,
                          description: template.description,
                          weight: template.weight,
                          length: template.length,
                          width: template.width,
                          height: template.height,
                          items: []
                        };
                        setPackages([...packages, newPackage]);
                        
                        // Trigger achievements for using templates and multiple packages
                        try {
                          // Mark that a template was used (from achievements)
                          markTemplateUsed();
                          
                          // Check if we've added multiple packages (from achievements)
                          if (packages.length + 1 > 1) {
                            checkMultiplePackages(packages.length + 1);
                          }
                          
                          // Notify assistant that package was added
                          triggerEvent('packageAdded');
                          
                          // Show achievement celebration animation
                          const achievementEl = document.createElement('div');
                          achievementEl.className = 'fixed top-10 right-10 z-50 animate-bounce';
                          achievementEl.innerHTML = `<div class="p-3 bg-primary text-primary-foreground rounded-full"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 4L13.4 7.05L16.5 7.75L14.25 10.05L14.65 13.15L12 11.7L9.35 13.15L9.75 10.05L7.5 7.75L10.6 7.05L12 4Z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>`;
                          document.body.appendChild(achievementEl);
                          
                          setTimeout(() => {
                            achievementEl.remove();
                          }, 3000);
                        } catch (error) {
                          console.log("Error triggering achievements", error);
                        }
                        
                        toast({
                          title: t('products.packageDialog.toast.packageSaved'),
                          description: t('products.packageDialog.toast.packageSavedDescription', { name: template.name, count: 0 })
                        });
                      }}
                      userId={userId}
                      className="w-full"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={packageLength}
                      onChange={(e) => {
                        setPackageLength(e.target.value);
                        onPackageChange?.();
                      }}
                      placeholder="0"
                      className="h-9"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={packageWidth}
                      onChange={(e) => {
                        setPackageWidth(e.target.value);
                        onPackageChange?.();
                      }}
                      placeholder="0"
                      className="h-9"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={packageHeight}
                      onChange={(e) => {
                        setPackageHeight(e.target.value);
                        onPackageChange?.();
                      }}
                      placeholder="0"
                      className="h-9"
                    />
                  </div>
                  <div className="col-span-1">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={packageWeight}
                      onChange={(e) => {
                        setPackageWeight(e.target.value);
                        onPackageChange?.();
                      }}
                      placeholder="0"
                      className="h-9"
                    />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Button
                      className="h-9 w-full"
                      onClick={() => {
                        // Get values from React state
                        const length = parseFloat(packageLength) || 0;
                        const width = parseFloat(packageWidth) || 0;
                        const height = parseFloat(packageHeight) || 0;
                        const weight = parseFloat(packageWeight) || 0;
                        
                        // Create a new package with custom dimensions
                        const newPackage: PackageData = {
                          id: Date.now(),
                          name: `${length}×${width}×${height} cm`,
                          description: null,
                          weight: weight,
                          length: length,
                          width: width,
                          height: height,
                          items: []
                        };
                        
                        // Add to packages
                        setPackages([...packages, newPackage]);
                        
                        // Notify parent component of package change
                        onPackageChange?.();
                        
                        // Clear input fields
                        setPackageLength('');
                        setPackageWidth('');
                        setPackageHeight('');
                        setPackageWeight('');
                        
                        // Trigger achievements for multiple packages
                        try {
                          // Check if we've added multiple packages
                          if (packages.length + 1 > 1) {
                            checkMultiplePackages(packages.length + 1);
                            
                            // Trigger shipping assistant event
                            triggerEvent('packageAdded');
                            
                            // Show achievement celebration animation if it's the second+ package
                            const achievementEl = document.createElement('div');
                            achievementEl.className = 'fixed top-10 right-10 z-50 animate-bounce';
                            achievementEl.innerHTML = `<div class="p-3 bg-primary text-primary-foreground rounded-full"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.29 7 12 12 20.71 7"></polyline><line x1="12" y1="22" x2="12" y2="12"></line></svg></div>`;
                            document.body.appendChild(achievementEl);
                            
                            setTimeout(() => {
                              achievementEl.remove();
                            }, 3000);
                          }
                        } catch (error) {
                          console.log("Error triggering achievements", error);
                        }
                        
                        toast({
                          title: t('products.packageDialog.toast.packageSaved'),
                          description: t('products.packageDialog.toast.packageSavedDescription', { 
                            name: `${length}×${width}×${height} cm`, 
                            count: 0 
                          })
                        });
                      }}
                    >
                      {t('common.add')}
                    </Button>
                  </div>
                </div>
                
                {/* Quick add custom package button row */}
                <div className="grid grid-cols-12 gap-2 p-2 border-b bg-white">
                  <div className="col-span-12">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="w-full"
                            onClick={() => {
                              // Create a new empty package
                              const newPackage: PackageData = {
                                id: Date.now(),
                                name: t('products.packageDialog.customPackage'),
                                description: null,
                                weight: 0,
                                length: 0,
                                width: 0,
                                height: 0,
                                items: []
                              };
                              setCurrentPackage(newPackage);
                              setShowPackageDialog(true);
                            }}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            {t('products.packageDialog.createCustomPackage')}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{t('products.packageDialog.createCustomPackageTooltip')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
                
                {/* List of added packages - Enhanced Excel-style table */}
                {packages.length > 0 ? (
                  <div className="border border-gray-300 bg-white shadow-sm rounded-lg overflow-hidden">
                    <table className="w-full border-collapse">
                      {/* Enhanced Excel-style header */}
                      <thead>
                        <tr className="bg-gradient-to-r from-slate-50 to-gray-100 border-b-2 border-gray-200">
                          <th className="border-r border-gray-300 px-3 py-2 text-left text-xs font-semibold text-gray-800 bg-slate-50">
                            <div className="flex items-center gap-1">
                              <Package className="h-3 w-3 text-blue-600" />
                              Package
                            </div>
                          </th>
                          <th className="border-r border-gray-300 px-3 py-2 text-center text-xs font-semibold text-gray-800 w-20 bg-blue-50">
                            <div className="flex items-center justify-center gap-1">
                              <Ruler className="h-3 w-3 text-blue-600" />
                              Length
                            </div>
                          </th>
                          <th className="border-r border-gray-300 px-3 py-2 text-center text-xs font-semibold text-gray-800 w-20 bg-green-50">
                            <div className="flex items-center justify-center gap-1">
                              <Ruler className="h-3 w-3 text-green-600" />
                              Width
                            </div>
                          </th>
                          <th className="border-r border-gray-300 px-3 py-2 text-center text-xs font-semibold text-gray-800 w-20 bg-purple-50">
                            <div className="flex items-center justify-center gap-1">
                              <Ruler className="h-3 w-3 text-purple-600" />
                              Height
                            </div>
                          </th>
                          <th className="border-r border-gray-300 px-3 py-2 text-center text-xs font-semibold text-gray-800 w-20 bg-orange-50">
                            <div className="flex items-center justify-center gap-1">
                              <Weight className="h-3 w-3 text-orange-600" />
                              Weight
                            </div>
                          </th>
                          <th className="border-gray-300 px-2 py-2 text-center text-xs font-semibold text-gray-800 w-32 bg-red-50">
                            <div className="flex items-center justify-center">
                              <Settings className="h-3 w-3 text-red-600" />
                            </div>
                          </th>
                        </tr>
                      </thead>
                      {/* Enhanced Excel-style body */}
                      <tbody>
                        {packages.map((pkg, index) => (
                          <tr key={index} className={`transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:shadow-sm ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                            <td className="border-r border-gray-200 px-2 py-2 relative group bg-slate-50/30 hover:bg-slate-100/50 transition-colors cursor-text">
                              {editingCell?.packageIndex === index && editingCell?.field === 'name' ? (
                                <Input
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={handleCellSave}
                                  onKeyDown={handleKeyDown}
                                  className="border border-gray-300 bg-white hover:bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:shadow-sm text-xs h-7 px-2 rounded-sm cursor-text"
                                  autoFocus
                                />
                              ) : (
                                <div 
                                  className="font-medium cursor-text bg-white border border-gray-300 hover:border-blue-400 p-1 rounded-sm transition-all duration-200 min-h-[28px] flex items-center"
                                  onClick={() => handleCellClick(index, 'name', pkg.name)}
                                  title="Click to edit package name"
                                >
                                  {pkg.name}
                                </div>
                              )}
                              {pkg.description && (
                                editingCell?.packageIndex === index && editingCell?.field === 'description' ? (
                                  <Input
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onBlur={handleCellSave}
                                    onKeyDown={handleKeyDown}
                                    className="border border-gray-300 bg-white hover:bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:shadow-sm text-xs h-6 px-2 mt-1 rounded-sm cursor-text"
                                    autoFocus
                                  />
                                ) : (
                                  <div 
                                    className="text-xs text-muted-foreground cursor-text bg-white border border-gray-300 hover:border-blue-400 p-1 mt-1 rounded-sm transition-all duration-200 min-h-[24px] flex items-center"
                                    onClick={() => handleCellClick(index, 'description', pkg.description || '')}
                                    title="Click to edit package description"
                                  >
                                    {pkg.description}
                                  </div>
                                )
                              )}
                            </td>
                            <td className="border-r border-gray-200 px-2 py-2 relative group bg-blue-50/30 hover:bg-blue-100/50 transition-colors cursor-text">
                              {editingCell?.packageIndex === index && editingCell?.field === 'length' ? (
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.1"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={handleCellSave}
                                  onKeyDown={handleKeyDown}
                                  className="border border-gray-300 bg-white hover:bg-blue-50/50 focus:bg-white focus:border-blue-500 focus:shadow-sm text-center text-xs h-7 px-2 rounded-sm font-medium cursor-text [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  autoFocus
                                />
                              ) : (
                                <div 
                                  className="text-center cursor-text bg-white border border-gray-300 hover:border-blue-400 p-1 rounded-sm transition-all duration-200 font-medium min-h-[28px] flex items-center justify-center"
                                  onClick={() => handleCellClick(index, 'length', pkg.length)}
                                  title="Click to edit length"
                                >
                                  {pkg.length}
                                </div>
                              )}
                            </td>
                            <td className="border-r border-gray-200 px-2 py-2 relative group bg-green-50/30 hover:bg-green-100/50 transition-colors cursor-text">
                              {editingCell?.packageIndex === index && editingCell?.field === 'width' ? (
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.1"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={handleCellSave}
                                  onKeyDown={handleKeyDown}
                                  className="border border-gray-300 bg-white hover:bg-green-50/50 focus:bg-white focus:border-green-500 focus:shadow-sm text-center text-xs h-7 px-2 rounded-sm font-medium cursor-text [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  autoFocus
                                />
                              ) : (
                                <div 
                                  className="text-center cursor-text bg-white border border-gray-300 hover:border-green-400 p-1 rounded-sm transition-all duration-200 font-medium min-h-[28px] flex items-center justify-center"
                                  onClick={() => handleCellClick(index, 'width', pkg.width)}
                                  title="Click to edit width"
                                >
                                  {pkg.width}
                                </div>
                              )}
                            </td>
                            <td className="border-r border-gray-200 px-2 py-2 relative group bg-purple-50/30 hover:bg-purple-100/50 transition-colors cursor-text">
                              {editingCell?.packageIndex === index && editingCell?.field === 'height' ? (
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.1"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={handleCellSave}
                                  onKeyDown={handleKeyDown}
                                  className="border border-gray-300 bg-white hover:bg-purple-50/50 focus:bg-white focus:border-purple-500 focus:shadow-sm text-center text-xs h-7 px-2 rounded-sm font-medium cursor-text [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  autoFocus
                                />
                              ) : (
                                <div 
                                  className="text-center cursor-text bg-white border border-gray-300 hover:border-purple-400 p-1 rounded-sm transition-all duration-200 font-medium min-h-[28px] flex items-center justify-center"
                                  onClick={() => handleCellClick(index, 'height', pkg.height)}
                                  title="Click to edit height"
                                >
                                  {pkg.height}
                                </div>
                              )}
                            </td>
                            <td className="border-r border-gray-200 px-2 py-2 relative group bg-orange-50/30 hover:bg-orange-100/50 transition-colors cursor-text">
                              {editingCell?.packageIndex === index && editingCell?.field === 'weight' ? (
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={handleCellSave}
                                  onKeyDown={handleKeyDown}
                                  className="border border-gray-300 bg-white hover:bg-orange-50/50 focus:bg-white focus:border-orange-500 focus:shadow-sm text-center text-xs h-7 px-2 rounded-sm font-medium cursor-text [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  autoFocus
                                />
                              ) : (
                                <div 
                                  className="text-center cursor-text bg-white border border-gray-300 hover:border-orange-400 p-1 rounded-sm transition-all duration-200 font-medium min-h-[28px] flex items-center justify-center"
                                  onClick={() => handleCellClick(index, 'weight', pkg.weight)}
                                  title="Click to edit weight"
                                >
                                  {pkg.weight}
                                </div>
                              )}
                            </td>
                            <td className="border-gray-200 px-2 py-2 relative group bg-red-50/20 hover:bg-red-50/40 transition-colors">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 border border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-700 rounded-sm transition-all duration-200 shadow-sm hover:shadow-md"
                                  onClick={() => {
                                    setCurrentPackage(pkg);
                                    setShowPackageDialog(true);
                                  }}
                                  title={t('common.edit')}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 border border-blue-200 hover:border-blue-300 bg-white hover:bg-blue-50 text-blue-600 hover:text-blue-700 rounded-sm transition-all duration-200 shadow-sm hover:shadow-md"
                                  onClick={() => {
                                    // Duplicate package
                                    const newPackage = {
                                      ...pkg,
                                      id: Date.now(), // ensure a unique ID
                                      name: `${pkg.name} (${t('common.copy')})`,
                                      items: [...pkg.items]
                                    };
                                    setPackages([...packages, newPackage]);
                                    onPackageChange?.();
                                  }}
                                  title={t('common.duplicate')}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 border border-red-200 hover:border-red-300 bg-white hover:bg-red-50 text-red-600 hover:text-red-700 rounded-sm transition-all duration-200 shadow-sm hover:shadow-md"
                                  onClick={() => {
                                    // Remove package
                                    setPackages(packages.filter((_, i) => i !== index));
                                    onPackageChange?.();
                                  }}
                                  title={t('common.delete')}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 text-center text-muted-foreground">
                    {t('products.packageDialog.noPackages')}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Item Edit Dialog */}
      <Dialog open={!!itemBeingEdited} onOpenChange={(open) => !open && handleCancelEdit()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader className="pb-2">
            <DialogTitle>{t('products.dialog.productDetails')}</DialogTitle>
          </DialogHeader>
          
          <div className="py-2">
            {/* Product search & selection row */}
            <div className="mb-4">
              <Label htmlFor="name" className="text-sm font-medium mb-1 block">{t('products.dialog.productContents')}</Label>
              <div className="relative">
                <Input
                  id="name"
                  placeholder={t('products.dialog.searchPlaceholder')}
                  value={itemBeingEdited?.name || ''}
                  onChange={(e) => {
                    handleItemChange('name', e.target.value);
                    setSearchQuery(e.target.value);
                  }}
                  className="w-full"
                />
                
                {searchQuery && searchResults && searchResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white rounded-md shadow-lg overflow-hidden max-h-60 overflow-y-auto border">
                    {searchResults.map((product: UserProduct) => (
                      <div 
                        key={product.id}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center"
                        onClick={() => {
                          // Fill all fields from the selected product
                          if (itemBeingEdited) {
                            setItemBeingEdited({
                              ...itemBeingEdited,
                              name: product.name,
                              description: product.description || '',
                              gtin: product.gtin || '',
                              price: product.price ? (product.price / 100).toFixed(2) : '0',
                              hsCode: product.hsCode || '',
                              countryOfOrigin: product.countryOfOrigin || '',
                              // Don't overwrite quantity
                            });
                          }
                          setSearchQuery('');
                        }}
                      >
                        <div>
                          <div className="font-medium">{product.name}</div>
                          {product.description && (
                            <div className="text-xs text-muted-foreground">{product.description}</div>
                          )}
                        </div>
                        <div className="text-sm">${(product.price / 100).toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Grid layout table style UI similar to screenshot */}
            <div className="border rounded-md mb-4 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="py-2 px-3 text-left font-medium text-muted-foreground">{t('products.dialog.quantity')}</th>
                    <th className="py-2 px-3 text-left font-medium text-muted-foreground">{t('products.dialog.unitPrice')}</th>
                    <th className="py-2 px-3 text-left font-medium text-muted-foreground">{t('products.dialog.skuCode')}</th>
                    <th className="py-2 px-3 text-left font-medium text-muted-foreground">{t('products.dialog.hsCode')}</th>
                    <th className="py-2 px-3 text-left font-medium text-muted-foreground"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2">
                      <Input
                        type="number"
                        min="1"
                        value={itemBeingEdited?.quantity || '1'}
                        onChange={(e) => handleItemChange('quantity', e.target.value)}
                        className="w-full"
                      />
                    </td>
                    <td className="p-2">
                      <div className="flex space-x-1">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={itemBeingEdited?.price || '0'}
                          onChange={(e) => handleItemChange('price', e.target.value)}
                          className="w-1/2"
                        />
                        <Select
                          value={itemBeingEdited?.currency || 'USD'}
                          onValueChange={(value) => handleItemChange('currency', value)}
                        >
                          <SelectTrigger className="w-1/2 text-xs">
                            <SelectValue placeholder="USD" />
                          </SelectTrigger>
                          <SelectContent>
                            {currencies.map((currency) => (
                              <SelectItem key={currency} value={currency}>{currency}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </td>
                    <td className="p-2">
                      <Input
                        value={itemBeingEdited?.gtin || ''}
                        onChange={(e) => handleItemChange('gtin', e.target.value)}
                        placeholder="SKU"
                        className="w-full"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        value={itemBeingEdited?.hsCode || ''}
                        onChange={(e) => handleItemChange('hsCode', e.target.value)}
                        placeholder="HS Code"
                        className="w-full"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" type="button">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </Button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            {/* Description field */}
            <div className="mb-4">
              <Label htmlFor="description" className="text-sm font-medium mb-1 block">{t('products.dialog.description')}</Label>
              <Input
                id="description"
                value={itemBeingEdited?.description || ''}
                onChange={(e) => handleItemChange('description', e.target.value)}
              />
            </div>
            
            {/* Country of Origin */}
            <div className="mb-4">
              <Label htmlFor="countryOfOrigin" className="text-sm font-medium mb-1 block">{t('products.dialog.countryOfOrigin')}</Label>
              <Input
                id="countryOfOrigin"
                value={itemBeingEdited?.countryOfOrigin || ''}
                onChange={(e) => handleItemChange('countryOfOrigin', e.target.value)}
              />
            </div>
            
            {/* Hidden Weight field with default value */}
            <input 
              type="hidden" 
              value={itemBeingEdited?.weight || '0.5'} 
              onChange={(e) => handleItemChange('weight', e.target.value)}
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelEdit}>{t('products.dialog.cancel')}</Button>
            <Button type="submit" onClick={handleSaveItem}>
              {isAddingItem ? t('products.dialog.add') : t('products.dialog.update')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Package Dialog */}
      <Dialog open={showPackageDialog} onOpenChange={setShowPackageDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{currentPackage?.id ? t('products.packageDialog.editPackage') : t('products.packageDialog.createPackage')}</DialogTitle>
            <DialogDescription>
              {t('products.packageDialog.description')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            {/* Package details form */}
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="packageName">{t('products.packageDialog.packageName')}</Label>
                  <Input
                    id="packageName"
                    value={currentPackage?.name || ''}
                    onChange={(e) => setCurrentPackage(currentPackage ? { 
                      ...currentPackage, 
                      name: e.target.value 
                    } : null)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="packageDescription">{t('products.packageDialog.packageDescription')}</Label>
                  <Input
                    id="packageDescription"
                    value={currentPackage?.description || ''}
                    onChange={(e) => setCurrentPackage(currentPackage ? { 
                      ...currentPackage, 
                      description: e.target.value 
                    } : null)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-4 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="packageLength">{t('products.packageDialog.length')}</Label>
                  <Input
                    id="packageLength"
                    type="number"
                    min="0"
                    step="0.1"
                    value={currentPackage?.length || '0'}
                    onChange={(e) => {
                      setCurrentPackage(currentPackage ? { 
                        ...currentPackage, 
                        length: parseFloat(e.target.value) 
                      } : null);
                      if (onPackageChange) onPackageChange();
                    }}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="packageWidth">{t('products.packageDialog.width')}</Label>
                  <Input
                    id="packageWidth"
                    type="number"
                    min="0"
                    step="0.1"
                    value={currentPackage?.width || '0'}
                    onChange={(e) => {
                      setCurrentPackage(currentPackage ? { 
                        ...currentPackage, 
                        width: parseFloat(e.target.value) 
                      } : null);
                      if (onPackageChange) onPackageChange();
                    }}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="packageHeight">{t('products.packageDialog.height')}</Label>
                  <Input
                    id="packageHeight"
                    type="number"
                    min="0"
                    step="0.1"
                    value={currentPackage?.height || '0'}
                    onChange={(e) => {
                      setCurrentPackage(currentPackage ? { 
                        ...currentPackage, 
                        height: parseFloat(e.target.value) 
                      } : null);
                      if (onPackageChange) onPackageChange();
                    }}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="packageWeight">{t('products.packageDialog.weight')}</Label>
                  <Input
                    id="packageWeight"
                    type="number"
                    min="0"
                    step="0.01"
                    value={currentPackage?.weight || '0'}
                    onChange={(e) => {
                      setCurrentPackage(currentPackage ? { 
                        ...currentPackage, 
                        weight: parseFloat(e.target.value) 
                      } : null);
                      if (onPackageChange) onPackageChange();
                    }}
                  />
                </div>
              </div>
            </div>
            
            {/* Items selection */}
            <div>
              <h4 className="text-sm font-medium mb-3">{t('products.packageDialog.selectItems')}</h4>
              
              {items.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  {t('products.packageDialog.noItems')}
                </div>
              ) : (
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead>{t('products.packageDialog.item')}</TableHead>
                        <TableHead>{t('products.packageDialog.quantity')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, index) => {
                        // Check if this item is already in the package being edited
                        const isInCurrentPackage = currentPackage?.items?.some(
                          pkgItem => pkgItem.name === item.name && pkgItem.description === item.description
                        );
                        
                        // Check if this item is in any other package
                        const isInOtherPackage = packages.some(pkg => 
                          pkg.id !== currentPackage?.id && 
                          pkg.items && pkg.items.some(pkgItem => 
                            pkgItem.name === item.name && pkgItem.description === item.description
                          )
                        );
                        
                        return (
                          <TableRow key={index}>
                            <TableCell>
                              <input 
                                type="checkbox" 
                                checked={isInCurrentPackage}
                                disabled={isInOtherPackage}
                                onChange={(e) => {
                                  if (!currentPackage) return;
                                  
                                  let updatedItems;
                                  if (e.target.checked) {
                                    // Add item to package
                                    updatedItems = [...(currentPackage.items || []), item];
                                  } else {
                                    // Remove item from package
                                    updatedItems = currentPackage.items.filter(
                                      pkgItem => pkgItem.name !== item.name || pkgItem.description !== item.description
                                    );
                                  }
                                  
                                  setCurrentPackage({
                                    ...currentPackage,
                                    items: updatedItems
                                  });
                                }}
                              />
                            </TableCell>
                            <TableCell className={isInOtherPackage ? "text-muted-foreground" : ""}>
                              <div className="font-medium">{item.name}</div>
                              {isInOtherPackage && (
                                <div className="text-xs text-amber-600">{t('products.packageDialog.alreadyInPackage')}</div>
                              )}
                            </TableCell>
                            <TableCell>{item.quantity}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPackageDialog(false)}>
              {t('products.packageDialog.cancel')}
            </Button>
            <Button onClick={() => {
              if (!currentPackage) return;
              
              // Calculate total weight from the items
              let totalItemWeight = 0;
              currentPackage.items.forEach(item => {
                totalItemWeight += parseFloat(item.weight) * parseInt(item.quantity);
              });
              
              // Create or update the package
              const existingIndex = packages.findIndex(pkg => pkg.id === currentPackage.id);
              const isNew = existingIndex < 0;
              
              if (existingIndex >= 0) {
                // Update existing package
                const updatedPackages = [...packages];
                updatedPackages[existingIndex] = {
                  ...currentPackage,
                  // Update weight to include items if needed
                  weight: currentPackage.weight > totalItemWeight ? currentPackage.weight : totalItemWeight
                };
                setPackages(updatedPackages);
              } else {
                // Add new package
                setPackages([...packages, {
                  ...currentPackage,
                  // Ensure the weight is at least the total of the items
                  weight: currentPackage.weight > totalItemWeight ? currentPackage.weight : totalItemWeight
                }]);
                
                // Trigger achievements for creating a package
                try {
                  if (packages.length + 1 > 1) {
                    // If this is at least the second package, trigger the multiple packages achievement
                    checkMultiplePackages(packages.length + 1);
                    
                    // Let the shipping assistant know a package was added
                    triggerEvent('packageAdded');
                    
                    // Add a little celebration for the user
                    const achievementEl = document.createElement('div');
                    achievementEl.className = 'fixed top-10 right-10 z-50 animate-bounce';
                    achievementEl.innerHTML = `<div class="p-3 bg-primary text-primary-foreground rounded-full"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.29 7 12 12 20.71 7"></polyline><line x1="12" y1="22" x2="12" y2="12"></line></svg></div>`;
                    document.body.appendChild(achievementEl);
                    
                    setTimeout(() => {
                      achievementEl.remove();
                    }, 3000);
                  }
                  
                  // If the package has multiple items, let's acknowledge the user's thoroughness
                  if (currentPackage.items.length > 1) {
                    // This isn't a standard achievement but it's good to acknowledge good practices
                    toast({
                      title: t('products.packageDialog.achievement.title'),
                      description: t('products.packageDialog.achievement.description'),
                      duration: 3000,
                    });
                  }
                } catch (error) {
                  console.log("Error triggering achievements", error);
                }
              }
              
              setShowPackageDialog(false);
              
              toast({
                title: t('products.packageDialog.toast.packageSaved'),
                description: t('products.packageDialog.toast.packageSavedDescription', {
                  name: currentPackage.name,
                  count: currentPackage.items.length
                }),
              });
            }}>
              {t('products.packageDialog.savePackage')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Products Catalog Dialog - Redesigned */}
      {/* Products Dialog - Commented out as we integrated functionality directly into the main interface 
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
            
            <div className="flex justify-between items-center mt-2">
              <div className="flex items-center">
                {Object.keys(selectedProductIds).filter(id => selectedProductIds[id]).length > 0 ? (
                  <span className="text-xs text-primary font-medium">
                    {t('products.productsSelected', {
                      count: Object.keys(selectedProductIds).filter(id => selectedProductIds[id]).length
                    })}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {t('products.selectInstructions')}
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
                {t('common.cancel')}
              </Button>

            </div>
          </div>
        </DialogContent>
      </Dialog>
      */}
    </div>
  );
};

export default PackageItemSelectorRedesigned;