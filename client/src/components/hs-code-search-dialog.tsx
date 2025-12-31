import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Loader2, CheckCircle2 } from 'lucide-react';
import { formatHSCodeDisplay } from '@/lib/hs-code-lookup';
import { useToast } from '@/hooks/use-toast';

interface HSCodeResult {
  code: string;
  description: string;
  chapter?: string;
  heading?: string;
  subheading?: string;
}

interface HSCodeSearchDialogProps {
  onSelect: (hsCode: string) => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function HSCodeSearchDialog({ onSelect, trigger, open, onOpenChange }: HSCodeSearchDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<HSCodeResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      console.log('🔍 HS Code dialog opened - resetting state');
      setSearchTerm('');
      setSearchResults([]);
      setIsSearching(false);
      setHasSearched(false);
    }
  }, [open]);

  const handleSearch = async (query: string) => {
    if (!query || query.length < 3) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    // Clear previous results immediately
    setSearchResults([]);
    setIsSearching(true);
    setHasSearched(true);

    try {
      // Add timestamp to prevent caching and force fresh requests
      const timestamp = Date.now();
      console.log(`🔍 Starting HS code search for: "${query}" at ${timestamp}`);
      
      const response = await fetch(`/api/hs-codes/search?q=${encodeURIComponent(query)}&rapidapi=true&t=${timestamp}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      console.log(`🔍 HS code search response status:`, response.status, response.statusText);
      
      if (response.ok) {
        const results = await response.json();
        console.log(`🔍 HS code search results:`, results?.length || 0, 'codes found');
        setSearchResults(results || []);
      } else {
        console.error('Failed to search HS codes:', response.status, response.statusText);
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching HS codes:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchClick = () => {
    if (searchTerm && searchTerm.length >= 3) {
      console.log(`🔍 Search button clicked for term: "${searchTerm}"`);
      // Always trigger a fresh search regardless of previous state
      handleSearch(searchTerm);
    } else {
      console.log(`🔍 Search clicked but term too short: "${searchTerm}" (${searchTerm.length} chars)`);
    }
  };

  const handleSelectCode = (hsCode: HSCodeResult) => {
    // Close dialog immediately
    if (onOpenChange) {
      onOpenChange(false);
    }
    
    // Apply the selection
    onSelect(hsCode.code);
    
    // Reset search state
    setSearchTerm('');
    setSearchResults([]);
    setHasSearched(false);
    
    // Show success notification after dialog closes
    setTimeout(() => {
      toast({
        title: "HS Kodu Seçildi",
        description: (
          <div className="space-y-1">
            <div className="font-semibold text-green-700">
              {formatCode(hsCode.code)}
            </div>
            <div className="text-sm text-gray-600 line-clamp-2">
              {hsCode.description}
            </div>
            <div className="text-xs text-gray-500 mt-2">
              ✓ Bu HS kodu otomatik olarak forma eklendi
            </div>
          </div>
        ),
        duration: 4000,
      });
    }, 100); // Small delay to ensure dialog closes first
  };

  const formatCode = (code: string) => {
    return formatHSCodeDisplay(code);
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="px-2" title="HS Kodu Ara">
      <Search className="h-4 w-4" />
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>HS Kodu Arama</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search Input */}
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Ürün adı girin (ör: masaüstü düzenleyici, kahve fincanı)"
                className="w-full"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearchClick();
                  }
                }}
              />
            </div>
            <Button 
              onClick={handleSearchClick} 
              disabled={!searchTerm || searchTerm.length < 3 || isSearching}
              className="gap-2"
            >
              {isSearching ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Aranıyor...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Ara
                </>
              )}
            </Button>
          </div>

          {/* Search Instructions */}
          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
            <p className="font-medium mb-1">Nasıl Arama Yapılır:</p>
            <ul className="space-y-1 text-xs">
              <li>• Ürün adını Türkçe veya İngilizce yazabilirsiniz</li>
              <li>• En az 3 karakter girin ve "Ara" butonuna tıklayın</li>
              <li>• Örnekler: "masaüstü düzenleyici", "coffee mug", "phone case"</li>
            </ul>
          </div>

          {/* Search Results */}
          <div className="flex-1 overflow-hidden">
            {isSearching && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">HS kodları aranıyor...</p>
                </div>
              </div>
            )}

            {!isSearching && hasSearched && searchResults.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-2">
                  <Search className="h-12 w-12 mx-auto mb-4" />
                  <p className="text-lg font-medium">Sonuç bulunamadı</p>
                  <p className="text-sm">Farklı anahtar kelimeler deneyin</p>
                </div>
              </div>
            )}

            {!isSearching && !hasSearched && (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-2">
                  <Search className="h-12 w-12 mx-auto mb-4" />
                  <p className="text-lg font-medium">HS Kodu Arama</p>
                  <p className="text-sm">Ürün adı girin ve arama yapın</p>
                </div>
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="max-h-96 overflow-y-auto space-y-2">
                <p className="text-sm text-gray-600 mb-3">
                  {searchResults.length} HS kodu bulundu
                </p>
                
                {searchResults.map((result, index) => (
                  <Card
                    key={index}
                    className="group cursor-pointer hover:bg-blue-50 transition-colors duration-200 border-gray-200"
                    onClick={() => handleSelectCode(result)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          {/* HS Code and Chapter */}
                          <div className="flex items-center space-x-3 mb-3">
                            <Badge 
                              variant="outline" 
                              className="text-base font-mono font-semibold bg-blue-50 border-blue-200 text-blue-800 px-3 py-1.5"
                            >
                              {formatCode(result.code)}
                            </Badge>
                            {result.chapter && (
                              <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-md">
                                Bölüm {result.chapter}
                              </span>
                            )}
                          </div>
                          
                          {/* Description */}
                          <p className="text-base text-gray-700 leading-relaxed mb-3 pr-4">
                            {result.description}
                          </p>
                          
                          {/* Additional Info */}
                          {result.heading && (
                            <p className="text-sm text-gray-500 pr-4 line-clamp-2">
                              {result.heading}
                            </p>
                          )}
                        </div>
                        
                        {/* Select Button */}
                        <div className="ml-6 shrink-0">
                          <Button 
                            variant="ghost" 
                            size="default" 
                            className="opacity-70 group-hover:opacity-100 hover:bg-blue-100 hover:text-blue-700 
                                     transition-all duration-200 text-sm font-medium px-4 py-2 gap-2"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Seç
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}