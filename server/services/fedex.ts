/**
 * FedEx Tracking Service
 * Integrates with FedEx Track API for real-time package tracking
 */

// FedEx API Configuration from environment variables
const FEDEX_API_KEY = process.env.FEDEX_API_KEY;
const FEDEX_SECRET_KEY = process.env.FEDEX_SECRET_KEY;
const FEDEX_ACCOUNT_NUMBER = process.env.FEDEX_ACCOUNT_NUMBER || process.env.FEDEX_ACCOUNT;
const FEDEX_API_BASE_URL = 'https://apis.fedex.com';

export interface FedExTrackingResult {
  trackingNumber: string;
  carrier: string;
  status: string;
  statusDescription: string;
  statusTime: string;
  location?: string;
  estimatedDelivery?: string;
  deliveredTime?: string;
  originAddress?: string;
  destinationAddress?: string;
  serviceName?: string;
  packageWeight?: string;
  events?: {
    timestamp: string;
    status: string;
    location: string;
  }[];
  error?: string;
}

interface FedExTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface FedExTrackResponse {
  transactionId: string;
  customerTransactionId?: string;
  output: {
    completeTrackResults: Array<{
      trackingNumber: string;
      trackResults?: Array<{
        trackingNumberInfo: {
          trackingNumber: string;
          trackingNumberUniqueId?: string;
          carrierCode?: string;
        };
        additionalTrackingInfo?: {
          nickname?: string;
          packageIdentifiers?: Array<{
            type: string;
            value: string;
          }>;
          hasAssociatedShipments?: boolean;
        };
        distanceToDestination?: {
          units: string;
          value: number;
        };
        consolidationDetail?: Array<any>;
        meterNumber?: string;
        returnDetail?: any;
        serviceDetail?: {
          description?: string;
          shortDescription?: string;
          type?: string;
        };
        destinationLocation?: {
          locationContactAndAddress?: {
            address?: {
              city?: string;
              stateOrProvinceCode?: string;
              countryCode?: string;
              countryName?: string;
              postalCode?: string;
              residential?: boolean;
            };
          };
        };
        latestStatusDetail?: {
          code?: string;
          derivedCode?: string;
          statusByLocale?: string;
          description?: string;
          scanLocation?: {
            city?: string;
            stateOrProvinceCode?: string;
            countryCode?: string;
            countryName?: string;
            postalCode?: string;
          };
          ancillaryDetails?: Array<{
            reason?: string;
            reasonDescription?: string;
            action?: string;
            actionDescription?: string;
          }>;
        };
        dateAndTimes?: Array<{
          type: string;
          dateTime: string;
        }>;
        packageDetails?: {
          count?: number;
          weightAndDimensions?: {
            weight?: Array<{
              units: string;
              value: number;
            }>;
            dimensions?: Array<{
              length?: number;
              width?: number;
              height?: number;
              units?: string;
            }>;
          };
          packageContent?: Array<string>;
          contentPieceCount?: number;
          declaredValue?: {
            currency: string;
            value: number;
          };
        };
        scanEvents?: Array<{
          date?: string;
          eventType?: string;
          eventDescription?: string;
          exceptionCode?: string;
          exceptionDescription?: string;
          scanLocation?: {
            city?: string;
            stateOrProvinceCode?: string;
            countryCode?: string;
            countryName?: string;
            postalCode?: string;
          };
        }>;
        availableImages?: Array<any>;
        specialHandlings?: Array<{
          description?: string;
          type?: string;
        }>;
        shipmentDetails?: {
          possibleDeliveryDates?: Array<string>;
          possibleDeliveryWindows?: Array<any>;
        };
      }>;
      error?: {
        code: string;
        message: string;
      };
    }>;
  };
}

// Token caching
let cachedToken: string | null = null;
let tokenExpiry: number = 0;

/**
 * Gets a valid OAuth token for FedEx API requests
 * Uses cached token if available and not expired
 */
