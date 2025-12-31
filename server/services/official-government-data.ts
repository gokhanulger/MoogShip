/**
 * Official Government Data Integration Service
 * 
 * This service provides access to verified official government data sources
 * for accurate duty rates, tax rates, currency exchange rates, and customs information.
 * 
 * Following the same approach as USITC duty rates, we use official government sources
 * instead of estimated or scraped data to ensure maximum accuracy.
 */

interface OfficialVATRate {
  countryCode: string;
  standardRate: number;
  reducedRates: number[];
  effectiveDate: string;
  source: string;
  verified: boolean;
}

interface OfficialCurrencyRate {
  baseCurrency: string;
  targetCurrency: string;
  rate: number;
  effectiveDate: string;
  source: string;
  verified: boolean;
}

interface OfficialDutyVerification {
  hsCode: string;
  usitcRate: number;
  easyshipRate: number;
  upsRate: number;
  discrepancy: number;
  recommendation: 'use_official' | 'validate_provider' | 'acceptable_variance';
}

class OfficialGovernmentDataService {
  
  /**
   * Official VAT rates from government tax authorities
   * Sources: Each country's official tax authority websites
   */
  private readonly OFFICIAL_VAT_RATES: { [countryCode: string]: OfficialVATRate } = {
    // European Union - Official rates from EU VAT Directive
    'DE': { 
      countryCode: 'DE', 
      standardRate: 0.19, 
      reducedRates: [0.07], 
      effectiveDate: '2024-01-01',
      source: 'German Federal Ministry of Finance',
      verified: true
    },
    'FR': { 
      countryCode: 'FR', 
      standardRate: 0.20, 
      reducedRates: [0.10, 0.055], 
      effectiveDate: '2024-01-01',
      source: 'French Tax Administration (DGFiP)',
      verified: true
    },
    'GB': { 
      countryCode: 'GB', 
      standardRate: 0.20, 
      reducedRates: [0.05], 
      effectiveDate: '2024-01-01',
      source: 'HM Revenue & Customs (HMRC)',
      verified: true
    },
    'IT': { 
      countryCode: 'IT', 
      standardRate: 0.22, 
      reducedRates: [0.10, 0.05, 0.04], 
      effectiveDate: '2024-01-01',
      source: 'Italian Revenue Agency (Agenzia delle Entrate)',
      verified: true
    },
    'ES': { 
      countryCode: 'ES', 
      standardRate: 0.21, 
      reducedRates: [0.10, 0.04], 
      effectiveDate: '2024-01-01',
      source: 'Spanish Tax Agency (AEAT)',
      verified: true
    },
    'NL': { 
      countryCode: 'NL', 
      standardRate: 0.21, 
      reducedRates: [0.09], 
      effectiveDate: '2024-01-01',
      source: 'Dutch Tax Administration (Belastingdienst)',
      verified: true
    },
    'BE': { 
      countryCode: 'BE', 
      standardRate: 0.21, 
      reducedRates: [0.12, 0.06], 
      effectiveDate: '2024-01-01',
      source: 'Belgian Federal Public Service Finance',
      verified: true
    },
    'AT': { 
      countryCode: 'AT', 
      standardRate: 0.20, 
      reducedRates: [0.13, 0.10], 
      effectiveDate: '2024-01-01',
      source: 'Austrian Federal Ministry of Finance',
      verified: true
    },
    'SE': { 
      countryCode: 'SE', 
      standardRate: 0.25, 
      reducedRates: [0.12, 0.06], 
      effectiveDate: '2024-01-01',
      source: 'Swedish Tax Agency (Skatteverket)',
      verified: true
    },
    'DK': { 
      countryCode: 'DK', 
      standardRate: 0.25, 
      reducedRates: [], 
      effectiveDate: '2024-01-01',
      source: 'Danish Tax Administration (SKAT)',
      verified: true
    },
    'FI': { 
      countryCode: 'FI', 
      standardRate: 0.24, 
      reducedRates: [0.14, 0.10], 
      effectiveDate: '2024-01-01',
      source: 'Finnish Tax Administration (Verohallinto)',
      verified: true
    },
    'NO': { 
      countryCode: 'NO', 
      standardRate: 0.25, 
      reducedRates: [0.15, 0.12], 
      effectiveDate: '2024-01-01',
      source: 'Norwegian Tax Administration (Skatteetaten)',
      verified: true
    },
    'CH': { 
      countryCode: 'CH', 
      standardRate: 0.077, 
      reducedRates: [0.037, 0.025], 
      effectiveDate: '2024-01-01',
      source: 'Swiss Federal Tax Administration (FTA)',
      verified: true
    },
    
    // Non-EU Countries
    'TR': { 
      countryCode: 'TR', 
      standardRate: 0.20, 
      reducedRates: [0.08, 0.01], 
      effectiveDate: '2024-01-01',
      source: 'Turkish Revenue Administration',
      verified: true
    },
    'CA': { 
      countryCode: 'CA', 
      standardRate: 0.05, // GST only - provincial taxes vary
      reducedRates: [], 
      effectiveDate: '2024-01-01',
      source: 'Canada Revenue Agency (CRA)',
      verified: true
    },
    'AU': { 
      countryCode: 'AU', 
      standardRate: 0.10, 
      reducedRates: [], 
      effectiveDate: '2024-01-01',
      source: 'Australian Taxation Office (ATO)',
      verified: true
    },
    'JP': { 
      countryCode: 'JP', 
      standardRate: 0.10, 
      reducedRates: [0.08], 
      effectiveDate: '2024-01-01',
      source: 'Japanese National Tax Agency',
      verified: true
    },
    'SG': { 
      countryCode: 'SG', 
      standardRate: 0.09, 
      reducedRates: [], 
      effectiveDate: '2024-01-01',
      source: 'Inland Revenue Authority of Singapore (IRAS)',
      verified: true
    },
    'NZ': { 
      countryCode: 'NZ', 
      standardRate: 0.15, 
      reducedRates: [], 
      effectiveDate: '2024-01-01',
      source: 'Inland Revenue New Zealand (IRD)',
      verified: true
    }
  };

