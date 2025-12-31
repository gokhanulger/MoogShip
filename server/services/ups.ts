/**
 * UPS API Integration Service
 * 
 * This service handles interactions with the UPS API for tracking packages,
 * including authentication, tracking requests, and response parsing.
 */

import fetch from 'node-fetch';

// Environment variables for UPS API credentials
const UPS_CLIENT_ID = process.env.UPS_CLIENT_ID;
const UPS_CLIENT_SECRET = process.env.UPS_CLIENT_SECRET;

// UPS_API_BASE_URL should be just the base part (e.g., https://onlinetools.ups.com)
// If it includes more path components, we need to extract just the base
let UPS_API_BASE_URL = process.env.UPS_API_BASE_URL;

// If UPS_API_BASE_URL contains the oauth token path, extract just the base URL
if (UPS_API_BASE_URL && UPS_API_BASE_URL.includes('/security/v1/oauth/token')) {
  UPS_API_BASE_URL = UPS_API_BASE_URL.split('/security/v1/oauth/token')[0];
  console.log(`Extracted base URL from environment: ${UPS_API_BASE_URL}`);
}

/**
 * Interface for OAuth token response
 */
interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

/**
 * Interface for UPS tracking status
 */
interface UpsTrackingStatus {
  code: string;
  description: string;
  statusTime: string;
  statusLocation?: {
    address?: {
      city?: string;
      stateProvince?: string;
      countryCode?: string;
    }
  };
}

/**
 * Interface for standard tracking response format
 */
