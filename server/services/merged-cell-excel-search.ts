/**
 * Merged Cell Aware Excel Search Service
 * Handles Excel files with merged cells and complex layouts
 * Specialized for HTS Excel format challenges
 */

import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

export interface MergedCellResult {
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
  extractionMethod: string;
}

export class MergedCellExcelSearch {
  private static excelPath = '/home/runner/workspace/attached_assets/finalcopy_2025htsrev21_1757188055443.xlsx';
  private static workbook: XLSX.WorkBook | null = null;
  private static mergeCache: Map<string, any[]> = new Map();
  
  /**
   * Load workbook and analyze merge patterns
   */
  private static loadWorkbook(): XLSX.WorkBook {
    if (!this.workbook) {
      console.log('[MERGED CELL SEARCH] Loading Excel workbook with merge analysis...');
      
      if (!fs.existsSync(this.excelPath)) {
        throw new Error(`Excel file not found: ${this.excelPath}`);
      }
      
      this.workbook = XLSX.readFile(this.excelPath);
      console.log(`[MERGED CELL SEARCH] Loaded ${this.workbook.SheetNames.length} sheets`);
    }
    
    return this.workbook;
  }
  
  /**
   * Advanced HS code search with merge cell handling
   */
  static async searchHSCode(hsCode: string): Promise<MergedCellResult | null> {
    try {
      console.log(`[MERGED CELL SEARCH] Searching for: ${hsCode} (merge-aware)`);
      
      const workbook = this.loadWorkbook();
      const cleanHsCode = this.normalizeHSCode(hsCode);
      
      // Multiple extraction strategies for merged cells
      const strategies = [
        { name: 'direct-cell', method: this.directCellStrategy },
        { name: 'column-pattern', method: this.columnPatternStrategy },
        { name: 'row-context', method: this.rowContextStrategy },
        { name: 'merge-reconstruction', method: this.mergeReconstructionStrategy }
      ];
      
      for (const strategy of strategies) {
        for (const sheetName of workbook.SheetNames) {
          const result = await strategy.method.call(this, sheetName, hsCode, cleanHsCode);
          if (result && result.confidence > 0.75) {
            result.extractionMethod = strategy.name;
            console.log(`[MERGED CELL SEARCH] Found ${hsCode} using ${strategy.name} method`);
            return result;
          }
        }
      }
      
      console.log(`[MERGED CELL SEARCH] HS code ${hsCode} not found with merge-aware search`);
      return null;
      
    } catch (error) {
      console.error('[MERGED CELL SEARCH] Error:', error);
      return null;
    }
  }
  
  /**
   * Strategy 1: Direct cell lookup (works when no merging affects the data)
   */
  private static async directCellStrategy(
    sheetName: string, 
    originalHsCode: string, 
    cleanHsCode: string
  ): Promise<MergedCellResult | null> {
    const worksheet = this.loadWorkbook().Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Special debugging for Table 110 and 4302.11.00
    if (sheetName === 'Table 110' && originalHsCode === '4302.11.00') {
      console.log(`[MERGED CELL DEBUG] Checking Table 110 for 4302.11.00`);
      for (let i = 0; i < Math.min(10, data.length); i++) {
        const row = data[i] as any[];
        if (row && row.length > 0) {
          const cellValue = String(row[0] || '').trim();
          console.log(`[DEBUG] Row ${i + 1}, Cell[0]:`, JSON.stringify(cellValue));
          if (cellValue.includes('4302')) {
            console.log(`[DEBUG] Found 4302 reference in row ${i + 1}:`, row.slice(0, 6));
          }
        }
      }
    }
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i] as any[];
      if (!row || row.length === 0) continue;
      
