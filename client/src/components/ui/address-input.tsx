import { useState, useRef, useEffect } from 'react';
import { Input } from './input';
import { Button } from './button';
import { MapPin, Loader2, Check, AlertCircle, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { addressVerificationService, type AddressSuggestion } from '@/services/addressVerification';

// Country flag emoji utility
const getCountryFlag = (countryCode: string): string => {
  if (!countryCode || countryCode.length !== 2) return '';
  
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  
  return String.fromCodePoint(...codePoints);
};

interface AddressInputProps {
  value: string;
  onChange: (value: string) => void;
  onAddressSelect?: (suggestion: AddressSuggestion) => void;
  placeholder?: string;
  className?: string;
  countryCode?: string;
  disabled?: boolean;
  showVerificationStatus?: boolean;
}

export function AddressInput({
  value,
  onChange,
  onAddressSelect,
  placeholder = "Enter address...",
  className,
  countryCode,
  disabled = false,
  showVerificationStatus = true
}: AddressInputProps) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showToolbox, setShowToolbox] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'none' | 'verified' | 'invalid'>('none');
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const toolboxRef = useRef<HTMLDivElement>(null);

  // Manual search function for the toolbox
  const searchAddresses = async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const results = await addressVerificationService.searchAddresses(query, countryCode);
      setSuggestions(results);
      
      // Check if current input matches any suggestion closely
      const exactMatch = results.find(r => 
        r.address.toLowerCase().includes(value.toLowerCase()) ||
        r.formatted.toLowerCase().includes(value.toLowerCase())
      );
      
      setVerificationStatus(exactMatch ? 'verified' : 'none');
    } catch (error) {
      console.error('Address search error:', error);
      setSuggestions([]);
      setVerificationStatus('none');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle input changes (no automatic search)
  const handleInputChange = (inputValue: string) => {
    onChange(inputValue);
    setVerificationStatus('none');
  };

  // Handle toolbox search
  const handleToolboxSearch = () => {
    if (!showToolbox) {
      setShowToolbox(true);
      setSearchQuery(value);
      if (value && value.length >= 3) {
        searchAddresses(value);
      }
    } else {
      setShowToolbox(false);
      setSuggestions([]);
    }
  };

  // Handle search in toolbox
  const handleSearchInToolbox = (query: string) => {
    setSearchQuery(query);
    searchAddresses(query);
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: AddressSuggestion) => {
    // Update input value and close toolbox
    onChange(suggestion.address);
    setShowToolbox(false);
    setSuggestions([]);
    setVerificationStatus('verified');
    
    if (onAddressSelect) {
      onAddressSelect(suggestion);
    }
  };

  // Handle click outside to close toolbox
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        toolboxRef.current &&
        !toolboxRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowToolbox(false);
        setSuggestions([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getVerificationIcon = () => {
    if (!showVerificationStatus) return null;
    
    switch (verificationStatus) {
      case 'verified':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'invalid':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <MapPin className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "pr-20", // Space for icons
            verificationStatus === 'verified' && "border-green-500 focus:border-green-500",
            verificationStatus === 'invalid' && "border-red-500 focus:border-red-500",
            className
          )}
          disabled={disabled}
          data-testid="input-address"
        />
        
        {/* Icons container */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {/* Address suggestion toolbox icon - made more remarkable */}
          <div className="relative">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 w-7 p-0 rounded-full transition-all duration-200 relative",
                showToolbox 
                  ? "bg-blue-100 hover:bg-blue-200" 
                  : "bg-blue-50 hover:bg-blue-100 hover:scale-110 animate-pulse"
              )}
              onClick={handleToolboxSearch}
              disabled={disabled}
              title="🔍 Click to open address suggestion toolbox - Get instant address suggestions!"
            >
              <Search className={cn(
                "h-5 w-5 transition-colors duration-200",
                showToolbox ? "text-blue-700" : "text-blue-600 hover:text-blue-700"
              )} />
            </Button>
            {/* Small indicator badge */}
            <div className={cn(
              "absolute -top-1 -right-1 h-3 w-3 bg-orange-400 rounded-full border-2 border-white",
              "flex items-center justify-center",
              showToolbox && "hidden"
            )}>
              <div className="h-1.5 w-1.5 bg-white rounded-full"></div>
            </div>
          </div>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
          {!isLoading && getVerificationIcon()}
        </div>
      </div>

      {/* Address Suggestion Toolbox */}
      {showToolbox && (
        <div
          ref={toolboxRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg"
        >
          {/* Toolbox Header */}
          <div className="p-3 border-b border-gray-100 bg-blue-50">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-blue-900 flex items-center gap-2">
                <Search className="h-4 w-4" />
                Address Suggestion Toolbox
              </h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                onClick={() => setShowToolbox(false)}
              >
                <AlertCircle className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-blue-700 mt-1">
              Search for address suggestions {countryCode && `in ${countryCode}`}
            </p>
          </div>

          {/* Search Input in Toolbox */}
          <div className="p-3 border-b">
            <Input
              type="text"
              placeholder="Type address to search..."
              value={searchQuery}
              onChange={(e) => handleSearchInToolbox(e.target.value)}
              className="text-sm"
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter at least 3 characters to search for address suggestions
            </p>
          </div>

          {/* Results Section */}
          <div className="max-h-60 overflow-y-auto">
            {isLoading && (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                <span className="ml-2 text-sm text-gray-600">Searching addresses...</span>
              </div>
            )}
            
            {!isLoading && suggestions.length === 0 && searchQuery.length >= 3 && (
              <div className="p-4 text-center text-gray-500 text-sm">
                No address suggestions found for "{searchQuery}"
                {countryCode && ` in ${countryCode}`}
              </div>
            )}

            {!isLoading && searchQuery.length > 0 && searchQuery.length < 3 && (
              <div className="p-4 text-center text-gray-500 text-sm">
                Type at least 3 characters to search
              </div>
            )}

            {!isLoading && searchQuery.length === 0 && (
              <div className="p-4 text-center text-gray-500 text-sm">
                Start typing to search for addresses
              </div>
            )}
            
            {!isLoading && suggestions.length > 0 && (
              <>
                <div className="p-2 text-xs text-gray-500 border-b bg-gray-50">
                  {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''} found
                  {countryCode && (
                    <span className="ml-2 text-green-600">• Filtered by {countryCode}</span>
                  )}
                </div>
                
                {suggestions.map((suggestion) => (
                  <Button
                    key={suggestion.id}
                    variant="ghost"
                    className="w-full justify-start text-left h-auto p-3 hover:bg-blue-50 border-0 rounded-none"
                    onClick={() => handleSuggestionSelect(suggestion)}
                  >
                    <div className="flex items-start gap-3 w-full">
                      <MapPin className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900 truncate">
                          {suggestion.address}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {[
                            suggestion.city,
                            suggestion.state,
                            suggestion.postalCode
                          ].filter(Boolean).join(', ')}
                        </div>
                        {suggestion.confidence && (
                          <div className="text-xs text-gray-400 mt-1">
                            Confidence: {Math.round(suggestion.confidence * 100)}%
                          </div>
                        )}
                      </div>
                      {/* Country indicator with flag */}
                      <div className="flex-shrink-0">
                        <div className={cn(
                          "px-2 py-1 rounded text-xs font-medium flex items-center gap-1",
                          !countryCode 
                            ? "bg-blue-100 text-blue-700 border border-blue-200" 
                            : "bg-gray-100 text-gray-600"
                        )}>
                          <span className="text-sm">
                            {getCountryFlag(suggestion.countryCode || '')}
                          </span>
                          <span>{suggestion.countryCode}</span>
                        </div>
                        {!countryCode && (
                          <div className="text-xs text-gray-500 mt-1 text-center">
                            {suggestion.country}
                          </div>
                        )}
                      </div>
                    </div>
                  </Button>
                ))}
              </>
            )}
          </div>
          
          {/* Toolbox Footer */}
          <div className="p-2 text-xs text-gray-400 border-t bg-gray-50">
            Powered by address verification service
          </div>
        </div>
      )}
    </div>
  );
}