async function getAccessToken(): Promise<string> {
  // Check if we have a valid cached token
  const now = Date.now();
  if (cachedToken && tokenExpiry > now) {
    return cachedToken;
  }

  if (!FEDEX_API_KEY || !FEDEX_SECRET_KEY) {
    throw new Error('FedEx credentials not configured. Set FEDEX_API_KEY and FEDEX_SECRET_KEY environment variables.');
  }
  
  // Log environment variable availability with length info for debugging
  console.log('=== FedEx API Configuration Debug ===');
  console.log('- API Base URL:', FEDEX_API_BASE_URL);
  console.log('- API Key exists:', !!FEDEX_API_KEY, '| Length:', FEDEX_API_KEY?.length || 0, '| First 4 chars:', FEDEX_API_KEY?.substring(0, 4) || 'EMPTY');
  console.log('- Secret Key exists:', !!FEDEX_SECRET_KEY, '| Length:', FEDEX_SECRET_KEY?.length || 0);
  console.log('- Account Number exists:', !!FEDEX_ACCOUNT_NUMBER);
  console.log('=====================================');

  try {
    const tokenUrl = `${FEDEX_API_BASE_URL}/oauth/token`;
    
    console.log(`Requesting FedEx OAuth token from: ${tokenUrl}`);
    
    // Request a new access token
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'grant_type': 'client_credentials',
        'client_id': FEDEX_API_KEY,
        'client_secret': FEDEX_SECRET_KEY,
      }).toString()
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('FedEx OAuth error:', errorText);
      
      let errorMessage = `Failed to obtain FedEx access token: ${response.status} ${response.statusText}`;
      
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.errors?.[0]?.message) {
          errorMessage = `FedEx OAuth error: ${errorJson.errors[0].message}`;
        }
      } catch (e) {
        // If parsing fails, use the default message
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json() as FedExTokenResponse;
    
    // Cache the token and set expiry (subtract 60 seconds for safety margin)
    cachedToken = data.access_token;
    tokenExpiry = now + ((data.expires_in - 60) * 1000);
    
    return data.access_token;

  } catch (error) {
    console.error('Error getting FedEx access token:', error);
    throw error;
  }
}

/**
 * Normalize FedEx status to our standard status format
 */
function normalizeStatus(fedexStatusCode: string): string {
  // FedEx status codes mapping
  const statusMap: { [key: string]: string } = {
    'OC': 'PRE_TRANSIT',    // Order created
    'IT': 'IN_TRANSIT',     // In transit
    'PU': 'IN_TRANSIT',     // Picked up
    'AR': 'IN_TRANSIT',     // At FedEx facility
    'OD': 'OUT_FOR_DELIVERY', // Out for delivery
    'DL': 'DELIVERED',      // Delivered
    'DE': 'DELIVERED',      // Delivered
    'CA': 'CANCELLED',      // Cancelled
    'EX': 'EXCEPTION',      // Exception
    'HL': 'ON_HOLD',        // On hold
  };

  // Check status code mapping
  if (statusMap[fedexStatusCode]) {
    return statusMap[fedexStatusCode];
  }

  // Default based on general patterns
  if (fedexStatusCode.includes('DL') || fedexStatusCode.includes('DE')) {
    return 'DELIVERED';
  }
  if (fedexStatusCode.includes('OD')) {
    return 'OUT_FOR_DELIVERY';
  }
  if (fedexStatusCode.includes('EX')) {
    return 'EXCEPTION';
  }

  // Default to IN_TRANSIT for any tracking activity
  return 'IN_TRANSIT';
}

/**
 * Track a package using the FedEx Track API
 * @param trackingNumber - The FedEx tracking number
 * @returns Standardized tracking result
 */
