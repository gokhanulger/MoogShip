/**
 * Generic shipping provider system
 * Supports multiple providers (ShipEntegra, DHL, FedEx, Aramex, etc.) with dynamic service mapping
 */

export interface ShippingProvider {
  name: string;
  displayName: string;
  getSupportedServices(): Promise<ServiceOption[]>;
  purchaseLabel(shipment: any, serviceCode: string): Promise<LabelResult>;
  calculatePrice(packageData: any): Promise<PriceResult>;
}

export interface ServiceOption {
  code: string; // Provider's internal service code (e.g., "shipentegra-amerika-eko-plus")
  name: string; // Display name (e.g., "ShipEntegra Amerika Eko Plus")
  type: string; // Service type (e.g., "EXPRESS", "ECO")
  price: number; // Price in cents
  estimatedDays: number;
}

export interface LabelResult {
  success: boolean;
  labelUrl?: string;
  labelPdf?: string | null;
  trackingNumber?: string;
  error?: string;
}

export interface PriceResult {
  success: boolean;
  options: ServiceOption[];
  error?: string;
}

/**
 * ShipEntegra provider implementation
 */
export class ShipEntegraProvider implements ShippingProvider {
  name = 'shipentegra';
  displayName = 'ShipEntegra';

  async getSupportedServices(): Promise<ServiceOption[]> {
    // This would typically come from a database or config
    return [
      { code: 'shipentegra-eco', name: 'ShipEntegra Eco', type: 'ECO', price: 0, estimatedDays: 7 },
      { code: 'shipentegra-express', name: 'ShipEntegra Express', type: 'EXPRESS', price: 0, estimatedDays: 3 },
      { code: 'shipentegra-ups-ekspress', name: 'ShipEntegra Ups Express', type: 'EXPRESS', price: 0, estimatedDays: 3 },
      { code: 'shipentegra-ups-standart', name: 'ShipEntegra Ups Standard', type: 'STANDARD', price: 0, estimatedDays: 5 },
      { code: 'shipentegra-widect', name: 'ShipEntegra Widect', type: 'ECO', price: 0, estimatedDays: 7 },
      { code: 'shipentegra-amerika-eko-plus', name: 'ShipEntegra Amerika Eko Plus', type: 'EXPRESS', price: 0, estimatedDays: 4 },
      { code: 'shipentegra-international-express', name: 'ShipEntegra International Express', type: 'EXPRESS', price: 0, estimatedDays: 2 },
      { code: 'shipentegra-worldwide-standard', name: 'ShipEntegra Worldwide Standard', type: 'STANDARD', price: 0, estimatedDays: 6 },
      { code: 'shipentegra-ingiltere-eko-plus', name: 'ShipEntegra Ingiltere Eko Plus', type: 'EXPRESS', price: 0, estimatedDays: 4 },
    ];
  }

  async calculatePrice(packageData: any): Promise<PriceResult> {
    try {
      // Return default pricing options for ShipEntegra provider
      return {
        success: true,
        options: [
          {
            code: "shipentegra-eco",
            name: "MoogShip Eco",
            type: "ECO",
            price: 2000,
            estimatedDays: 7
          },
          {
            code: "shipentegra-ups-ekspress",
            name: "MoogShip UPS Express",
            type: "EXPRESS",
            price: 3500,
            estimatedDays: 3
          },
          {
            code: "shipentegra-widect",
            name: "MoogShip Standard",
            type: "STANDARD",
            price: 2500,
            estimatedDays: 5
          }
        ]
      };
    } catch (error: any) {
      return { success: false, options: [], error: error.message };
    }
  }

