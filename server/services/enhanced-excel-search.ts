/**
 * Enhanced Excel Search Service
 * Comprehensive and accurate search through Excel workbook
 * Handles all HTS Excel formats and patterns
 */

import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

export interface AccurateExcelResult {
  hsCode: string;
  description: string;
  generalRate: string;
  specialRate?: string;
  unit?: string;
  chapter: number;
  percentage: number;
  sheetName: string;
  rowNumber: number;
  confidence: number; // 0-1 confidence score
}

export class EnhancedExcelSearch {
  private static excelPath = '/home/runner/workspace/attached_assets/finalcopy_2025htsrev21_1757188055443.xlsx';
  private static workbook: XLSX.WorkBook | null = null;
  private static sheetCache: Map<string, any[][]> = new Map();
  
  /**
   * Load workbook with caching
   */
  private static loadWorkbook(): XLSX.WorkBook {
    if (!this.workbook) {
      console.log('[ENHANCED EXCEL] Loading Excel workbook...');
      
      if (!fs.existsSync(this.excelPath)) {
        throw new Error(`Excel file not found: ${this.excelPath}`);
      }
      
      this.workbook = XLSX.readFile(this.excelPath);
      console.log(`[ENHANCED EXCEL] Loaded ${this.workbook.SheetNames.length} sheets`);
    }
    
    return this.workbook;
  }
  
  /**
   * Get sheet data with caching
   */
  private static getSheetData(sheetName: string): any[][] {
    if (!this.sheetCache.has(sheetName)) {
      const workbook = this.loadWorkbook();
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      this.sheetCache.set(sheetName, data as any[][]);
    }
    
    return this.sheetCache.get(sheetName) || [];
  }
  
  /**
   * Comprehensive HS code search
   */
  static async searchHSCode(hsCode: string): Promise<AccurateExcelResult | null> {
    try {
      console.log(`[ENHANCED EXCEL] Comprehensive search for: ${hsCode}`);
      
      const workbook = this.loadWorkbook();
      const cleanHsCode = this.normalizeHSCode(hsCode);
      
      // Search all sheets with different strategies
      const searchStrategies = [
        this.exactMatchStrategy,
        this.normalizedMatchStrategy,
        this.partialMatchStrategy,
        this.fuzzyMatchStrategy
      ];
      
      for (const strategy of searchStrategies) {
        for (const sheetName of workbook.SheetNames) {
          const result = await strategy.call(this, sheetName, hsCode, cleanHsCode);
          if (result && result.confidence > 0.8) {
            console.log(`[ENHANCED EXCEL] Found ${hsCode} in ${sheetName} with confidence ${result.confidence}`);
            return result;
          }
        }
      }
      
      console.log(`[ENHANCED EXCEL] HS code ${hsCode} not found with high confidence`);
      return null;
      
    } catch (error) {
      console.error('[ENHANCED EXCEL] Search error:', error);
      return null;
    }
  }
  
  /**
   * Strategy 1: Exact string match
   */
  private static async exactMatchStrategy(
    sheetName: string, 
    originalHsCode: string, 
    cleanHsCode: string
  ): Promise<AccurateExcelResult | null> {
    const data = this.getSheetData(sheetName);
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;
      
      // Check first column for exact HS code match
      const cellValue = String(row[0] || '').trim();
      if (cellValue === originalHsCode || cellValue === cleanHsCode) {
        const result = this.extractCompleteRateInfo(data, i, sheetName, originalHsCode);
        if (result) {
          result.confidence = 1.0;
          return result;
        }
      }
    }
    
