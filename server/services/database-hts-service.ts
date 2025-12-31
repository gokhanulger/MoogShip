/**
 * Database HTS Service
 * Provides duty rate lookup from database instead of PDF parsing
 */

import { db } from '../db.js';
import { htsData, type HTSData } from '@shared/schema.js';
import { eq, like, sql } from 'drizzle-orm';
import { ExcelSearchService } from './excel-search-service.js';
import { EnhancedExcelSearch } from './enhanced-excel-search.js';
import { MergedCellExcelSearch } from './merged-cell-excel-search.js';
import { ExcelDirectSearch } from './excel-direct-search.js';
import { EmergencyExcelSearch } from './emergency-excel-search.js';
import { UltraComprehensiveSearch } from './ultra-comprehensive-search.js';
import { ManualHSCodeFix } from './manual-hs-code-fix.js';

export interface DatabaseHTSResult {
  hsCode: string;
  description: string;
  generalRate: string;
  percentage: number;
  source: 'database' | 'fallback';
  confidence: 'high' | 'medium' | 'low';
}

export class DatabaseHTSService {
  
  /**
   * Get duty rate for an HS code - EXCEL FILE SEARCH ONLY
   */
  static async getDutyRate(hsCode: string): Promise<DatabaseHTSResult | null> {
    try {
      console.log(`[DATABASE HTS] Looking up HS code: ${hsCode}`);
      
      // Clean the HS code for search
      const cleanHsCode = this.cleanHSCode(hsCode);
      
      // FIRST: Try database exact match (for already cached codes)
      const dbResult = await this.exactMatch(cleanHsCode);
      if (dbResult) {
        console.log(`[DATABASE HTS] Exact match found in cache: ${dbResult.generalRate}`);
        return {
          hsCode: dbResult.hsCode,
          description: dbResult.description,
          generalRate: dbResult.generalRate,
          percentage: dbResult.percentage,
          source: 'database',
          confidence: 'high'
        };
      }
      
      // SECOND: Check manual database for known problematic codes
      console.log(`[DATABASE HTS] Checking manual database for ${hsCode}...`);
      const manualResult = ManualHSCodeFix.getManualHSCode(hsCode);
      if (manualResult) {
        console.log(`[DATABASE HTS] Found in manual database: ${manualResult.generalRate}`);
        
        // Cache the manual result
        await db.insert(htsData).values({
          hsCode: manualResult.hsCode,
          description: manualResult.description,
          generalRate: manualResult.generalRate,
          specialRate: manualResult.specialRate || '',
          unit: manualResult.unit || '',
          chapter: manualResult.chapter,
          percentage: manualResult.percentage,
          sheetName: manualResult.sheetName,
          rowNumber: manualResult.rowNumber,
          confidence: 'high'
        }).onConflictDoNothing();
        
        return {
          hsCode: manualResult.hsCode,
          description: manualResult.description,
          generalRate: manualResult.generalRate,
          specialRate: manualResult.specialRate || '',
          unit: manualResult.unit || '',
          chapter: manualResult.chapter,
          percentage: manualResult.percentage,
          sheetName: manualResult.sheetName,
          rowNumber: manualResult.rowNumber,
          confidence: 'high'
        };
      }
      
      // THIRD: EMERGENCY SEARCH (with critical bug fixes) - Use emergency search system
      console.log(`[DATABASE HTS] EMERGENCY comprehensive search for ${hsCode}...`);
      const excelResult = await EmergencyExcelSearch.searchHSCode(hsCode);
      if (excelResult) {
        console.log(`[DATABASE HTS] Found in Excel: ${excelResult.generalRate} (Sheet: ${excelResult.sheetName}, Row: ${excelResult.rowNumber})`);
        
        // Cache the result in database for future use
        await this.cacheExcelResult(excelResult);
        
        return {
          hsCode: excelResult.hsCode,
          description: excelResult.description,
          generalRate: excelResult.generalRate,
          percentage: excelResult.percentage,
          source: 'database',
          confidence: 'high'
        };
      }
      
      console.log(`[DATABASE HTS] HS code ${hsCode} not found in Excel file`);
      return null;
      
    } catch (error) {
      console.error('[DATABASE HTS] Error looking up duty rate:', error);
      return null;
    }
  }
  
  /**
   * Cache Excel result in database for future use
   */
  private static async cacheExcelResult(excelResult: any): Promise<void> {
    try {
      const insertData = {
        hsCode: excelResult.hsCode,
        description: excelResult.description,
        generalRate: excelResult.generalRate,
        specialRate: excelResult.specialRate || '',
        unit: excelResult.unit || '',
        chapter: excelResult.chapter,
        percentage: excelResult.percentage,
        source: 'excel_import_2025',
        isActive: true
      };

      await db.insert(htsData).values(insertData).onConflictDoUpdate({
        target: htsData.hsCode,
        set: {
          description: insertData.description,
          generalRate: insertData.generalRate,
          percentage: insertData.percentage,
          updatedAt: new Date()
        }
      });

      console.log(`[DATABASE HTS] Cached Excel result for ${excelResult.hsCode}`);
    } catch (error) {
      console.warn('[DATABASE HTS] Error caching Excel result:', error);
    }
  }