export interface TrackingResult {
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

// Token caching
let cachedToken: string | null = null;
let tokenExpiry: number = 0;

/**
 * Gets a valid OAuth token for UPS API requests
 * Uses cached token if available and not expired
 */
async function getAccessToken(): Promise<string> {
  // Check if we have a valid cached token
  const now = Date.now();
  if (cachedToken && tokenExpiry > now) {
    return cachedToken;
  }

  if (!UPS_CLIENT_ID || !UPS_CLIENT_SECRET) {
    throw new Error('UPS credentials not configured. Set UPS_CLIENT_ID and UPS_CLIENT_SECRET environment variables.');
  }
  
  // Log environment variable availability (but not their values)
  console.log('UPS API Configuration:');
  console.log('- API Base URL provided:', !!UPS_API_BASE_URL);
  console.log('- Client ID provided:', !!UPS_CLIENT_ID);
  console.log('- Client Secret provided:', !!UPS_CLIENT_SECRET);

  // Basic authentication for token request
  const encodedCredentials = Buffer.from(`${UPS_CLIENT_ID}:${UPS_CLIENT_SECRET}`).toString('base64');

  try {
    if (!UPS_API_BASE_URL) {
      throw new Error('UPS_API_BASE_URL environment variable is not configured');
    }
    
    // Make sure the URL is correctly formatted and doesn't include path components already in the base URL
    const tokenUrl = UPS_API_BASE_URL.endsWith('/') 
      ? `${UPS_API_BASE_URL}security/v1/oauth/token`
      : `${UPS_API_BASE_URL}/security/v1/oauth/token`;
    
    // Log the authentication request details (excluding sensitive credentials)
    console.log(`Requesting UPS OAuth token from: ${tokenUrl}`);
    
    // Request a new access token
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${encodedCredentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'x-merchant-id': UPS_CLIENT_ID
      },
      body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('UPS OAuth error:', errorText);
      
      let errorMessage = `Failed to obtain UPS access token: ${response.status} ${response.statusText}`;
      
      try {
        // Try to parse the error message from the response
        const errorJson = JSON.parse(errorText);
        if (errorJson.response?.errors?.[0]?.message) {
          errorMessage = `UPS OAuth error: ${errorJson.response.errors[0].message}`;
          console.error(errorMessage);
        }
      } catch (e) {
        // If parsing fails, use the default message
        console.error('Failed to parse UPS OAuth error response:', e);
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json() as TokenResponse;
    
    // Cache the token and set expiry (subtract 60 seconds for safety margin)
    cachedToken = data.access_token;
    tokenExpiry = now + ((data.expires_in - 60) * 1000);
    
    return data.access_token;

  } catch (error) {
    console.error('Error obtaining UPS access token:', error);
    throw new Error('Failed to authenticate with UPS API');
  }
}

/**
 * Normalize UPS status to standardized status description
 */
function normalizeStatus(upsStatusCode: string, upsDescription: string = ''): string {
  const upperDescription = upsDescription.toUpperCase();
  
  // Check for pre-transit states ONLY when it's truly just label creation
  if (upperDescription.includes('SHIPPER CREATED A LABEL') && upperDescription.includes('UPS HAS NOT RECEIVED THE PACKAGE YET')) {
    return 'PRE_TRANSIT';
  }
  
  // Check for specific UPS status codes that indicate pre-transit
  if (upsStatusCode === 'MP' || upsStatusCode === '003') {
    return 'PRE_TRANSIT';
  }
  
  // Check for delivery status
  if (upperDescription.includes('DELIVERED')) {
    return 'DELIVERED';
  }
  
  if (upperDescription.includes('OUT FOR DELIVERY')) {
    return 'OUT_FOR_DELIVERY';
  }
  
  // Check for actual in-transit indicators
  if (upperDescription.includes('IN TRANSIT') || 
      upperDescription.includes('DEPARTURE SCAN') ||
      upperDescription.includes('ARRIVAL SCAN') ||
      upperDescription.includes('DEPARTED FROM FACILITY') ||
      upperDescription.includes('ARRIVED AT FACILITY') ||
      upperDescription.includes('EXPORT SCAN') ||
      upperDescription.includes('IMPORT SCAN') ||
      upperDescription.includes('FACILITY') ||
      upperDescription.includes('ON THE WAY')) {
    return 'IN_TRANSIT';
  }
  
  // Check for pickup/origin events
  if (upperDescription.includes('PICKUP SCAN') ||
      upperDescription.includes('ORIGIN SCAN') ||
      upperDescription.includes('PICKED UP')) {
    return 'IN_TRANSIT';
  }
  
  // Then check status codes
  const statusMap: { [key: string]: string } = {
    'M': 'PRE_TRANSIT', // All M codes = Pre-Transit
    'I': 'IN_TRANSIT',  // All I codes = In Transit
    'X': 'IN_TRANSIT',  // All X codes = In Transit (but with exception)
    'P': 'IN_TRANSIT',  // Pickup means package is now in transit
    'D': 'DELIVERED',   // All D codes = Delivered
    'O': 'IN_TRANSIT',  // All O codes = In Transit (Out for Delivery)
    'OR': 'IN_TRANSIT'  // Origin scan means package is in transit
  };

  // Check status code mapping
  if (statusMap[upsStatusCode]) {
    return statusMap[upsStatusCode];
  }

  // Default to IN_TRANSIT for any tracking activity that's not explicitly label-only
  return 'IN_TRANSIT';
}

/**
 * Check if UPS tracking status indicates customs charges are due
 * @param statusCode The UPS status code
 * @param statusDescription The status description from UPS
 * @returns True if customs charges are due
 */
function hasCustomsCharges(statusCode: string, statusDescription: string): boolean {
  // Status type X indicates exemption, but check description for actual charges
  if (statusCode === 'X') {
    const description = statusDescription.toLowerCase();
    
    // First check for phrases that indicate customs have been CLEARED or PAID (no charges due)
    // This includes completed actions (paid, collected, settled, processed)
    if (description.includes('cleared customs') || 
        description.includes('customs cleared') || 
        description.includes('cleared through customs') ||
        description.includes('released from customs') ||
        description.includes('customs clearance complete') ||
        description.includes('have been paid') ||
        description.includes('has been paid') ||
        description.includes('been paid') ||
        description.includes('already paid') ||
        description.includes('payment received') ||
        description.includes('payment complete') ||
        description.includes('payment processed') ||
        description.includes('charges paid') ||
        description.includes('been collected') ||
        description.includes('been settled') ||
        description.includes('been processed') ||
        description.includes('collection complete') ||
        description.includes('settlement complete') ||
        description.includes('documentation needed') ||
        description.includes('documents needed') ||
        description.includes('document required') ||
        description.includes('documentation requirements') ||
        description.includes('document requirements') ||
        description.includes('clearance needed') ||
        description.includes('information needed') ||
        description.includes('payment requirements fulfilled') ||
        description.includes('payment requirements satisfied') ||
        description.includes('payment requirements completed') ||
        description.includes('payment requirements met')) {
      return false; // Customs cleared, charges paid, or documentation request - no payment due
    }
    
    // Check for specific payment-obligation phrase combinations
    // Use explicit phrases instead of individual keywords to avoid false positives
    
    const paymentObligationPhrases = [
      // Charges/fees with obligation verbs
      'charges due', 'charges are due', 'charges owed', 'charges required', 'charges must',
      'charges need to be paid', 'charges require payment', 'charges requires payment',
      'fees due', 'fees are due', 'fees owed', 'fees required', 'fees must',
      'fees need to be paid', 'fees require payment', 'fees requires payment',
      
      // Payment with obligation verbs
      'payment due', 'payment is due', 'payment owed', 'payment required', 'payment is required', 'payment must',
      'payment needs to be', 'payment need to be', 'requires payment', 'require payment',
      'payment requirements outstanding', 'payment requirements pending',
      
      // Duty/duties with obligation verbs
      'duty due', 'duty owed', 'duty required', 'duty must',
      'duty needs to be paid', 'duty requires payment',
      'duties due', 'duties owed', 'duties required', 'duties must',
      'duties need to be paid', 'duties require payment',
      'duties and taxes due', 'duties and taxes are due',
      
      // Tax with obligation verbs
      'tax due', 'tax owed', 'tax required', 'tax must',
      'tax needs to be paid', 'tax requires payment',
      'taxes due', 'taxes owed', 'taxes required', 'taxes must',
      'taxes need to be paid', 'taxes require payment',
      'taxes and duties due', 'taxes and duties are due',
      
      // Action required phrases
      'need to pay', 'needs to pay', 'must pay', 'must be paid', 'need to be paid', 'needs to be paid',
      
      // Brokerage specific
      'brokerage due', 'brokerage fees due', 'brokerage owed', 'brokerage requires payment'
    ];
    
    // Check if description contains any payment-obligation phrase
    return paymentObligationPhrases.some(phrase => description.includes(phrase));
  }
  return false;
}

/**
 * Track a package using the UPS API
 * @param trackingNumber - The UPS tracking number
 * @returns Standardized tracking result
 */
export async function trackPackage(trackingNumber: string): Promise<TrackingResult> {
  if (!trackingNumber) {
    throw new Error('Tracking number is required');
  }

  if (!UPS_API_BASE_URL) {
    throw new Error('UPS API base URL not configured. Set UPS_API_BASE_URL environment variable.');
  }

  try {
    // Get access token
    const token = await getAccessToken();

    // Make sure the URL is correctly formatted
    // Based on the UPS documentation, the endpoint should be /api/track/v1/details/
    const trackingUrl = UPS_API_BASE_URL.endsWith('/') 
      ? `${UPS_API_BASE_URL}api/track/v1/details/${trackingNumber}`
      : `${UPS_API_BASE_URL}/api/track/v1/details/${trackingNumber}`;
    
    console.log(`Requesting tracking data from: ${trackingUrl}`);
    
    // Make tracking request with the headers from the UPS documentation
    const response = await fetch(`${trackingUrl}?locale=en_US&returnSignature=false&returnMilestones=false`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-merchant-id': UPS_CLIENT_ID!,
        'transId': Date.now().toString(),
        'transactionSrc': 'moogship'
      }
    });

    // Only log errors, not all responses
    const responseText = await response.text();
    if (!response.ok) {
      console.log(`UPS tracking response status: ${response.status}`);
      console.log(`UPS tracking response body: ${responseText}`);
    }
    
    // Parse the response if it's JSON, or use the text version for error reporting
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse UPS response as JSON:', e);
    }

