/**
 * DHL Tracking Service
 * 
 * This service handles DHL shipment tracking using the DHL API.
 * It provides similar functionality to the UPS tracking service.
 */

// DHL API configuration
const DHL_API_BASE_URL = process.env.DHL_API_BASE_URL || 'https://api-eu.dhl.com';
const DHL_API_KEY = process.env.DHL_API_KEY;

console.log('DHL API Configuration:');
console.log('- API Base URL:', DHL_API_BASE_URL);
console.log('- API Key provided:', !!DHL_API_KEY);

export interface DHLTrackingResult {
  trackingNumber: string;
  carrier: string;
  status: string;
  statusDescription: string;
  statusTime: string;
  location?: string;
  estimatedDelivery?: string;
  serviceName?: string;
  packageWeight?: string;
  events?: Array<{
    timestamp: string;
    status: string;
    location: string;
  }>;
  error?: string;
}

/**
 * Normalize DHL status codes to our internal status system
 */
function normalizeStatus(dhlStatusCode: string, dhlDescription: string = ''): string {
  const upperDescription = dhlDescription.toUpperCase();
  
  // Check for pre-transit states (label created but package not picked up)
  if (upperDescription.includes('ELECTRONIC NOTIFICATION RECEIVED') || 
      upperDescription.includes('SHIPMENT INFORMATION RECEIVED') ||
      upperDescription.includes('DATA RECEIVED') ||
      upperDescription.includes('SHIPMENT PREPARED')) {
    return 'PRE_TRANSIT';
  }
  
  // Check for delivery status
  if (upperDescription.includes('DELIVERED') || 
      upperDescription.includes('SUCCESSFUL DELIVERY')) {
    return 'DELIVERED';
  }
  
  if (upperDescription.includes('OUT FOR DELIVERY') || 
      upperDescription.includes('WITH DELIVERY COURIER')) {
    return 'OUT_FOR_DELIVERY';
  }
  
  // Check for actual in-transit indicators
  if (upperDescription.includes('IN TRANSIT') || 
      upperDescription.includes('PROCESSED AT') ||
      upperDescription.includes('DEPARTED FACILITY') ||
      upperDescription.includes('ARRIVED AT FACILITY') ||
      upperDescription.includes('SHIPMENT ON HOLD') ||
      upperDescription.includes('CUSTOMS CLEARED')) {
    return 'IN_TRANSIT';
  }
  
  // Check for pickup/origin events
  if (upperDescription.includes('PICKED UP') ||
      upperDescription.includes('COLLECTED') ||
      upperDescription.includes('SHIPMENT PICKED UP')) {
    return 'IN_TRANSIT';
  }
  
  // Map common DHL status codes
  const statusMap: { [key: string]: string } = {
    'pre-transit': 'PRE_TRANSIT',
    'transit': 'IN_TRANSIT',
    'delivered': 'DELIVERED',
    'exception': 'IN_TRANSIT', // Keep in transit for exceptions
    'unknown': 'PRE_TRANSIT'
  };

  // Check status code mapping
  const normalizedCode = dhlStatusCode.toLowerCase().replace(/[-_]/g, '-');
  if (statusMap[normalizedCode]) {
    return statusMap[normalizedCode];
  }

  // Default to PRE_TRANSIT for unknown statuses
  return 'PRE_TRANSIT';
}

/**
 * Track a DHL package using the DHL API
 */
