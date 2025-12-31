/**
 * UPS Landed Cost API Integration Service
 * 
 * This service handles interactions with the UPS Landed Cost Quote API to estimate
 * all-inclusive costs of international shipments including duties, VAT, taxes,
 * brokerage fees, and other fees.
 */

import fetch from 'node-fetch';

// Environment variables for UPS API credentials (reusing existing ones)
const UPS_CLIENT_ID = process.env.UPS_CLIENT_ID;
const UPS_CLIENT_SECRET = process.env.UPS_CLIENT_SECRET;
let UPS_API_BASE_URL = process.env.UPS_API_BASE_URL;

// Extract base URL if it contains token path
if (UPS_API_BASE_URL && UPS_API_BASE_URL.includes('/security/v1/oauth/token')) {
  UPS_API_BASE_URL = UPS_API_BASE_URL.split('/security/v1/oauth/token')[0];
}

/**
 * Interface for UPS OAuth token response
 */
interface UpsTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

/**
 * Interface for UPS Landed Cost shipment item
 */
interface UpsLandedCostItem {
  commodityId: string;
  grossWeight?: number;
  grossWeightUnit?: 'LB' | 'KG';
  priceEach: number;
  commodityCurrencyCode: string;
  quantity: number;
  UOM: string;
  hsCode?: string;
  description?: string;
  originCountryCode: string;
}

/**
 * Interface for UPS Landed Cost request
 */
interface UpsLandedCostRequest {
  currencyCode: string;
  transID: string;
  allowPartialLandedCostResult?: boolean;
  alversion: number;
  shipment: {
    id: string;
    importCountryCode: string;
    importProvince?: string;
    shipDate?: string;
    incoterms?: string;
    exportCountryCode: string;
    transModes?: string;
    transportCost?: number;
    shipmentType?: string;
    shipmentItems: UpsLandedCostItem[];
  };
}

/**
 * Interface for UPS Landed Cost response
 */
interface UpsLandedCostResponse {
  shipment: {
    currencyCode: string;
    id: string;
    brokerageFeeItems: any[];
    totalBrokerageFees: number;
    totalDuties: number;
    totalCommodityLevelTaxesAndFees: number;
    totalShipmentLevelTaxesAndFees: number;
    totalVAT: number;
    totalDutyandTax: number;
    grandTotal: number;
    importCountryCode: string;
    shipmentItems: any[];
  };
  alversion: number;
  dpversion: string | null;
  transID: string;
  error: any;
  perfStats: {
    absLayerTime: string;
    fulfillTime: string;
    receiptTime: string;
  };
}

/**
 * Interface for standardized landed cost result
 */
export interface LandedCostResult {
  provider: 'UPS';
  currency: string;
  duties: number;
  taxes: number;
  vat: number;
  brokerageFees: number;
  totalDutyAndTax: number;
  grandTotal: number;
  success: boolean;
  error?: string;
  transactionId: string;
}

// Token caching
let cachedUpsToken: string | null = null;
let upsTokenExpiry: number = 0;

/**
 * Get UPS access token with caching
 */
async function getUpsAccessToken(): Promise<string> {
  // Check if we have a valid cached token
  if (cachedUpsToken && Date.now() < upsTokenExpiry) {
    return cachedUpsToken;
  }

  if (!UPS_CLIENT_ID || !UPS_CLIENT_SECRET) {
    throw new Error('UPS credentials not configured. Set UPS_CLIENT_ID and UPS_CLIENT_SECRET environment variables.');
  }

  if (!UPS_API_BASE_URL) {
    throw new Error('UPS API base URL not configured. Set UPS_API_BASE_URL environment variable.');
  }

  try {
    const tokenUrl = UPS_API_BASE_URL.endsWith('/') 
      ? `${UPS_API_BASE_URL}security/v1/oauth/token`
      : `${UPS_API_BASE_URL}/security/v1/oauth/token`;

    console.log(`[UPS LANDED COST] Requesting access token from: ${tokenUrl}`);

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${UPS_CLIENT_ID}:${UPS_CLIENT_SECRET}`).toString('base64')}`
      },
      body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[UPS LANDED COST] Token request failed: ${response.status} ${response.statusText}`);
      console.error(`[UPS LANDED COST] Error details: ${errorText}`);
      throw new Error(`UPS token request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as UpsTokenResponse;
    
    // Cache the token with a 50-minute expiry (tokens typically last 1 hour)
    cachedUpsToken = data.access_token;
    upsTokenExpiry = Date.now() + ((data.expires_in - 600) * 1000); // 10 minutes before actual expiry

    console.log(`[UPS LANDED COST] Access token obtained successfully, expires in ${data.expires_in} seconds`);
    return cachedUpsToken;
  } catch (error) {
    console.error('[UPS LANDED COST] Error getting access token:', error);
    throw error;
  }
}