    if (!response.ok) {
      console.error(`UPS tracking error (${response.status}):`, responseText);
      
      // Handle different error types
      if (response.status === 404) {
        return {
          trackingNumber,
          carrier: 'UPS',
          status: 'NOT_FOUND',
          statusDescription: 'Tracking information not found',
          statusTime: new Date().toISOString(),
          error: 'Tracking number not found in UPS system'
        };
      } else if (response.status === 401) {
        // Authentication error
        let errorMessage = 'UPS API authentication failed';
        
        try {
          // Try to parse the error response for more details
          if (data?.response?.errors?.[0]?.message) {
            errorMessage = `UPS API error: ${data.response.errors[0].message}`;
          }
        } catch (e) {
          // If accessing parsed JSON fails, use the default message
          console.error('Failed to extract error details from UPS response:', e);
        }
        
        return {
          trackingNumber,
          carrier: 'UPS',
          status: 'ERROR',
          statusDescription: 'Authentication error with UPS API',
          statusTime: new Date().toISOString(),
          error: errorMessage
        };
      }
      
      throw new Error(`UPS tracking request failed: ${response.status} ${response.statusText}`);
    }
    
    // Extract the relevant tracking information
    const shipment = data.trackResponse?.shipment?.[0];
    
    // Check for warnings in the response (like "Tracking Information Not Found")
    if (shipment?.warnings?.length > 0) {
      const warning = shipment.warnings[0];
      return {
        trackingNumber,
        carrier: 'UPS',
        status: 'NOT_FOUND',
        statusDescription: warning.message || 'Tracking information not found',
        statusTime: new Date().toISOString(),
        error: `UPS API warning: ${warning.code} - ${warning.message}`
      };
    }
    
    const trackDetail = shipment?.package?.[0];
    
