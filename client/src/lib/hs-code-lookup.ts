// HS Code Lookup Service
// Uses the free Harmonized System Code API for product classification

export interface HSCodeResult {
  code: string;
  description: string;
  chapter: string;
  heading: string;
  subheading?: string;
  source?: 'rapidapi' | 'local' | 'usitc';
}

export interface HSCodeSearchResponse {
  results: HSCodeResult[];
  total: number;
}

// Official USITC Harmonized Tariff Schedule database
const USITC_API_BASE = 'https://hts.usitc.gov/api';
const USITC_SEARCH_BASE = 'https://hts.usitc.gov/search';

/**
 * Search for HS codes using Easyship API exclusively
 */
export async function searchHSCodes(query: string): Promise<HSCodeResult[]> {
  if (!query || query.length < 3) {
    return [];
  }

  // Use Easyship API exclusively for HS code searches
  try {
    const easyshipResults = await searchHSCodesWithEasyship(query);
    if (easyshipResults.length > 0) {
      return easyshipResults;
    }
  } catch (error) {
    console.error('Easyship HS code search failed:', error);
  }

  return [];
}

/**
 * Test RapidAPI connection and availability
 */
export async function testRapidAPIConnection(): Promise<{
  available: boolean;
  message: string;
  services?: any;
}> {
  try {
    const response = await fetch('/api/hs-codes/test-rapidapi', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      return {
        available: data.rapidapi_available,
        message: data.message,
        services: data.services
      };
    } else {
      return {
        available: false,
        message: 'RapidAPI test endpoint failed'
      };
    }
  } catch (error) {
    return {
      available: false,
      message: 'Failed to connect to RapidAPI test endpoint'
    };
  }
}

/**
 * Validate HS code using RapidAPI
 */