/**
 * UPS Landed Cost Service Class
 */
class UpsLandedCostService {
  private version: string = 'v1';

  constructor() {
    if (!UPS_CLIENT_ID || !UPS_CLIENT_SECRET) {
      console.warn('[UPS LANDED COST] UPS credentials not configured');
    } else {
      console.log('[UPS LANDED COST] Service initialized');
    }
  }

  /**
   * Calculate landed cost using UPS API
   */
  async calculateLandedCost(params: {
    originCountryCode: string;
    destinationCountryCode: string;
    destinationProvince?: string;
    items: Array<{
      description: string;
      value: number; // in dollars
      quantity: number;
      weight?: number; // in kg
      originCountryCode?: string;
      hsCode?: string;
    }>;
    shippingCost: number; // in dollars
    currencyCode?: string;
    shipmentType?: string;
    incoterms?: string;
    transportMode?: string;
  }): Promise<LandedCostResult | null> {
    try {
      if (!UPS_CLIENT_ID || !UPS_CLIENT_SECRET) {
        console.error('[UPS LANDED COST] UPS credentials not configured');
        return null;
      }

      console.log(`[UPS LANDED COST] Calculating landed cost for ${params.originCountryCode} → ${params.destinationCountryCode}`);

      // Get access token
      const token = await getUpsAccessToken();

      // Prepare shipment items
      const shipmentItems: UpsLandedCostItem[] = params.items.map((item, index) => ({
        commodityId: `item_${index + 1}`,
        grossWeight: item.weight || 1.0,
        grossWeightUnit: 'KG',
        priceEach: item.value,
        commodityCurrencyCode: params.currencyCode || 'USD',
        quantity: item.quantity,
        UOM: 'EA', // Each
        hsCode: item.hsCode,
        description: item.description,
        originCountryCode: item.originCountryCode || params.originCountryCode
      }));

      // Generate unique transaction ID
      const transactionId = `UPS_LC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Prepare request body
      const requestBody: UpsLandedCostRequest = {
        currencyCode: params.currencyCode || 'USD',
        transID: transactionId,
        allowPartialLandedCostResult: true,
        alversion: 1,
        shipment: {
          id: `SHIPMENT_${Date.now()}`,
          importCountryCode: params.destinationCountryCode,
          importProvince: params.destinationProvince || '',
          shipDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD
          incoterms: params.incoterms || 'FOB',
          exportCountryCode: params.originCountryCode,
          transModes: params.transportMode || 'INT_AIR',
          transportCost: params.shippingCost,
          shipmentType: params.shipmentType || 'COMMERCIAL',
          shipmentItems: shipmentItems
        }
      };

      console.log('[UPS LANDED COST] Request payload:', JSON.stringify(requestBody, null, 2));

      // Make API request
      const apiUrl = UPS_API_BASE_URL!.endsWith('/') 
        ? `${UPS_API_BASE_URL}landedcost/${this.version}/quotes`
        : `${UPS_API_BASE_URL}/landedcost/${this.version}/quotes`;

      console.log(`[UPS LANDED COST] Making API request to: ${apiUrl}`);
      console.log(`[UPS LANDED COST] Request headers: Authorization: Bearer [TOKEN], transId: ${transactionId.substring(0, 32)}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.log('[UPS LANDED COST] Request timed out after 180 seconds');
      }, 180000); // 180 second timeout for complex international duty calculations

      let response: Awaited<ReturnType<typeof fetch>>;
      let responseData: UpsLandedCostResponse;