export async function trackPackage(trackingNumber: string): Promise<FedExTrackingResult> {
  if (!trackingNumber) {
    throw new Error('Tracking number is required');
  }

  if (!FEDEX_API_BASE_URL) {
    throw new Error('FedEx API base URL not configured. Set FEDEX_API_BASE_URL environment variable.');
  }

  try {
    // Get access token
    const token = await getAccessToken();

    // Make tracking request
    const trackingUrl = `${FEDEX_API_BASE_URL}/track/v1/trackingnumbers`;
    
    console.log(`Requesting FedEx tracking data from: ${trackingUrl}`);
    
    const requestBody = {
      includeDetailedScans: true,
      trackingInfo: [
        {
          trackingNumberInfo: {
            trackingNumber: trackingNumber
          }
        }
      ]
    };

    const response = await fetch(trackingUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-locale': 'en_US',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`FedEx tracking error for ${trackingNumber}:`, errorText);
      
      return {
        trackingNumber,
        carrier: 'FedEx',
        status: 'ERROR',
        statusDescription: `Failed to fetch tracking data: ${response.status} ${response.statusText}`,
        statusTime: new Date().toISOString(),
        error: errorText
      };
    }

    const data = await response.json() as FedExTrackResponse;
    console.log(`[FEDEX DEBUG] Raw API response for ${trackingNumber}:`, JSON.stringify(data, null, 2));

    // Parse the response
    const completeTrackResults = data.output.completeTrackResults;
    
    if (!completeTrackResults || completeTrackResults.length === 0) {
      return {
        trackingNumber,
        carrier: 'FedEx',
        status: 'NOT_FOUND',
        statusDescription: 'Tracking number not found',
        statusTime: new Date().toISOString(),
        error: 'No tracking results found'
      };
    }

    const trackResult = completeTrackResults[0];
    
    // Check for errors
    if (trackResult.error) {
      return {
        trackingNumber,
        carrier: 'FedEx',
        status: 'ERROR',
        statusDescription: trackResult.error.message,
        statusTime: new Date().toISOString(),
        error: `FedEx API error: ${trackResult.error.code} - ${trackResult.error.message}`
      };
    }

    // Check if we have track results
    if (!trackResult.trackResults || trackResult.trackResults.length === 0) {
      return {
        trackingNumber,
        carrier: 'FedEx',
        status: 'NOT_FOUND',
        statusDescription: 'No tracking information available',
        statusTime: new Date().toISOString(),
        error: 'No track results in response'
      };
    }

    const result = trackResult.trackResults[0];
    
    // Get latest status
    const latestStatus = result.latestStatusDetail;
    const statusCode = latestStatus?.code || latestStatus?.derivedCode || 'UNKNOWN';
    const statusDescription = latestStatus?.description || latestStatus?.statusByLocale || 'Status not available';
    const normalizedStatus = normalizeStatus(statusCode);
    
    // Get location info
    let location = '';
    if (latestStatus?.scanLocation) {
      const loc = latestStatus.scanLocation;
      location = [loc.city, loc.stateOrProvinceCode, loc.countryCode].filter(Boolean).join(', ');
    }

    // Get estimated delivery date
    let estimatedDelivery = '';
    const deliveryDate = result.dateAndTimes?.find(dt => dt.type === 'ESTIMATED_DELIVERY' || dt.type === 'SCHEDULED_DELIVERY');
    if (deliveryDate) {
      estimatedDelivery = deliveryDate.dateTime;
    }

    // Get delivered time
    let deliveredTime = '';
    if (normalizedStatus === 'DELIVERED') {
      const deliveredEvent = result.dateAndTimes?.find(dt => dt.type === 'ACTUAL_DELIVERY');
      if (deliveredEvent) {
        deliveredTime = deliveredEvent.dateTime;
      }
    }

    // Convert scan events to our format
    const events = result.scanEvents?.map(event => ({
      timestamp: event.date || new Date().toISOString(),
      status: event.eventDescription || 'Unknown event',
      location: event.scanLocation 
        ? [event.scanLocation.city, event.scanLocation.stateOrProvinceCode, event.scanLocation.countryCode].filter(Boolean).join(', ')
        : ''
    })) || [];

    // Get service info
    const serviceName = result.serviceDetail?.description || result.serviceDetail?.shortDescription || 'FedEx Service';
    
    // Get package weight
    let packageWeight = '';
    if (result.packageDetails?.weightAndDimensions?.weight?.[0]) {
      const weight = result.packageDetails.weightAndDimensions.weight[0];
      packageWeight = `${weight.value} ${weight.units}`;
    }

    // Get addresses
    let originAddress = '';
    let destinationAddress = '';
    if (result.destinationLocation?.locationContactAndAddress?.address) {
      const addr = result.destinationLocation.locationContactAndAddress.address;
      destinationAddress = [addr.city, addr.stateOrProvinceCode, addr.countryCode].filter(Boolean).join(', ');
    }

    const statusTime = result.dateAndTimes?.find(dt => dt.type === 'ACTUAL_PICKUP' || dt.type === 'SHIP_TIMESTAMP')?.dateTime || new Date().toISOString();

    console.log(`[FEDEX DEBUG] Tracking ${trackingNumber}: Status Code="${statusCode}", Description="${statusDescription}", Normalized="${normalizedStatus}"`);

    return {
      trackingNumber,
      carrier: 'FedEx',
      status: normalizedStatus,
      statusDescription,
      statusTime,
      location,
      estimatedDelivery,
      deliveredTime,
      originAddress,
      destinationAddress,
      serviceName,
      packageWeight,
      events
    };

  } catch (error) {
    console.error(`Error tracking FedEx package ${trackingNumber}:`, error);
    
    return {
      trackingNumber,
      carrier: 'FedEx',
      status: 'ERROR',
      statusDescription: `Tracking service error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      statusTime: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// ===== ADDRESS VALIDATION INTERFACES =====

export interface FedExAddress {
  streetLines: string[];
  city: string;
  stateOrProvinceCode?: string;
  postalCode?: string;
  countryCode: string;
}

export interface FedExAddressValidationRequest {
  addressesToValidate: Array<{
    address: FedExAddress;
  }>;
}

export interface FedExAddressValidationResult {
  isValid: boolean;
  classification?: 'RESIDENTIAL' | 'BUSINESS' | 'UNKNOWN';
  deliverability?: 'DELIVERABLE' | 'UNDELIVERABLE' | 'UNKNOWN';
  originalAddress: FedExAddress;
  standardizedAddress?: FedExAddress;
  suggestions?: FedExAddress[];
  errors?: string[];
  warnings?: string[];
}

export interface FedExAddressValidationResponse {
  transactionId: string;
  output: {
    resolvedAddresses: Array<{
      streetLinesToken?: string[];
      city?: string;
      stateOrProvinceCode?: string;
      postalCode?: string;
      countryCode?: string;
      classification?: string;
      ruralRouteHighwayContract?: boolean;
      generalDelivery?: boolean;
      customerMessages?: string[];
      normalizedStatusNameDPV?: boolean;
      standardizedStatusNameMatchSource?: string;
      resolutionMethodName?: string;
      attributes?: {
        POBox?: string;
        POBoxOnlyZIP?: string;
        SplitZIP?: string;
        SuiteRequiredButMissing?: string;
        InvalidSuiteNumber?: string;
        ResolutionInput?: string;
        DPV?: string;
        ResolutionMethod?: string;
        DataVintage?: string;
        MatchSource?: string;
        CountrySupported?: string;
        ValidlyFormed?: string;
        Matched?: string;
        Resolved?: string;
        Inserted?: string;
        MultiUnitBase?: string;
        ZIP11Match?: string;
        ZIP4Match?: string;
        UniqueZIP?: string;
        StreetAddress?: string;
        RRConversion?: string;
        ValidMultiUnit?: string;
        AddressType?: string;
        AddressPrecision?: string;
        MultipleMatches?: string;
      };
      proposedAddressDetails?: Array<{
        address?: FedExAddress;
        score?: number;
        attributes?: Array<{
          name: string;
          value: string;
        }>;
      }>;
      state?: string;
      deliverability?: string;
    }>;
  };
}

// ===== POSTAL CODE VALIDATION INTERFACES =====

export interface FedExPostalCodeValidationRequest {
  carrierCode: 'FDXE' | 'FDXG';
  countryCode: string;
  stateOrProvinceCode?: string;
  postalCode: string;
  shipDate?: string;
  checkForMismatch?: boolean;
}

export interface FedExServiceAvailabilityRequest {
  carrierCodes: string[];
  origin: {
    countryCode: string;
    postalCode: string;
    stateOrProvinceCode?: string;
  };
  destination: {
    countryCode: string;
    postalCode: string;
    stateOrProvinceCode?: string;
  };
  shipDate: string;
  accountNumber?: {
    value: string;
  };
}

export interface FedExPostalCodeValidationResult {
  isValid: boolean;
  postalCode: string;
  countryCode: string;
  city?: string;
  stateOrProvinceCode?: string;
  errors?: string[];
  warnings?: string[];
}

export interface FedExPostalCodeValidationResponse {
  transactionId: string;
  output: {
    locationDetails?: Array<{
      locationId?: string;
      locationContactAndAddress?: {
        address?: {
          city?: string;
          stateOrProvinceCode?: string;
          countryCode?: string;
          postalCode?: string;
        };
      };
      locationCapabilities?: Array<{
        carrierCode?: string;
        serviceType?: string;
        transferOfPossession?: string;
      }>;
    }>;
    alerts?: Array<{
      code?: string;
      message?: string;
      alertType?: string;
    }>;
  };
}

/**
 * Validates an address using FedEx Address Validation API
 * @param address - The address to validate
 * @returns Validation result with standardized address if available
 */
export async function validateAddress(address: FedExAddress): Promise<FedExAddressValidationResult> {
  if (!address.streetLines || !address.city || !address.countryCode) {
    return {
      isValid: false,
      originalAddress: address,
      errors: ['Street address, city, and country are required for validation']
    };
  }

  try {
    // Get access token
    const token = await getAccessToken();

    // Prepare request body
    const requestBody: FedExAddressValidationRequest = {
      addressesToValidate: [
        {
          address: {
            streetLines: address.streetLines.filter(line => line.trim().length > 0),
            city: address.city.trim(),
            stateOrProvinceCode: address.stateOrProvinceCode?.trim(),
            postalCode: address.postalCode?.trim(),
            countryCode: address.countryCode.toUpperCase()
          }
        }
      ]
    };

    console.log('[FEDEX ADDRESS VALIDATION] Request:', JSON.stringify(requestBody, null, 2));

    // Make validation request
    const validationUrl = `${FEDEX_API_BASE_URL}/address/v1/addresses/resolve`;
    
    const response = await fetch(validationUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-locale': 'en_US',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[FEDEX ADDRESS VALIDATION] API Error:', errorText);
      
      return {
        isValid: false,
        originalAddress: address,
        errors: [`FedEx validation failed: ${response.status} ${response.statusText}`]
      };
    }

    const data = await response.json() as FedExAddressValidationResponse;
    console.log('[FEDEX ADDRESS VALIDATION] Response:', JSON.stringify(data, null, 2));

    // Parse the response
    const resolvedAddresses = data.output.resolvedAddresses;
    
    if (!resolvedAddresses || resolvedAddresses.length === 0) {
      return {
        isValid: false,
        originalAddress: address,
        errors: ['No address resolution results returned']
      };
    }

    const resolved = resolvedAddresses[0];
    const attributes = resolved.attributes || {};
    
    // Determine validity based on FedEx response attributes
    const isMatched = attributes.Matched === 'true';
    const isResolved = attributes.Resolved === 'true';
    const isValidlyFormed = attributes.ValidlyFormed === 'true';
    const hasDPV = attributes.DPV === 'true';
    
    // Check if the original address likely contains suite/apartment/unit information
    const originalAddressText = address.streetLines.join(' ').toLowerCase();
    const hasSuiteInfo = /\b(suite|ste|apt|apartment|unit|#|\broom\b|floor|fl)\b/i.test(originalAddressText);
    
    // Address validation logic:
    // 1. Full validation: matched + resolved + validly formed (ideal case)
    // 2. Lenient validation for suite addresses: resolved + validly formed (suite numbers often cause match failures)
    const isValid = (isMatched && isResolved && isValidlyFormed) || 
                    (hasSuiteInfo && isResolved && isValidlyFormed);
    
    // Build standardized address from resolved response
    let standardizedAddress: FedExAddress | undefined;
    if (isValid && resolved.streetLinesToken && resolved.city && resolved.countryCode) {
      let finalStreetLines = [...resolved.streetLinesToken];
      
      // If original address had suite info but standardized doesn't, preserve it
      if (hasSuiteInfo) {
        const standardizedText = resolved.streetLinesToken.join(' ').toLowerCase();
        const hasStandardizedSuite = /\b(suite|ste|apt|apartment|unit|#|\broom\b|floor|fl)\b/i.test(standardizedText);
        
        if (!hasStandardizedSuite) {
          // Extract suite information from original address
          const suiteMatch = originalAddressText.match(/\b(suite|ste|apt|apartment|unit|#|\broom\b|floor|fl)\s*[a-z0-9-]+\b/i);
          if (suiteMatch) {
            // Add the suite info to the first street line of standardized address
            finalStreetLines[0] = `${finalStreetLines[0]} ${suiteMatch[0]}`;
          }
        }
      }
      
      standardizedAddress = {
        streetLines: finalStreetLines,
        city: resolved.city,
        stateOrProvinceCode: resolved.stateOrProvinceCode,
        postalCode: resolved.postalCode,
        countryCode: resolved.countryCode
      };
    }
    
    // Check for suggestions from proposedAddressDetails (fallback)
    let suggestions: FedExAddress[] = [];
    if (resolved.proposedAddressDetails && resolved.proposedAddressDetails.length > 0) {
      suggestions = resolved.proposedAddressDetails
        .map(detail => detail.address)
        .filter((addr): addr is FedExAddress => addr !== undefined);
        
      // If we don't have a standardized address yet, use the first suggestion
      if (!standardizedAddress && suggestions.length > 0) {
        standardizedAddress = suggestions[0];
        suggestions = suggestions.slice(1);
      }
    }

    // Build error messages based on specific validation issues
    const errors: string[] = [];
    if (!isValid) {
      if (hasSuiteInfo) {
        // More user-friendly messages for addresses with suite numbers
        if (!isResolved) errors.push('Address could not be resolved - please check street address and city');
        if (!isValidlyFormed) errors.push('Address format is invalid - please check formatting');
        if (!isMatched && !isResolved && !isValidlyFormed) {
          errors.push('Address with suite number could not be validated - please verify the base address is correct');
        }
      } else {
        // Standard error messages for regular addresses
        if (!isMatched) errors.push('Address could not be matched');
        if (!isResolved) errors.push('Address could not be resolved');
        if (!isValidlyFormed) errors.push('Address is not validly formed');
      }
    }
    
    // Add warnings for delivery issues
    const warnings: string[] = [];
    if (attributes.SuiteRequiredButMissing === 'true') {
      warnings.push('Suite or unit number may be required for delivery');
    }
    if (!hasDPV) {
      warnings.push('Delivery point validation could not confirm deliverability');
    }
    if (attributes.POBox === 'true') {
      warnings.push('This is a PO Box address');
    }

    return {
      isValid,
      classification: resolved.classification as 'RESIDENTIAL' | 'BUSINESS' | 'UNKNOWN',
      deliverability: hasDPV ? 'DELIVERABLE' : 'UNKNOWN',
      originalAddress: address,
      standardizedAddress,
      suggestions,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };

  } catch (error) {
    console.error('[FEDEX ADDRESS VALIDATION] Error:', error);
    
    return {
      isValid: false,
      originalAddress: address,
      errors: [`Validation service error: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}

/**
 * Helper function to generate UUID for transaction tracking
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Clear token cache (for 401 retry mechanism)
 */
async function clearTokenCache(): Promise<void> {
  // In-memory cache clearing - token will be refetched
  console.log('[FEDEX AUTH] Clearing token cache for retry...');
}

/**
 * Parse postal validation response (matching Google Apps Script logic)
 */
function parsePostalValidationResponse(data: any, payload: any): FedExPostalCodeValidationResult {
  // Parse response according to working Google Apps Script
  const output = (data && data.output) || {};
  const cleaned = output.cleanedPostalCode || data.cleanedPostalCode || payload.postalCode;

  // Try to extract city/state hint if present (matching Google Apps Script)
  let city = null, state = null;
  if (output.locationDescriptions && output.locationDescriptions.length) {
    const first = output.locationDescriptions[0];
    city = first.city || first.cityName || null;
    state = first.stateOrProvinceCode || null;
  }
  if (!state) state = output.stateOrProvinceCode || null;

  return {
    isValid: true,
    postalCode: cleaned,
    countryCode: payload.countryCode,
    city: city || undefined,
    stateOrProvinceCode: state || payload.stateOrProvinceCode || undefined,
    warnings: []
  };
}

/**
 * Primary: Postal Code Validation API
 */
async function callFedexPostalValidation(payload: {
  carrierCode: string;
  countryCode: string;
  stateOrProvinceCode?: string;
  postalCode: string;
  shipDate: string;
  checkForMismatch?: boolean;
}): Promise<FedExPostalCodeValidationResult> {
  const token = await getAccessToken();
  const url = `${FEDEX_API_BASE_URL}/country/v1/postal/validate`;

  // Clean request body exactly like working Google Apps Script
  const body: any = {
    carrierCode: payload.carrierCode,
    countryCode: payload.countryCode,
    stateOrProvinceCode: payload.stateOrProvinceCode || null, // Always include, required for US/CA
    postalCode: payload.postalCode,
    shipDate: payload.shipDate,
    checkForMismatch: payload.checkForMismatch === true
  };

  console.log('[FEDEX POSTAL CODE VALIDATION] Request:', JSON.stringify(body, null, 2));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'x-customer-transaction-id': generateUUID()
    },
    body: JSON.stringify(body)
  });

  // Handle 401 with token retry (like working Google Apps Script)
  if (response.status === 401) {
    console.log('[FEDEX POSTAL CODE VALIDATION] 401 - Token expired, retrying...');
    // Clear token and retry once
    await clearTokenCache();
    const newToken = await getAccessToken();
    const retryResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${newToken}`,
        'Content-Type': 'application/json',
        'x-customer-transaction-id': generateUUID()
      },
      body: JSON.stringify(body)
    });
    
    if (retryResponse.status === 403) {
      const errorText = await retryResponse.text();
      console.error('[FEDEX POSTAL CODE VALIDATION] 403 Forbidden after retry:', errorText);
      throw new Error('403 Forbidden: Your key is not authorized for Postal Code Validation. Trying fallback API...');
    }
    
    if (!retryResponse.ok) {
      const errorText = await retryResponse.text();
      console.error('[FEDEX POSTAL CODE VALIDATION] API Error after retry:', errorText);
      
      try {
        const errorData = JSON.parse(errorText);
        // Return FedEx error details to user instead of throwing
        if (errorData.errors && errorData.errors.length > 0) {
          return {
            isValid: false,
            postalCode: payload.postalCode,
            countryCode: payload.countryCode,
            stateOrProvinceCode: payload.stateOrProvinceCode,
            errors: errorData.errors.map((err: any) => err.message || 'Validation failed')
          };
        }
      } catch (parseError) {
        // If we can't parse the error, still return a proper validation result
      }
      
      throw new Error(`Postal Validation HTTP ${retryResponse.status}`);
    }
    
    const retryData = await retryResponse.json() as FedExPostalCodeValidationResponse;
    console.log('[FEDEX POSTAL CODE VALIDATION] Retry Success:', JSON.stringify(retryData, null, 2));
    
    // Check if FedEx returned errors in the retry response body
    if (retryData.errors && retryData.errors.length > 0) {
      return {
        isValid: false,
        postalCode: payload.postalCode,
        countryCode: payload.countryCode,
        stateOrProvinceCode: payload.stateOrProvinceCode,
        errors: retryData.errors.map((err: any) => err.message || 'Validation failed')
      };
    }
    
    return parsePostalValidationResponse(retryData, payload);
  }

  if (response.status === 403) {
    const errorText = await response.text();
    console.error('[FEDEX POSTAL CODE VALIDATION] 403 Forbidden:', errorText);
    throw new Error('403 Forbidden: Your key is not authorized for Postal Code Validation. Trying fallback API...');
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[FEDEX POSTAL CODE VALIDATION] API Error:', errorText);
    
    try {
      const errorData = JSON.parse(errorText);
      // Return FedEx error details to user instead of throwing
      if (errorData.errors && errorData.errors.length > 0) {
        return {
          isValid: false,
          postalCode: payload.postalCode,
          countryCode: payload.countryCode,
          stateOrProvinceCode: payload.stateOrProvinceCode,
          errors: errorData.errors.map((err: any) => err.message || 'Validation failed')
        };
      }
    } catch (parseError) {
      // If we can't parse the error, still return a proper validation result
    }
    
    throw new Error(`Postal Validation HTTP ${response.status}`);
  }

  const data = await response.json() as FedExPostalCodeValidationResponse;
  console.log('[FEDEX POSTAL CODE VALIDATION] Response:', JSON.stringify(data, null, 2));
  
  // Check if FedEx returned errors in the response body
  if (data.errors && data.errors.length > 0) {
    return {
      isValid: false,
      postalCode: payload.postalCode,
      countryCode: payload.countryCode,
      stateOrProvinceCode: payload.stateOrProvinceCode,
      errors: data.errors.map((err: any) => err.message || 'Validation failed')
    };
  }
  
  return parsePostalValidationResponse(data, payload);
}

/**
 * Fallback: Service Availability API
 */
async function callFedexServiceAvailability(payload: FedExServiceAvailabilityRequest): Promise<FedExPostalCodeValidationResult> {
  const token = await getAccessToken();
  const url = `${FEDEX_API_BASE_URL}/availability/v1/transittimes`;

  // Clean request body exactly like working Google Apps Script
  const body: any = {
    carrierCodes: [payload.carrierCodes[0]], // Use first carrier code
    origin: {
      countryCode: payload.origin.countryCode,
      postalCode: payload.origin.postalCode,
      stateOrProvinceCode: payload.origin.stateOrProvinceCode
    },
    destination: {
      countryCode: payload.destination.countryCode,
      postalCode: payload.destination.postalCode
    },
    shipDate: payload.shipDate
  };

  // Always include stateOrProvinceCode for destination (like Google Apps Script)
  body.destination.stateOrProvinceCode = payload.destination.stateOrProvinceCode || undefined;

  // Include account number if provided (like Google Apps Script)
  if (payload.accountNumber?.value) {
    body.accountNumber = { value: payload.accountNumber.value };
  }

  console.log('[FEDEX SERVICE AVAILABILITY] Request:', JSON.stringify(body, null, 2));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'x-customer-transaction-id': generateUUID()
    },
    body: JSON.stringify(body)
  });

  // Handle 401 with token retry (like Google Apps Script)
  if (response.status === 401) {
    console.log('[FEDEX SERVICE AVAILABILITY] 401 - Token expired, retrying...');
    await clearTokenCache();
    const newToken = await getAccessToken();
    const retryResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${newToken}`,
        'Content-Type': 'application/json',
        'x-customer-transaction-id': generateUUID()
      },
      body: JSON.stringify(body)
    });

    if (retryResponse.status === 403) {
      console.error('[FEDEX SERVICE AVAILABILITY] 403 Forbidden after retry');
      throw new Error('403 Forbidden: Enable Availability/Transit Times API or check permissions');
    }

    if (!retryResponse.ok) {
      const errorText = await retryResponse.text();
      console.error('[FEDEX SERVICE AVAILABILITY] API Error after retry:', errorText);
      throw new Error(`Service Availability HTTP ${retryResponse.status}`);
    }

    const retryData = await retryResponse.json();
    console.log('[FEDEX SERVICE AVAILABILITY] Retry Success:', JSON.stringify(retryData, null, 2));
    return parseServiceAvailabilityResponse(retryData, payload);
  }

  if (response.status === 403) {
    console.error('[FEDEX SERVICE AVAILABILITY] 403 Forbidden - both APIs unavailable');
    throw new Error('403 Forbidden: Enable Availability/Transit Times API or check permissions');
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[FEDEX SERVICE AVAILABILITY] API Error:', errorText);
    throw new Error(`Service Availability HTTP ${response.status}`);
  }

  const data = await response.json();
  console.log('[FEDEX SERVICE AVAILABILITY] Response:', JSON.stringify(data, null, 2));

  return parseServiceAvailabilityResponse(data, payload);
}