export async function validateHSCodeWithRapidAPI(code: string): Promise<{
  valid: boolean;
  results?: HSCodeResult[];
  message?: string;
}> {
  if (!code || code.length < 6) {
    return { valid: false, message: 'Invalid HS code format' };
  }

  try {
    const response = await fetch(`/api/hs-codes/validate-rapidapi/${encodeURIComponent(code)}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      return {
        valid: data.valid,
        results: data.results,
        message: data.message
      };
    } else {
      const errorData = await response.json();
      return {
        valid: false,
        message: errorData.message || 'HS code validation failed'
      };
    }
  } catch (error) {
    return {
      valid: false,
      message: 'Failed to validate HS code with RapidAPI'
    };
  }
}

/**
 * Parse USITC search results from HTML response
 */
function parseUSITCSearchResults(html: string): HSCodeResult[] {
  const results: HSCodeResult[] = [];
  
  try {
    // Create a temporary DOM parser (simplified for basic HTML parsing)
    // Look for patterns in the HTML that contain HS codes and descriptions
    const codePattern = /(\d{4}\.\d{2}\.\d{2}(?:\.\d{2})?)\s*([^<\n]+)/g;
    let match;
    
    while ((match = codePattern.exec(html)) !== null && results.length < 10) {
      const code = match[1].replace(/\./g, '');
      const description = match[2].trim();
      
      if (code && description && code.length >= 6) {
        results.push({
          code,
          description,
          chapter: code.substring(0, 2),
          heading: code.substring(0, 4),
          subheading: code.length > 6 ? code.substring(0, 6) : undefined
        });
      }
    }
    
    // Also look for simpler patterns
    const simplePattern = /(\d{6,10})\s*[-–]\s*([^<\n]{10,})/g;
    while ((match = simplePattern.exec(html)) !== null && results.length < 10) {
      const code = match[1];
      const description = match[2].trim();
      
      if (code && description && !results.find(r => r.code === code)) {
        results.push({
          code,
          description,
          chapter: code.substring(0, 2),
          heading: code.substring(0, 4),
          subheading: code.length > 6 ? code.substring(0, 6) : undefined
        });
      }
    }
  } catch (error) {
    console.error('Error parsing USITC results:', error);
  }
  
  return results;
}

/**
 * Format API response to standardized format
 */
function formatHSCodeResults(data: any): HSCodeResult[] {
  if (!data) return [];

  // Handle different API response formats
  const results = data.results || data.data || data.codes || [];
  
  return results.map((item: any) => ({
    code: item.code || item.hscode || item.hs_code || '',
    description: item.description || item.desc || item.commodity || '',
    chapter: item.chapter || item.chapter_code || '',
    heading: item.heading || item.heading_code || '',
    subheading: item.subheading || item.subheading_code || ''
  })).filter((item: HSCodeResult) => item.code && item.description);
}

/**
 * Fallback: Common HS codes based on product keywords
 */
function getCommonHSCodes(query: string): HSCodeResult[] {
  const lowercaseQuery = query.toLowerCase();
  const commonCodes: HSCodeResult[] = [];

  // Electronics
  if (lowercaseQuery.includes('phone') || lowercaseQuery.includes('mobile') || lowercaseQuery.includes('smartphone')) {
    commonCodes.push({
      code: '851712',
      description: 'Telephones for cellular networks',
      chapter: '85',
      heading: '8517'
    });
  }

  // Clothing
  if (lowercaseQuery.includes('shirt') || lowercaseQuery.includes('t-shirt') || lowercaseQuery.includes('clothing')) {
    commonCodes.push({
      code: '610910',
      description: 'T-shirts, singlets and other vests, knitted or crocheted, of cotton',
      chapter: '61',
      heading: '6109'
    });
  }

  // Jewelry
  if (lowercaseQuery.includes('jewelry') || lowercaseQuery.includes('jewellery') || lowercaseQuery.includes('ring') || lowercaseQuery.includes('necklace')) {
    commonCodes.push({
      code: '711319',
      description: 'Articles of jewelry and parts thereof, of precious metal other than silver',
      chapter: '71',
      heading: '7113'
    });
  }

  // Books
  if (lowercaseQuery.includes('book') || lowercaseQuery.includes('manual') || lowercaseQuery.includes('guide')) {
    commonCodes.push({
      code: '490199',
      description: 'Printed books, brochures, leaflets and similar printed matter',
      chapter: '49',
      heading: '4901'
    });
  }

  // Toys
  if (lowercaseQuery.includes('toy') || lowercaseQuery.includes('game') || lowercaseQuery.includes('puzzle')) {
    commonCodes.push({
      code: '950300',
      description: 'Tricycles, scooters, pedal cars and similar wheeled toys; dolls carriages',
      chapter: '95',
      heading: '9503'
    });
  }

  // Cosmetics
  if (lowercaseQuery.includes('cosmetic') || lowercaseQuery.includes('makeup') || lowercaseQuery.includes('cream') || lowercaseQuery.includes('lotion')) {
    commonCodes.push({
      code: '330499',
      description: 'Beauty or make-up preparations and preparations for the care of the skin',
      chapter: '33',
      heading: '3304'
    });
  }

  // Food items
  if (lowercaseQuery.includes('food') || lowercaseQuery.includes('snack') || lowercaseQuery.includes('candy')) {
    commonCodes.push({
      code: '210690',
      description: 'Food preparations not elsewhere specified or included',
      chapter: '21',
      heading: '2106'
    });
  }

  // Computer accessories
  if (lowercaseQuery.includes('cable') || lowercaseQuery.includes('charger') || lowercaseQuery.includes('adapter')) {
    commonCodes.push({
      code: '854449',
      description: 'Electric conductors, for a voltage not exceeding 1,000 V, fitted with connectors',
      chapter: '85',
      heading: '8544'
    });
  }

  // Office supplies
  if (lowercaseQuery.includes('desk') || lowercaseQuery.includes('organizer') || lowercaseQuery.includes('office')) {
    commonCodes.push({
      code: '420500',
      description: 'Articles of leather or composition leather, nesoi',
      chapter: '42',
      heading: '4205'
    });
  }

  return commonCodes;
}

/**
 * Get all common HS codes for lookup purposes
 */
function getAllCommonHSCodes(): HSCodeResult[] {
  return [
    // Electronics and technology
    { code: '851712', description: 'Telephones for cellular networks', chapter: '85', heading: '8517' },
    { code: '854449', description: 'Electric conductors, for a voltage not exceeding 1,000 V, fitted with connectors', chapter: '85', heading: '8544' },
    { code: '852872', description: 'Reception apparatus for television, color, nesoi', chapter: '85', heading: '8528' },
    
    // Clothing and textiles
    { code: '610910', description: 'T-shirts, singlets and other vests, knitted or crocheted, of cotton', chapter: '61', heading: '6109' },
    { code: '621420', description: 'Shawls, scarves and mufflers, knitted or crocheted', chapter: '62', heading: '6214' },
    { code: '640399', description: 'Footwear with outer soles of rubber, plastics or composition leather, nesoi', chapter: '64', heading: '6403' },
    
    // Jewelry and accessories
    { code: '711319', description: 'Articles of jewelry and parts thereof, of precious metal other than silver', chapter: '71', heading: '7113' },
    { code: '711420', description: 'Articles of goldsmiths or silversmiths wares and parts thereof', chapter: '71', heading: '7114' },
    
    // Books and printed matter
    { code: '490199', description: 'Printed books, brochures, leaflets and similar printed matter', chapter: '49', heading: '4901' },
    { code: '490700', description: 'Unused postage, revenue stamps; check forms; banknotes; stock/bond certificates', chapter: '49', heading: '4907' },
    
    // Toys and games
    { code: '950300', description: 'Tricycles, scooters, pedal cars and similar wheeled toys; dolls carriages', chapter: '95', heading: '9503' },
    { code: '950430', description: 'Other games, operated by coins, banknotes, bank cards, tokens or by other means of payment', chapter: '95', heading: '9504' },
    
    // Cosmetics and personal care
    { code: '330499', description: 'Beauty or make-up preparations and preparations for the care of the skin', chapter: '33', heading: '3304' },
    { code: '330610', description: 'Dentifrices', chapter: '33', heading: '3306' },
    
    // Food and beverages
    { code: '210690', description: 'Food preparations not elsewhere specified or included', chapter: '21', heading: '2106' },
    { code: '190590', description: 'Bread, pastry, cakes, biscuits and other bakers wares', chapter: '19', heading: '1905' },
    
    // Office and leather goods
    { code: '420500', description: 'Articles of leather or composition leather, nesoi', chapter: '42', heading: '4205' },
    { code: '420212', description: 'Trunks, suitcases, vanity cases, attache cases, briefcases, school satchels and similar containers, with outer surface of plastics or textile materials', chapter: '42', heading: '4202' },
    
    // Home and garden
    { code: '690890', description: 'Glazed ceramic tiles, cubes and similar articles for mosaic work, nesoi', chapter: '69', heading: '6908' },
    { code: '940360', description: 'Wooden furniture, nesoi', chapter: '94', heading: '9403' },
    
    // Sports and fitness
    { code: '950690', description: 'Articles and equipment for general physical exercise, gymnastics, athletics, other sports or outdoor games, nesoi', chapter: '95', heading: '9506' },
    { code: '420292', description: 'Sporting bags and cases, with outer surface of textile materials or plastics', chapter: '42', heading: '4202' }
  ];
}

/**
 * Get detailed information for a specific HS code using USITC reference
 */
export async function getHSCodeDetails(code: string): Promise<HSCodeResult | null> {
  if (!code || code.length < 4) {
    return null;
  }

  // For now, use our enhanced common codes database
  // In production, this would integrate with authenticated USITC API access
  const cleanCode = code.replace(/[^0-9]/g, '');
  
  // Check if we have this code in our common codes
  const allCommonCodes = getAllCommonHSCodes();
  const found = allCommonCodes.find(c => c.code === cleanCode || c.code.startsWith(cleanCode.substring(0, 6)));
  
  if (found) {
    return found;
  }

  // Generate basic structure based on HS code hierarchy
  return {
    code: cleanCode,
    description: `Product classification code ${formatHSCodeDisplay(cleanCode)}`,
    chapter: cleanCode.substring(0, 2),
    heading: cleanCode.substring(0, 4),
    subheading: cleanCode.length > 6 ? cleanCode.substring(0, 6) : undefined
  };
}

/**
 * Validate HS code format
 */
export function validateHSCode(code: string): boolean {
  // HS codes are typically 6-10 digits
  const cleanCode = code.replace(/[^0-9]/g, '');
  return cleanCode.length >= 6 && cleanCode.length <= 10;
}

/**
 * Validate a specific HS code using Easyship database
 */
export async function validateHSCodeWithAPI(code: string): Promise<{
  valid: boolean;
  description?: string;
  details?: any;
  error?: string;
}> {
  try {
    const cleanCode = code.replace(/[^0-9]/g, '');
    
    if (!validateHSCode(cleanCode)) {
      return {
        valid: false,
        error: 'Invalid HS code format. Must be 6-10 digits.'
      };
    }

    const response = await fetch(`/api/hs-codes/${cleanCode}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      return {
        valid: true,
        description: data.description,
        details: data
      };
    } else if (response.status === 404) {
      return {
        valid: false,
        error: 'HS code not found'
      };
    } else {
      return {
        valid: false,
        error: 'Unable to validate HS code at this time'
      };
    }
  } catch (error) {
    console.error('HS code validation error:', error);
    return {
      valid: false,
      error: 'Network error during validation'
    };
  }
}

/**
 * Search HS codes using Easyship API
 */
export async function searchHSCodesWithEasyship(query: string): Promise<HSCodeResult[]> {
  try {
    const response = await fetch(`/api/hs-codes/search?q=${encodeURIComponent(query)}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      // Handle both array response (search results) and single object (not found)
      if (Array.isArray(data)) {
        return data;
      } else if (data.results) {
        return data.results;
      } else {
        return [];
      }
    } else {
      console.error('Easyship HS code search failed:', response.status);
      return [];
    }
  } catch (error) {
    console.error('Easyship HS code search error:', error);
    return [];
  }
}

/**
 * Format HS code for display
 */
export function formatHSCodeDisplay(code: string): string {
  const cleanCode = code.replace(/[^0-9]/g, '');
  
  if (cleanCode.length >= 6) {
    // Format as XX.XX.XX for readability
    return cleanCode.slice(0, 2) + '.' + cleanCode.slice(2, 4) + '.' + cleanCode.slice(4);
  }
  
  return cleanCode;
}