  async purchaseLabel(shipment: any, serviceCode: string): Promise<LabelResult> {
    try {
      // Use the new sample implementation that matches the working code format
      const { createShipentegraOrderAndLabelSample } = await import('./shipentegra-sample');
      
      const result = await createShipentegraOrderAndLabelSample(shipment);
      
      if (result.success) {
        return {
          success: true,
          labelUrl: result.labelUrl,
          labelPdf: result.labelPdf || undefined,
          trackingNumber: result.trackingNumber
        };
      }

      return { success: false, error: result.message };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private getServiceCodeFromName(serviceName: string): string {
    const nameLower = serviceName.toLowerCase();
    
    if (nameLower.includes('amerika eko plus')) return 'shipentegra-amerika-eko-plus';
    if (nameLower.includes('international express')) return 'shipentegra-international-express';
    if (nameLower.includes('ingiltere eko plus')) return 'shipentegra-ingiltere-eko-plus';
    if (nameLower.includes('worldwide standard')) return 'shipentegra-worldwide-standard';
    if (nameLower.includes('ups express')) return 'shipentegra-ups-ekspress';
    if (nameLower.includes('ups standard')) return 'shipentegra-ups-standart';
    if (nameLower.includes('widect')) return 'shipentegra-widect';
    if (nameLower.includes('express') && !nameLower.includes('ups')) return 'shipentegra-express';
    if (nameLower.includes('eco')) return 'shipentegra-eco';
    
    return 'shipentegra-ups-ekspress'; // Default fallback
  }

  private getEstimatedDays(serviceType: string): number {
    switch (serviceType.toUpperCase()) {
      case 'EXPRESS': return 3;
      case 'ECO': return 7;
      case 'STANDARD': return 5;
      default: return 5;
    }
  }
}

/**
 * DHL provider implementation
 * NOTE: DHL is available for TRACKING ONLY. Pricing and label generation
 * should be done through ShipEntegra which handles DHL shipments.
 */
export class DHLProvider implements ShippingProvider {
  name = 'dhl';
  displayName = 'DHL';

  async getSupportedServices(): Promise<ServiceOption[]> {
    // DHL services are handled through ShipEntegra, return empty for direct DHL
    return [];
  }

  async calculatePrice(packageData: any): Promise<PriceResult> {
    // DHL pricing is handled through ShipEntegra integration
    return {
      success: false,
      options: [],
      error: 'DHL pricing is handled through ShipEntegra. Use ShipEntegra for DHL shipments.'
    };
  }

  async purchaseLabel(shipment: any, serviceCode: string): Promise<LabelResult> {
    // DHL labels are generated through ShipEntegra
    return {
      success: false,
      error: 'DHL labels are generated through ShipEntegra. Use ShipEntegra for DHL shipments.'
    };
  }
}

/**
 * FedEx provider implementation
 * NOTE: FedEx is available for TRACKING and ADDRESS VALIDATION.
 * Pricing and label generation should be done through ShipEntegra.
 */
export class FedExProvider implements ShippingProvider {
  name = 'fedex';
  displayName = 'FedEx';

  async getSupportedServices(): Promise<ServiceOption[]> {
    // FedEx services are handled through ShipEntegra, return empty for direct FedEx
    return [];
  }

  async calculatePrice(packageData: any): Promise<PriceResult> {
    // FedEx pricing is handled through ShipEntegra integration
    return {
      success: false,
      options: [],
      error: 'FedEx pricing is handled through ShipEntegra. Use ShipEntegra for FedEx shipments.'
    };
  }

  async purchaseLabel(shipment: any, serviceCode: string): Promise<LabelResult> {
    // FedEx labels are generated through ShipEntegra
    return {
      success: false,
      error: 'FedEx labels are generated through ShipEntegra. Use ShipEntegra for FedEx shipments.'
    };
  }
}

/**
 * Aramex provider implementation
 */
export class AramexProvider implements ShippingProvider {
  name = 'aramex';
  displayName = 'Aramex';

  async getSupportedServices(): Promise<ServiceOption[]> {
    return [
      { code: 'aramex-ppx', name: 'Aramex Priority Parcel Express', type: 'EXPRESS', price: 0, estimatedDays: 2 },
      { code: 'aramex-plx', name: 'Aramex Priority Letter Express', type: 'EXPRESS', price: 0, estimatedDays: 2 },
      { code: 'aramex-epx', name: 'Aramex Economy Parcel Express', type: 'ECO', price: 0, estimatedDays: 7 },
      { code: 'aramex-gdx', name: 'Aramex Ground Express', type: 'STANDARD', price: 0, estimatedDays: 5 },
    ];
  }

  async calculatePrice(packageData: any): Promise<PriceResult> {
    try {
      const { calculateAramexRates } = await import('./aramex');
      
      const rates = await calculateAramexRates({
        originAddress: {
          city: packageData.senderCity || 'Istanbul',
          countryCode: packageData.senderCountryCode || 'TR',
          postalCode: packageData.senderPostalCode,
          address: packageData.senderAddress || packageData.senderAddress1,
        },
        destinationAddress: {
          city: packageData.receiverCity,
          countryCode: packageData.receiverCountryCode,
          postalCode: packageData.receiverPostalCode,
          address: packageData.receiverAddress || packageData.receiverAddress1,
        },
        weightKg: packageData.packageWeight,
        numberOfPieces: packageData.pieceCount || 1,
        dimensions: {
          length: packageData.packageLength || 1,
          width: packageData.packageWidth || 1,
          height: packageData.packageHeight || 1
        }
      });

      // Import currency conversion function
      const { convertTryToUsd } = await import('./aramex');

      const options: ServiceOption[] = [];
      
      for (const rate of rates) {
        // Convert TRY to USD if needed
        let priceInUsd = rate.amount;
        if (rate.currency === 'TRY') {
          priceInUsd = await convertTryToUsd(rate.amount);
        }

        options.push({
          code: `aramex-${rate.serviceCode.toLowerCase()}`,
          name: rate.serviceName,
          type: rate.serviceType,
          price: Math.round(priceInUsd * 100), // Convert to cents
          estimatedDays: rate.estimatedDays
        });
      }

      return {
        success: true,
        options
      };
    } catch (error: any) {
      console.error('Aramex pricing calculation failed:', error);
      return { 
        success: false, 
        options: [], 
        error: error.message || 'Failed to calculate Aramex rates'
      };
    }
  }

  async purchaseLabel(shipment: any, serviceCode: string): Promise<LabelResult> {
    try {
      const { createAramexShipment } = await import('./aramex');
      
      // Extract Aramex service code from full service code
      const aramexServiceCode = this.getAramexServiceCode(serviceCode);
      
      // Prepare Aramex shipment data
      const aramexShipmentData = {
        senderName: shipment.senderName || 'Default Sender',
        senderAddress: shipment.senderAddress || shipment.senderAddress1 || '',
        senderCity: shipment.senderCity || 'Istanbul',
        senderPostalCode: shipment.senderPostalCode || '34000',
        senderCountry: shipment.senderCountry || 'TR',
        senderPhone: shipment.senderPhone || '+90 000 000 0000',
        senderEmail: shipment.senderEmail || 'sender@example.com',
        
        receiverName: shipment.receiverName || 'Default Receiver',
        receiverAddress: shipment.receiverAddress || shipment.receiverAddress1 || '',
        receiverCity: shipment.receiverCity || '',
        receiverPostalCode: shipment.receiverPostalCode || '',
        receiverCountry: shipment.receiverCountry || '',
        receiverPhone: shipment.receiverPhone || '+1 000 000 0000',
        receiverEmail: shipment.receiverEmail || 'receiver@example.com',
        
        // Package details
        packageLength: shipment.packageLength || 1,
        packageWidth: shipment.packageWidth || 1,
        packageHeight: shipment.packageHeight || 1,
        packageWeight: shipment.packageWeight || 1,
        
        // Service and description
        serviceCode: aramexServiceCode,
        description: shipment.packageContents || 'Package contents',
        value: shipment.totalPrice ? (shipment.totalPrice / 100) : 100, // Convert from cents to dollars
        
        // Reference numbers
        reference1: `MoogShip-${shipment.id}`,
        reference2: shipment.trackingNumber || '',
        reference3: ''
      };
      
      console.log('🚀 ARAMEX PURCHASE LABEL: Calling createAramexShipment with data:', aramexShipmentData);
      
      const result = await createAramexShipment({
        shipment: aramexShipmentData,
        serviceCode: aramexServiceCode
      });
      
      console.log('🚀 ARAMEX PURCHASE LABEL: Result:', result);
      
      if (result.success) {
        console.log('🚀 ARAMEX PURCHASE LABEL: Processing successful result with labelPdf:', result.labelPdf ? `${result.labelPdf.length} chars` : 'empty');
        
        return {
          success: true,
          carrierLabelUrl: result.labelUrl,
          carrierLabelPdf: result.labelPdf || undefined,
          carrierTrackingNumber: result.trackingNumber
        };
      }
      
      return { success: false, error: result.error || 'Unknown error' };
    } catch (error: any) {
      console.error('🚀 ARAMEX PURCHASE LABEL: Error:', error);
      return { success: false, error: error.message };
    }
  }

  private getAramexServiceCode(serviceCode: string): string {
    // Extract service code from full service name
    if (serviceCode.includes('aramex-ppx') || serviceCode.includes('priority-parcel')) {
      return 'PPX';
    }
    if (serviceCode.includes('aramex-plx') || serviceCode.includes('priority-letter')) {
      return 'PLX';
    }
    if (serviceCode.includes('aramex-epx') || serviceCode.includes('economy-parcel')) {
      return 'EPX';
    }
    if (serviceCode.includes('aramex-gdx') || serviceCode.includes('ground-express')) {
      return 'GDX';
    }
    
    // Default to PPX (Priority Parcel Express) as per user requirements
    return 'PPX';
  }
}

/**
 * Provider Registry - manages all available shipping providers
 */
export class ProviderRegistry {
  private providers: Map<string, ShippingProvider> = new Map();

  constructor() {
    // Register all available providers
    this.registerProvider(new ShipEntegraProvider());
    this.registerProvider(new DHLProvider());
    this.registerProvider(new FedExProvider());
    this.registerProvider(new AramexProvider());
  }

  registerProvider(provider: ShippingProvider) {
    this.providers.set(provider.name, provider);
  }

  getProvider(name: string): ShippingProvider | null {
    return this.providers.get(name) || null;
  }

  getAllProviders(): ShippingProvider[] {
    return Array.from(this.providers.values());
  }

  async calculatePricesFromAllProviders(packageData: any): Promise<{
    provider: string;
    displayName: string;
    result: PriceResult;
  }[]> {
    const results = [];
    
    for (const provider of this.getAllProviders()) {
      try {
        const result = await provider.calculatePrice(packageData);
        results.push({
          provider: provider.name,
          displayName: provider.displayName,
          result
        });
      } catch (error: any) {
        results.push({
          provider: provider.name,
          displayName: provider.displayName,
          result: { success: false, options: [], error: error.message }
        });
      }
    }
    
    return results;
  }
}

// Export a singleton instance
export const providerRegistry = new ProviderRegistry();

/**
 * Generic label purchase function
 */
export async function purchaseLabel(shipment: any): Promise<LabelResult> {
  const provider = providerRegistry.getProvider(shipment.shippingProvider || 'shipentegra');
  
  if (!provider) {
    return { success: false, error: `Unsupported shipping provider: ${shipment.shippingProvider}` };
  }

  const serviceCode = shipment.providerServiceCode || shipment.selectedService;
  if (!serviceCode) {
    return { success: false, error: 'No service code specified for label purchase' };
  }

  console.log(`Purchasing label via ${provider.displayName} with service code: ${serviceCode}`);
  
  return await provider.purchaseLabel(shipment, serviceCode);
}

/**
 * Generic price calculation function
 */
export async function calculatePrices(packageData: any, providerName?: string): Promise<PriceResult> {
  const provider = providerRegistry.getProvider(providerName || 'shipentegra');
  
  if (!provider) {
    return { success: false, options: [], error: `Unsupported shipping provider: ${providerName}` };
  }

  return await provider.calculatePrice(packageData);
}