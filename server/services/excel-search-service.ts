/**
 * Excel Search Service
 * Real-time search through Excel file for HS codes and tax rates
 */

import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

export interface ExcelHTSResult {
  hsCode: string;
  description: string;
  generalRate: string;
  specialRate?: string;
  unit?: string;
  chapter: number;
  percentage: number;
  sheetName: string;
  rowNumber: number;
}

export class ExcelSearchService {
  private static excelPath = '/home/runner/workspace/attached_assets/finalcopy_2025htsrev21_1757188055443.xlsx';
  private static workbook: XLSX.WorkBook | null = null;
  
  /**
   * Initialize the Excel workbook (load once, use many times)
   */
  private static loadWorkbook(): XLSX.WorkBook {
    if (!this.workbook) {
      console.log('[EXCEL SEARCH] Loading Excel workbook...');
      
      if (!fs.existsSync(this.excelPath)) {
        throw new Error(`Excel file not found: ${this.excelPath}`);
      }
      
      this.workbook = XLSX.readFile(this.excelPath);
      console.log(`[EXCEL SEARCH] Loaded workbook with ${this.workbook.SheetNames.length} sheets`);
    }
    
    return this.workbook;
  }
  
  /**
   * Search for an HS code across all sheets in the Excel file
   */
  static async searchHSCode(hsCode: string): Promise<ExcelHTSResult | null> {
    try {
      console.log(`[EXCEL SEARCH] Searching for HS code: ${hsCode}`);
      
      const workbook = this.loadWorkbook();
      const cleanHsCode = this.cleanHSCode(hsCode);
      
      // Search through all sheets
      for (const sheetName of workbook.SheetNames) {
        const result = await this.searchInSheet(workbook, sheetName, cleanHsCode, hsCode);
        if (result) {
          console.log(`[EXCEL SEARCH] Found HS code ${hsCode} in sheet ${sheetName} at row ${result.rowNumber}`);
          return result;
        }
      }
      
      console.log(`[EXCEL SEARCH] HS code ${hsCode} not found in any sheet`);
      return null;
      
    } catch (error) {
      console.error('[EXCEL SEARCH] Error searching Excel file:', error);
      return null;
    }
  }
  
  /**
   * Search for HS code in a specific sheet
   */
  private static async searchInSheet(
    workbook: XLSX.WorkBook, 
    sheetName: string, 
    cleanHsCode: string, 
    originalHsCode: string
  ): Promise<ExcelHTSResult | null> {
    try {
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (data.length === 0) {
        return null;
      }
      
      // Search each row for the HS code
      for (let i = 0; i < data.length; i++) {
        const row = data[i] as any[];
        if (!row || row.length === 0) continue;
        
        // Check if any cell in the row contains our HS code
        for (let j = 0; j < row.length; j++) {
          const cellValue = String(row[j] || '').trim();
          
          if (this.isHSCodeMatch(cellValue, cleanHsCode, originalHsCode)) {
            // Found the HS code, now extract the duty rate
            // Try current row first
            let result = this.extractDutyRateFromRow(row, sheetName, i + 1, cleanHsCode);
            if (result) {
              return result;
            }
            
            // If no rate in current row, check next row (common in HTS format)
            if (i + 1 < data.length) {
              const nextRow = data[i + 1] as any[];
              result = this.extractDutyRateFromRow(nextRow, sheetName, i + 2, cleanHsCode);
              if (result) {
                return result;
              }
            }
            
            // If still no rate, check row after that
            if (i + 2 < data.length) {
              const nextNextRow = data[i + 2] as any[];
              result = this.extractDutyRateFromRow(nextNextRow, sheetName, i + 3, cleanHsCode);
              if (result) {
                return result;
              }
            }
          }
        }
      }
      
      return null;
      
    } catch (error) {
      console.warn(`[EXCEL SEARCH] Error searching sheet ${sheetName}:`, error);
      return null;
    }
  }
  
  /**
   * Check if a cell value matches our HS code
   */
  private static isHSCodeMatch(cellValue: string, cleanHsCode: string, originalHsCode: string): boolean {
    if (!cellValue) return false;
    
    // Direct match
    if (cellValue.includes(cleanHsCode) || cellValue.includes(originalHsCode)) {
      return true;
    }
    
    // Clean and compare
    const cleanCellValue = this.cleanHSCode(cellValue);
    if (cleanCellValue === cleanHsCode) {
      return true;
    }
    
    // Check for partial matches (like 6115.10.30 in "6115.10.30" or "(con.) 6115.10.30")
    const hsCodePattern = cleanHsCode.replace(/\./g, '\\.');
    const regex = new RegExp(`\\b${hsCodePattern}\\b`);
    
    return regex.test(cellValue);
  }
  
