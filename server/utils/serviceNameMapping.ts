/**
 * Utility function to convert raw service names to user-friendly display names
 * This ensures consistent service name display across transactions and UI
 */

export function getServiceDisplayName(rawServiceName: string): string {
  if (!rawServiceName || typeof rawServiceName !== 'string') {
    return rawServiceName || 'Unknown Service';
  }

  const normalizedServiceName = rawServiceName.toLowerCase().trim();
  
  // Map raw service names to display names - using consistent naming style
  const serviceNameMappings: Record<string, string> = {
    // Primary ECO services - use consistent "MoogShip ECO" style
    'shipentegra-eco-primary': 'MoogShip ECO',
    'shipentegra': 'MoogShip ECO', // When service is just "Shipentegra"
    
    // Fallback ECO services - standardized to match primary
    'shipentegra-widect': 'MoogShip ECO',
    
    // UK specific services
    'shipentegra-ingiltere-eko-plus': 'MoogShip UK ECO',
    
    // Express services
    'shipentegra-ups-express': 'MoogShip UPS Express',
    'afs-ups-express': 'MoogShip UPS Express',
    
    // FedEx services
    'shipentegra-fedex': 'MoogShip FedEx',
    
    // Standard services
    'shipentegra-worldwide-standard': 'MoogShip Worldwide Standard',
    
    // AFS Transport services - consistent naming
    'ecoafs': 'MoogShip ECO',
    'afs-gls-express': 'MoogShip GLS Express',
    
    // Aramex services
    'aramex-ppx': 'MoogShip Aramex Express',
    'aramex-ppx-0': 'MoogShip Aramex Express',
    'aramex-plx': 'MoogShip Aramex Letter',
    'aramex-plx-1': 'MoogShip Aramex Letter',
    'aramex-epx': 'MoogShip Aramex Economy',
    'aramex-epx-2': 'MoogShip Aramex Economy',
    'aramex-gdx': 'MoogShip Aramex Ground',
    'aramex-gdx-3': 'MoogShip Aramex Ground',
  };

  // First, try exact match
  if (serviceNameMappings[normalizedServiceName]) {
    return serviceNameMappings[normalizedServiceName];
  }

  // If no exact match, try pattern-based matching
  if (normalizedServiceName.includes('ups') && normalizedServiceName.includes('express')) {
    return 'MoogShip UPS Express';
  }
  
  if (normalizedServiceName.includes('fedex')) {
    return 'MoogShip FedEx';
  }
  
  if (normalizedServiceName.includes('worldwide') && normalizedServiceName.includes('standard')) {
    return 'MoogShip Worldwide Standard';
  }
  
  if (normalizedServiceName.includes('widect')) {
    return 'MoogShip ECO';
  }
  
  if (normalizedServiceName.includes('ingiltere') && normalizedServiceName.includes('eko')) {
    return 'MoogShip UK ECO';
  }
  
  if (normalizedServiceName.includes('gls') && normalizedServiceName.includes('express')) {
    return 'MoogShip GLS Express';
  }
  
  if (normalizedServiceName.includes('aramex')) {
    if (normalizedServiceName.includes('ppx')) return 'MoogShip Aramex Express';
    if (normalizedServiceName.includes('plx')) return 'MoogShip Aramex Letter';
    if (normalizedServiceName.includes('epx')) return 'MoogShip Aramex Economy';
    if (normalizedServiceName.includes('gdx')) return 'MoogShip Aramex Ground';
    return 'MoogShip Aramex';
  }
  
  if (normalizedServiceName.includes('eco') || normalizedServiceName === 'shipentegra') {
    return 'MoogShip ECO';
  }
  
  if (normalizedServiceName.includes('express')) {
    return 'MoogShip Express';
  }
  
  if (normalizedServiceName.includes('standard')) {
    return 'MoogShip Standard';
  }

  // If no pattern matches, provide a safe fallback to avoid exposing raw service names
  // Default to MoogShip ECO for unknown services to maintain consistency
  console.warn(`Unknown service name: ${rawServiceName}, defaulting to MoogShip ECO`);
  return 'MoogShip ECO';
}

/**
 * Helper function to determine if a service name should be shown as raw or display name
 * Returns display name for user-facing contexts, raw name for debugging
 */
export function formatServiceNameForContext(rawServiceName: string, context: 'user' | 'debug' = 'user'): string {
  if (context === 'debug') {
    return rawServiceName;
  }
  
  return getServiceDisplayName(rawServiceName);
}