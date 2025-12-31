import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Plus, CopyPlus, Check, Search, Package } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from '@/hooks/use-toast';
import { PackageTemplateSelect } from './package-template-select';

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
}

interface PackageItemFormProps {
  items: PackageItem[];
  setItems: React.Dispatch<React.SetStateAction<PackageItem[]>>;
  userId: number;
}

const emptyItem: PackageItem = {
  name: '',
  description: '',
  quantity: '1',
  price: '',
  gtin: '',
  hsCode: '',
  weight: '',
  length: '',
  width: '',
  height: '',
  countryOfOrigin: '',
  manufacturer: ''
};

const PackageItemFormEnhanced = ({ items, setItems, userId }: PackageItemFormProps) => {
  const [expanded, setExpanded] = useState<number[]>([]);
  const [searchResults, setSearchResults] = useState<{ [key: number]: UserProduct[] }>({});
  const [searchOpen, setSearchOpen] = useState<number | null>(null);
  const [searchLoading, setSearchLoading] = useState<{ [key: number]: boolean }>({});
  const searchTimeouts = useRef<{ [key: number]: NodeJS.Timeout }>({});

  const toggleExpand = (index: number) => {
    if (expanded.includes(index)) {
      setExpanded(expanded.filter(i => i !== index));
    } else {
      setExpanded([...expanded, index]);
    }
  };

  const handleAdd = () => {
    const newItems = [...items, { ...emptyItem }];
    setItems(newItems);
    // Auto-expand the newly added item
    setExpanded([...expanded, items.length]);
  };

  const handleRemove = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
    // Adjust expanded indices after removal
    setExpanded(expanded.filter(i => i !== index).map(i => i > index ? i - 1 : i));
  };

  const handleSearch = async (index: number, query: string) => {
    // If query is too short, clear results and return
    if (query.length < 2) {
      setSearchResults(prev => ({ ...prev, [index]: [] }));
      if (searchOpen === index) setSearchOpen(null);
      return;
    }
    
    // Set loading state for this index
    setSearchLoading(prev => ({ ...prev, [index]: true }));
    
    // Clear previous timeout for this index
    if (searchTimeouts.current[index]) {
      clearTimeout(searchTimeouts.current[index]);
    }
    
    // Set a new timeout for search
    searchTimeouts.current[index] = setTimeout(async () => {
      try {
        const response = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`, {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          setSearchResults(prev => ({ ...prev, [index]: data }));
          
          // Open the dropdown if we have results
          if (data.length > 0) {
            setSearchOpen(index);
          }
        }
      } catch (error) {
        console.error('Error searching products:', error);
      } finally {
        setSearchLoading(prev => ({ ...prev, [index]: false }));
      }
    }, 300);
  };

  const handleChange = (index: number, field: keyof PackageItem, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
    
    // If we're changing the name field, trigger search
    if (field === 'name') {
      // Only search if query is at least 2 characters
      handleSearch(index, value);
    }
  };

  const handleProductSelect = (index: number, product: UserProduct) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      name: product.name,
      description: product.description || '',
      gtin: product.gtin || '',
      hsCode: product.hsCode || '',
      weight: product.weight?.toString() || '',
      length: product.length?.toString() || '',
      width: product.width?.toString() || '',
      height: product.height?.toString() || '',
      price: product.price?.toString() || '',
      quantity: product.quantity?.toString() || '1',
      countryOfOrigin: product.countryOfOrigin || '',
      manufacturer: product.manufacturer || ''
    };
    setItems(newItems);
    setSearchOpen(null);
  };

  const handleTemplateSelect = (index: number, template: PackageTemplate) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      weight: template.weight?.toString() || '',
      length: template.length?.toString() || '',
      width: template.width?.toString() || '',
      height: template.height?.toString() || '',
    };
    setItems(newItems);
    
    toast({
      title: "Template Applied",
      description: `Applied "${template.name}" dimensions to item ${index + 1}`,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Package Items</h3>
        <Button 
          onClick={handleAdd} 
          variant="outline" 
          size="sm" 
          type="button"
        >
          <Plus className="mr-1 h-4 w-4" /> Add Item
        </Button>
      </div>

      <div className="space-y-4">
        {items.map((item, index) => (
          <div 
            key={index} 
            className="border rounded-md p-4 bg-background"
          >
            <div className="flex flex-col space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex-1 flex items-center">
                  <span className="mr-2 text-sm font-medium">{index + 1}.</span>
                  <Label htmlFor={`item-name-${index}`} className="sr-only">
                    Item Name
                  </Label>
                  <div className="flex-1 relative">
                    <div className="flex">
                      <Input
                        id={`item-name-${index}`}
                        placeholder="Item name (type to search catalog)"
                        value={item.name}
                        onChange={(e) => handleChange(index, 'name', e.target.value)}
                        className="w-full"
                        required
                      />
                      {searchLoading[index] && (
                        <div className="absolute right-3 top-2.5">
                          <div className="animate-spin h-4 w-4 border-t-2 border-b-2 border-primary rounded-full"></div>
                        </div>
                      )}
                      {/* Show save icon if item has a name but no matches were found */}
                      {!searchLoading[index] && item.name.trim().length >= 2 && (searchResults[index]?.length === 0 || !searchResults[index]) && (
                        <div className="absolute right-2 top-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-primary hover:text-primary-600"
                            onClick={() => {
                              // Create a product object from the current item
                              const productToSave = {
                                name: item.name,
                                description: item.description || '',
                                price: parseFloat(item.price) || 0,
                                gtin: item.gtin || '',
                                hsCode: item.hsCode || '',
                                weight: parseFloat(item.weight) || null,
                                height: parseFloat(item.height) || null,
                                width: parseFloat(item.width) || null,
                                length: parseFloat(item.length) || null,
                                quantity: parseInt(item.quantity) || 1,
                                countryOfOrigin: item.countryOfOrigin || '',
                                manufacturer: item.manufacturer || '',
                              };
                              
                              // Call API to save product
                              fetch('/api/products', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                },
                                body: JSON.stringify(productToSave),
                                credentials: 'include',
                              })
                              .then(response => {
                                if (!response.ok) {
                                  throw new Error('Failed to save product');
                                }
                                return response.json();
                              })
                              .then(data => {
                                // Show success message
                                console.log('Product saved:', data);
                                
                                // Refresh search results
                                handleSearch(index, item.name);
                                
                                // Show success toast notification
                                toast({
                                  title: "Success",
                                  description: "Product added to your catalog",
                                });
                              })
                              .catch(error => {
                                console.error('Error saving product:', error);
                                toast({
                                  variant: "destructive",
                                  title: "Error",
                                  description: "Failed to save product to catalog"
                                });
                              });
                            }}
                            title="Add to product catalog"
                          >
                            <CopyPlus className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    {searchOpen === index && searchResults[index]?.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md">
                        <Command className="rounded-lg border shadow-md">
                          <CommandGroup className="max-h-64 overflow-auto">
                            {searchResults[index]?.map((product) => (
                              <CommandItem
                                key={product.id}
                                value={product.id.toString()}
                                onSelect={() => handleProductSelect(index, product)}
                                className="flex items-center py-2 px-2 cursor-pointer hover:bg-accent"
                              >
                                <div className="flex-1 overflow-hidden">
                                  <p className="font-medium truncate">{product.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {product.price ? `$${product.price.toFixed(2)}` : ''} 
                                    {product.description ? ` - ${product.description}` : ''}
                                  </p>
                                </div>
                                <Check className="h-4 w-4 text-primary ml-2 flex-shrink-0 opacity-0 group-data-[selected]:opacity-100" />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center ml-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => toggleExpand(index)}
                  >
                    {expanded.includes(index) ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5v14" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14" />
                      </svg>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    onClick={() => handleRemove(index)}
                    className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {expanded.includes(index) && (
                <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`item-description-${index}`}>Description</Label>
                    <Textarea
                      id={`item-description-${index}`}
                      placeholder="Item description"
                      value={item.description}
                      onChange={(e) => handleChange(index, 'description', e.target.value)}
                      className="h-20 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`item-quantity-${index}`}>Quantity</Label>
                      <Input
                        id={`item-quantity-${index}`}
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleChange(index, 'quantity', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`item-price-${index}`}>Price ($)</Label>
                      <Input
                        id={`item-price-${index}`}
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={item.price}
                        onChange={(e) => {
                          // Only allow numbers and one decimal point
                          const value = e.target.value.replace(/[^0-9.]/g, '');
                          // Prevent multiple decimal points
                          const decimalCount = (value.match(/\./g) || []).length;
                          if (decimalCount <= 1) {
                            handleChange(index, 'price', value);
                          }
                        }}
                        onBlur={(e) => {
                          // Format to 2 decimal places on blur if there's a value
                          if (e.target.value) {
                            const numValue = parseFloat(e.target.value);
                            if (!isNaN(numValue)) {
                              handleChange(index, 'price', numValue.toFixed(2));
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`item-gtin-${index}`}>GTIN/UPC</Label>
                      <Input
                        id={`item-gtin-${index}`}
                        placeholder="Global Trade Item Number"
                        value={item.gtin}
                        onChange={(e) => handleChange(index, 'gtin', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`item-hscode-${index}`}>HS Code</Label>
                      <Input
                        id={`item-hscode-${index}`}
                        placeholder="Harmonized System Code"
                        value={item.hsCode}
                        onChange={(e) => handleChange(index, 'hsCode', e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`item-origin-${index}`}>Country of Origin</Label>
                      <Input
                        id={`item-origin-${index}`}
                        placeholder="Country of origin"
                        value={item.countryOfOrigin}
                        onChange={(e) => handleChange(index, 'countryOfOrigin', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`item-manufacturer-${index}`}>Manufacturer</Label>
                      <Input
                        id={`item-manufacturer-${index}`}
                        placeholder="Manufacturer"
                        value={item.manufacturer}
                        onChange={(e) => handleChange(index, 'manufacturer', e.target.value)}
                      />
                    </div>
                  </div>
                  
                  {/* Package dimensions section with template selector */}
                  <div className="md:col-span-2 border-t pt-4 mt-2">
                    <div className="flex justify-between items-center mb-4">
                      <Label className="text-base font-medium">Package Dimensions</Label>
                      
                      {/* Package Template Selector */}
                      <div className="w-1/2">
                        <PackageTemplateSelect 
                          userId={userId}
                          onSelect={(template) => handleTemplateSelect(index, template)}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`item-weight-${index}`}>Weight (kg)</Label>
                        <Input
                          id={`item-weight-${index}`}
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={item.weight}
                          onChange={(e) => handleChange(index, 'weight', e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label htmlFor={`item-length-${index}`}>L (cm)</Label>
                          <Input
                            id={`item-length-${index}`}
                            type="number"
                            step="0.1"
                            placeholder="0.0"
                            value={item.length}
                            onChange={(e) => handleChange(index, 'length', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`item-width-${index}`}>W (cm)</Label>
                          <Input
                            id={`item-width-${index}`}
                            type="number"
                            step="0.1"
                            placeholder="0.0"
                            value={item.width}
                            onChange={(e) => handleChange(index, 'width', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`item-height-${index}`}>H (cm)</Label>
                          <Input
                            id={`item-height-${index}`}
                            type="number"
                            step="0.1"
                            placeholder="0.0"
                            value={item.height}
                            onChange={(e) => handleChange(index, 'height', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PackageItemFormEnhanced;