  /**
   * Extract duty rate information from a row that contains the HS code
   */
  private static extractDutyRateFromRow(
    row: any[], 
    sheetName: string, 
    rowNumber: number, 
    hsCode: string
  ): ExcelHTSResult | null {
    try {
      // Common HTS Excel structure patterns:
      // Column 0: HS Code
      // Column 2: Description  
      // Column 3: Unit
      // Column 4: General Rate
      // Column 5: Special Rate
      
      let generalRate = '';
      let description = '';
      let unit = '';
      let specialRate = '';
      
      // Try to find the general rate in typical positions
      for (let i = 0; i < row.length; i++) {
        const cellValue = String(row[i] || '').trim();
        
        // Look for duty rate patterns (percentage or monetary)
        if (this.isDutyRatePattern(cellValue)) {
          generalRate = cellValue;
          break;
        }
      }
      
      // Try to find description
      for (let i = 0; i < row.length; i++) {
        const cellValue = String(row[i] || '').trim();
        if (cellValue.length > 20 && !this.isDutyRatePattern(cellValue) && !cellValue.includes(hsCode)) {
          description = cellValue;
          break;
        }
      }
      
      // Try to find unit (usually shorter text, may contain "kg", "doz", etc.)
      for (let i = 0; i < row.length; i++) {
        const cellValue = String(row[i] || '').trim();
        if (cellValue.length < 30 && (cellValue.includes('kg') || cellValue.includes('doz') || cellValue.includes('No.'))) {
          unit = cellValue;
          break;
        }
      }
      
      // If no general rate found, skip this row
      if (!generalRate) {
        return null;
      }
      
      // Parse the percentage
      const { percentage } = this.parseDutyRate(generalRate);
      
      return {
        hsCode,
        description: description || `Product under HS ${hsCode}`,
        generalRate,
        specialRate,
        unit,
        chapter: parseInt(hsCode.substring(0, 2)),
        percentage,
        sheetName,
        rowNumber
      };
      
    } catch (error) {
      console.warn('[EXCEL SEARCH] Error extracting duty rate from row:', error);
      return null;
    }
  }
  
  /**
   * Check if a string looks like a duty rate
   */
  private static isDutyRatePattern(value: string): boolean {
    if (!value) return false;
    
    // Check for percentage
    if (/%/.test(value) && /\d/.test(value)) return true;
    
    // Check for cents
    if (/¢/.test(value) && /\d/.test(value)) return true;
    
    // Check for dollar amounts
    if (/\$/.test(value) && /\d/.test(value)) return true;
    
    // Check for "Free"
    if (/free/i.test(value)) return true;
    
    return false;
  }
  
  /**
   * Clean and standardize HS code format
   */
  private static cleanHSCode(raw: string): string {
    // Remove all non-numeric characters except dots
    let cleaned = raw.replace(/[^\d\.]/g, '');
    
    // Remove dots for processing
    const numbersOnly = cleaned.replace(/\./g, '');
    
    // Validate length
    if (numbersOnly.length < 6 || numbersOnly.length > 10) {
      return raw; // Return original if invalid
    }
    
    // Format as standard HS code (XXXX.XX.XX)
    if (numbersOnly.length >= 8) {
      return `${numbersOnly.substring(0, 4)}.${numbersOnly.substring(4, 6)}.${numbersOnly.substring(6)}`;
    } else if (numbersOnly.length >= 6) {
      return `${numbersOnly.substring(0, 4)}.${numbersOnly.substring(4, 6)}.00`;
    }
    
    return raw;
  }
  
  /**
   * Parse duty rate from various formats
   */
  private static parseDutyRate(raw: string): { percentage: number } {
    if (!raw) {
      return { percentage: 0 };
    }
    
    // Check for "Free" rates
    if (/free/i.test(raw)) {
      return { percentage: 0 };
    }
    
    // Extract percentage
    const percentMatch = raw.match(/(\d+(?:\.\d+)?)\s*%/);
    if (percentMatch) {
      const percent = parseFloat(percentMatch[1]);
      return { percentage: percent / 100 };
    }
    
    // Extract cents per unit - estimate as low percentage
    const centsMatch = raw.match(/(\d+(?:\.\d+)?)\s*¢/);
    if (centsMatch) {
      const cents = parseFloat(centsMatch[1]);
      return { percentage: cents / 100 }; // Rough estimate
    }
    
    // Extract dollar amounts - estimate as percentage
    const dollarMatch = raw.match(/\$(\d+(?:\.\d+)?)/);
    if (dollarMatch) {
      const dollars = parseFloat(dollarMatch[1]);
      return { percentage: dollars * 0.01 }; // Rough estimate
    }
    
    // Default case
    return { percentage: 0 };
  }
  
  /**
   * Get statistics about the Excel file
   */
  static async getExcelStats(): Promise<{
    totalSheets: number;
    sheetNames: string[];
    sampleData: any;
  }> {
    try {
      const workbook = this.loadWorkbook();
      
      return {
        totalSheets: workbook.SheetNames.length,
        sheetNames: workbook.SheetNames.slice(0, 10), // First 10 sheet names
        sampleData: `Excel file loaded successfully with ${workbook.SheetNames.length} sheets`
      };
      
    } catch (error) {
      console.error('[EXCEL SEARCH] Error getting Excel stats:', error);
      return {
        totalSheets: 0,
        sheetNames: [],
        sampleData: 'Error loading Excel file'
      };
    }
  }
}