      try {
        response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'transId': transactionId.substring(0, 32), // UPS requires max 32 chars
            'transactionSrc': 'moogship'
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        
        console.log(`[UPS LANDED COST] Response status: ${response.status} ${response.statusText}`);
        console.log(`[UPS LANDED COST] Response headers:`, Object.fromEntries(response.headers.entries()));

        responseData = await response.json() as UpsLandedCostResponse;
        console.log('[UPS LANDED COST] Raw response data:', JSON.stringify(responseData, null, 2));
      } catch (fetchError: unknown) {
        clearTimeout(timeoutId);
        const error = fetchError as Error;
        if (error.name === 'AbortError') {
          console.error('[UPS LANDED COST] Request was aborted due to timeout');
          throw new Error('UPS API request timed out after 180 seconds - complex duty calculations can take time');
        }
        console.error('[UPS LANDED COST] Fetch error:', error);
        throw error;
      }

      if (!response.ok) {
        console.error('[UPS LANDED COST] API request failed:', response.status, responseData);
        return {
          provider: 'UPS',
          currency: params.currencyCode || 'USD',
          duties: 0,
          taxes: 0,
          vat: 0,
          brokerageFees: 0,
          totalDutyAndTax: 0,
          grandTotal: 0,
          success: false,
          error: `UPS API error: ${response.status} - ${JSON.stringify(responseData)}`,
          transactionId: transactionId
        };
      }

      console.log('[UPS LANDED COST] Response received:', JSON.stringify(responseData, null, 2));

      // Parse successful response
      const shipment = responseData.shipment;
      
      return {
        provider: 'UPS',
        currency: shipment.currencyCode,
        duties: shipment.totalDuties || 0,
        taxes: shipment.totalCommodityLevelTaxesAndFees + shipment.totalShipmentLevelTaxesAndFees || 0,
        vat: shipment.totalVAT || 0,
        brokerageFees: shipment.totalBrokerageFees || 0,
        totalDutyAndTax: shipment.totalDutyandTax || 0,
        grandTotal: shipment.grandTotal || 0,
        success: true,
        transactionId: responseData.transID
      };

    } catch (error) {
      console.error('[UPS LANDED COST] Error calculating landed cost:', error);
      return {
        provider: 'UPS',
        currency: params.currencyCode || 'USD',
        duties: 0,
        taxes: 0,
        vat: 0,
        brokerageFees: 0,
        totalDutyAndTax: 0,
        grandTotal: 0,
        success: false,
        error: `Service error: ${(error as Error).message}`,
        transactionId: `ERROR_${Date.now()}`
      };
    }
  }

  /**
   * Get supported countries for landed cost calculations
   */
  async getSupportedCountries(): Promise<string[]> {
    // UPS Landed Cost supports many countries, but exact list would need to be fetched from their API
    // For now, return common countries that are typically supported
    return [
      'US', 'CA', 'MX', 'GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'CH', 'AT', 
      'DK', 'SE', 'NO', 'FI', 'IE', 'PT', 'LU', 'CZ', 'PL', 'HU', 'SK', 'SI',
      'EE', 'LV', 'LT', 'MT', 'CY', 'BG', 'RO', 'HR', 'AU', 'NZ', 'JP', 'KR',
      'SG', 'HK', 'TW', 'MY', 'TH', 'IN', 'CN', 'BR', 'AR', 'CL', 'CO', 'PE',
      'UY', 'ZA', 'EG', 'IL', 'AE', 'SA', 'QA', 'KW', 'BH', 'OM', 'JO', 'LB',
      'TR', 'RU', 'UA', 'KZ', 'PH', 'ID', 'VN', 'BD', 'LK', 'PK', 'NG', 'KE',
      'GH', 'TN', 'MA', 'DZ', 'LY'
    ];
  }

  /**
   * Validate if landed cost calculation is available for the given route
   */
  async isRouteSupported(originCountryCode: string, destinationCountryCode: string): Promise<boolean> {
    const supportedCountries = await this.getSupportedCountries();
    return supportedCountries.includes(originCountryCode) && supportedCountries.includes(destinationCountryCode);
  }
}

// Export singleton instance
export const upsLandedCostService = new UpsLandedCostService();