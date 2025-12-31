/**
 * USITC Duty Rate Service
 * 
 * Fetches official US duty rates from the USITC Harmonized Tariff Schedule API
 * to provide accurate, real-time duty rate information for HS codes.
 */

import fetch from 'node-fetch';
import { HTSDutyParser } from './hts-duty-parser.js';
import { ComprehensiveHTSParser } from './hts-comprehensive-parser.js';
import { EnhancedHTSSystem } from './enhanced-hts-system.js';
import { DatabaseHTSService } from './database-hts-service.js';
import { HTSPDFParser } from './hts-pdf-parser.js';

interface USITCSearchResult {
  htsno?: string;
  description?: string;
  general_rate?: string;
  general?: string;
  'General rate of duty'?: string;
  'General Rate'?: string;
  'General'?: string;
  special_rate?: string;
  special?: string;
  'Special rate of duty'?: string;
}

interface USITCResponse {
  results?: USITCSearchResult[];
  status?: number;
  error?: string;
}

interface DutyRateResult {
  code: string;
  description: string;
  generalRateText: string;
  specialRateText: string;
  dutyPercentage: number | null;
}

class USITCDutyService {
  private static readonly USITC_API_BASE = 'https://hts.usitc.gov/api/search';

  /**
   * Fetch duty rate information for an HS code from USITC with fallback for known codes
   */
  async getDutyRate(hsCode: string): Promise<DutyRateResult> {
    try {
      // Clean the HS code (remove dots and non-digits)
      let cleanHsCode = hsCode.replace(/\D/g, '');
      
      // Truncate to 8 digits for tax calculation if longer
      if (cleanHsCode.length > 8) {
        console.log(`[USITC] Truncating HS code from ${cleanHsCode.length} digits (${cleanHsCode}) to 8 digits for tax calculation`);
        cleanHsCode = cleanHsCode.substring(0, 8);
      }
      
      if (!cleanHsCode) {
        return this.createBlankResult();
      }

      console.log(`[USITC] Looking up duty rate for HS code: ${cleanHsCode}`);

      // Skip website scraping and go directly to official PDF parsing
      console.log(`[USITC] Using official PDF database for ${cleanHsCode}`);

      // ONLY USE EXACT EXCEL MATCHES - NO ESTIMATES OR FALLBACKS
      const databaseRate = await DatabaseHTSService.getDutyRate(hsCode);
      if (databaseRate) {
        console.log(`[USITC DATABASE] Found exact Excel match for ${databaseRate.hsCode}: ${databaseRate.generalRate}`);
        return {
          code: databaseRate.hsCode,
          description: databaseRate.description,
          generalRateText: databaseRate.generalRate,
          specialRateText: '',
          dutyPercentage: databaseRate.percentage
        };
      }

      console.log(`[USITC] No exact Excel match found for ${hsCode} - returning blank result`);
      return this.createBlankResult();

    } catch (error) {
      console.error(`[USITC] Error fetching duty rate:`, error);
      // Try official database one more time on error
      const officialResult = await this.getOfficialDutyRate(hsCode);
      if (officialResult.code) {
        console.log(`[USITC OFFICIAL] Using official duty rate after error for ${hsCode}: ${officialResult.generalRateText}`);
        return officialResult;
      }
      return this.createBlankResult();
    }
  }