      const cellValue = String(row[0] || '').trim();
      if (this.isExactMatch(cellValue, cleanHsCode, originalHsCode)) {
        const rateInfo = this.extractRateFromStandardRow(row, data, i);
        if (rateInfo.rate) {
          return this.buildResult(originalHsCode, rateInfo, sheetName, i + 1, 0.95);
        }
      }
    }
    
    return null;
  }
  
  /**
   * Strategy 2: Column pattern analysis (handles column shifts due to merges)
   */
  private static async columnPatternStrategy(
    sheetName: string, 
    originalHsCode: string, 
    cleanHsCode: string
  ): Promise<MergedCellResult | null> {
    const worksheet = this.loadWorkbook().Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // First, analyze the column structure for this sheet
    const columnMap = this.analyzeColumnStructure(data);
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i] as any[];
      if (!row || row.length === 0) continue;
      
      // Check multiple possible HS code positions
      for (const hsCol of [0, 1, 2]) {
        if (hsCol < row.length) {
          const cellValue = String(row[hsCol] || '').trim();
          if (this.isExactMatch(cellValue, cleanHsCode, originalHsCode)) {
            const rateInfo = this.extractRateFromMappedColumns(row, data, i, columnMap);
            if (rateInfo.rate) {
              return this.buildResult(originalHsCode, rateInfo, sheetName, i + 1, 0.9);
            }
          }
        }
      }
    }
    
    return null;
  }
  
  /**
   * Strategy 3: Row context analysis (looks across multiple rows for rate info)
   */
  private static async rowContextStrategy(
    sheetName: string, 
    originalHsCode: string, 
    cleanHsCode: string
  ): Promise<MergedCellResult | null> {
    const worksheet = this.loadWorkbook().Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i] as any[];
      if (!row || row.length === 0) continue;
      
      // Check if this row contains our HS code
      if (this.rowContainsHSCode(row, cleanHsCode, originalHsCode)) {
        // Look in surrounding rows for rate information
        const rateInfo = this.extractRateFromContext(data, i, 5); // Look 5 rows around
        if (rateInfo.rate) {
          return this.buildResult(originalHsCode, rateInfo, sheetName, i + 1, 0.85);
        }
      }
    }
    
    return null;
  }
  
  /**
   * Strategy 4: Merge reconstruction (attempts to reconstruct logical table structure)
   */
  private static async mergeReconstructionStrategy(
    sheetName: string, 
    originalHsCode: string, 
    cleanHsCode: string
  ): Promise<MergedCellResult | null> {
    const worksheet = this.loadWorkbook().Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Build a logical table by handling empty cells and merges
    const reconstructedTable = this.reconstructLogicalTable(data);
    
    for (let i = 0; i < reconstructedTable.length; i++) {
      const logicalRow = reconstructedTable[i];
      
      if (this.rowContainsHSCode(logicalRow.cells, cleanHsCode, originalHsCode)) {
        const rateInfo = this.extractRateFromLogicalRow(logicalRow);
        if (rateInfo.rate) {
          return this.buildResult(originalHsCode, rateInfo, sheetName, logicalRow.originalRowIndex, 0.8);
        }
      }
    }
    
    return null;
  }
  
  /**
   * Analyze column structure to map standard HTS columns
   */
  private static analyzeColumnStructure(data: any[][]): {
    hsCodeCol: number;
    descriptionCol: number;
    unitCol: number;
    generalRateCol: number;
    specialRateCol: number;
  } {
    // Default HTS structure
    let mapping = {
      hsCodeCol: 0,
      descriptionCol: 2,
      unitCol: 3,
      generalRateCol: 4,
      specialRateCol: 5
    };
    
    // Look at header rows to detect actual structure
    for (let i = 0; i < Math.min(5, data.length); i++) {
      const row = data[i];
      if (row && row.length > 0) {
        for (let j = 0; j < row.length; j++) {
          const cellValue = String(row[j] || '').toLowerCase();
          
          if (cellValue.includes('heading') || cellValue.includes('subheading')) {
            mapping.hsCodeCol = j;
          } else if (cellValue.includes('description')) {
            mapping.descriptionCol = j;
          } else if (cellValue.includes('unit')) {
            mapping.unitCol = j;
          } else if (cellValue.includes('general')) {
            mapping.generalRateCol = j;
          } else if (cellValue.includes('special')) {
            mapping.specialRateCol = j;
          }
        }
      }
    }
    
    return mapping;
  }
  
  /**
   * Extract rate from standard row structure
   */
  private static extractRateFromStandardRow(
    row: any[], 
    allData: any[][], 
    rowIndex: number
  ): { rate: string; description: string; unit: string } {
    // Try current row first
    let rate = this.findRateInRow(row);
    let description = String(row[2] || '').trim();
    let unit = String(row[3] || '').trim();
    
    // If no rate found, check next few rows
    if (!rate) {
      for (let i = 1; i <= 3; i++) {
        if (rowIndex + i < allData.length) {
          const nextRow = allData[rowIndex + i];
          rate = this.findRateInRow(nextRow);
          if (rate) break;
        }
      }
    }
    
    return { rate, description, unit };
  }
  
  /**
   * Extract rate using column mapping
   */
  private static extractRateFromMappedColumns(
    row: any[], 
    allData: any[][], 
    rowIndex: number, 
    columnMap: any
  ): { rate: string; description: string; unit: string } {
    let rate = '';
    let description = '';
    let unit = '';
    
    // Try mapped columns
    if (columnMap.generalRateCol < row.length) {
      rate = this.cleanRateValue(String(row[columnMap.generalRateCol] || ''));
    }
    
    if (columnMap.descriptionCol < row.length) {
      description = String(row[columnMap.descriptionCol] || '').trim();
    }
    
    if (columnMap.unitCol < row.length) {
      unit = String(row[columnMap.unitCol] || '').trim();
    }
    
    // Fallback: search adjacent rows if no rate found
    if (!rate) {
      for (let i = 1; i <= 3; i++) {
        if (rowIndex + i < allData.length) {
          const nextRow = allData[rowIndex + i];
          if (columnMap.generalRateCol < nextRow.length) {
            rate = this.cleanRateValue(String(nextRow[columnMap.generalRateCol] || ''));
            if (rate) break;
          }
        }
      }
    }
    
    return { rate, description, unit };
  }
  
  /**
   * Extract rate from context (multiple surrounding rows)
   */
  private static extractRateFromContext(
    data: any[][], 
    centerRow: number, 
    contextSize: number
  ): { rate: string; description: string; unit: string } {
    let rate = '';
    let description = '';
    let unit = '';
    
    const startRow = Math.max(0, centerRow - contextSize);
    const endRow = Math.min(data.length, centerRow + contextSize + 1);
    
    for (let i = startRow; i < endRow; i++) {
      const row = data[i];
      if (row && row.length > 0) {
        // Look for rate pattern
        if (!rate) {
          rate = this.findRateInRow(row);
        }
        
        // Look for description
        if (!description) {
          for (let j = 0; j < row.length; j++) {
            const cellValue = String(row[j] || '').trim();
            if (cellValue.length > 20 && !this.isRatePattern(cellValue)) {
              description = cellValue;
              break;
            }
          }
        }
        
        // Look for unit
        if (!unit) {
          for (let j = 0; j < row.length; j++) {
            const cellValue = String(row[j] || '').trim();
            if (this.isUnitPattern(cellValue)) {
              unit = cellValue;
              break;
            }
          }
        }
      }
    }
    
    return { rate, description, unit };
  }
  
  /**
   * Reconstruct logical table structure from fragmented data
   */
  private static reconstructLogicalTable(data: any[][]): Array<{
    cells: any[];
    originalRowIndex: number;
  }> {
    const reconstructed = [];
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;
      
      // Create logical row by filling empty cells with context
      const logicalCells = [...row];
      
      // Fill empty cells with data from nearby rows
      for (let j = 0; j < logicalCells.length; j++) {
        if (!logicalCells[j] || String(logicalCells[j]).trim() === '') {
          // Look in previous rows for non-empty value (merged cell effect)
          for (let k = 1; k <= 5; k++) {
            if (i - k >= 0 && data[i - k] && data[i - k][j]) {
              const candidateValue = String(data[i - k][j]).trim();
              if (candidateValue && candidateValue !== '') {
                logicalCells[j] = candidateValue;
                break;
              }
            }
          }
        }
      }
      
      reconstructed.push({
        cells: logicalCells,
        originalRowIndex: i + 1
      });
    }
    
    return reconstructed;
  }
  
  /**
   * Extract rate from logical reconstructed row
   */
  private static extractRateFromLogicalRow(logicalRow: any): { rate: string; description: string; unit: string } {
    const cells = logicalRow.cells;
    
    let rate = this.findRateInRow(cells);
    let description = String(cells[2] || '').trim();
    let unit = String(cells[3] || '').trim();
    
    // Enhanced search in logical cells
    if (!rate) {
      for (let i = 0; i < cells.length; i++) {
        const cellValue = String(cells[i] || '').trim();
        if (this.isRatePattern(cellValue)) {
          rate = cellValue;
          break;
        }
      }
    }
    
    return { rate, description, unit };
  }
  
  /**
   * Helper functions
   */
  private static isExactMatch(cellValue: string, cleanHsCode: string, originalHsCode: string): boolean {
    if (!cellValue) return false;
    
    // Handle multi-line cells with \r\n line breaks
    const cleanedCell = cellValue.replace(/[\r\n]/g, ' ').trim();
    
    // Check if the cell contains our HS code (for multi-line format like "4302\r\n4302.11.00")
    const hsCodePattern = new RegExp(`\\b${cleanHsCode.replace(/\./g, '\\.')}\\b`);
    const originalPattern = new RegExp(`\\b${originalHsCode.replace(/\./g, '\\.')}\\b`);
    
    if (hsCodePattern.test(cleanedCell) || originalPattern.test(cleanedCell)) {
      return true;
    }
    
    // Fallback to normalized comparison
    const normalized = this.normalizeHSCode(cellValue);
    return normalized === cleanHsCode || cellValue === originalHsCode;
  }
  
  private static rowContainsHSCode(row: any[], cleanHsCode: string, originalHsCode: string): boolean {
    if (!row) return false;
    
    for (let i = 0; i < Math.min(3, row.length); i++) {
      const cellValue = String(row[i] || '').trim();
      
      // Enhanced multi-line cell handling
      const cleanedCell = cellValue.replace(/[\r\n]/g, ' ').trim();
      
      // Check if cell contains our HS code anywhere
      const hsCodePattern = new RegExp(`\\b${cleanHsCode.replace(/\./g, '\\.')}\\b`);
      const originalPattern = new RegExp(`\\b${originalHsCode.replace(/\./g, '\\.')}\\b`);
      
      if (hsCodePattern.test(cleanedCell) || originalPattern.test(cleanedCell)) {
        return true;
      }
      
      // Also check exact match
      if (this.isExactMatch(cellValue, cleanHsCode, originalHsCode)) {
        return true;
      }
    }
    return false;
  }
  
  private static findRateInRow(row: any[]): string {
    if (!row) return '';
    
    for (let i = 0; i < row.length; i++) {
      const cellValue = String(row[i] || '').trim();
      if (this.isRatePattern(cellValue)) {
        return this.cleanRateValue(cellValue);
      }
    }
    return '';
  }
  
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
      /\d+\.?\d*.*doz/       // Rate per dozen
    ];
    
    return patterns.some(pattern => pattern.test(value));
  }
  
  private static isUnitPattern(value: string): boolean {
    if (!value || value.length > 50) return false;
    
    const unitKeywords = ['kg', 'doz', 'No.', 'prs', 'liters', 'm²', 'tons', 'units', 'each'];
    return unitKeywords.some(keyword => value.toLowerCase().includes(keyword.toLowerCase()));
  }
  
  private static cleanRateValue(value: string): string {
    if (!value) return '';
    
    // Clean up the rate value but preserve important formatting
    let cleaned = value.trim();
    
    // Remove excessive whitespace but keep structure
    cleaned = cleaned.replace(/\s+/g, ' ');
    
    return cleaned;
  }
  
  private static normalizeHSCode(raw: string): string {
    if (!raw) return '';
    
    // Remove all non-numeric characters except dots
    let cleaned = raw.replace(/[^\d\.]/g, '');
    
    // Remove dots for comparison
    const numbersOnly = cleaned.replace(/\./g, '');
    
    // Add standard formatting
    if (numbersOnly.length >= 8) {
      return numbersOnly.substring(0, 4) + '.' + 
             numbersOnly.substring(4, 6) + '.' + 
             numbersOnly.substring(6);
    } else if (numbersOnly.length >= 6) {
      return numbersOnly.substring(0, 4) + '.' + 
             numbersOnly.substring(4, 6) + '.00';
    }
    
    return cleaned;
  }
  
  private static buildResult(
    hsCode: string,
    rateInfo: { rate: string; description: string; unit: string },
    sheetName: string,
    rowNumber: number,
    confidence: number
  ): MergedCellResult {
    const { percentage } = this.parseRate(rateInfo.rate);
    
    return {
      hsCode,
      description: rateInfo.description || `Product under HS ${hsCode}`,
      generalRate: rateInfo.rate,
      specialRate: '',
      unit: rateInfo.unit,
      chapter: parseInt(hsCode.substring(0, 2)),
      percentage,
      sheetName,
      rowNumber,
      confidence,
      extractionMethod: ''
    };
  }
  
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
    
    // Handle cents (rough conversion)
    const centsMatch = rate.match(/(\d+\.?\d*)¢/);
    if (centsMatch) {
      const cents = parseFloat(centsMatch[1]);
      return { percentage: cents / 100 };
    }
    
    return { percentage: 0 };
  }
}