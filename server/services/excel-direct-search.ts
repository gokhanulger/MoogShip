/**
 * Direct Excel Search Service
 * Handles complex Excel formats with absolute accuracy
 * Fixes critical search bugs for multi-line cells
 */

import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

export interface DirectSearchResult {
  hsCode: string;
  description: string;
  generalRate: string;
  specialRate?: string;
  unit?: string;
  chapter: number;
  percentage: number;
  sheetName: string;
  rowNumber: number;
  confidence: number;
}

export class ExcelDirectSearch {
  private static excelPath = '/home/runner/workspace/attached_assets/finalcopy_2025htsrev21_1757188055443.xlsx';
  private static workbook: XLSX.WorkBook | null = null;
  
  /**
   * Load workbook once and cache it
   */
  private static loadWorkbook(): XLSX.WorkBook {
    if (!this.workbook) {
      console.log('[DIRECT SEARCH] Loading Excel workbook...');
      
      if (!fs.existsSync(this.excelPath)) {
        throw new Error(`Excel file not found: ${this.excelPath}`);
      }
      
      this.workbook = XLSX.readFile(this.excelPath);
      console.log(`[DIRECT SEARCH] Loaded ${this.workbook.SheetNames.length} sheets`);
    }
    
    return this.workbook;
  }
  
  /**
   * Search for HS code with comprehensive pattern matching
   */
  static async searchHSCode(hsCode: string): Promise<DirectSearchResult | null> {
    try {
      console.log(`[DIRECT SEARCH] Searching for: ${hsCode}`);
      
      const workbook = this.loadWorkbook();
      const cleanHsCode = this.normalizeHSCode(hsCode);
      
      // Search all sheets systematically with detailed logging
      for (const sheetName of workbook.SheetNames) {
        // Special debug logging for 8539.22.80
        if (hsCode === '8539.22.80' && sheetName === 'Table 203') {
          console.log(`[DIRECT SEARCH DEBUG] Checking Table 203 for 8539.22.80`);
        }
        
        const result = await this.searchInSheet(sheetName, hsCode, cleanHsCode);
        if (result) {
          console.log(`[DIRECT SEARCH] Found ${hsCode} in ${sheetName}, row ${result.rowNumber}`);
          return result;
        }
      }
      
      console.log(`[DIRECT SEARCH] HS code ${hsCode} not found in any sheet`);
      return null;
      
    } catch (error) {
      console.error('[DIRECT SEARCH] Error:', error);
      return null;
    }
  }
  
  /**
   * Search within a specific sheet
   */
  private static async searchInSheet(
    sheetName: string, 
    originalHsCode: string, 
    cleanHsCode: string
  ): Promise<DirectSearchResult | null> {
    const worksheet = this.loadWorkbook().Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Special debug for 8539.22.80 in Table 203
    if (originalHsCode === '8539.22.80' && sheetName === 'Table 203') {
      console.log(`[DEBUG] Table 203 has ${data.length} rows`);
      // Check around row 546 specifically
      for (let i = 540; i < Math.min(550, data.length); i++) {
        const row = data[i] as any[];
        if (row && row.length > 0) {
          const cellValue = String(row[0] || '').trim();
          console.log(`[DEBUG] Row ${i + 1}, Cell[0]: "${cellValue}"`);
          if (cellValue === '8539.22.80' || cellValue.includes('8539.22.80')) {
            console.log(`[DEBUG] EXACT MATCH FOUND at row ${i + 1}!`);
            console.log(`[DEBUG] Full row:`, row.slice(0, 6));
          }
        }
      }
    }
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i] as any[];
      if (!row || row.length === 0) continue;
      