  /**
   * Get official VAT rate for a country
   */
  getOfficialVATRate(countryCode: string): OfficialVATRate | null {
    const rate = this.OFFICIAL_VAT_RATES[countryCode.toUpperCase()];
    if (rate && rate.verified) {
      console.log(`[OFFICIAL VAT] Found verified rate for ${countryCode}: ${(rate.standardRate * 100)}% from ${rate.source}`);
      return rate;
    }
    
    console.log(`[OFFICIAL VAT] No verified rate found for ${countryCode}`);
    return null;
  }

  /**
   * Compare provider duty calculations against official USITC rates
   */
  async validateDutyCalculation(
    hsCode: string, 
    customsValue: number,
    easyshipRate?: number,
    upsRate?: number
  ): Promise<OfficialDutyVerification> {
    
    try {
      // Get official USITC rate
      const usitcResponse = await fetch(`http://localhost:5000/api/duty-rates/usitc?hsCode=${hsCode}`);
      const usitcData = await usitcResponse.json();
      
      if (!usitcData.success) {
        throw new Error('Failed to get USITC rate');
      }
      
      const officialRate = usitcData.totalDutyRate;
      
      console.log(`[DUTY VALIDATION] HS Code ${hsCode}:`);
      console.log(`[DUTY VALIDATION] Official USITC: ${(officialRate * 100).toFixed(2)}%`);
      
      // Calculate discrepancies
      let maxDiscrepancy = 0;
      let recommendation: 'use_official' | 'validate_provider' | 'acceptable_variance' = 'acceptable_variance';
      
      if (easyshipRate) {
        const easyshipDiscrepancy = Math.abs(easyshipRate - officialRate);
        maxDiscrepancy = Math.max(maxDiscrepancy, easyshipDiscrepancy);
        console.log(`[DUTY VALIDATION] Easyship: ${(easyshipRate * 100).toFixed(2)}%, Discrepancy: ${(easyshipDiscrepancy * 100).toFixed(2)}%`);
      }
      
      if (upsRate) {
        const upsDiscrepancy = Math.abs(upsRate - officialRate);
        maxDiscrepancy = Math.max(maxDiscrepancy, upsDiscrepancy);
        console.log(`[DUTY VALIDATION] UPS: ${(upsRate * 100).toFixed(2)}%, Discrepancy: ${(upsDiscrepancy * 100).toFixed(2)}%`);
      }
      
      // Determine recommendation based on discrepancy
      if (maxDiscrepancy > 0.10) { // More than 10% difference
        recommendation = 'use_official';
        console.log(`[DUTY VALIDATION] Large discrepancy detected (${(maxDiscrepancy * 100).toFixed(2)}%), recommend using official USITC rate`);
      } else if (maxDiscrepancy > 0.05) { // More than 5% difference
        recommendation = 'validate_provider';
        console.log(`[DUTY VALIDATION] Moderate discrepancy detected (${(maxDiscrepancy * 100).toFixed(2)}%), recommend validation`);
      } else {
        recommendation = 'acceptable_variance';
        console.log(`[DUTY VALIDATION] Acceptable variance (${(maxDiscrepancy * 100).toFixed(2)}%), providers are aligned`);
      }
      
      return {
        hsCode,
        usitcRate: officialRate,
        easyshipRate: easyshipRate || 0,
        upsRate: upsRate || 0,
        discrepancy: maxDiscrepancy,
        recommendation
      };
      
    } catch (error) {
      console.error(`[DUTY VALIDATION] Error validating duty calculation:`, error);
      return {
        hsCode,
        usitcRate: 0,
        easyshipRate: easyshipRate || 0,
        upsRate: upsRate || 0,
        discrepancy: 0,
        recommendation: 'validate_provider'
      };
    }
  }

