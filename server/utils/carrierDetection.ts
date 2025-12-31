/**
 * Carrier Detection Utility
 * 
 * Provides utilities for detecting carriers based on tracking number formats
 * and managing carrier-specific tracking operations.
 */

export type CarrierType = 'UPS' | 'DHL' | 'FEDEX' | 'AFS' | 'GLS' | 'ROYAL' | 'UNKNOWN';

/**
 * Detect carrier based on tracking number format
 */
export function detectCarrier(trackingNumber: string): CarrierType {
  if (!trackingNumber) return 'UNKNOWN';
  
  const cleanTrackingNumber = trackingNumber.trim().toUpperCase();
  
  // UPS tracking numbers start with "1Z" followed by 16 more characters
  if (/^1Z[A-Z0-9]{16}$/i.test(cleanTrackingNumber)) {
    return 'UPS';
  }
  
  // AFS Transport tracking numbers (internal barkod format)
  // Check for MoogShip/AFS patterns first before broader DHL patterns
  // - MGS followed by numbers/letters (MoogShip internal format)
  // - MGS_ followed by numbers/letters (alternative format)  
  // - Pure numeric codes (6-8 digits for AFS barkod - short format only)
  // - Tracking numbers starting with "003" (AFS Transport format)
  if (/^MGS[_]?[A-Z0-9]+$/i.test(cleanTrackingNumber) || 
      /^\d{6,8}$/.test(cleanTrackingNumber) ||
      /^003\d{11,14}$/.test(cleanTrackingNumber)) {
    return 'AFS';
  }
  
  // Royal Mail tracking numbers: 13 chars, 2 letters + 9 digits + GB (e.g., AB123456789GB)
  if (/^[A-Z]{2}\d{9}GB$/i.test(cleanTrackingNumber)) {
    return 'ROYAL';
  }
  
  // FedEx tracking numbers: 12, 15, or 20-digit numeric
  // Check FedEx patterns before GLS since they might overlap
  if (/^\d{12}$/.test(cleanTrackingNumber) || /^\d{15}$/.test(cleanTrackingNumber) || /^\d{20}$/.test(cleanTrackingNumber)) {
    return 'FEDEX';
  }
  
  // GLS tracking numbers: typically 11-15 digit numeric codes
  // Common patterns: 10-15 digits, often starting with specific ranges
  // GLS Germany: often 11-12 digits
  // GLS Europe: can be 10-15 digits
  if (/^\d{10,15}$/.test(cleanTrackingNumber) && 
      (cleanTrackingNumber.length === 11 || cleanTrackingNumber.length === 12 || 
       cleanTrackingNumber.startsWith('50') || cleanTrackingNumber.startsWith('59'))) {
    return 'GLS';
  }
  
  // DHL tracking numbers have specific formats:
  // - 10-30 digit numeric (DHL Express and eCommerce including very long format)
  // - Starting with specific DHL prefixes (like GM, RX, etc.)
  // - Includes both short and long numeric DHL tracking numbers
  // - EXCLUDE numbers starting with "003" (those are AFS Transport)
  // - EXCLUDE GLS patterns (10-15 digits starting with certain patterns)
  if ((/^\d{16,30}$/.test(cleanTrackingNumber) && !cleanTrackingNumber.startsWith('003')) || 
      /^(GM|RX|JV|CV|TV|JX)[A-Z0-9]{7,12}$/i.test(cleanTrackingNumber) ||
      (/^\d{13,15}$/.test(cleanTrackingNumber) && !cleanTrackingNumber.startsWith('50') && !cleanTrackingNumber.startsWith('59'))) {
    return 'DHL';
  }
  
  return 'UNKNOWN';
}

/**
 * Get the appropriate tracking service for a carrier
 */
export async function getTrackingService(carrier: CarrierType) {
  switch (carrier) {
    case 'UPS':
      return await import('../services/ups.js');
    case 'DHL':
      return await import('../services/dhl.js');
    case 'AFS':
      return await import('../services/afstransport.js');
    case 'GLS':
      return await import('../services/gls.js');
    case 'FEDEX':
      return await import('../services/fedex.js');
    case 'ROYAL':
      // Royal Mail tracking handled via external API or manual tracking
      throw new Error('Royal Mail tracking requires manual processing');
    default:
      throw new Error(`Unsupported carrier: ${carrier}`);
  }
}

/**
 * Track a package with automatic carrier detection
 */
export async function trackPackageWithAutoDetection(trackingNumber: string) {
  const carrier = detectCarrier(trackingNumber);
  
  if (carrier === 'UNKNOWN') {
    throw new Error(`Unable to determine carrier for tracking number: ${trackingNumber}`);
  }
  
  const trackingService = await getTrackingService(carrier);
  
  // Different services have different tracking function names
  if (carrier === 'AFS') {
    return await (trackingService as any).trackAFS(trackingNumber);
  } else {
    return await (trackingService as any).trackPackage(trackingNumber);
  }
}

/**
 * Get carrier-specific tracking URL for frontend display
 */
export function getCarrierTrackingUrl(trackingNumber: string, carrier?: CarrierType): string {
  const detectedCarrier = carrier || detectCarrier(trackingNumber);
  
  switch (detectedCarrier) {
    case 'UPS':
      return `https://www.ups.com/track?loc=en_US&tracknum=${trackingNumber}`;
    case 'DHL':
      return `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${trackingNumber}`;
    case 'AFS':
      return `/takip?q=${trackingNumber}`; // AFS tracking handled by MoogShip tracking
    case 'GLS':
      return `https://gls-group.eu/GROUP/en/shipment-tracking?match=${trackingNumber}`;
    case 'FEDEX':
      return `https://www.fedex.com/apps/fedextrack/?tracknumbers=${trackingNumber}`;
    case 'ROYAL':
      return `https://www.royalmail.com/track-your-item#/details/${trackingNumber}`;
    default:
      return `/takip?q=${trackingNumber}`; // Fallback to MoogShip tracking
  }
}