      // Check each cell in the first 3 columns for HS codes
      for (let j = 0; j < Math.min(3, row.length); j++) {
        const cellValue = String(row[j] || '').trim();
        
        if (this.cellContainsHSCode(cellValue, originalHsCode, cleanHsCode)) {
          // Extract duty rate from this row
          const rateInfo = this.extractCompleteRowData(row, data, i);
          
          if (rateInfo.rate) {
            return {
              hsCode: originalHsCode,
              description: rateInfo.description || `Product under HS ${originalHsCode}`,
              generalRate: rateInfo.rate,
              specialRate: rateInfo.specialRate || '',
              unit: rateInfo.unit || '',
              chapter: parseInt(originalHsCode.substring(0, 2)),
              percentage: this.parseRate(rateInfo.rate).percentage,
              sheetName,
              rowNumber: i + 1,
              confidence: 1.0
            };
          }
        }
      }
    }
    
    return null;
  }
  
  /**
   * Enhanced cell checking for HS codes
   */
  private static cellContainsHSCode(cellValue: string, originalHsCode: string, cleanHsCode: string): boolean {
    if (!cellValue) return false;
    
    // Handle multi-line cells (like "4302\r\n4302.11.00")
    const cleanedCell = cellValue.replace(/[\r\n]/g, ' ').trim();
    
    // Pattern 1: Exact match with dots
    if (cleanedCell === originalHsCode) {
      return true;
    }
    
    // Pattern 2: Contains the HS code anywhere in the cell
    if (cleanedCell.includes(originalHsCode)) {
      return true;
    }
    
    // Pattern 3: Regex pattern matching with word boundaries
    const dotPattern = new RegExp(`\\b${originalHsCode.replace(/\./g, '\\.')}\\b`);
    if (dotPattern.test(cleanedCell)) {
      return true;
    }
    
    // Pattern 4: Without dots (cleaned format)
    const noDotPattern = new RegExp(`\\b${cleanHsCode}\\b`);
    if (noDotPattern.test(cleanedCell.replace(/\./g, ''))) {
      return true;
    }
    
    // Pattern 5: Check if cell starts with chapter and contains full code
    const chapter = originalHsCode.substring(0, 2);
    if (cleanedCell.startsWith(chapter) && cleanedCell.includes(originalHsCode)) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Extract complete row data including rate and description
   */
  private static extractCompleteRowData(
    row: any[], 
    allData: any[][], 
    rowIndex: number
  ): { rate: string; description: string; specialRate: string; unit: string } {
    let rate = '';
    let description = '';
    let specialRate = '';
    let unit = '';
    
    // Try to find rate in current row
    rate = this.findRateInRow(row);
    
    // Try to find description (usually in column 2)
    if (row.length > 2) {
      description = String(row[2] || '').trim();
    }
    
    // Try to find unit (usually in column 3)
    if (row.length > 3) {
      unit = String(row[3] || '').trim();
    }
    
    // Try to find special rate (usually in column 5)
    if (row.length > 5) {
      specialRate = String(row[5] || '').trim();
    }
    
    // If no rate found in current row, check adjacent rows
    if (!rate) {
      for (let i = 1; i <= 3; i++) {
        if (rowIndex + i < allData.length) {
          const nextRow = allData[rowIndex + i];
          rate = this.findRateInRow(nextRow);
          if (rate) break;
        }
      }
    }
    
    return { rate, description, specialRate, unit };
  }
  
  /**
   * Find duty rate in a row
   */
  private static findRateInRow(row: any[]): string {
    if (!row) return '';
    
    for (let i = 0; i < row.length; i++) {
      const cellValue = String(row[i] || '').trim();
      if (this.isRatePattern(cellValue)) {
        return cellValue;
      }
    }
    return '';
  }
  
  /**
   * Check if text looks like a duty rate
   */
  private static isRatePattern(value: string): boolean {
    if (!value || value.length > 100) return false;
    
    // Enhanced rate patterns
    const patterns = [
      /%/,                    // Percentage
      /¢/,                    // Cents
      /\$/,                   // Dollar
      /^free$/i,              // Free
      /\d+\.?\d*[¢%]/,       // Number with cents or percent
      /free.*\d+/i,          // "Free" followed by number
      /\d+\.?\d*.*kg/,       // Rate per kg
      /\d+\.?\d*.*doz/,      // Rate per dozen
      /^\d+\.?\d*%\d*\/.*$/  // Pattern like "2.1%2/"
    ];
    
    return patterns.some(pattern => pattern.test(value));
  }
  
  /**
   * Parse duty rate to percentage
   */
  private static parseRate(rate: string): { percentage: number } {
    if (!rate) return { percentage: 0 };
    
    // Handle "Free" case
    if (/free/i.test(rate)) {
      return { percentage: 0 };
    }
    
    // Extract percentage (handle formats like "2.1%2/")
    const percentMatch = rate.match(/(\d+\.?\d*)%/);
    if (percentMatch) {
      return { percentage: parseFloat(percentMatch[1]) / 100 };
    }
    
    // Handle cents (rough conversion)
    const centsMatch = rate.match(/(\d+\.?\d*)¢/);
    if (centsMatch) {
      const cents = parseFloat(centsMatch[1]);
      return { percentage: cents / 100 };
    }
    
    return { percentage: 0 };
  }
  
  /**
   * Normalize HS code for comparison
   */
  private static normalizeHSCode(raw: string): string {
    if (!raw) return '';
    
    // Remove all non-numeric characters except dots
    let cleaned = raw.replace(/[^\d\.]/g, '');
    
    // Remove dots for comparison
    const numbersOnly = cleaned.replace(/\./g, '');
    
    return numbersOnly;
  }
}