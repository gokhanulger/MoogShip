// Country-specific zip code validation patterns and utilities

export interface CountryZipPattern {
  pattern: RegExp;
  format: string;
  example: string;
  name: string;
}

// Comprehensive zip code patterns for major countries
export const ZIP_CODE_PATTERNS: Record<string, CountryZipPattern> = {
  // North America
  US: {
    pattern: /^\d{5}(-\d{4})?$/,
    format: "NNNNN or NNNNN-NNNN",
    example: "12345 or 12345-6789",
    name: "ZIP Code"
  },
  CA: {
    pattern: /^[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d$/,
    format: "ANA NAN",
    example: "K1A 0A6",
    name: "Postal Code"
  },
  MX: {
    pattern: /^\d{5}$/,
    format: "NNNNN",
    example: "01000",
    name: "Código Postal"
  },

  // Europe
  GB: {
    pattern: /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i,
    format: "AN NAA or AAN NAA or ANA NAA or AANA NAA",
    example: "SW1A 1AA",
    name: "Postcode"
  },
  DE: {
    pattern: /^\d{5}$/,
    format: "NNNNN",
    example: "12345",
    name: "Postleitzahl"
  },
  FR: {
    pattern: /^\d{5}$/,
    format: "NNNNN",
    example: "75001",
    name: "Code Postal"
  },
  IT: {
    pattern: /^\d{5}$/,
    format: "NNNNN",
    example: "00118",
    name: "Codice Postale"
  },
  ES: {
    pattern: /^\d{5}$/,
    format: "NNNNN",
    example: "28001",
    name: "Código Postal"
  },
  NL: {
    pattern: /^\d{4}\s?[A-Z]{2}$/i,
    format: "NNNN AA",
    example: "1012 AB",
    name: "Postcode"
  },
  BE: {
    pattern: /^\d{4}$/,
    format: "NNNN",
    example: "1000",
    name: "Code Postal"
  },
  CH: {
    pattern: /^\d{4}$/,
    format: "NNNN",
    example: "8001",
    name: "Postleitzahl"
  },
  AT: {
    pattern: /^\d{4}$/,
    format: "NNNN",
    example: "1010",
    name: "Postleitzahl"
  },
  SE: {
    pattern: /^\d{3}\s?\d{2}$/,
    format: "NNN NN",
    example: "123 45",
    name: "Postnummer"
  },
  NO: {
    pattern: /^\d{4}$/,
    format: "NNNN",
    example: "0150",
    name: "Postnummer"
  },
  DK: {
    pattern: /^\d{4}$/,
    format: "NNNN",
    example: "1050",
    name: "Postnummer"
  },
  FI: {
    pattern: /^\d{5}$/,
    format: "NNNNN",
    example: "00100",
    name: "Postinumero"
  },
  PL: {
    pattern: /^\d{2}-\d{3}$/,
    format: "NN-NNN",
    example: "00-950",
    name: "Kod Pocztowy"
  },
  CZ: {
    pattern: /^\d{3}\s?\d{2}$/,
    format: "NNN NN",
    example: "110 00",
    name: "PSČ"
  },
  RU: {
    pattern: /^\d{6}$/,
    format: "NNNNNN",
    example: "101000",
    name: "Почтовый индекс"
  },

  // Asia Pacific
  JP: {
    pattern: /^\d{3}-\d{4}$/,
    format: "NNN-NNNN",
    example: "100-0001",
    name: "郵便番号"
  },
  KR: {
    pattern: /^\d{5}$/,
    format: "NNNNN",
    example: "03051",
    name: "우편번호"
  },
  CN: {
    pattern: /^\d{6}$/,
    format: "NNNNNN",
    example: "100000",
    name: "邮政编码"
  },
  IN: {
    pattern: /^\d{6}$/,
    format: "NNNNNN",
    example: "110001",
    name: "PIN Code"
  },
  AU: {
    pattern: /^\d{4}$/,
    format: "NNNN",
    example: "2000",
    name: "Postcode"
  },
  NZ: {
    pattern: /^\d{4}$/,
    format: "NNNN",
    example: "1010",
    name: "Postcode"
  },
  SG: {
    pattern: /^\d{6}$/,
    format: "NNNNNN",
    example: "018956",
    name: "Postal Code"
  },
  MY: {
    pattern: /^\d{5}$/,
    format: "NNNNN",
    example: "50470",
    name: "Poskod"
  },
  TH: {
    pattern: /^\d{5}$/,
    format: "NNNNN",
    example: "10100",
    name: "รหัสไปรษณีย์"
  },
  PH: {
    pattern: /^\d{4}$/,
    format: "NNNN",
    example: "1000",
    name: "ZIP Code"
  },

  // Middle East & Africa
  IL: {
    pattern: /^\d{5}(\d{2})?$/,
    format: "NNNNN or NNNNNNN",
    example: "91000",
    name: "מיקוד"
  },
  ZA: {
    pattern: /^\d{4}$/,
    format: "NNNN",
    example: "2000",
    name: "Postal Code"
  },
  AE: {
    pattern: /^\d{5}$/,
    format: "NNNNN",
    example: "12345",
    name: "Postal Code"
  },
  SA: {
    pattern: /^\d{5}(-\d{4})?$/,
    format: "NNNNN or NNNNN-NNNN",
    example: "11564",
    name: "الرمز البريدي"
  },

  // South America
  BR: {
    pattern: /^\d{5}-?\d{3}$/,
    format: "NNNNN-NNN",
    example: "01310-100",
    name: "CEP"
  },
  AR: {
    pattern: /^[A-Z]\d{4}[A-Z]{3}$/i,
    format: "ANNNNAA",
    example: "C1000AAA",
    name: "Código Postal"
  },
  CL: {
    pattern: /^\d{7}$/,
    format: "NNNNNNN",
    example: "8320000",
    name: "Código Postal"
  },

  // Turkey (Special case for your platform)
  TR: {
    pattern: /^\d{5}$/,
    format: "NNNNN",
    example: "34000",
    name: "Posta Kodu"
  }
};

// Countries that don't use postal codes
export const NO_POSTAL_CODE_COUNTRIES = new Set([
  'AO', 'AG', 'AW', 'BS', 'BZ', 'BJ', 'BW', 'BF', 'BI', 'CM', 'CF', 'TD', 'KM', 'CG', 'CD', 'CK',
  'CI', 'DJ', 'DM', 'GQ', 'ER', 'FJ', 'TF', 'GA', 'GM', 'GH', 'GD', 'GN', 'GW', 'GY', 'HK', 'IE',
  'JM', 'KE', 'KI', 'LY', 'MO', 'MW', 'ML', 'MR', 'MU', 'NR', 'NU', 'OM', 'PA', 'PW', 'QA', 'RW',
  'KN', 'LC', 'ST', 'SC', 'SL', 'SB', 'SO', 'SR', 'SZ', 'TZ', 'TL', 'TK', 'TO', 'TT', 'TV', 'UG',
  'VU', 'YE', 'ZW'
]);

export interface ZipValidationResult {
  isValid: boolean;
  message?: string;
  formatted?: string;
  city?: string;
  stateOrProvinceCode?: string;
  source?: 'pattern' | 'fedex';
}

/**
 * Validates a zip code for a specific country
 */
export function validateZipCode(zipCode: string, countryCode: string): ZipValidationResult {
  if (!zipCode || !countryCode) {
    return {
      isValid: false,
      message: "Zip code and country code are required"
    };
  }

  const upperCountryCode = countryCode.toUpperCase();
  
  // Check if country doesn't use postal codes
  if (NO_POSTAL_CODE_COUNTRIES.has(upperCountryCode)) {
    return {
      isValid: true,
      message: "This country does not use postal codes",
      formatted: ""
    };
  }

  const pattern = ZIP_CODE_PATTERNS[upperCountryCode];
  
  if (!pattern) {
    // Unknown country - allow any format but warn
    return {
      isValid: true,
      message: "Unknown country format - please verify manually",
      formatted: zipCode.trim()
    };
  }

  const cleanZip = zipCode.trim();
  
  if (pattern.pattern.test(cleanZip)) {
    return {
      isValid: true,
      formatted: formatZipCode(cleanZip, upperCountryCode)
    };
  } else {
    return {
      isValid: false,
      message: `Invalid ${pattern.name}. Expected format: ${pattern.format} (e.g., ${pattern.example})`
    };
  }
}

/**
 * Formats a zip code according to country standards
 */
export function formatZipCode(zipCode: string, countryCode: string): string {
  const upperCountryCode = countryCode.toUpperCase();
  const cleanZip = zipCode.replace(/\s+/g, '').toUpperCase();
  
  switch (upperCountryCode) {
    case 'CA':
      // Format as A1A 1A1
      return cleanZip.replace(/^([A-Z]\d[A-Z])(\d[A-Z]\d)$/, '$1 $2');
      
    case 'GB':
      // Add space before last 3 characters if not present
      if (cleanZip.length >= 5 && !cleanZip.includes(' ')) {
        return cleanZip.slice(0, -3) + ' ' + cleanZip.slice(-3);
      }
      return cleanZip;
      
    case 'NL':
      // Format as 1234 AB
      return cleanZip.replace(/^(\d{4})([A-Z]{2})$/, '$1 $2');
      
    case 'SE':
    case 'CZ':
      // Format as 123 45
      return cleanZip.replace(/^(\d{3})(\d{2})$/, '$1 $2');
      
    case 'PL':
      // Format as 12-345
      return cleanZip.replace(/^(\d{2})(\d{3})$/, '$1-$2');
      
    case 'BR':
      // Format as 12345-678
      return cleanZip.replace(/^(\d{5})(\d{3})$/, '$1-$2');
      
    case 'JP':
      // Format as 123-4567
      return cleanZip.replace(/^(\d{3})(\d{4})$/, '$1-$2');
      
    default:
      return cleanZip;
  }
}

/**
 * Get zip code pattern info for a country
 */
export function getZipCodeInfo(countryCode: string): CountryZipPattern | null {
  const upperCountryCode = countryCode.toUpperCase();
  
  if (NO_POSTAL_CODE_COUNTRIES.has(upperCountryCode)) {
    return null;
  }
  
  return ZIP_CODE_PATTERNS[upperCountryCode] || null;
}

/**
 * Check if a country requires a postal code
 */
export function requiresPostalCode(countryCode: string): boolean {
  const upperCountryCode = countryCode.toUpperCase();
  return !NO_POSTAL_CODE_COUNTRIES.has(upperCountryCode);
}

/**
 * Get a user-friendly field label for the postal code field
 */
export function getPostalCodeLabel(countryCode: string): string {
  const pattern = getZipCodeInfo(countryCode);
  return pattern ? pattern.name : 'Postal Code';
}

/**
 * Get placeholder text for the postal code input
 */
export function getPostalCodePlaceholder(countryCode: string): string {
  const pattern = getZipCodeInfo(countryCode);
  return pattern ? pattern.example : 'Enter postal code';
}

/**
 * Enhanced postal code validation prioritizing FedEx API first
 * Falls back to pattern validation if FedEx is unavailable
 */
export async function validatePostalCodeWithFedEx(
  postalCode: string, 
  countryCode: string,
  authToken?: string
): Promise<ZipValidationResult> {
  if (!postalCode || !countryCode) {
    return {
      isValid: false,
      message: "Postal code and country code are required",
      source: 'pattern'
    };
  }

  // PRIORITY 1: Try FedEx validation first if auth token is available
  if (authToken && typeof fetch !== 'undefined') {
    try {
      const response = await fetch('/api/fedex/validate-postal-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          postalCode: postalCode.trim(),
          countryCode: countryCode.toUpperCase(),
          carrierCode: 'FDXE'
        })
      });

      if (response.ok) {
        const fedexResult = await response.json();
        
        if (fedexResult.isValid) {
          return {
            isValid: true,
            message: 'Validated with FedEx',
            formatted: fedexResult.postalCode,
            city: fedexResult.city,
            stateOrProvinceCode: fedexResult.stateOrProvinceCode,
            source: 'fedex'
          };
        } else {
          // FedEx explicitly says it's invalid - trust that result
          return {
            isValid: false,
            message: fedexResult.errors?.[0] || 'Invalid postal code (FedEx validation)',
            source: 'fedex'
          };
        }
      }
    } catch (error) {
      console.warn('FedEx postal code validation failed, falling back to pattern validation:', error);
    }
  }

  // PRIORITY 2: Fall back to pattern-based validation
  const patternResult = validateZipCode(postalCode, countryCode);
  return {
    ...patternResult,
    source: 'pattern',
    message: authToken ? 
      `${patternResult.message} (FedEx validation unavailable)` : 
      patternResult.message
  };
}

/**
 * Simple wrapper for client-side usage without authentication
 * Uses pattern validation only
 */
export function validatePostalCodeClient(
  postalCode: string, 
  countryCode: string
): ZipValidationResult {
  const result = validateZipCode(postalCode, countryCode);
  return {
    ...result,
    source: 'pattern'
  };
}