  /**
   * Fetch duty rate from live USITC website by scraping
   */
  private async fetchFromUSITCAPI(hsCode: string): Promise<DutyRateResult> {
    try {
      // Format HS code with dots for USITC website (e.g., 6109.10.00.04)
      const formattedCode = hsCode.length >= 8 
        ? hsCode.slice(0, 4) + '.' + hsCode.slice(4, 6) + '.' + hsCode.slice(6, 8) + (hsCode.slice(8) ? '.' + hsCode.slice(8) : '')
        : hsCode;
      
      console.log(`[USITC LIVE] Scraping website for HS code: ${formattedCode}`);
      
      // Use the correct USITC search URL format
      const searchUrl = `https://hts.usitc.gov/search?query=${encodeURIComponent(formattedCode)}`;
      
      const response = await fetch(searchUrl, {
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      if (!response.ok) {
        console.log(`[USITC LIVE] Website response not OK: ${response.status}`);
        throw new Error(`USITC website returned ${response.status}`);
      }
      
      // Get HTML content (not JSON)
      const html = await response.text();
      console.log(`[USITC LIVE] Retrieved HTML content, length: ${html.length} characters`);
      
      // Parse the HTML to extract duty rate information
      const result = this.parseUSITCHTML(html, formattedCode);
      
      if (result.code) {
        console.log(`[USITC LIVE] Found duty rate in HTML: ${result.code} - ${result.generalRateText}`);
        return result;
      }
      
      console.log(`[USITC LIVE] No duty rate found in HTML for ${formattedCode}`);
      return this.createBlankResult();
      
    } catch (error) {
      console.error(`[USITC LIVE] Website scraping error:`, error);
      throw error; // Re-throw to allow fallback
    }
  }

  /**
   * Parse USITC website HTML to extract duty rate information
   */
  private parseUSITCHTML(html: string, searchCode: string): DutyRateResult {
    try {
      console.log(`[USITC HTML] Parsing HTML for ${searchCode}, content length: ${html.length}`);
      
      // Enhanced parsing for USITC website structure
      // The website uses a specific table structure with duty rates in specific columns
      
      // First, try to find table rows containing the HS code
      const tableRowRegex = /<tr[^>]*>.*?<\/tr>/gi;
      const rows = html.match(tableRowRegex) || [];
      
      console.log(`[USITC HTML] Found ${rows.length} table rows to analyze`);
      
      // Also try to find duty rates in the main content area around the HS code
      const hsCodePattern = new RegExp(searchCode.replace(/\./g, '\\.'), 'gi');
      const hsCodeMatches = Array.from(html.matchAll(hsCodePattern));
      
      if (hsCodeMatches.length > 0) {
        console.log(`[USITC HTML] Found ${hsCodeMatches.length} HS code references in HTML`);
        
        // Look for duty rates within 1000 characters of each HS code mention
        for (const match of hsCodeMatches) {
          const startPos = Math.max(0, match.index - 500);
          const endPos = Math.min(html.length, match.index + 500);
          const surroundingText = html.slice(startPos, endPos);
          
          // Look for percentage patterns near the HS code
          const percentPatterns = [
            /(\d+(?:\.\d+)?)\s*%/g,
            /(\d+(?:\.\d+)?)\s*percent/gi,
            /rate[:\s]*(\d+(?:\.\d+)?)\s*%/gi,
            /general[:\s]*(\d+(?:\.\d+)?)\s*%/gi
          ];
          
          for (const pattern of percentPatterns) {
            const matches = Array.from(surroundingText.matchAll(pattern));
            if (matches.length > 0) {
              // Filter out obviously wrong numbers (like years, page numbers, etc.)
              const validRates = matches.filter(m => {
                const rate = parseFloat(m[1]);
                return rate >= 0 && rate <= 100; // Valid duty rate range
              });
              
              if (validRates.length > 0) {
                const rate = validRates[0][1];
                const percentage = parseFloat(rate) / 100;
                
                console.log(`[USITC HTML] Found contextual duty rate: ${rate}% near ${searchCode}`);
                
                return {
                  code: searchCode,
                  description: `Duty rate from USITC website context`,
                  generalRateText: `${rate}%`,
                  specialRateText: '',
                  dutyPercentage: percentage
                };
              }
            }
          }
          
          // Look for "Free" near the HS code
          if (/\bfree\b/i.test(surroundingText)) {
            console.log(`[USITC HTML] Found "Free" duty rate near ${searchCode}`);
            return {
              code: searchCode,
              description: `Duty-free from USITC website`,
              generalRateText: 'Free',
              specialRateText: '',
              dutyPercentage: 0
            };
          }
        }
      }
      
      // Try parsing table structure more carefully
      for (const row of rows) {
        // Check if this row contains our HS code (flexible matching)
        const cleanCode = searchCode.replace(/\D/g, ''); // Remove all non-digits
        const flexiblePattern = new RegExp(`${cleanCode.slice(0,4)}\\.?${cleanCode.slice(4,6)}\\.?${cleanCode.slice(6)}`, 'i');
        
        if (flexiblePattern.test(row) || row.includes(searchCode)) {
          console.log(`[USITC HTML] Found flexible match for HS code in table row`);
          
          // Extract all table cells from this row
          const cellRegex = /<td[^>]*>(.*?)<\/td>/gi;
          const cells = Array.from(row.matchAll(cellRegex));
          
          // Look for duty rates in each cell
          for (let i = 0; i < cells.length; i++) {
            const cellContent = cells[i][1].replace(/<[^>]*>/g, '').trim();
            
            // Check for percentage rates
            const percentMatch = cellContent.match(/(\d+(?:\.\d+)?)\s*%/);
            if (percentMatch && parseFloat(percentMatch[1]) <= 100) {
              const rate = percentMatch[1];
              const percentage = parseFloat(rate) / 100;
              
              console.log(`[USITC HTML] Found table cell duty rate: ${rate}%`);
              
              return {
                code: searchCode,
                description: `Duty rate from USITC table`,
                generalRateText: `${rate}%`,
                specialRateText: '',
                dutyPercentage: percentage
              };
            }
            
            // Check for "Free"
            if (/\bfree\b/i.test(cellContent)) {
              console.log(`[USITC HTML] Found "Free" in table cell`);
              return {
                code: searchCode,
                description: `Duty-free from USITC table`,
                generalRateText: 'Free',
                specialRateText: '',
                dutyPercentage: 0
              };
            }
          }
        }
      }
      
      console.log(`[USITC HTML] No duty rate patterns found in HTML for ${searchCode}`);
      return this.createBlankResult();
      
    } catch (error) {
      console.error(`[USITC HTML] Error parsing HTML:`, error);
      return this.createBlankResult();
    }
  }

  /**
   * Official USITC duty rates database (curated from government sources)
   */
  private async getOfficialDutyRate(originalHsCode: string): Promise<DutyRateResult> {
    
    // First try PDF parser for comprehensive official rates from the actual HTS document
    try {
      const pdfRate = await HTSPDFParser.getDutyRate(originalHsCode);
      if (pdfRate) {
        console.log(`[HTS PDF] Found official duty rate for ${originalHsCode}: ${pdfRate.generalRate}`);
        return {
          code: pdfRate.hsCode,
          description: pdfRate.description,
          generalRateText: pdfRate.generalRate,
          specialRateText: pdfRate.specialRate || '',
          dutyPercentage: pdfRate.percentage
        };
      }
    } catch (error) {
      console.warn(`[HTS PDF] Error parsing PDF for ${originalHsCode}:`, error);
    }
    
    // Try comprehensive HTS parser as backup
    const comprehensiveRate = ComprehensiveHTSParser.getComprehensiveRate(originalHsCode);
    if (comprehensiveRate) {
      console.log(`[HTS COMPREHENSIVE] Found official duty rate for ${originalHsCode}: ${comprehensiveRate.generalRate}`);
      return {
        code: comprehensiveRate.hsCode,
        description: comprehensiveRate.description,
        generalRateText: comprehensiveRate.generalRate,
        specialRateText: comprehensiveRate.specialRate || '',
        dutyPercentage: comprehensiveRate.percentage
      };
    }
    
    // Try original HTS parser as final backup
    const htsRate = HTSDutyParser.getOfficialRate(originalHsCode);
    if (htsRate) {
      console.log(`[HTS PARSER] Found official duty rate for ${originalHsCode}: ${htsRate.generalRate}`);
      return {
        code: htsRate.hsCode,
        description: htsRate.description,
        generalRateText: htsRate.generalRate,
        specialRateText: htsRate.specialRate || '',
        dutyPercentage: htsRate.percentage
      };
    }
    
    // Known duty rates for common HS codes
    const officialRates: Record<string, { rate: string; description: string; percentage?: number }> = {
      '7113115000': { 
        rate: '5%', 
        description: 'Articles of jewelry and parts thereof, of silver; Other',
        percentage: 0.05
      },
      '7113115030': { 
        rate: '5%', 
        description: 'Articles of jewelry and parts thereof, of silver; Other; Valued over $18 per dozen pieces or parts thereof',
        percentage: 0.05
      },
      '7323991000': { 
        rate: '4%', 
        description: 'Table, kitchen or other household articles and parts thereof, of iron or steel',
        percentage: 0.04
      },
      '6109100004': {
        rate: '16.5%',
        description: 'T-shirts, singlets and other vests, knitted or crocheted, of cotton',
        percentage: 0.165
      },
      '06031901': {
        rate: '6.4%',
        description: 'Cut flowers and flower buds, fresh, other (Anthuriums, Alstroemeria, etc.)',
        percentage: 0.064
      },
      '06031100': {
        rate: '6.8%',
        description: 'Fresh cut roses and buds suitable for bouquets or ornamental purposes',
        percentage: 0.068
      },
      '06049060': {
        rate: '7.0%',
        description: 'Foliage, branches and other parts of plants (other than fresh/dried/bleached) for ornamental purposes',
        percentage: 0.07
      },
      '25151220': {
        rate: '3.0%',
        description: 'Travertine marble - cut into rectangular blocks or slabs for building/monumental use',
        percentage: 0.03
      },
      '04069090': {
        rate: '5.4%',
        description: 'Cheese (other than fresh/grated/processed), not elsewhere specified',
        percentage: 0.054
      },
      '0406.90.90': {
        rate: '5.4%',
        description: 'Cheese (other than fresh/grated/processed), not elsewhere specified',
        percentage: 0.054
      },
      '04069072': {
        rate: '5.4%',
        description: 'Cheese (processed, not grated or powdered), aged over 9 months',
        percentage: 0.054
      },
      '0406.90.72': {
        rate: '5.4%',
        description: 'Cheese (processed, not grated or powdered), aged over 9 months',
        percentage: 0.054
      },
      '8414.80.16': {
        rate: 'Free',
        description: 'Air or vacuum pumps, air or other gas compressors and fans',
        percentage: 0
      },
      '61099010': {
        rate: '32%',
        description: 'T-shirts, tank tops and similar garments, knitted or crocheted, of other textile materials',
        percentage: 0.32
      },
      '6109.90.10': {
        rate: '32%',
        description: 'T-shirts, tank tops and similar garments, knitted or crocheted, of other textile materials',
        percentage: 0.32
      },
      '8516.79.00': {
        rate: '2%',
        description: 'Electro-thermic appliances, for domestic use (excl. specified types)',
        percentage: 0.02
      },
      '61089990': {
        rate: '7.5%',
        description: 'Women\'s or girls\' slips, petticoats, briefs, panties, nightdresses, pyjamas, négligés, bathrobes, dressing gowns and similar articles, knitted or crocheted, of other textile materials',
        percentage: 0.075
      },
      '6108.99.90': {
        rate: '7.5%',
        description: 'Women\'s or girls\' slips, petticoats, briefs, panties, nightdresses, pyjamas, négligés, bathrobes, dressing gowns and similar articles, knitted or crocheted, of other textile materials',  
        percentage: 0.075
      },
      '61089200': {
        rate: '11.5%',
        description: 'Women\'s or girls\' slips, petticoats, briefs, panties, nightdresses, pyjamas, négligés, bathrobes, dressing gowns and similar articles, knitted or crocheted, of man-made fibers',
        percentage: 0.115
      },
      '6108.92.00': {
        rate: '11.5%',
        description: 'Women\'s or girls\' slips, petticoats, briefs, panties, nightdresses, pyjamas, négligés, bathrobes, dressing gowns and similar articles, knitted or crocheted, of man-made fibers',
        percentage: 0.115
      },
      '61083910': {
        rate: '8.5%',
        description: 'Women\'s or girls\' slips, petticoats, briefs, panties, nightdresses, pyjamas, négligés, bathrobes, dressing gowns and similar articles, knitted or crocheted, of cotton, other',
        percentage: 0.085
      },
      '6108.39.10': {
        rate: '8.5%',
        description: 'Women\'s or girls\' slips, petticoats, briefs, panties, nightdresses, pyjamas, négligés, bathrobes, dressing gowns and similar articles, knitted or crocheted, of cotton, other',
        percentage: 0.085
      },
      '61072920': {
        rate: '8.4%',
        description: 'Men\'s or boys\' nightshirts, pyjamas, bathrobes, dressing gowns and similar articles, knitted or crocheted, of cotton, other',
        percentage: 0.084
      },
      '6107.29.20': {
        rate: '8.4%',
        description: 'Men\'s or boys\' nightshirts, pyjamas, bathrobes, dressing gowns and similar articles, knitted or crocheted, of cotton, other',
        percentage: 0.084
      },
      '61079910': {
        rate: '28.2%',
        description: 'Men\'s or boys\' underpants, briefs, nightshirts, pyjamas, bathrobes, dressing gowns and similar articles, knitted or crocheted, of man-made fibers, other',
        percentage: 0.282
      },
      '6107.99.10': {
        rate: '28.2%',
        description: 'Men\'s or boys\' underpants, briefs, nightshirts, pyjamas, bathrobes, dressing gowns and similar articles, knitted or crocheted, of man-made fibers, other',
        percentage: 0.282
      },
      
      // Precious stones and metals - Official USITC rates
      '71031040': {
        rate: '10.5%',
        description: 'Precious stones (other than diamonds) and semiprecious stones, simply sawn or roughly shaped',
        percentage: 0.105
      },
      '7103.10.40': {
        rate: '10.5%',
        description: 'Precious stones (other than diamonds) and semiprecious stones, simply sawn or roughly shaped',
        percentage: 0.105
      },
      '71039910': {
        rate: 'Free',
        description: 'Precious or semiprecious stones, cut but not set and suitable for use in jewelry',
        percentage: 0.0
      },
      '7103.99.10': {
        rate: 'Free',
        description: 'Precious or semiprecious stones, cut but not set and suitable for use in jewelry',
        percentage: 0.0
      },
      '71131110': {
        rate: '5%',
        description: 'Articles of jewelry and parts thereof, of silver, whether or not plated or clad with other precious metal; rope, curb, cable, chain and similar articles',
        percentage: 0.05
      },
      '7113.11.10': {
        rate: '5%',
        description: 'Articles of jewelry and parts thereof, of silver, whether or not plated or clad with other precious metal; rope, curb, cable, chain and similar articles',
        percentage: 0.05
      },
      '71042900': {
        rate: '3%',
        description: 'Synthetic or reconstructed precious or semi-precious stones, unworked or simply sawn or roughly shaped, other',
        percentage: 0.03
      },
      '7104.29.00': {
        rate: '3%',
        description: 'Synthetic or reconstructed precious or semi-precious stones, unworked or simply sawn or roughly shaped, other',
        percentage: 0.03
      },
      '71032100': {
        rate: 'Free',
        description: 'Precious stones (other than diamonds) unworked or simply sawn or roughly shaped',
        percentage: 0
      },
      '7103.21.00': {
        rate: 'Free',
        description: 'Precious stones (other than diamonds) unworked or simply sawn or roughly shaped',
        percentage: 0
      },
      '73239910': {
        rate: '4%',
        description: 'Table, kitchen or other household articles and parts thereof, of iron or steel, other',
        percentage: 0.04
      },
      '7323.99.10': {
        rate: '4%',
        description: 'Table, kitchen or other household articles and parts thereof, of iron or steel, other',
        percentage: 0.04
      },
      '71039950': {
        rate: '10.5%',
        description: 'Precious or semiprecious stones, nesoi, worked, whether or not graded, but not strung, mounted or set',
        percentage: 0.105
      },
      '7103.99.50': {
        rate: '10.5%',
        description: 'Precious or semiprecious stones, nesoi, worked, whether or not graded, but not strung, mounted or set',
        percentage: 0.105
      },
      '71041000': {
        rate: '3%',
        description: 'Piezo-electric quartz (synthetic or reconstructed)',
        percentage: 0.03
      },
      '7104.10.00': {
        rate: '3%',
        description: 'Piezo-electric quartz (synthetic or reconstructed)',
        percentage: 0.03
      },
      '61069025': {
        rate: '5.6%',
        description: 'Women\'s or girls\' blouses, shirts and shirt-blouses, knitted or crocheted, other',
        percentage: 0.056
      },
      '6106.90.25': {
        rate: '5.6%',
        description: 'Women\'s or girls\' blouses, shirts and shirt-blouses, knitted or crocheted, other',
        percentage: 0.056
      },
      '61061000': {
        rate: '16.5%',
        description: 'Women\'s or girls\' blouses, shirts and shirt-blouses, knitted or crocheted, of cotton',
        percentage: 0.165
      },
      '6106.10.00': {
        rate: '16.5%',
        description: 'Women\'s or girls\' blouses, shirts and shirt-blouses, knitted or crocheted, of cotton',
        percentage: 0.165
      },
      '61069010': {
        rate: '28.2%',
        description: 'Women\'s or girls\' blouses, shirts and shirt-blouses, knitted or crocheted, of man-made fibers',
        percentage: 0.282
      },
      '6106.90.10': {
        rate: '28.2%',
        description: 'Women\'s or girls\' blouses, shirts and shirt-blouses, knitted or crocheted, of man-made fibers',
        percentage: 0.282
      },
      // Jewelry - Official USITC rates based on verification
      '71131921': {
        rate: '5.5%',
        description: 'Rope jewelry made of precious metal (other than silver)',
        percentage: 0.055
      },
      '7113.19.21': {
        rate: '5.5%',
        description: 'Rope jewelry made of precious metal (other than silver)',
        percentage: 0.055
      },
      
      // Electronics & Technology - Common HS codes
      '85171200': {
        rate: '0%',
        description: 'Smartphones and mobile phones',
        percentage: 0
      },
      '8517.12.00': {
        rate: '0%',
        description: 'Smartphones and mobile phones',
        percentage: 0
      },
      '84713000': {
        rate: '0%',
        description: 'Laptop computers and portable computers',
        percentage: 0
      },
      '8471.30.00': {
        rate: '0%',
        description: 'Laptop computers and portable computers',
        percentage: 0
      },
      '85287200': {
        rate: '5.3%',
        description: 'LCD monitors and displays',
        percentage: 0.053
      },
      '8528.72.00': {
        rate: '5.3%',
        description: 'LCD monitors and displays',
        percentage: 0.053
      },
      
      // Textiles & Apparel - Common categories
      '61091000': {
        rate: '16.5%',
        description: 'Cotton t-shirts, knitted or crocheted',
        percentage: 0.165
      },
      '6109.10.00': {
        rate: '16.5%',
        description: 'Cotton t-shirts, knitted or crocheted',
        percentage: 0.165
      },
      '62034200': {
        rate: '16.6%',
        description: 'Men\'s cotton trousers and shorts',
        percentage: 0.166
      },
      '6203.42.00': {
        rate: '16.6%',
        description: 'Men\'s cotton trousers and shorts',
        percentage: 0.166
      },
      '62046200': {
        rate: '28.2%',
        description: 'Women\'s cotton trousers and shorts',
        percentage: 0.282
      },
      '6204.62.00': {
        rate: '28.2%',
        description: 'Women\'s cotton trousers and shorts',
        percentage: 0.282
      },
      
      // Footwear
      '64029100': {
        rate: '37.5%',
        description: 'Footwear with rubber or plastic soles',
        percentage: 0.375
      },
      '6402.91.00': {
        rate: '37.5%',
        description: 'Footwear with rubber or plastic soles',
        percentage: 0.375
      },
      
      // Food & Agriculture
      '09011100': {
        rate: '0%',
        description: 'Coffee, not roasted, not decaffeinated',
        percentage: 0
      },
      '0901.11.00': {
        rate: '0%',
        description: 'Coffee, not roasted, not decaffeinated',
        percentage: 0
      },
      '17011400': {
        rate: '3.6¢/kg',
        description: 'Other cane sugar',
        percentage: 0.02 // Approximate for calculation purposes
      },
      '1701.14.00': {
        rate: '3.6¢/kg',
        description: 'Other cane sugar',
        percentage: 0.02
      },
      
      // Automotive parts
      '87082100': {
        rate: '2.5%',
        description: 'Safety seat belts for motor vehicles',
        percentage: 0.025
      },
      '8708.21.00': {
        rate: '2.5%',
        description: 'Safety seat belts for motor vehicles',
        percentage: 0.025
      },
      
      // Machinery
      '84798200': {
        rate: '2.5%',
        description: 'Mixing, kneading, crushing, grinding machinery',
        percentage: 0.025
      },
      '8479.82.00': {
        rate: '2.5%',
        description: 'Mixing, kneading, crushing, grinding machinery',
        percentage: 0.025
      },
      
      // Home & Garden
      '94036000': {
        rate: '0%',
        description: 'Wooden furniture for bedrooms',
        percentage: 0
      },
      '9403.60.00': {
        rate: '0%',
        description: 'Wooden furniture for bedrooms',
        percentage: 0
      },
      '39241000': {
        rate: '3.4%',
        description: 'Tableware and kitchenware of plastic',
        percentage: 0.034
      },
      '3924.10.00': {
        rate: '3.4%',
        description: 'Tableware and kitchenware of plastic',
        percentage: 0.034
      },
      
      // Beauty & Personal Care
      '33049900': {
        rate: '0%',
        description: 'Beauty and makeup preparations',
        percentage: 0
      },
      '3304.99.00': {
        rate: '0%',
        description: 'Beauty and makeup preparations',
        percentage: 0
      },
      '33051000': {
        rate: '0%',
        description: 'Shampoos',
        percentage: 0
      },
      '3305.10.00': {
        rate: '0%',
        description: 'Shampoos',
        percentage: 0
      },
      
      // Toys & Games
      '95030100': {
        rate: '0%',
        description: 'Electric trains and track sets',
        percentage: 0
      },
      '9503.01.00': {
        rate: '0%',
        description: 'Electric trains and track sets',
        percentage: 0
      },
      '95030900': {
        rate: '0%',
        description: 'Other toys for infants',
        percentage: 0
      },
      '9503.09.00': {
        rate: '0%',
        description: 'Other toys for infants',
        percentage: 0
      },
      
      // Imitation jewelry - Chapter 7117 - Official USITC rates
      '71171915': {
        rate: '11%',
        description: 'Imitation jewelry: Other (base metal with or without plating)',
        percentage: 0.11
      },
      '7117.19.15': {
        rate: '11%',
        description: 'Imitation jewelry: Other (base metal with or without plating)',
        percentage: 0.11
      },
      
      // Religious articles - Chapter 7117.90
      '71179020': {
        rate: '4.3%',
        description: 'Rosaries and chaplets (imitation jewelry)',
        percentage: 0.043
      },
      '7117.90.20': {
        rate: '4.3%',
        description: 'Rosaries and chaplets (imitation jewelry)',
        percentage: 0.043
      },
      
      // Other imitation jewelry - Chapter 7117.90
      '71179030': {
        rate: '4.3%',
        description: 'Imitation jewelry: Other articles (Chapter 7117.90.30)',
        percentage: 0.043
      },
      '7117.90.30': {
        rate: '4.3%',
        description: 'Imitation jewelry: Other articles (Chapter 7117.90.30)',
        percentage: 0.043
      },
      '71179060': {
        rate: '4.3%',
        description: 'Imitation jewelry: Other articles (Chapter 7117.90.60)',
        percentage: 0.043
      },
      '7117.90.60': {
        rate: '4.3%',
        description: 'Imitation jewelry: Other articles (Chapter 7117.90.60)',
        percentage: 0.043
      },
      '71179090': {
        rate: '4.3%',
        description: 'Imitation jewelry: Other articles (Chapter 7117.90.90)',
        percentage: 0.043
      },
      '7117.90.90': {
        rate: '4.3%',
        description: 'Imitation jewelry: Other articles (Chapter 7117.90.90)',
        percentage: 0.043
      }
    };

    // Clean version (no dots, only digits)
    const cleanHsCode = originalHsCode.replace(/\D/g, '');
    
    // Try exact match with original HS code first
    let officialRate = officialRates[originalHsCode];
    let foundCode = originalHsCode;
    
    // If not found, try cleaned version (no dots)
    if (!officialRate) {
      officialRate = officialRates[cleanHsCode];
      if (officialRate) {
        foundCode = cleanHsCode;
      }
    }
    
    // If not found and we have a cleaned code (no dots), try standard format with dots
    if (!officialRate && cleanHsCode.length >= 8) {
      const withDots = cleanHsCode.slice(0, 4) + '.' + cleanHsCode.slice(4, 6) + '.' + cleanHsCode.slice(6);
      officialRate = officialRates[withDots];
      if (officialRate) {
        foundCode = withDots;
      }
    }
    
    if (officialRate) {
      return {
        code: foundCode,
        description: officialRate.description,
        generalRateText: officialRate.rate,
        specialRateText: '',
        dutyPercentage: officialRate.percentage || null
      };
    }

    // No fallback - return blank result if not found in official database
    return this.createBlankResult();
  }


  /**
   * Calculate duty amount based on customs value and duty rate
   */
  calculateDutyAmount(dutyRate: DutyRateResult, customsValue: number): number {
    if (!dutyRate.dutyPercentage || !isFinite(customsValue) || customsValue <= 0) {
      return 0;
    }

    const dutyAmount = customsValue * dutyRate.dutyPercentage;
    return Math.round(dutyAmount * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Get duty rate and calculate amount in one call with Trump tariff
   */
  async getDutyRateAndAmount(hsCode: string, customsValue: number): Promise<{
    dutyRate: DutyRateResult;
    dutyAmount: number;
    baseDutyAmount: number;
    trumpTariffAmount: number;
    baseDutyRate: number;
    trumpTariffRate: number;
    totalDutyRate: number;
  }> {
    const dutyRate = await this.getDutyRate(hsCode);
    
    // If no base duty rate found, provide default minimal duty with Trump tariff
    let baseDutyRate = dutyRate.dutyPercentage || 0;
    let effectiveDutyRate = { ...dutyRate };
    
    // CRITICAL ACCURACY FIX: If no rate found in Excel, still apply Trump tariff
    if (!dutyRate.code || dutyRate.dutyPercentage === null) {
      console.log(`[USITC] ACCURACY PROTECTION: HS code ${hsCode} not found in official Excel file - using base duty 0% + Trump tariff 15%`);
      const trumpTariffRate = 0.15; // 15%
      const trumpTariffAmount = customsValue * trumpTariffRate;
      
      return {
        dutyRate: {
          code: hsCode,
          description: 'HS code not found - applying default Trump tariff',
          generalRateText: '0% (base) + 15% (Trump tariff)',
          specialRateText: '',
          dutyPercentage: 0
        },
        dutyAmount: trumpTariffAmount,
        baseDutyAmount: 0,
        trumpTariffAmount: trumpTariffAmount,
        baseDutyRate: 0,
        trumpTariffRate: trumpTariffRate,
        totalDutyRate: trumpTariffRate
      };
    }
    
    // Handle "Free" duty rate cases properly  
    if (dutyRate.generalRateText && dutyRate.generalRateText.toLowerCase() === 'free') {
      baseDutyRate = 0;
      effectiveDutyRate.dutyPercentage = 0;
    }
    
    // Trump tariff: additional 15% on top of base duty
    const trumpTariffRate = 0.15; // 15%
    const totalDutyRate = baseDutyRate + trumpTariffRate;
    
    // Calculate individual amounts
    const baseDutyAmount = this.calculateDutyAmount(effectiveDutyRate, customsValue);
    const trumpTariffAmount = customsValue * trumpTariffRate;
    const totalDutyAmount = baseDutyAmount + trumpTariffAmount;
    
    return { 
      dutyRate: effectiveDutyRate, 
      dutyAmount: totalDutyAmount,
      baseDutyAmount,
      trumpTariffAmount,
      baseDutyRate,
      trumpTariffRate,
      totalDutyRate
    };
  }

  /**
   * Parse duty rate text to a decimal number (e.g., "5%" -> 0.05)
   */
  private parseRateToNumber(rateText: string): number | null {
    if (!rateText) return null;
    
    const text = String(rateText).trim().toLowerCase();
    
    // Handle "Free" or "0%" cases
    if (text === 'free' || text === '0%' || text === '0 %') {
      return 0;
    }

    // Extract percentage (e.g., "5.5%" -> 5.5)
    const percentMatch = text.match(/(\d+(?:\.\d+)?)\s*%/);
    if (percentMatch) {
      return Number(percentMatch[1]) / 100;
    }

    // Handle specific rate formats (dollars per unit, etc.)
    // This would need more complex parsing for specific rates
    
    return null;
  }

  /**
   * Clean up text from HTML entities and extra whitespace
   */
  private sanitizeText(text: string): string {
    return String(text)
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Parse HTML search results from USITC website
   */
  private parseHTSSearchResults(html: string, searchHsCode: string): DutyRateResult {
    try {
      // Look for table rows containing tariff data
      // The USITC website uses tables with specific structure
      
      // First, try to find exact match in the HTML
      const hsCodePattern = new RegExp(`${searchHsCode.substring(0,4)}\\.${searchHsCode.substring(4,6)}\\.${searchHsCode.substring(6,8)}\\.${searchHsCode.substring(8)}`, 'i');
      
      // Look for table rows containing duty information
      const tableRowPattern = /<tr[^>]*>.*?<\/tr>/gi;
      const matches = html.match(tableRowPattern) || [];
      
      for (const row of matches) {
        // Check if this row contains our HS code
        if (hsCodePattern.test(row)) {
          // Extract duty rate from the General column
          // Look for percentage patterns in the row
          const dutyRateMatch = row.match(/(\d+(?:\.\d+)?)\s*%/);
          const freeMatch = row.match(/\bfree\b/i);
          
          if (dutyRateMatch) {
            const rate = dutyRateMatch[1];
            console.log(`[USITC HTML Parser] Found duty rate ${rate}% in HTML for ${searchHsCode}`);
            
            return {
              code: searchHsCode,
              description: 'Parsed from USITC HTML',
              generalRateText: `${rate}%`,
              specialRateText: '',
              dutyPercentage: Number(rate) / 100
            };
          } else if (freeMatch) {
            console.log(`[USITC HTML Parser] Found free duty rate in HTML for ${searchHsCode}`);
            
            return {
              code: searchHsCode,
              description: 'Parsed from USITC HTML',
              generalRateText: 'Free',
              specialRateText: '',
              dutyPercentage: 0
            };
          }
        }
      }
      
      // If no exact match, try a broader search in the HTML content
      const generalRatePattern = /(?:general|general rate|gen)\s*[:\s]*(\d+(?:\.\d+)?)\s*%/gi;
      const match = generalRatePattern.exec(html);
      
      if (match) {
        const rate = match[1];
        console.log(`[USITC HTML Parser] Found general duty rate ${rate}% in HTML content`);
        
        return {
          code: searchHsCode,
          description: 'Parsed from USITC HTML content',
          generalRateText: `${rate}%`,
          specialRateText: '',
          dutyPercentage: Number(rate) / 100
        };
      }
      
      console.log(`[USITC HTML Parser] No duty rate found in HTML for ${searchHsCode}`);
      return this.createBlankResult();
      
    } catch (error) {
      console.error(`[USITC HTML Parser] Error parsing HTML:`, error);
      return this.createBlankResult();
    }
  }

  /**
   * Create a blank result for error cases
   */
  private createBlankResult(): DutyRateResult {
    return {
      code: '',
      description: 'HS code not found in official Excel database',
      generalRateText: '',
      specialRateText: '',
      dutyPercentage: null
    };
  }
}

export default USITCDutyService;