    if (!trackDetail) {
      return {
        trackingNumber,
        carrier: 'UPS',
        status: 'UNKNOWN',
        statusDescription: 'No tracking details available',
        statusTime: new Date().toISOString(),
        error: 'No tracking details returned from UPS'
      };
    }

    // Get the current status from the correct path
    const activities = trackDetail.activity || [];
    const currentStatus = activities[0];
    const deliveryStatus = data.trackResponse?.shipment?.[0]?.package?.[0]?.activity?.[0]?.status?.description;
    
    // Format location if available
    let location = '';
    if (currentStatus?.location?.address) {
      const address = currentStatus.location.address;
      const parts = [
        address.city,
        address.stateProvince,
        address.countryCode
      ].filter(Boolean);
      location = parts.join(', ');
    }

    // Build events array if activity history is available
    const events = (trackDetail.activity || []).map((activity: any) => {
      let eventLocation = '';
      if (activity?.location?.address) {
        const address = activity.location.address;
        const parts = [
          address.city,
          address.stateProvince,
          address.countryCode
        ].filter(Boolean);
        eventLocation = parts.join(', ');
      }

      // Format timestamp from UPS date/time format
      let formattedTimestamp = '';
      if (activity.date && activity.time) {
        try {
          // UPS format: date="20250522" time="144100"
          const dateStr = activity.date;
          const timeStr = activity.time;
          const year = dateStr.substring(0, 4);
          const month = dateStr.substring(4, 6);
          const day = dateStr.substring(6, 8);
          const hour = timeStr.substring(0, 2);
          const minute = timeStr.substring(2, 4);
          const second = timeStr.substring(4, 6);
          
          formattedTimestamp = `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
        } catch (e) {
          formattedTimestamp = new Date().toISOString();
        }
      }

      return {
        timestamp: formattedTimestamp,
        status: activity.status?.description || '',
        location: eventLocation
      };
    });

    // Extract service information if available
    const serviceName = data.trackResponse?.shipment?.[0]?.service?.description;
    
    // Extract package information if available
    const packageInfo = trackDetail.packageWeight?.weight
      ? `${trackDetail.packageWeight.weight} ${trackDetail.packageWeight.unitOfMeasurement?.code || 'lbs'}`
      : undefined;

    // Extract delivery information
    const deliveryDate = trackDetail.deliveryDate?.[0]?.date;
    const deliveryTime = trackDetail.deliveryTime?.endTime;

    // Extract UPS status codes from the current activity
    const upsStatusCode = currentStatus?.status?.code || currentStatus?.status?.statusCode;
    const statusDescription = deliveryStatus || 'In Transit';
    
    // Check ALL activities for customs charges (not just current status)
    let customsChargesDue = false;
    let customsChargesDetails = '';
    
    if (activities && activities.length > 0) {
      for (const activity of activities) {
        const activityStatusType = activity?.status?.type;
        const activityStatusCode = activity?.status?.code || activity?.status?.statusCode;
        const activityDescription = activity?.status?.description || '';
        
        if (hasCustomsCharges(activityStatusType || '', activityDescription)) {
          customsChargesDue = true;
          customsChargesDetails = activityDescription;
          console.log(`[UPS CUSTOMS] Found customs charges in activity: Type="${activityStatusType}", Description="${activityDescription}"`);
          break; // Found one, that's enough
        }
      }
    }
    
    // Debug logging for customs charges detection
    if (upsStatusCode) {
      console.log(`[UPS DEBUG] Tracking ${trackingNumber}: Status Code="${upsStatusCode}", Description="${statusDescription}", CustomsCharges=${customsChargesDue}`);
    }
    
    // Use the normalize function to properly map UPS status
    const status = normalizeStatus(upsStatusCode || '', deliveryStatus || '');

    // Build standard response
    const result: TrackingResult = {
      trackingNumber,
      carrier: 'UPS',
      status,
      statusDescription,
      statusTime: currentStatus?.statusTime || new Date().toISOString(),
      location,
      estimatedDelivery: deliveryDate 
        ? `${deliveryDate}${deliveryTime ? ' ' + deliveryTime : ''}`
        : undefined,
      serviceName,
      packageWeight: packageInfo,
      events
    };

    // Add customs charges flag if detected
    if (customsChargesDue) {
      (result as any).customsChargesDue = true;
      (result as any).customsChargesDetails = customsChargesDetails;
      console.log(`[UPS TRACKING] Customs charges detected for ${trackingNumber}: ${customsChargesDetails}`);
    }

    return result;

  } catch (error) {
    console.error(`Error tracking UPS package ${trackingNumber}:`, error);
    return {
      trackingNumber,
      carrier: 'UPS',
      status: 'ERROR',
      statusDescription: 'Error retrieving tracking information',
      statusTime: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown tracking error'
    };
  }
}