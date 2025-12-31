import React, { useState, useRef, useEffect } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Database } from "lucide-react";
import { cn } from "@/lib/utils";

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

interface ProductAutocompleteProps {
  onSelect: (product: UserProduct) => void;
  placeholder?: string;
}

export default function ProductAutocomplete({ 
  onSelect,
  placeholder = "Search products..." 
}: ProductAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState<UserProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<UserProduct | null>(null);
  
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  
  // Search products when typing
  useEffect(() => {
    if (searchTerm.trim().length < 2) {
      return;
    }
    
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    searchTimeout.current = setTimeout(() => {
      fetchProducts(searchTerm);
    }, 300);
    
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [searchTerm]);
  
  const fetchProducts = async (query: string) => {
    if (query.trim().length < 2) {
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSelect = (product: UserProduct) => {
    setSelectedProduct(product);
    onSelect(product);
    setOpen(false);
  };
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <div className="flex items-center">
            <Database className="mr-2 h-4 w-4 text-muted-foreground" />
            {placeholder}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput 
            placeholder="Search products..." 
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          {loading && (
            <div className="py-6 text-center text-sm">
              <div className="animate-spin h-4 w-4 border-t-2 border-b-2 border-blue-500 rounded-full mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Searching...</p>
            </div>
          )}
          {!loading && products && (
            <>
              <CommandEmpty>No products found.</CommandEmpty>
              <CommandGroup>
                {products.map((product) => (
                  <CommandItem
                    key={product.id}
                    value={`${product.id}`}
                    onSelect={() => handleSelect(product)}
                    className="flex items-center"
                  >
                    <div className="flex-1 truncate">
                      <p className="font-medium">{product.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {product.description || "No description"}
                      </p>
                    </div>
                    {selectedProduct?.id === product.id && (
                      <Check className="ml-2 h-4 w-4 flex-shrink-0 text-green-500" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}