async function trackPackage(trackingNumber: string): Promise<DHLTrackingResult> {
  if (!trackingNumber) {
    throw new Error('Tracking number is required');
  }

  if (!DHL_API_KEY) {
    console.error('DHL API key not configured. Set DHL_API_KEY environment variable.');
    return {
      trackingNumber,
      carrier: 'DHL',
      status: 'ERROR',
      statusDescription: 'DHL API not configured',
      statusTime: new Date().toISOString(),
      error: 'DHL API key not configured'
    };
  }

  try {
    // DHL Tracking API endpoint
    const trackingUrl = `${DHL_API_BASE_URL}/track/shipments`;
    
    console.log(`[DHL] Requesting tracking data for: ${trackingNumber}`);
    
    // Make tracking request
    const response = await fetch(`${trackingUrl}?trackingNumber=${encodeURIComponent(trackingNumber)}`, {
      method: 'GET',
      headers: {
        'DHL-API-Key': DHL_API_KEY,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      console.error(`[DHL] Tracking error (${response.status}):`, responseText);
      
      // Handle different error types
      if (response.status === 404) {
        return {
          trackingNumber,
          carrier: 'DHL',
          status: 'NOT_FOUND',
          statusDescription: 'Tracking information not found',
          statusTime: new Date().toISOString(),
          error: 'Tracking number not found in DHL system'
        };
      } else if (response.status === 401 || response.status === 403) {
        return {
          trackingNumber,
          carrier: 'DHL',
          status: 'ERROR',
          statusDescription: 'Authentication error with DHL API',
          statusTime: new Date().toISOString(),
          error: 'DHL API authentication failed'
        };
      }
      
      throw new Error(`DHL tracking request failed: ${response.status} ${response.statusText}`);
    }
    
    // Parse the response
    let data;
    try {
      data = JSON.parse(responseText);

    } catch (e) {
      console.error('[DHL] Failed to parse response as JSON:', e);
      throw new Error('Invalid response format from DHL API');
    }
    
    // Extract tracking information from DHL response
    const shipments = data.shipments || [];

    
    if (!shipments.length) {

      return {
        trackingNumber,
        carrier: 'DHL',
        status: 'NOT_FOUND',
        statusDescription: 'No tracking information available',
        statusTime: new Date().toISOString(),
        error: 'No shipment data returned from DHL'
      };
    }
    
    const shipment = shipments[0];
    const events = shipment.events || [];
    console.log(`[DHL] Shipment details:`, JSON.stringify(shipment, null, 2));
    console.log(`[DHL] Number of events: ${events.length}`);
    
    // Handle cases where there are no events but we have shipment status
    let latestEvent: any = null;
    let statusDescription = '';
    let dhlStatusCode = '';
    let statusTime = new Date().toISOString();
    
    console.log(`[DHL] Processing status for tracking number: ${trackingNumber}`);
    
    if (events.length > 0) {
      // Use the latest event if available
      latestEvent = events[0];
      statusDescription = latestEvent.description || latestEvent.statusCode || 'In Transit';
      dhlStatusCode = latestEvent.statusCode || '';
      statusTime = latestEvent.timestamp || new Date().toISOString();
      console.log(`[DHL] Using event data - Status: ${dhlStatusCode}, Description: ${statusDescription}`);
    } else if (shipment.status && shipment.status.statusCode) {
      // Use shipment status if no events
      dhlStatusCode = shipment.status.statusCode || '';
      statusDescription = shipment.status.description || dhlStatusCode || 'Pre-transit';
      statusTime = shipment.status.timestamp || new Date().toISOString();
      console.log(`[DHL] Using shipment status - Status: ${dhlStatusCode}, Description: ${statusDescription}`);
    } else {
      // If we have no events and no explicit status, but we have shipment data, treat as pre-transit
      dhlStatusCode = 'pre-transit';
      statusDescription = 'Shipment information received';
      statusTime = new Date().toISOString();
      console.log(`[DHL] Using fallback status - Status: ${dhlStatusCode}, Description: ${statusDescription}`);
    }
    
    // Format location if available
    let location = '';
    if (latestEvent?.location) {
      const locationParts = [
        latestEvent.location.address?.addressLocality,
        latestEvent.location.address?.addressRegion,
        latestEvent.location.address?.countryCode
      ].filter(Boolean);
      location = locationParts.join(', ');
    }

    // Build events array
    const formattedEvents = events.map((event: any) => {
      let eventLocation = '';
      if (event.location?.address) {
        const locationParts = [
          event.location.address.addressLocality,
          event.location.address.addressRegion,
          event.location.address.countryCode
        ].filter(Boolean);
        eventLocation = locationParts.join(', ');
      }

      return {
        timestamp: event.timestamp || new Date().toISOString(),
        status: event.description || event.statusCode || '',
        location: eventLocation
      };
    });

    // Extract service information
    const serviceName = shipment.service?.name || shipment.service?.product?.productName || shipment.service;
    
    // Extract package weight
    const packageWeight = shipment.details?.weight?.value 
      ? `${shipment.details.weight.value} ${shipment.details.weight.unitText || 'kg'}`
      : undefined;

    // Extract delivery information
    const estimatedDelivery = shipment.estimatedTimeOfDelivery || shipment.estimatedDeliveryTimeFrame?.estimatedFrom;

    // Normalize status based on DHL status code and description
    const status = normalizeStatus(dhlStatusCode, statusDescription);
    
    console.log(`[DHL] Final result for ${trackingNumber}:`);
    console.log(`[DHL] - Raw status code: ${dhlStatusCode}`);
    console.log(`[DHL] - Status description: ${statusDescription}`);
    console.log(`[DHL] - Normalized status: ${status}`);
    console.log(`[DHL] - Status time: ${statusTime}`);
    console.log(`[DHL] - Service name: ${serviceName}`);

    // Build response
    return {
      trackingNumber,
      carrier: 'DHL',
      status,
      statusDescription,
      statusTime,
      location,
      estimatedDelivery,
      serviceName,
      packageWeight,
      events: formattedEvents
    };

  } catch (error) {
    console.error(`Error tracking DHL package ${trackingNumber}:`, error);
    return {
      trackingNumber,
      carrier: 'DHL',
      status: 'ERROR',
      statusDescription: 'Error retrieving tracking information',
      statusTime: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown tracking error'
    };
  }
}

export { trackPackage, normalizeStatus };