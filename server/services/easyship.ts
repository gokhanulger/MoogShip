/**
 * Easyship API Integration for Duty Calculations
 * Provides accurate tax and duty calculations for international shipments
 */

interface EasyshipCountry {
  id: number;
  name: string;
  alpha2: string;
}

interface EasyshipHSCode {
  code: string;
  description: string;
}

interface EasyshipItem {
  duty_origin_country_id: number;
  hs_code: string;
  customs_value: number;
}

interface EasyshipTaxDutyRequest {
  origin_country_id: number;
  destination_country_id: number;
  insurance_fee: number;
  shipment_charge: number;
  items: EasyshipItem[];
}

interface EasyshipTaxDutyResponse {
  tax_and_duty: {
    currency: string;
    duty: number;
    tax: number;
  };
  meta: {
    request_id: string;
  };
}

interface EasyshipError {
  error: {
    code: string;
    details: string[];
    message: string;
    request_id: string;
    type: string;
  };
}

class EasyshipService {
  private accessToken: string;
  private baseUrl: string;
  private countriesCache: Map<string, number> = new Map();
  private hsCodesCache: Map<string, string> = new Map();

  constructor() {
    this.accessToken = process.env.EASYSHIP_API_KEY || '';
    this.baseUrl = 'https://public-api.easyship.com/2024-09';
    
    if (!this.accessToken) {
      console.warn('[EASYSHIP] Access token not configured');
    } else {
      console.log('[EASYSHIP] Service initialized with access token (2024-09 version)');
    }
  }

