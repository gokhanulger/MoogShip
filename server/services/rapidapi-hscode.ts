/**
 * RapidAPI HS Code Lookup Service
 * Integrates with RapidAPI marketplace for enhanced HS code classification
 */

export interface RapidAPIHSCodeResult {
  code: string;
  description: string;
  chapter: string;
  heading: string;
  subheading?: string;
  source: 'rapidapi' | 'local' | 'usitc';
}

export interface RapidAPIResponse {
  success: boolean;
  data: RapidAPIHSCodeResult[];
  error?: string;
}

/**
 * Available RapidAPI HS Code services
 * These are common HS code APIs available on RapidAPI marketplace
 */
const RAPIDAPI_SERVICES = {
  // Primary HS Code Harmonized System API - User's authenticated service
  harmonized_system: {
    host: 'hs-code-harmonized-system.p.rapidapi.com',
    endpoints: {
      search: '/code',
      validate: '/code',
      details: '/code'
    }
  },
  // Backup HS Code Lookup API
  hscode_lookup: {
    host: 'hscode-lookup-api.p.rapidapi.com',
    endpoints: {
      search: '/search',
      validate: '/validate',
      details: '/details'
    }
  },
  // Trade Data API (often includes HS codes)
  trade_data: {
    host: 'trade-data-api.p.rapidapi.com',
    endpoints: {
      hscode: '/hscode/search',
      product: '/product/classify'
    }
  }
};

/**
 * Search HS codes using RapidAPI
 */
export async function searchHSCodesRapidAPI(query: string, limit: number = 10): Promise<RapidAPIResponse> {
  const rapidApiKey = process.env.RAPIDAPI_KEY;
  
  if (!rapidApiKey) {
    console.log('🔍 RapidAPI: No API key provided, skipping RapidAPI lookup');
    return { success: false, data: [], error: 'No RapidAPI key configured' };
  }

  if (!query || query.length < 2) {
    return { success: false, data: [], error: 'Query too short' };
  }

  console.log(`🔍 RapidAPI: Searching HS codes for query: "${query}"`);

  // Only use the user's authenticated harmonized_system service
  const serviceName = 'harmonized_system';
  const config = RAPIDAPI_SERVICES.harmonized_system;

  try {
    const result = await tryRapidAPIService(serviceName, config, query, limit);
    if (result.success && result.data.length > 0) {
      console.log(`🔍 RapidAPI: Found ${result.data.length} results from ${serviceName}`);
      return result;
    } else if (!result.success && result.error?.includes('Invalid HS code format')) {
      console.log(`🔍 RapidAPI: ${serviceName} validation rejected query "${query}" - will fall back to USITC`);
      return result; // Return the error for graceful fallback
    }
  } catch (error) {
    console.log(`🔍 RapidAPI: Service ${serviceName} failed:`, error.message);
  }

  return { success: false, data: [], error: 'RapidAPI harmonized_system service failed' };
}

/**
 * Try a specific RapidAPI service
 */