  /**
   * Try exact match in database
   */
  private static async exactMatch(hsCode: string): Promise<HTSData | null> {
    const variations = this.generateHSCodeVariations(hsCode);
    
    for (const variation of variations) {
      const result = await db.select()
        .from(htsData)
        .where(eq(htsData.hsCode, variation))
        .limit(1);
        
      if (result.length > 0) {
        return result[0];
      }
    }
    
    return null;
  }
  
  /**
   * Try fuzzy matching (partial matches)
   */
  private static async fuzzyMatch(hsCode: string): Promise<HTSData | null> {
    // Try matching first 6 digits (tariff heading)
    const heading = hsCode.substring(0, 6);
    
    const result = await db.select()
      .from(htsData)
      .where(like(htsData.hsCode, `${heading}%`))
      .limit(1);
      
    return result.length > 0 ? result[0] : null;
  }
  
  /**
   * Chapter-based fallback using average rates
   */
  private static async chapterFallback(hsCode: string): Promise<DatabaseHTSResult | null> {
    try {
      const chapter = parseInt(hsCode.substring(0, 2));
      
      // Get average duty rate for the chapter
      const result = await db.select({
        avgPercentage: sql<number>`AVG(${htsData.percentage})`,
        count: sql<number>`COUNT(*)`,
        sampleRate: sql<string>`COALESCE(MODE() WITHIN GROUP (ORDER BY ${htsData.generalRate}), 'Unknown')`
      })
      .from(htsData)
      .where(eq(htsData.chapter, chapter));
      
      if (result.length > 0 && result[0].count > 0) {
        const avgPercentage = result[0].avgPercentage || 0.05;
        const sampleRate = result[0].sampleRate || '5%';
        
        return {
          hsCode,
          description: `Product under Chapter ${chapter} (estimated)`,
          generalRate: `~${Math.round(avgPercentage * 100)}%`,
          percentage: avgPercentage,
          source: 'fallback',
          confidence: 'low'
        };
      }
      
      return null;
      
    } catch (error) {
      console.error('[DATABASE HTS] Error in chapter fallback:', error);
      return null;
    }
  }
  
  /**
   * Clean and standardize HS code format
   */
  private static cleanHSCode(hsCode: string): string {
    // Remove all non-numeric characters and format as XXXX.XX.XX
    const numbersOnly = hsCode.replace(/[^\d]/g, '');
    
    if (numbersOnly.length >= 8) {
      return `${numbersOnly.substring(0, 4)}.${numbersOnly.substring(4, 6)}.${numbersOnly.substring(6)}`;
    } else if (numbersOnly.length >= 6) {
      return `${numbersOnly.substring(0, 4)}.${numbersOnly.substring(4, 6)}.00`;
    } else if (numbersOnly.length >= 4) {
      return `${numbersOnly.substring(0, 4)}.00.00`;
    }
    
    return hsCode;
  }
  
  /**
   * Generate various HS code format variations
   */
  private static generateHSCodeVariations(hsCode: string): string[] {
    const numbersOnly = hsCode.replace(/[^\d]/g, '');
    
    const variations = [
      hsCode, // Original
      numbersOnly, // Numbers only
    ];
    
    // Add dotted variations
    if (numbersOnly.length >= 6) {
      variations.push(`${numbersOnly.substring(0, 4)}.${numbersOnly.substring(4, 6)}`);
    }
    if (numbersOnly.length >= 8) {
      variations.push(`${numbersOnly.substring(0, 4)}.${numbersOnly.substring(4, 6)}.${numbersOnly.substring(6)}`);
    }
    
    return [...new Set(variations)]; // Remove duplicates
  }
  
  /**
   * Get statistics about the database
   */
  static async getStats(): Promise<{
    totalCodes: number;
    chapterCounts: Record<number, number>;
    sampleEntries: HTSData[];
  }> {
    try {
      // Get total count
      const totalResult = await db.select({
        count: sql<number>`COUNT(*)`
      }).from(htsData);
      
      // Get chapter distribution
      const chapterResult = await db.select({
        chapter: htsData.chapter,
        count: sql<number>`COUNT(*)`
      })
      .from(htsData)
      .groupBy(htsData.chapter)
      .orderBy(htsData.chapter);
      
      // Get sample entries
      const sampleResult = await db.select()
        .from(htsData)
        .limit(10);
      
      const chapterCounts: Record<number, number> = {};
      chapterResult.forEach(row => {
        chapterCounts[row.chapter] = row.count;
      });
      
      return {
        totalCodes: totalResult[0]?.count || 0,
        chapterCounts,
        sampleEntries: sampleResult
      };
      
    } catch (error) {
      console.error('[DATABASE HTS] Error getting stats:', error);
      return {
        totalCodes: 0,
        chapterCounts: {},
        sampleEntries: []
      };
    }
  }
}