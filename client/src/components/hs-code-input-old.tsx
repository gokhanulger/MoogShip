export { HSCodeInput } from './hs-code-input-simple';

interface HSCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  productName?: string;
  disabled?: boolean;
  showRapidAPIToggle?: boolean;
}

export function HSCodeInput({ 
  value, 
  onChange, 
  placeholder = "Enter HS Code or search by product name", 
  className = "",
  productName = "",
  disabled = false,
  showRapidAPIToggle = true
}: HSCodeInputProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<HSCodeResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isValidCode, setIsValidCode] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [currentCodeDescription, setCurrentCodeDescription] = useState<string>('');
  // Removed RapidAPI state variables - now using Easyship exclusively
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const resultsRef = useRef<HTMLDivElement>(null);

  // Removed RapidAPI availability check - using Easyship exclusively

  // Validate HS code and fetch description when value changes
  useEffect(() => {
    const isValid = validateHSCode(value);
    setIsValidCode(isValid);
    
    // If valid code, try to fetch description
    if (isValid && value) {
      fetchCodeDescription(value);
    } else {
      setCurrentCodeDescription('');
    }
  }, [value]);

  // Removed RapidAPI availability check function - using Easyship exclusively

  // Function to fetch description for a specific HS code
  const fetchCodeDescription = async (code: string) => {
    try {
      const cleanCode = code.replace(/[^0-9]/g, '');
      if (cleanCode.length < 6) return;
      
      setIsValidating(true);
      
      // Validate HS code using Easyship database
      const result = await validateHSCodeWithAPI(cleanCode);
      if (result.valid && result.description) {
        setCurrentCodeDescription(result.description);
        setIsValidCode(true);
      } else {
        setCurrentCodeDescription(result.error || 'HS code validation failed');
        setIsValidCode(false);
      }
    } catch (error) {
      console.error('HS code validation error:', error);
      setCurrentCodeDescription('');
      setIsValidCode(false);
    } finally {
      setIsValidating(false);
    }
  };

  // Auto-search when product name is provided
  useEffect(() => {
    if (productName && productName.length > 2 && !value) {
      handleSearch(productName);
    }
  }, [productName, value]);

  // Handle clicking outside to close results
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (resultsRef.current && !resultsRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    setSearchQuery(query);

    try {
      const results = await searchHSCodes(query);
      setSearchResults(results);
      setShowResults(results.length > 0);
    } catch (error) {
      
      setSearchResults([]);
      setShowResults(false);
    } finally {
      setIsSearching(false);
    }
  };

  const handleInputChange = (inputValue: string) => {
    onChange(inputValue);

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Check if input looks like an HS code (numbers only)
    const isNumericCode = /^\d+$/.test(inputValue.replace(/[.\s-]/g, ''));
    
    if (isNumericCode && inputValue.length >= 6) {
      // Direct HS code entry - validate it
      setShowResults(false);
      setSearchResults([]);
      // The useEffect will handle validation and description fetching
    } else {
      // For text input, don't auto-search - wait for user to click search button
      setShowResults(false);
      setSearchResults([]);
    }
  };

  const handleSearchClick = () => {
    if (value && value.length >= 3) {
      handleSearch(value);
    }
  };

  const handleSelectCode = (hsCode: HSCodeResult) => {
    onChange(hsCode.code);
    setShowResults(false);
    setSearchResults([]);
  };

  const formatCode = (code: string) => {
    return formatHSCodeDisplay(code);
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="HS Kodu"
          disabled={disabled}
          className={`transition-all duration-200 focus:ring-2 
                     ${isValidCode && value 
                       ? 'border-green-400 focus:border-green-500 focus:ring-green-100 bg-green-50/30' 
                       : value && !isValidCode 
                       ? 'border-yellow-400 focus:border-yellow-500 focus:ring-yellow-100 bg-yellow-50/30'
                       : 'focus:border-blue-500 focus:ring-blue-100'
                     } ${isSearching || isValidating ? 'bg-blue-50/30' : ''}`}

          title="HS Kodu"
        />
        

      </div>

      {/* HS Code Description */}
      {currentCodeDescription && (
        <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-md">
          <div className="flex items-start space-x-2">
            <div className={`mt-1 w-2 h-2 rounded-full ${isValidCode ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
            <div className="flex-1">
              <p className={`text-sm ${isValidCode ? 'text-green-800' : 'text-yellow-800'}`}>
                {currentCodeDescription}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Search Results Dropdown */}
      {showResults && searchResults.length > 0 && (
        <div 
          ref={resultsRef} 
          className="absolute z-[100] w-full mt-3 animate-in slide-in-from-top-3 duration-300 ease-out"
          style={{ width: '150%', maxWidth: '600px' }}
        >
          <Card className="shadow-lg border border-gray-200 bg-white rounded-lg overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-semibold text-gray-700">
                    HS Code Suggestions ({searchResults.length})
                  </span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  Easyship
                </Badge>
              </div>
            </div>
            
            <CardContent className="p-0 max-h-96 overflow-y-auto">
              {searchResults.map((result, index) => (
                <div
                  key={index}
                  className="group relative px-6 py-4 border-b border-gray-100 last:border-b-0 cursor-pointer 
                           hover:bg-blue-50 transition-colors duration-200"
                  onClick={() => handleSelectCode(result)}
                >
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
                            Chapter {result.chapter}
                          </span>
                        )}
                      </div>
                      
                      {/* Description */}
                      <p className="text-base text-gray-700 leading-relaxed mb-3 line-clamp-3 pr-4">
                        {result.description}
                      </p>
                      
                      {/* Additional Info */}
                      {result.heading && (
                        <p className="text-sm text-gray-500 mt-2 pr-4 line-clamp-2">
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
                                 transition-all duration-200 text-sm font-medium px-4 py-2"
                      >
                        Select
                      </Button>
                    </div>
                  </div>
                  

                </div>
              ))}
            </CardContent>
            
            {/* Footer */}
            <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 text-center">
              <p className="text-xs text-gray-500">
                Click any HS code to use it
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Enhanced No Results State */}
      {showResults && searchResults.length === 0 && !isSearching && searchQuery && (
        <div 
          ref={resultsRef} 
          className="absolute z-50 w-full mt-2 animate-in slide-in-from-top-2 duration-200"
        >
          <Card className="shadow-xl border-0 bg-white/95 backdrop-blur-sm ring-1 ring-black/5">
            <CardContent className="p-6 text-center">
              <div className="flex flex-col items-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Search className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-800">
                    No HS codes found
                  </p>
                  <p className="text-xs text-gray-500 max-w-xs">
                    Try using more general terms like "electronics", "clothing", or "furniture"
                  </p>
                </div>
                <div className="flex items-center space-x-1 pt-2">
                  <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                  <span className="text-xs text-gray-400">Searched in Easyship Database</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}


    </div>
  );
}