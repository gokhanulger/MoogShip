import { useState, useEffect, useRef } from 'react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';
import { COUNTRIES, type Country } from '@shared/countries';
import { CountryFlag } from '@/components/country-flag';
import { useTranslation } from 'react-i18next';
import { Search, X } from 'lucide-react';
import { Input } from './input';

// Helper function to detect mobile devices
const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
};

// Popular countries to show at the top
const POPULAR_COUNTRIES = ['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'AE', 'BH'];

interface CountrySelectProps {
  value?: string;
  onChange: (countryCode: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function CountrySelect({
  value,
  onChange,
  placeholder,
  disabled = false,
  className
}: CountrySelectProps) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus search input when dropdown opens (desktop only)
  useEffect(() => {
    if (isOpen && searchInputRef.current && !isMobileDevice()) {
      // Delay focus to ensure dropdown is fully rendered
      const timeoutId = setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          // Clear any existing text selection to avoid typing issues
          searchInputRef.current.setSelectionRange(
            searchInputRef.current.value.length, 
            searchInputRef.current.value.length
          );
        }
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen]);

  // Simple and effective search function
  const filteredCountries = COUNTRIES.filter(country => {
    if (!searchTerm) return true;
    
    const term = searchTerm.toLowerCase().trim();
    const name = country.name.toLowerCase();
    const code = country.code.toLowerCase();
    
    // Basic matching: name contains term OR code matches term
    if (name.includes(term) || code.includes(term)) return true;
    
    // Common abbreviations
    const commonNames: Record<string, string[]> = {
      'US': ['usa', 'america', 'united states'],
      'GB': ['uk', 'britain', 'england', 'united kingdom'],
      'DE': ['germany', 'deutschland'],
      'FR': ['france'],
      'IT': ['italy'],
      'ES': ['spain'],
      'CN': ['china'],
      'JP': ['japan'],
      'RU': ['russia'],
      'CA': ['canada'],
      'AU': ['australia'],
      'IN': ['india'],
      'BR': ['brazil'],
      'MX': ['mexico'],
      'TR': ['turkey', 'türkiye']
    };
    
    // Check alternative names
    const alternatives = commonNames[country.code] || [];
    return alternatives.some(alt => alt.includes(term));
  }).sort((a, b) => {
    // Popular countries first when not searching
    if (!searchTerm) {
      const aIsPopular = POPULAR_COUNTRIES.includes(a.code);
      const bIsPopular = POPULAR_COUNTRIES.includes(b.code);
      
      if (aIsPopular && !bIsPopular) return -1;
      if (!aIsPopular && bIsPopular) return 1;
    }
    
    // Then alphabetical
    return a.name.localeCompare(b.name);
  });

  const selectedCountry = COUNTRIES.find(c => c.code === value);

  // Clear search function
  const clearSearch = () => {
    setSearchTerm('');
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 0);
  };

  // Simple highlight function
  const highlightMatch = (text: string) => {
    if (!searchTerm) return text;
    
    try {
      const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      const parts = text.split(regex);
      
      return parts.map((part, index) => {
        if (part.toLowerCase() === searchTerm.toLowerCase()) {
          return <mark key={index} className="bg-yellow-200 text-yellow-900 px-0.5 rounded">{part}</mark>;
        }
        return part;
      });
    } catch {
      return text;
    }
  };

  return (
    <Select 
      value={value} 
      onValueChange={onChange} 
      disabled={disabled} 
      onOpenChange={setIsOpen}
    >
      <SelectTrigger className={className} data-testid="select-country">
        <SelectValue placeholder={placeholder || t('createShipment.recipientInfo.placeholders.country', 'Select country...')}>
          {selectedCountry && (
            <div className="flex items-center gap-2">
              <CountryFlag country={selectedCountry.code} size="sm" />
              <span>{selectedCountry.name}</span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="p-0">
        {/* Sticky Enhanced Search input */}
        <div className="sticky top-0 z-10 p-2 border-b border-gray-100 bg-white shadow-sm" onMouseDown={(e) => {
          // Only prevent on desktop to avoid interfering with touch events
          if (!isMobileDevice()) {
            e.preventDefault();
          }
        }}>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder={t('priceCalculator.searchCountry', 'Search countries...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-8 h-8 text-sm border-gray-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
              onKeyDown={(e) => {
                // Only prevent default key handling on desktop
                if (!isMobileDevice()) {
                  e.stopPropagation();
                  e.preventDefault();
                  
                  // Handle specific keys manually
                  if (e.key === 'Escape') {
                    setIsOpen(false);
                    setSearchTerm('');
                    setIsInputFocused(false);
                  } else if (e.key === 'Backspace') {
                    const newValue = searchTerm.slice(0, -1);
                    setSearchTerm(newValue);
                  } else if (e.key.length === 1) {
                    setSearchTerm(searchTerm + e.key);
                  }
                } else {
                  // On mobile, allow natural input behavior, minimal interference
                  if (e.key === 'Escape') {
                    setIsOpen(false);
                    setSearchTerm('');
                    setIsInputFocused(false);
                  }
                  // Only stop propagation to prevent dropdown from closing, but allow input to work
                  e.stopPropagation();
                }
              }}
              onKeyPress={(e) => {
                // Only stop propagation on desktop to prevent interference with Radix
                if (!isMobileDevice()) {
                  e.stopPropagation();
                }
              }}
              onInput={(e) => {
                // Only stop propagation on desktop to prevent interference with Radix
                if (!isMobileDevice()) {
                  e.stopPropagation();
                }
              }}
              onFocus={(e) => {
                e.stopPropagation();
                setIsInputFocused(true);
              }}
              onBlur={() => {
                setIsInputFocused(false);
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
            />
            {searchTerm && (
              <button
                onClick={clearSearch}
                className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground hover:text-gray-700 transition-colors"
                type="button"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          {searchTerm && (
            <div className="text-xs text-gray-500 mt-1 px-1">
              {filteredCountries.length === 0 
                ? t('priceCalculator.noCountryFound', 'No countries found')
                : `${filteredCountries.length} ${filteredCountries.length === 1 ? 'country' : 'countries'} found`
              }
            </div>
          )}
        </div>
        
        {/* Scrollable Results Section */}
        <div className="max-h-72 overflow-y-auto">
          {filteredCountries.length > 0 ? (
            <>
              {/* Popular Countries Section (when not searching) */}
              {!searchTerm && (
                <>
                  <div className="px-3 py-2 border-b border-gray-100 bg-blue-50 mb-1">
                    <span className="text-xs font-semibold text-blue-800">{t('countries.popular', 'Popular Countries')}</span>
                  </div>
                  {filteredCountries
                    .filter(country => POPULAR_COUNTRIES.includes(country.code))
                    .map((country) => (
                      <SelectItem key={`popular-${country.code}`} value={country.code}>
                        <div className="flex items-center gap-2 py-1">
                          <CountryFlag country={country.code} size="sm" />
                          <span className="font-medium">{highlightMatch(country.name)}</span>
                          <span className="text-xs text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full ml-auto font-medium">{country.code}</span>
                        </div>
                      </SelectItem>
                    ))
                  }
                  
                  <div className="px-3 py-2 border-b border-gray-100 bg-gray-50 mt-2 mb-1">
                    <span className="text-xs font-semibold text-gray-700">{t('countries.all', 'All Countries')}</span>
                  </div>
                </>
              )}
              
              {/* Search Results or All Countries */}
              {(searchTerm ? 
                filteredCountries :
                filteredCountries.filter(country => !POPULAR_COUNTRIES.includes(country.code))
              ).map((country) => (
                <SelectItem key={country.code} value={country.code}>
                  <div className="flex items-center gap-2 py-1">
                    <CountryFlag country={country.code} size="sm" />
                    <span className={searchTerm ? 'font-medium' : ''}>
                      {highlightMatch(country.name)}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ml-auto font-medium ${
                      searchTerm 
                        ? 'text-green-700 bg-green-100' 
                        : 'text-gray-500 bg-gray-100'
                    }`}>
                      {country.code}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </>
          ) : searchTerm ? (
            /* Enhanced No Results State */
            <div className="p-6 text-center">
              <div className="text-gray-400 mb-2">
                <Search className="h-8 w-8 mx-auto" />
              </div>
              <div className="text-sm text-gray-600 mb-1">
                {t('priceCalculator.noCountryFound', 'No countries found')}
              </div>
              <div className="text-xs text-gray-500">
                Try searching for "USA", "Turkey", or "Germany"
              </div>
              <button
                onClick={clearSearch}
                className="text-xs text-blue-600 hover:text-blue-800 mt-2 underline"
                type="button"
              >
                Clear search
              </button>
            </div>
          ) : null}
        </div>
      </SelectContent>
    </Select>
  );
}