async function tryRapidAPIService(
  serviceName: string, 
  config: any, 
  query: string, 
  limit: number
): Promise<RapidAPIResponse> {
  const rapidApiKey = process.env.RAPIDAPI_KEY;
  
  let url: string;
  let searchParams: any = {};

  // Configure request based on service
  switch (serviceName) {
    case 'hscode_lookup':
      url = `https://${config.host}${config.endpoints.search}`;
      searchParams = { q: query, limit };
      break;
    
    case 'harmonized_system':
      url = `https://${config.host}${config.endpoints.search}`;
      searchParams = { term: query };
      break;
    
    case 'trade_data':
      url = `https://${config.host}${config.endpoints.hscode}`;
      searchParams = { query, max_results: limit };
      break;
    
    default:
      throw new Error(`Unknown service: ${serviceName}`);
  }

  // Add search parameters to URL
  const searchUrl = new URL(url);
  Object.entries(searchParams).forEach(([key, value]) => {
    searchUrl.searchParams.append(key, value.toString());
  });

  console.log(`🔍 RapidAPI: Calling ${serviceName} at ${searchUrl.toString()}`);

  const response = await fetch(searchUrl.toString(), {
    method: 'GET',
    headers: {
      'X-RapidAPI-Key': rapidApiKey,
      'X-RapidAPI-Host': config.host,
      'Accept': 'application/json',
      'User-Agent': 'MoogShip-HSCodeLookup/1.0'
    }
  });

  const data = await response.json();
  console.log(`🔍 RapidAPI: ${serviceName} response:`, JSON.stringify(data, null, 2));

  // Handle specific API validation errors
  if (!response.ok) {
    // Check if it's a validation error from harmonized_system API
    if (response.status === 422 && data.status === 'error' && data.msg === 'Invalid HS code!') {
      console.log(`🔍 RapidAPI: ${serviceName} - Invalid HS code validation: ${query}`);
      return {
        success: false,
        data: [],
        error: `Invalid HS code format: ${query}`
      };
    }
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  // Parse response based on service format
  const parsedResults = parseRapidAPIResponse(serviceName, data);
  
  return {
    success: true,
    data: parsedResults.map(item => ({ ...item, source: 'rapidapi' as const }))
  };
}

/**
 * Parse different RapidAPI response formats
 */
function parseRapidAPIResponse(serviceName: string, data: any): RapidAPIHSCodeResult[] {
  let results: any[] = [];

  // Handle harmonized_system API specific format
  if (serviceName === 'harmonized_system') {
    if (data.status === 'success' && data.result) {
      // Single result format from hs-code-harmonized-system.p.rapidapi.com
      results = [data.result];
    } else if (data.status === 'error') {
      // Error response - return empty results
      console.log(`🔍 RapidAPI: ${serviceName} returned error: ${data.msg}`);
      return [];
    }
  } else if (Array.isArray(data)) {
    results = data;
  } else if (data.results && Array.isArray(data.results)) {
    results = data.results;
  } else if (data.data && Array.isArray(data.data)) {
    results = data.data;
  } else if (data.codes && Array.isArray(data.codes)) {
    results = data.codes;
  } else if (data.items && Array.isArray(data.items)) {
    results = data.items;
  } else if (data.hscodes && Array.isArray(data.hscodes)) {
    results = data.hscodes;
  } else {
    console.log(`🔍 RapidAPI: Unexpected response format from ${serviceName}:`, data);
    return [];
  }

  return results.map((item: any) => {
    // Normalize different field names from various APIs
    const code = item.code || item.hscode || item.hs_code || item.hsCode || 
                 item.harmonized_code || item.tariff_code || '';
    
    const description = item.description || item.desc || item.commodity || 
                       item.product_description || item.title || item.name || '';
    
    // Extract chapter and heading from code
    const cleanCode = code.toString().replace(/[^0-9]/g, '');
    const chapter = cleanCode.substring(0, 2);
    const heading = cleanCode.substring(0, 4);
    const subheading = cleanCode.length > 6 ? cleanCode.substring(0, 6) : undefined;

    return {
      code: cleanCode,
      description: description.toString(),
      chapter,
      heading,
      subheading,
      source: 'rapidapi' as const
    };
  }).filter((item: RapidAPIHSCodeResult) => 
    item.code && item.description && item.code.length >= 6
  );
}

/**
 * Validate an HS code using RapidAPI
 */
export async function validateHSCodeRapidAPI(code: string): Promise<RapidAPIResponse> {
  const rapidApiKey = process.env.RAPIDAPI_KEY;
  
  if (!rapidApiKey) {
    return { success: false, data: [], error: 'No RapidAPI key configured' };
  }

  if (!code || code.length < 6) {
    return { success: false, data: [], error: 'Invalid HS code format' };
  }

  const cleanCode = code.replace(/[^0-9]/g, '');
  console.log(`🔍 RapidAPI: Validating HS code: ${cleanCode}`);

  try {
    // Try validation with hscode_lookup service
    const config = RAPIDAPI_SERVICES.hscode_lookup;
    const url = `https://${config.host}${config.endpoints.validate}?code=${cleanCode}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': rapidApiKey,
        'X-RapidAPI-Host': config.host,
        'Accept': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      const parsedResults = parseRapidAPIResponse('hscode_lookup', data);
      
      if (parsedResults.length > 0) {
        return {
          success: true,
          data: parsedResults.map(item => ({ ...item, source: 'rapidapi' as const }))
        };
      }
    }

    // Fallback: search for the code as a query
    return await searchHSCodesRapidAPI(cleanCode, 5);

  } catch (error) {
    console.log('🔍 RapidAPI: Validation failed:', error.message);
    return { success: false, data: [], error: error.message };
  }
}

/**
 * Get detailed information for a specific HS code
 */
export async function getHSCodeDetailsRapidAPI(code: string): Promise<RapidAPIResponse> {
  const rapidApiKey = process.env.RAPIDAPI_KEY;
  
  if (!rapidApiKey) {
    return { success: false, data: [], error: 'No RapidAPI key configured' };
  }

  const cleanCode = code.replace(/[^0-9]/g, '');
  console.log(`🔍 RapidAPI: Getting details for HS code: ${cleanCode}`);

  try {
    const config = RAPIDAPI_SERVICES.hscode_lookup;
    const url = `https://${config.host}${config.endpoints.details}?code=${cleanCode}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': rapidApiKey,
        'X-RapidAPI-Host': config.host,
        'Accept': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      const parsedResults = parseRapidAPIResponse('hscode_lookup', data);
      
      return {
        success: true,
        data: parsedResults.map(item => ({ ...item, source: 'rapidapi' as const }))
      };
    }

    // Fallback to validation endpoint
    return await validateHSCodeRapidAPI(cleanCode);

  } catch (error) {
    console.log('🔍 RapidAPI: Details lookup failed:', error.message);
    return { success: false, data: [], error: error.message };
  }
}

/**
 * Test RapidAPI connection and service availability
 */
export async function testRapidAPIConnection(): Promise<{ success: boolean; message: string; services: any }> {
  const rapidApiKey = process.env.RAPIDAPI_KEY;
  
  if (!rapidApiKey) {
    return {
      success: false,
      message: 'No RapidAPI key configured',
      services: {}
    };
  }

  const serviceResults: any = {};

  // Test each service with a simple query
  for (const [serviceName, config] of Object.entries(RAPIDAPI_SERVICES)) {
    try {
      const testQuery = 'electronics';
      const result = await tryRapidAPIService(serviceName, config, testQuery, 1);
      
      serviceResults[serviceName] = {
        available: result.success,
        message: result.success ? 'Service available' : result.error,
        resultCount: result.data.length
      };
    } catch (error) {
      serviceResults[serviceName] = {
        available: false,
        message: error.message,
        resultCount: 0
      };
    }
  }

  const availableServices = Object.values(serviceResults).filter((s: any) => s.available).length;
  const totalServices = Object.keys(serviceResults).length;

  return {
    success: availableServices > 0,
    message: `${availableServices}/${totalServices} RapidAPI services available`,
    services: serviceResults
  };
}