  /**
   * Get country ID by country code (ISO 3166-1 alpha-2)
   */
  async getCountryId(countryCode: string): Promise<number | null> {
    try {
      // Check cache first
      if (this.countriesCache.has(countryCode)) {
        return this.countriesCache.get(countryCode)!;
      }

      // Get all countries with pagination
      let allCountries: EasyshipCountry[] = [];
      let page = 1;
      let hasMore = true;
      
      while (hasMore) {
        const response = await fetch(`${this.baseUrl}/countries?page=${page}`, {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          console.error(`[EASYSHIP] Countries API error: ${response.status}`);
          return null;
        }

        const data = await response.json();
        allCountries = allCountries.concat(data.countries);
        
        // Check if there are more pages
        hasMore = data.meta.pagination.next !== null;
        page++;
      }
      
      // Cache all countries
      allCountries.forEach(country => {
        this.countriesCache.set(country.alpha2, country.id);
      });

      return this.countriesCache.get(countryCode) || null;
    } catch (error) {
      console.error('[EASYSHIP] Error fetching countries:', error);
      return null;
    }
  }

  /**
   * Search for HS code by product description (single result)
   */
  async searchHSCode(productDescription: string): Promise<string | null> {
    try {
      // Check cache first
      const cacheKey = productDescription.toLowerCase();
      if (this.hsCodesCache.has(cacheKey)) {
        return this.hsCodesCache.get(cacheKey)!;
      }

      const response = await fetch(`${this.baseUrl}/hs_codes?search=${encodeURIComponent(productDescription)}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error(`[EASYSHIP] HS Codes API error: ${response.status}`);
        return null;
      }

      const hsCodes: EasyshipHSCode[] = await response.json();
      
      if (hsCodes.length > 0) {
        const hsCode = hsCodes[0].code;
        this.hsCodesCache.set(cacheKey, hsCode);
        return hsCode;
      }

      return null;
    } catch (error) {
      console.error('[EASYSHIP] Error searching HS codes:', error);
      return null;
    }
  }

  /**
   * Search for multiple HS codes by product description (for auto-complete)
   */
  async searchHSCodes(productDescription: string): Promise<any> {
    try {
      const searchTerm = productDescription.trim();
      
      // Use the correct Easyship API format with 'description' query parameter
      // Based on the API docs: GET /hs_codes?description=searchterm&per_page=50
      const searchUrl = `${this.baseUrl}/hs_codes?description=${encodeURIComponent(searchTerm)}&per_page=50`;
      console.log(`[EASYSHIP] Making HS code search request to: ${searchUrl}`);
      console.log(`[EASYSHIP] Search term: "${searchTerm}"`);
      
      const response = await fetch(searchUrl, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      console.log(`[EASYSHIP] Response status: ${response.status}`);

      if (!response.ok) {
        console.error(`[EASYSHIP] HS Codes API error: ${response.status}`);
        const errorText = await response.text();
        console.error(`[EASYSHIP] Error details:`, errorText);
        
        // If description search fails, try a broader approach
        if (response.status === 400 || response.status === 422) {
          console.log(`[EASYSHIP] Trying fallback with broader search...`);
          const fallbackUrl = `${this.baseUrl}/hs_codes?per_page=50&page=1`;
          const fallbackResponse = await fetch(fallbackUrl, {
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            // Filter results client-side for the search term
            const filteredResults = fallbackData.hs_codes?.filter((hsCode: any) =>
              hsCode.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              hsCode.code?.includes(searchTerm)
            ) || [];
            
            console.log(`[EASYSHIP] Fallback search found ${filteredResults.length} matching results`);
            return {
              hs_codes: filteredResults.slice(0, 20), // Limit to 20 results
              meta: fallbackData.meta
            };
          }
        }
        
        return { hs_codes: [] };
      }

      const apiResponse = await response.json();
      console.log(`[EASYSHIP] Raw API response structure:`, {
        hasHsCodes: !!(apiResponse && apiResponse.hs_codes),
        hsCodesLength: apiResponse?.hs_codes?.length || 0,
        firstCodeSample: apiResponse?.hs_codes?.[0]?.code,
        firstDescriptionSample: apiResponse?.hs_codes?.[0]?.description?.substring(0, 50),
        hasPagination: !!(apiResponse?.meta?.pagination)
      });
      
      return apiResponse;
    } catch (error) {
      console.error('[EASYSHIP] Error searching HS codes:', error);
      return { hs_codes: [] };
    }
  }

  /**
   * Calculate taxes and duties for a shipment
   */
  async calculateTaxesAndDuties(params: {
    originCountryCode: string;
    destinationCountryCode: string;
    items: Array<{
      description: string;
      value: number;
      originCountryCode?: string;
      hsCode?: string;
    }>;
    shippingCost: number;
    insuranceFee?: number;
  }): Promise<{ tax: number; duty: number; total: number } | null> {
    try {
      if (!this.accessToken) {
        console.error('[EASYSHIP] Access token not configured');
        return null;
      }

      console.log(`[EASYSHIP] Calculating duties for ${params.originCountryCode} → ${params.destinationCountryCode}`);

      // Get country IDs
      const originCountryId = await this.getCountryId(params.originCountryCode);
      const destinationCountryId = await this.getCountryId(params.destinationCountryCode);

      if (!originCountryId || !destinationCountryId) {
        console.error('[EASYSHIP] Could not resolve country IDs');
        return null;
      }

      // Prepare items with HS codes
      const easyshipItems: EasyshipItem[] = [];
      
      for (const item of params.items) {
        let hsCode = item.hsCode;
        
        // If no HS code provided, try to find one
        if (!hsCode) {
          hsCode = await this.searchHSCode(item.description) || undefined;
        }
        
        // Use a default HS code if none found - try different common codes
        if (!hsCode) {
          // Try different common HS codes that are more likely to have duty data
          // Start with general merchandise, then electronics
          const fallbackCodes = [
            '63079090', // Other made up textile articles
            '39269097', // Other articles of plastics
            '73269098', // Other articles of iron or steel
            '85171200', // Telephones for cellular networks
            '42021290', // Trunks, suit-cases, brief-cases and similar containers
          ];
          
          hsCode = fallbackCodes[0]; // Use first fallback
          console.warn(`[EASYSHIP] No HS code found for "${item.description}", using general merchandise default: ${hsCode}`);
        }

        const itemOriginCountryId = item.originCountryCode 
          ? await this.getCountryId(item.originCountryCode)
          : originCountryId;

        easyshipItems.push({
          duty_origin_country_id: itemOriginCountryId || originCountryId,
          hs_code: hsCode,
          customs_value: item.value // Easyship expects dollars, not cents
        });
      }

      const requestBody: EasyshipTaxDutyRequest = {
        origin_country_id: originCountryId,
        destination_country_id: destinationCountryId,
        insurance_fee: params.insuranceFee || 0, // Easyship expects dollars, not cents
        shipment_charge: params.shippingCost, // Easyship expects dollars, not cents
        items: easyshipItems
      };

      console.log('[EASYSHIP] Request payload:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(`${this.baseUrl}/taxes_and_duties`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error('[EASYSHIP] Tax and duty calculation failed:', response.status, responseData);
        return null;
      }

      const result = responseData as EasyshipTaxDutyResponse;
      
      // Easyship returns values in dollars already
      const tax = result.tax_and_duty.tax;
      const duty = result.tax_and_duty.duty;
      const total = tax + duty;

      console.log(`[EASYSHIP] Calculated duties: Tax=$${tax}, Duty=$${duty}, Total=$${total}`);

      return {
        tax,
        duty,
        total
      };
    } catch (error) {
      console.error('[EASYSHIP] Error calculating taxes and duties:', error);
      return null;
    }
  }

  /**
   * Calculate duties for a MoogShip shipment
   */
  async calculateShipmentDuties(shipment: {
    senderCountry: string;
    receiverCountry: string;
    packageItems: Array<{
      description: string;
      value: number;
      quantity: number;
    }>;
    declaredValue: number;
    shippingCost: number;
  }): Promise<{ tax: number; duty: number; total: number } | null> {
    try {
      // Prepare items for Easyship
      const items = shipment.packageItems.map(item => ({
        description: item.description,
        value: item.value * item.quantity, // Total value for this item type
        originCountryCode: shipment.senderCountry
      }));

      return await this.calculateTaxesAndDuties({
        originCountryCode: shipment.senderCountry,
        destinationCountryCode: shipment.receiverCountry,
        items,
        shippingCost: shipment.shippingCost,
        insuranceFee: shipment.declaredValue * 0.01 // 1% insurance fee estimate
      });
    } catch (error) {
      console.error('[EASYSHIP] Error calculating shipment duties:', error);
      return null;
    }
  }
}

export const easyshipService = new EasyshipService();
export { EasyshipService };