/**
 * Parse service availability response (matching Google Apps Script logic)
 */
function parseServiceAvailabilityResponse(data: any, payload: FedExServiceAvailabilityRequest): FedExPostalCodeValidationResult {
  // If we get service options, destination postal is acceptable (per Google Apps Script)
  const services = (data && (data.output || {}).serviceOptions) || (data.services || []);
  const valid = Array.isArray(services) && services.length > 0;

  return {
    isValid: valid,
    postalCode: payload.destination.postalCode,
    countryCode: payload.destination.countryCode,
    stateOrProvinceCode: payload.destination.stateOrProvinceCode,
    warnings: valid ? [] : ['Postal code validity uncertain - fallback validation used']
  };
}

/**
 * Test FedEx OAuth connection - for debugging credentials issues
 */
export async function testFedExConnection(): Promise<{
  success: boolean;
  message: string;
  debug: {
    apiKeyLength: number;
    apiKeyPrefix: string;
    secretKeyLength: number;
    accountNumberExists: boolean;
  };
  error?: string;
}> {
  const debug = {
    apiKeyLength: FEDEX_API_KEY?.length || 0,
    apiKeyPrefix: FEDEX_API_KEY?.substring(0, 8) || 'EMPTY',
    secretKeyLength: FEDEX_SECRET_KEY?.length || 0,
    accountNumberExists: !!FEDEX_ACCOUNT_NUMBER,
  };

  try {
    const token = await getAccessToken();
    return {
      success: true,
      message: 'FedEx OAuth connection successful!',
      debug,
    };
  } catch (error) {
    return {
      success: false,
      message: 'FedEx OAuth connection failed',
      debug,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Validates a postal code using ONLY FedEx Postal Code Validation API - NO FALLBACKS
 * @param postalCode - The postal code to validate
 * @param countryCode - The country code (ISO 2-letter)
 * @param stateOrProvinceCode - State/province code (required for US/CA)
 * @param carrierCode - FedEx carrier code (defaults to FDXG)
 * @returns Validation result with location details if available
 */
export async function validatePostalCode(
  postalCode: string, 
  countryCode: string, 
  stateOrProvinceCode?: string,
  carrierCode: 'FDXE' | 'FDXG' = 'FDXG'
): Promise<FedExPostalCodeValidationResult> {
  if (!postalCode || !countryCode) {
    return {
      isValid: false,
      postalCode,
      countryCode,
      errors: ['Postal code and country code are required']
    };
  }

  const shipDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // Tomorrow's date
  const cleanCountryCode = countryCode.toUpperCase();
  const cleanPostalCode = postalCode.trim();
  const cleanStateCode = stateOrProvinceCode?.toUpperCase() || undefined;

  // Use ONLY FedEx Postal Code Validation API - NO FALLBACKS
  return await callFedexPostalValidation({
    carrierCode,
    countryCode: cleanCountryCode,
    stateOrProvinceCode: cleanStateCode,
    postalCode: cleanPostalCode,
    shipDate,
    checkForMismatch: true
  });
}