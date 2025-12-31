/**
 * Enhanced HTS System - Integration layer for comprehensive duty rate calculation
 * This system combines multiple approaches for maximum coverage
 */

import { ComprehensiveHTSParser } from './comprehensive-hts-parser';
import { ComprehensiveHTSParser as LegacyParser } from './hts-comprehensive-parser';
import { PDFHTSExtractor } from './pdf-hts-extractor';

export interface EnhancedHTSResult {
  hsCode: string;
  description: string;
  generalRate: string;
  percentage: number;
  source: 'comprehensive_parser' | 'legacy_database' | 'pdf_extractor' | 'not_found';
  confidence: 'high' | 'medium' | 'low';
  chapter: number;
  unit?: string;
}

export class EnhancedHTSSystem {
  
  /**
   * Get duty rate with maximum accuracy using multiple methods
   */
  static async getDutyRate(hsCode: string): Promise<EnhancedHTSResult | null> {
    console.log(`[ENHANCED HTS] Searching for HS code: ${hsCode}`);

    // Method 1: Try the new comprehensive parser (highest accuracy)
    try {
      const comprehensiveResult = await ComprehensiveHTSParser.findDutyRate(hsCode);
      if (comprehensiveResult) {
        console.log(`[ENHANCED HTS] Found via comprehensive parser: ${comprehensiveResult.generalRate}`);
        return {
          hsCode: comprehensiveResult.hsCode,
          description: comprehensiveResult.description,
          generalRate: comprehensiveResult.generalRate,
          percentage: comprehensiveResult.percentage,
          source: 'comprehensive_parser',
          confidence: 'high',
          chapter: comprehensiveResult.chapter,
          unit: comprehensiveResult.unit
        };
      }
    } catch (error) {
      console.log('[ENHANCED HTS] Comprehensive parser error:', error);
    }

    // Method 2: Try the legacy database
    try {
      const legacyResult = await LegacyParser.getComprehensiveRate(hsCode);
      if (legacyResult) {
        console.log(`[ENHANCED HTS] Found via legacy database: ${legacyResult.generalRate}`);
        return {
          hsCode: legacyResult.hsCode,
          description: legacyResult.description,
          generalRate: legacyResult.generalRate,
          percentage: legacyResult.percentage,
          source: 'legacy_database',
          confidence: 'high',
          chapter: legacyResult.chapter,
          unit: legacyResult.unit
        };
      }
    } catch (error) {
      console.log('[ENHANCED HTS] Legacy database error:', error);
    }

    // Method 3: Try direct PDF extraction
    try {
      const pdfResult = await PDFHTSExtractor.extractDutyRate(hsCode);
      if (pdfResult) {
        console.log(`[ENHANCED HTS] Found via PDF extraction: ${pdfResult.generalRate}`);
        return {
          hsCode: pdfResult.hsCode,
          description: pdfResult.description,
          generalRate: pdfResult.generalRate,
          percentage: pdfResult.percentage,
          source: 'pdf_extractor',
          confidence: 'medium',
          chapter: pdfResult.chapter,
          unit: pdfResult.unit
        };
      }
    } catch (error) {
      console.log('[ENHANCED HTS] PDF extractor error:', error);
    }

    // Method 4: Try fuzzy matching and similar codes
    const fuzzyResult = await this.findSimilarHSCode(hsCode);
    if (fuzzyResult) {
      console.log(`[ENHANCED HTS] Found similar code: ${fuzzyResult.generalRate} (confidence: low)`);
      return fuzzyResult;
    }

    console.log(`[ENHANCED HTS] No duty rate found for HS code: ${hsCode}`);
    return null;
  }

  /**
   * Find similar HS codes using fuzzy matching
   */
  private static async findSimilarHSCode(hsCode: string): Promise<EnhancedHTSResult | null> {
    // Try chapter-level matching (first 2 digits)
    const chapter = hsCode.substring(0, 2);
    
    // Common chapter fallback rates
    const chapterFallbacks: { [key: string]: { rate: string; percentage: number; description: string } } = {
      '04': { rate: '5.4%', percentage: 0.054, description: 'Dairy products' },
      '61': { rate: '16.0%', percentage: 0.16, description: 'Knitted apparel' },
      '62': { rate: '12.0%', percentage: 0.12, description: 'Woven apparel' },
      '84': { rate: '2.5%', percentage: 0.025, description: 'Machinery' },
      '85': { rate: '0%', percentage: 0, description: 'Electrical equipment' }
    };

    const fallback = chapterFallbacks[chapter];
    if (fallback) {
      return {
        hsCode,
        description: `${fallback.description} (estimated based on chapter ${chapter})`,
        generalRate: fallback.rate,
        percentage: fallback.percentage,
        source: 'not_found',
        confidence: 'low',
        chapter: parseInt(chapter),
        unit: 'kg'
      };
    }

    return null;
  }

  /**
   * Get system statistics
   */
  static async getSystemStats(): Promise<{
    comprehensiveParser: any;
    totalAvailableCodes: number;
    recommendedAction: string;
  }> {
    const stats = await ComprehensiveHTSParser.getStatistics();
    
    return {
      comprehensiveParser: stats,
      totalAvailableCodes: stats.totalCodes,
      recommendedAction: stats.totalCodes < 1000 ? 
        'System needs full PDF processing to extract all codes' :
        'System is well-populated with duty rates'
    };
  }
}