export interface AddressSuggestion {
  id: string;
  address: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  countryCode: string;
  formatted: string;
  confidence: number;
}

export interface AddressVerificationService {
  searchAddresses(query: string, countryCode?: string): Promise<AddressSuggestion[]>;
  verifyAddress(address: string, city: string, state: string, postalCode: string, countryCode: string): Promise<AddressSuggestion | null>;
}

// Using HERE Geocoding API as it provides good global coverage and free tier
class HereAddressService implements AddressVerificationService {
  private apiKey: string;
  private baseUrl = 'https://geocode.search.hereapi.com/v1';

  constructor() {
    // In production, this should come from environment variables
    this.apiKey = import.meta.env.VITE_HERE_API_KEY || '';
  }

  async searchAddresses(query: string, countryCode?: string): Promise<AddressSuggestion[]> {
    if (!this.apiKey) {
      console.warn('HERE API key not configured, using fallback service');
      return this.fallbackAddressSearch(query, countryCode);
    }

    if (!query || query.length < 3) {
      return [];
    }

    try {
      const params = new URLSearchParams({
        q: query,
        apiKey: this.apiKey,
        limit: '8',
        types: 'houseNumber,street,city'
      });

      if (countryCode) {
        params.append('in', `countryCode:${countryCode}`);
      }

      const response = await fetch(`${this.baseUrl}/geocode?${params}`);
      
      if (!response.ok) {
        throw new Error(`HERE API error: ${response.status}`);
      }

      const data = await response.json();
      
      return this.transformHereResults(data.items || []);
    } catch (error) {
      console.error('Address search error:', error);
      return this.fallbackAddressSearch(query, countryCode);
    }
  }

  async verifyAddress(address: string, city: string, state: string, postalCode: string, countryCode: string): Promise<AddressSuggestion | null> {
    const fullAddress = `${address}, ${city}${state ? `, ${state}` : ''}, ${postalCode}, ${countryCode}`;
    const results = await this.searchAddresses(fullAddress, countryCode);
    
    return results.length > 0 ? results[0] : null;
  }

  private transformHereResults(items: any[]): AddressSuggestion[] {
    return items.map((item, index) => {
      const address = item.address || {};
      const houseNumber = address.houseNumber || '';
      const street = address.street || '';
      const fullAddress = `${houseNumber} ${street}`.trim();

      return {
        id: item.id || `here-${index}`,
        address: fullAddress || address.label || '',
        city: address.city || address.district || '',
        state: address.state || address.county || '',
        postalCode: address.postalCode || '',
        country: address.countryName || '',
        countryCode: address.countryCode || '',
        formatted: item.title || address.label || fullAddress,
        confidence: item.scoring?.queryScore || 0.5
      };
    }).filter(suggestion => suggestion.address || suggestion.city);
  }

  // Fallback service using basic pattern matching for common address formats
  private fallbackAddressSearch(query: string, countryCode?: string): Promise<AddressSuggestion[]> {
    return new Promise((resolve) => {
      // Simple pattern-based suggestions for common address formats
      const suggestions: AddressSuggestion[] = [];
      
      // If query looks like a street address, suggest some common formats
      if (/^\d+/.test(query)) {
        const baseAddress = query.trim();
        const commonSuffixes = ['St', 'Ave', 'Rd', 'Blvd', 'Dr', 'Ln', 'Way'];
        
        commonSuffixes.forEach((suffix, index) => {
          if (!baseAddress.toLowerCase().includes(suffix.toLowerCase())) {
            suggestions.push({
              id: `fallback-${index}`,
              address: `${baseAddress} ${suffix}`,
              city: '',
              state: '',
              postalCode: '',
              country: '',
              countryCode: countryCode || '',
              formatted: `${baseAddress} ${suffix}`,
              confidence: 0.3
            });
          }
        });
      }

      // Simulate async behavior
      setTimeout(() => resolve(suggestions.slice(0, 5)), 100);
    });
  }
}

// Nominatim (OpenStreetMap) as a completely free alternative
class NominatimAddressService implements AddressVerificationService {
  private baseUrl = 'https://nominatim.openstreetmap.org';

  async searchAddresses(query: string, countryCode?: string): Promise<AddressSuggestion[]> {
    if (!query || query.length < 3) {
      return [];
    }

    try {
      const params = new URLSearchParams({
        q: query,
        format: 'json',
        addressdetails: '1',
        limit: '8',
        'accept-language': 'en'
      });

      if (countryCode) {
        params.append('countrycodes', countryCode.toLowerCase());
      }

      const response = await fetch(`${this.baseUrl}/search?${params}`, {
        headers: {
          'User-Agent': 'MoogShip-AddressVerification/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`Nominatim API error: ${response.status}`);
      }

      const data = await response.json();
      return this.transformNominatimResults(data);
    } catch (error) {
      console.error('Nominatim address search error:', error);
      return [];
    }
  }

  async verifyAddress(address: string, city: string, state: string, postalCode: string, countryCode: string): Promise<AddressSuggestion | null> {
    const fullAddress = `${address}, ${city}${state ? `, ${state}` : ''}, ${postalCode}, ${countryCode}`;
    const results = await this.searchAddresses(fullAddress, countryCode);
    
    return results.length > 0 ? results[0] : null;
  }

  private transformNominatimResults(items: any[]): AddressSuggestion[] {
    return items.map((item, index) => {
      const address = item.address || {};
      const houseNumber = address.house_number || '';
      const street = address.road || address.street || '';
      const fullAddress = `${houseNumber} ${street}`.trim();

      return {
        id: item.place_id?.toString() || `nominatim-${index}`,
        address: fullAddress || item.display_name?.split(',')[0] || '',
        city: address.city || address.town || address.village || address.municipality || '',
        state: address.state || address.province || address.region || '',
        postalCode: address.postcode || '',
        country: address.country || '',
        countryCode: address.country_code?.toUpperCase() || '',
        formatted: item.display_name || fullAddress,
        confidence: parseFloat(item.importance || '0.5')
      };
    }).filter(suggestion => suggestion.address || suggestion.city);
  }
}

// Factory function to get the appropriate service
export function createAddressVerificationService(): AddressVerificationService {
  // Try HERE first if API key is available, otherwise use Nominatim (free)
  const hereApiKey = import.meta.env.VITE_HERE_API_KEY;
  
  if (hereApiKey) {
    return new HereAddressService();
  } else {
    return new NominatimAddressService();
  }
}

export const addressVerificationService = createAddressVerificationService();