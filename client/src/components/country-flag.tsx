import { useMemo } from "react";

interface CountryFlagProps {
  country: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

// Comprehensive country code mapping - includes all database countries and common variations
const COUNTRY_CODES: Record<string, string> = {
  // Direct ISO codes (already normalized in database)
  "US": "US",
  "AE": "AE", 
  "GB": "GB",
  "FR": "FR",
  "IT": "IT",
  "BH": "BH",
  "NL": "NL",
  "AU": "AU",
  "DE": "DE",
  "SA": "SA",
  "CA": "CA",
  "BR": "BR",
  "IN": "IN",
  "MX": "MX",
  "JP": "JP",
  "CN": "CN",
  "RU": "RU",
  "KR": "KR",
  "ES": "ES",
  "BE": "BE",
  "CH": "CH",
  "AT": "AT",
  "SE": "SE",
  "NO": "NO",
  "DK": "DK",
  "FI": "FI",
  "IE": "IE",
  "PT": "PT",
  "GR": "GR",
  "PL": "PL",
  "CZ": "CZ",
  "HU": "HU",
  "RO": "RO",
  "BG": "BG",
  "HR": "HR",
  "RS": "RS",
  "UA": "UA",
  "TR": "TR",
  "IL": "IL",
  "EG": "EG",
  "ZA": "ZA",
  "NG": "NG",
  "KE": "KE",
  "SG": "SG",
  "MY": "MY",
  "TH": "TH",
  "ID": "ID",
  "PH": "PH",
  "VN": "VN",
  "NZ": "NZ",
  "AR": "AR",
  "CL": "CL",
  "CO": "CO",
  "PE": "PE",
  "VE": "VE",
  
  // North America - Full names and variations
  "United States": "US",
  "United States of America": "US",
  "USA": "US",
  "America": "US",
  "Canada": "CA",
  "Mexico": "MX",
  
  // Europe - Full names and variations
  "United Kingdom": "GB",
  "UK": "GB",
  "England": "GB",
  "Great Britain": "GB",
  "Britain": "GB",
  "Germany": "DE",
  "Deutschland": "DE",
  "France": "FR",
  "Italy": "IT",
  "Italia": "IT",
  "Spain": "ES",
  "España": "ES",
  "Netherlands": "NL",
  "The Netherlands": "NL",
  "Holland": "NL",
  "Belgium": "BE",
  "Switzerland": "CH",
  "Austria": "AT",
  "Sweden": "SE",
  "Norway": "NO",
  "Denmark": "DK",
  "Finland": "FI",
  "Poland": "PL",
  "Portugal": "PT",
  "Greece": "GR",
  "Ireland": "IE",
  "Czech Republic": "CZ",
  "Hungary": "HU",
  "Romania": "RO",
  "Bulgaria": "BG",
  "Croatia": "HR",
  "Slovakia": "SK",
  "Slovenia": "SI",
  "Estonia": "EE",
  "Latvia": "LV",
  "Lithuania": "LT",
  "Luxembourg": "LU",
  "Malta": "MT",
  "Cyprus": "CY",
  
  // Asia Pacific - Full names and variations
  "Australia": "AU",
  "New Zealand": "NZ",
  "Japan": "JP",
  "South Korea": "KR",
  "Korea": "KR",
  "China": "CN",
  "People's Republic of China": "CN",
  "India": "IN",
  "Singapore": "SG",
  "Malaysia": "MY",
  "Thailand": "TH",
  "Philippines": "PH",
  "Indonesia": "ID",
  "Vietnam": "VN",
  "Taiwan": "TW",
  "Hong Kong": "HK",
  
  // Middle East - Full names and variations  
  "Turkey": "TR",
  "Saudi Arabia": "SA",
  "Kingdom of Saudi Arabia": "SA",
  "United Arab Emirates": "AE",
  "UAE": "AE",
  "Emirates": "AE",
  "Israel": "IL",
  "Jordan": "JO",
  "Lebanon": "LB",
  "Kuwait": "KW",
  "Qatar": "QA",
  "Bahrain": "BH",
  "Kingdom of Bahrain": "BH",
  "Oman": "OM",
  "Iran": "IR",
  "Iraq": "IQ",
  "Syria": "SY",
  "Yemen": "YE",
  
  // South America - Full names and variations
  "Brazil": "BR",
  "Argentina": "AR",
  "Chile": "CL",
  "Colombia": "CO",
  "Peru": "PE",
  "Venezuela": "VE",
  "Ecuador": "EC",
  "Uruguay": "UY",
  "Paraguay": "PY",
  "Bolivia": "BO",
  "Guyana": "GY",
  "Suriname": "SR",
  
  // Africa - Full names and variations
  "South Africa": "ZA",
  "Egypt": "EG",
  "Morocco": "MA",
  "Nigeria": "NG",
  "Kenya": "KE",
  "Ghana": "GH",
  "Tunisia": "TN",
  "Algeria": "DZ",
  "Ethiopia": "ET",
  "Uganda": "UG",
  "Tanzania": "TZ",
  "Rwanda": "RW",
  "Senegal": "SN",
  "Mali": "ML",
  "Burkina Faso": "BF",
  "Niger": "NE",
  "Chad": "TD",
  "Sudan": "SD",
  "Libya": "LY",
  
  // Others
  "Russia": "RU",
  "Russian Federation": "RU",
  "Ukraine": "UA",
  "Belarus": "BY",
  "Kazakhstan": "KZ",
  "Uzbekistan": "UZ",
  "Serbia": "RS",
  "Bosnia and Herzegovina": "BA",
  "North Macedonia": "MK",
  "Albania": "AL",
  "Montenegro": "ME",
  "Moldova": "MD",
  "Georgia": "GE",
  "Armenia": "AM",
  "Azerbaijan": "AZ"
};

export function CountryFlag({ country, size = "sm", className = "" }: CountryFlagProps) {
  const countryCode = useMemo(() => {
    if (!country) return null;
    
    // First try exact match
    const exactMatch = COUNTRY_CODES[country];
    if (exactMatch) return exactMatch;
    
    // Try case-insensitive match
    const caseInsensitiveMatch = Object.keys(COUNTRY_CODES).find(
      key => key.toLowerCase() === country.toLowerCase()
    );
    if (caseInsensitiveMatch) return COUNTRY_CODES[caseInsensitiveMatch];
    
    // Try partial match for common variations
    const partialMatch = Object.keys(COUNTRY_CODES).find(
      key => key.toLowerCase().includes(country.toLowerCase()) || 
             country.toLowerCase().includes(key.toLowerCase())
    );
    if (partialMatch) return COUNTRY_CODES[partialMatch];
    
    return null;
  }, [country]);
  
  const sizeClasses = {
    sm: "w-4 h-3",
    md: "w-6 h-4", 
    lg: "w-8 h-6"
  };
  
  if (!countryCode) {
    // Return a generic globe icon if country code not found
    return (
      <div className={`${sizeClasses[size]} ${className} bg-gray-100 rounded-sm flex items-center justify-center border border-gray-200`}>
        <span className="text-xs text-gray-400">🌍</span>
      </div>
    );
  }
  
  return (
    <div className={`${sizeClasses[size]} ${className} relative`}>
      <img
        src={`https://flagcdn.com/${countryCode.toLowerCase()}.svg`}
        alt={`${country} flag`}
        className={`${sizeClasses[size]} object-cover rounded-sm border border-gray-200 shadow-sm`}
        onError={(e) => {
          // Hide the broken image and show fallback
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const parent = target.parentElement;
          if (parent) {
            const fallback = parent.querySelector('.flag-fallback') as HTMLElement;
            if (fallback) {
              fallback.style.display = 'flex';
            }
          }
        }}
      />
      <div 
        className={`flag-fallback ${sizeClasses[size]} bg-gray-100 rounded-sm flex items-center justify-center border border-gray-200 absolute inset-0`}
        style={{ display: 'none' }}
      >
        <span className="text-xs text-gray-400 font-bold">{countryCode}</span>
      </div>
    </div>
  );
}