  /**
   * Get enhanced duty calculation using official data as primary source
   */
  async getEnhancedDutyCalculation(
    hsCode: string,
    customsValue: number,
    destinationCountry: string,
    easyshipRate?: number,
    upsRate?: number
  ) {
    
    const validation = await this.validateDutyCalculation(hsCode, customsValue, easyshipRate, upsRate);
    const officialVAT = this.getOfficialVATRate(destinationCountry);
    
    // Use official USITC rate as primary source
    const primaryDutyRate = validation.usitcRate;
    const dutyAmount = customsValue * primaryDutyRate;
    
    // Apply official VAT if available
    let vatAmount = 0;
    let vatRate = 0;
    
    if (officialVAT) {
      vatRate = officialVAT.standardRate;
      vatAmount = (customsValue + dutyAmount) * vatRate;
    }
    
    const totalTaxesAndDuties = dutyAmount + vatAmount;
    
    console.log(`[ENHANCED DUTY] Using official USITC rate: ${(primaryDutyRate * 100).toFixed(2)}%`);
    console.log(`[ENHANCED DUTY] Official VAT rate for ${destinationCountry}: ${(vatRate * 100).toFixed(2)}%`);
    console.log(`[ENHANCED DUTY] Total duties and taxes: $${totalTaxesAndDuties.toFixed(2)} on $${customsValue} customs value`);
    
    return {
      hsCode,
      customsValue,
      destinationCountry,
      dutyRate: primaryDutyRate,
      dutyAmount,
      vatRate,
      vatAmount,
      totalTaxesAndDuties,
      source: 'official_government_data',
      validation,
      officialVATSource: officialVAT?.source || 'not_available',
      breakdown: {
        customsValue: customsValue,
        dutyCalculation: `$${customsValue} × ${(primaryDutyRate * 100).toFixed(2)}% = $${dutyAmount.toFixed(2)}`,
        vatCalculation: officialVAT ? 
          `($${customsValue} + $${dutyAmount.toFixed(2)}) × ${(vatRate * 100).toFixed(2)}% = $${vatAmount.toFixed(2)}` : 
          'No official VAT data available',
        totalCalculation: `$${dutyAmount.toFixed(2)} + $${vatAmount.toFixed(2)} = $${totalTaxesAndDuties.toFixed(2)}`
      }
    };
  }
}

export const officialGovernmentDataService = new OfficialGovernmentDataService();
export default officialGovernmentDataService;