    return null;
  }
  
  /**
   * Strategy 2: Normalized match (handles formatting differences)
   */
  private static async normalizedMatchStrategy(
    sheetName: string, 
    originalHsCode: string, 
    cleanHsCode: string
  ): Promise<AccurateExcelResult | null> {
    const data = this.getSheetData(sheetName);
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;
      
      const cellValue = String(row[0] || '').trim();
      const normalizedCell = this.normalizeHSCode(cellValue);
      
      if (normalizedCell === cleanHsCode && normalizedCell.length >= 8) {
        const result = this.extractCompleteRateInfo(data, i, sheetName, originalHsCode);
        if (result) {
          result.confidence = 0.95;
          return result;
        }
      }
    }
    
    return null;
  }
  
  /**
   * Strategy 3: Partial match for hierarchical codes
   */
  private static async partialMatchStrategy(
    sheetName: string, 
    originalHsCode: string, 
    cleanHsCode: string
  ): Promise<AccurateExcelResult | null> {
    const data = this.getSheetData(sheetName);
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;
      
      const cellValue = String(row[0] || '').trim();
      
      // Check if this is a parent heading that contains our HS code
      if (this.isParentCode(cellValue, cleanHsCode)) {
        // Look for the specific code in following rows
        for (let j = i + 1; j < Math.min(i + 50, data.length); j++) {
          const nextRow = data[j];
          if (nextRow && nextRow.length > 0) {
            const nextCellValue = String(nextRow[0] || '').trim();
            const normalizedNext = this.normalizeHSCode(nextCellValue);
            
            if (normalizedNext === cleanHsCode) {
              const result = this.extractCompleteRateInfo(data, j, sheetName, originalHsCode);
              if (result) {
                result.confidence = 0.9;
                return result;
              }
            }
          }
        }
      }
    }
    
    return null;
  }
  
  /**
   * Strategy 4: Fuzzy match for slight variations
   */
  private static async fuzzyMatchStrategy(
    sheetName: string, 
    originalHsCode: string, 
    cleanHsCode: string
  ): Promise<AccurateExcelResult | null> {
    const data = this.getSheetData(sheetName);
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;
      
      for (let j = 0; j < Math.min(3, row.length); j++) {
        const cellValue = String(row[j] || '').trim();
        
        if (this.isFuzzyMatch(cellValue, cleanHsCode)) {
          const result = this.extractCompleteRateInfo(data, i, sheetName, originalHsCode);
          if (result) {
            result.confidence = 0.85;
            return result;
          }
        }
      }
    }
    
    return null;
  }
  
  /**
   * Extract complete rate information from Excel data
   */
  private static extractCompleteRateInfo(
    data: any[][], 
    rowIndex: number, 
    sheetName: string, 
    hsCode: string
  ): AccurateExcelResult | null {
    try {
      const row = data[rowIndex];
      
      // Standard HTS structure:
      // Column 0: HS Code
      // Column 1: Stat Suffix
      // Column 2: Description
      // Column 3: Unit
      // Column 4: General Rate
      // Column 5: Special Rate
      
      let generalRate = '';
      let description = '';
      let unit = '';
      let specialRate = '';
      
      // Look for rate in current row first
      generalRate = this.extractRateFromRow(row);
      
      // If no rate in current row, check next 3 rows (common in HTS)
      if (!generalRate) {
        for (let i = 1; i <= 3; i++) {
          if (rowIndex + i < data.length) {
            const nextRow = data[rowIndex + i];
            generalRate = this.extractRateFromRow(nextRow);
            if (generalRate) break;
          }
        }
      }
      
      // Extract description (column 2 or longest meaningful text)
      description = String(row[2] || '').trim();
      if (!description || description.length < 5) {
        for (let i = 0; i < row.length; i++) {
          const cellValue = String(row[i] || '').trim();
          if (cellValue.length > 20 && !this.isRatePattern(cellValue) && !cellValue.includes(hsCode)) {
            description = cellValue;
            break;
          }
        }
      }
      
      // Extract unit (column 3 or pattern match)
      unit = String(row[3] || '').trim();
      if (!unit) {
        for (let i = 0; i < row.length; i++) {
          const cellValue = String(row[i] || '').trim();
          if (this.isUnitPattern(cellValue)) {
            unit = cellValue;
            break;
          }
        }
      }
      
      // Extract special rate (column 5 or after general rate)
      specialRate = String(row[5] || '').trim();
      
      if (!generalRate) {
        return null; // Must have a rate
      }
      
      const { percentage } = this.parseRate(generalRate);
      
      return {
        hsCode,
        description: description || `Product under HS ${hsCode}`,
        generalRate,
        specialRate,
        unit,
        chapter: parseInt(hsCode.substring(0, 2)),
        percentage,
        sheetName,
        rowNumber: rowIndex + 1,
        confidence: 1.0
      };
      
    } catch (error) {
      console.warn('[ENHANCED EXCEL] Error extracting rate info:', error);
      return null;
    }
  }
  
  /**
   * Extract rate from a single row
   */
  private static extractRateFromRow(row: any[]): string {
    if (!row) return '';
    
    // Check columns 4, 5 first (typical rate positions)
    for (const colIndex of [4, 5, 3, 6]) {
      if (colIndex < row.length) {
        const cellValue = String(row[colIndex] || '').trim();
        if (this.isRatePattern(cellValue)) {
          return cellValue;
        }
      }
    }
    
    // Check all columns for rate patterns
    for (let i = 0; i < row.length; i++) {
      const cellValue = String(row[i] || '').trim();
      if (this.isRatePattern(cellValue)) {
        return cellValue;
      }
    }
    
    return '';
  }
  
  /**
   * Check if string is a duty rate pattern
   */
  private static isRatePattern(value: string): boolean {
    if (!value || value.length > 50) return false;
    
    // Percentage patterns
    if (/%/.test(value) && /\d/.test(value)) return true;
    
    // Cents patterns
    if (/¢/.test(value) && /\d/.test(value)) return true;
    
    // Dollar patterns
    if (/\$/.test(value) && /\d/.test(value)) return true;
    
    // Free pattern
    if (/^free$/i.test(value.trim())) return true;
    
    // Complex rate patterns like "37.2¢/kg + 8.5%"
    if (/\d+\.?\d*[¢%]/.test(value)) return true;
    
    return false;
  }
  
  /**
   * Check if string is a unit pattern
   */
  private static isUnitPattern(value: string): boolean {
    if (!value || value.length > 30) return false;
    
    const unitKeywords = ['kg', 'doz', 'No.', 'prs', 'liters', 'm²', 'tons', 'units'];
    return unitKeywords.some(keyword => value.toLowerCase().includes(keyword.toLowerCase()));
  }
  
  /**
   * Normalize HS code format
   */
  private static normalizeHSCode(raw: string): string {
    if (!raw) return '';
    
    // Remove all non-numeric characters except dots
    let cleaned = raw.replace(/[^\d\.]/g, '');
    
    // Remove dots for comparison
    const numbersOnly = cleaned.replace(/\./g, '');
    
    // Add standard formatting if needed
    if (numbersOnly.length >= 6) {
      return numbersOnly.substring(0, 4) + '.' + 
             numbersOnly.substring(4, 6) + 
             (numbersOnly.length > 6 ? '.' + numbersOnly.substring(6) : '');
    }
    
    return cleaned;
  }
  
  /**
   * Check if code is parent of target code
   */
  private static isParentCode(parentCode: string, targetCode: string): boolean {
    const normalizedParent = this.normalizeHSCode(parentCode).replace(/\./g, '');
    const normalizedTarget = this.normalizeHSCode(targetCode).replace(/\./g, '');
    
    return normalizedTarget.startsWith(normalizedParent) && 
           normalizedParent.length < normalizedTarget.length &&
           normalizedParent.length >= 4;
  }
  
  /**
   * Fuzzy match check
   */
  private static isFuzzyMatch(cellValue: string, targetCode: string): boolean {
    if (!cellValue || cellValue.length < 8) return false;
    
    const normalized = this.normalizeHSCode(cellValue).replace(/\./g, '');
    const target = this.normalizeHSCode(targetCode).replace(/\./g, '');
    
    // Check if it contains the target code
    return normalized.includes(target) && target.length >= 8;
  }
  
  /**
   * Parse duty rate to get percentage
   */
  private static parseRate(rate: string): { percentage: number } {
    if (!rate) return { percentage: 0 };
    
    // Handle "Free" case
    if (/free/i.test(rate)) {
      return { percentage: 0 };
    }
    
    // Extract percentage
    const percentMatch = rate.match(/(\d+\.?\d*)%/);
    if (percentMatch) {
      return { percentage: parseFloat(percentMatch[1]) / 100 };
    }
    
    // Handle cents per unit (approximate to percentage)
    const centsMatch = rate.match(/(\d+\.?\d*)¢/);
    if (centsMatch) {
      // Convert cents to approximate percentage (rough estimation)
      const cents = parseFloat(centsMatch[1]);
      return { percentage: cents / 100 }; // Very rough conversion
    }
    
    return { percentage: 0 };
  }
}