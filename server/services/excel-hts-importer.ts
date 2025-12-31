/**
 * Excel HTS Importer
 * Reads comprehensive HS code data from Excel file and imports to database
 */

import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { db } from '../db.js';
import { htsData, type InsertHTSData } from '@shared/schema.js';

export interface ExcelHTSEntry {
  hsCode: string;
  description: string;
  generalRate: string;
  specialRate?: string;
  unit?: string;
  chapter: number;
  percentage: number;
}

export class ExcelHTSImporter {
  private static excelPath = path.resolve('../attached_assets/finalcopy_2025htsrev21_1757188055443.xlsx');
  
  /**
   * Import all HS codes from Excel file to database
   */
  static async importAllHSCodes(): Promise<number> {
    try {
      console.log('[EXCEL IMPORTER] Starting import of HS codes from Excel...');
      
      if (!fs.existsSync(this.excelPath)) {
        throw new Error(`Excel file not found: ${this.excelPath}`);
      }
      
      // Read the Excel file
      const workbook = XLSX.readFile(this.excelPath);
      const sheetNames = workbook.SheetNames;
      console.log(`[EXCEL IMPORTER] Found ${sheetNames.length} sheets: ${sheetNames.join(', ')}`);
      
      let totalImported = 0;
      
      // Process each sheet
      for (const sheetName of sheetNames) {
        const imported = await this.processSheet(workbook, sheetName);
        totalImported += imported;
      }
      
      console.log(`[EXCEL IMPORTER] Successfully imported ${totalImported} HS codes`);
      return totalImported;
      
    } catch (error) {
      console.error('[EXCEL IMPORTER] Error importing HS codes:', error);
      throw error;
    }
  }
  
  /**
   * Process a single sheet from the Excel file
   */
  private static async processSheet(workbook: XLSX.WorkBook, sheetName: string): Promise<number> {
    console.log(`[EXCEL IMPORTER] Processing sheet: ${sheetName}`);
    
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (data.length === 0) {
      console.log(`[EXCEL IMPORTER] Sheet ${sheetName} is empty, skipping`);
      return 0;
    }
    
    // Find header row and column mappings
    const headers = this.findHeaders(data);
    if (!headers) {
      console.log(`[EXCEL IMPORTER] Could not find valid headers in sheet ${sheetName}, skipping`);
      return 0;
    }
    
    console.log(`[EXCEL IMPORTER] Found headers at row ${headers.rowIndex}:`, headers.columns);
    
    // Process data rows
    const hsEntries: InsertHTSData[] = [];
    
    for (let i = headers.rowIndex + 1; i < data.length; i++) {
      const row = data[i] as any[];
      const entry = this.parseRow(row, headers.columns);
      
      if (entry) {
        hsEntries.push(entry);
      }
    }
    
    console.log(`[EXCEL IMPORTER] Parsed ${hsEntries.length} valid entries from sheet ${sheetName}`);
    
    // Batch insert to database
    if (hsEntries.length > 0) {
      await this.batchInsertEntries(hsEntries);
    }
    
    return hsEntries.length;
  }
  
  /**
   * Find header row and map column positions
   * For HTS Excel format: Column 0=HS Code, 2=Description, 3=Unit, 4=General Rate
   */
  private static findHeaders(data: any[]): { rowIndex: number; columns: any } | null {
    // Look for header row with "Heading/ Subheading" or similar
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i] as any[];
      if (!row) continue;
      
      const firstCell = String(row[0] || '').toLowerCase();
      
      // Check if this looks like the HTS header row
      if (firstCell.includes('heading') || firstCell.includes('subheading') || 
          firstCell.includes('tariff') || firstCell.includes('hts')) {
        
        // Fixed column mapping based on HTS Excel structure
        return {
          rowIndex: i,
          columns: {
            hsCode: 0,        // HS Code in first column
            description: 2,   // Description in third column  
            unit: 3,          // Unit in fourth column
            generalRate: 4,   // General rate in fifth column
            specialRate: 5    // Special rate in sixth column
          }
        };
      }
    }
    
    // If no header found, assume standard HTS format
    return {
      rowIndex: 0,
      columns: {
        hsCode: 0,
        description: 2,
        unit: 3,
        generalRate: 4,
        specialRate: 5
      }
    };
  }
  
  /**
   * Parse a single row into HS entry
   */
  private static parseRow(row: any[], columns: any): InsertHTSData | null {
    try {
      const hsCodeRaw = String(row[columns.hsCode] || '').trim();
      const generalRateRaw = String(row[columns.generalRate] || '').trim();
      const descriptionRaw = String(row[columns.description] || '').trim();
      const unitRaw = String(row[columns.unit] || '').trim();
      const specialRateRaw = String(row[columns.specialRate] || '').trim();
      
      // Skip rows without HS code or empty rows
      if (!hsCodeRaw || hsCodeRaw.length < 4) {
        return null;
      }
      
      // Skip description-only rows or dots
      if (hsCodeRaw.startsWith('.') || hsCodeRaw === 'Other' || hsCodeRaw.length < 4) {
        return null;
      }
      
      // Clean and format HS code
      const hsCode = this.cleanHSCode(hsCodeRaw);
      if (!hsCode) {
        return null;
      }
      
      // Skip if not a valid HS code format
      if (!/^\d{4}\.\d{2}\.\d{2}$/.test(hsCode)) {
        return null;
      }
      
      // Parse duty rate
      const { generalRate, percentage } = this.parseDutyRate(generalRateRaw);
      
      // Clean description - remove excessive whitespace and newlines
      const cleanDescription = descriptionRaw
        .replace(/\r?\n/g, ' ')
        .replace(/\s+/g, ' ')
        .substring(0, 500) // Limit length
        .trim() || `Product under HS ${hsCode}`;
      
      return {
        hsCode,
        description: cleanDescription,
        generalRate,
        specialRate: specialRateRaw,
        unit: unitRaw || undefined,
        chapter: parseInt(hsCode.substring(0, 2)),
        percentage,
        source: 'excel_import_2025',
        isActive: true
      };
      
    } catch (error) {
      console.warn('[EXCEL IMPORTER] Error parsing row:', error);
      return null;
    }
  }
  
  /**
   * Clean and validate HS code format
   */
  private static cleanHSCode(raw: string): string | null {
    // Remove all non-numeric characters except dots
    let cleaned = raw.replace(/[^\d\.]/g, '');
    
    // Remove dots for processing
    const numbersOnly = cleaned.replace(/\./g, '');
    
    // Validate length
    if (numbersOnly.length < 6 || numbersOnly.length > 10) {
      return null;
    }
    
    // Format as standard HS code (XXXX.XX.XX)
    if (numbersOnly.length >= 8) {
      return `${numbersOnly.substring(0, 4)}.${numbersOnly.substring(4, 6)}.${numbersOnly.substring(6)}`;
    } else if (numbersOnly.length >= 6) {
      return `${numbersOnly.substring(0, 4)}.${numbersOnly.substring(4, 6)}.00`;
    }
    
    return null;
  }
  
  /**
   * Parse duty rate from various formats
   */
  private static parseDutyRate(raw: string): { generalRate: string; percentage: number } {
    if (!raw) {
      return { generalRate: '0%', percentage: 0 };
    }
    
    // Check for "Free" rates
    if (/free/i.test(raw)) {
      return { generalRate: 'Free', percentage: 0 };
    }
    
    // Extract percentage
    const percentMatch = raw.match(/(\d+(?:\.\d+)?)\s*%/);
    if (percentMatch) {
      const percent = parseFloat(percentMatch[1]);
      return { generalRate: `${percent}%`, percentage: percent / 100 };
    }
    
    // Extract cents per unit
    const centsMatch = raw.match(/(\d+(?:\.\d+)?)\s*¢/);
    if (centsMatch) {
      const cents = parseFloat(centsMatch[1]);
      return { generalRate: `${cents}¢/kg`, percentage: cents / 100 };
    }
    
    // Extract dollar amounts
    const dollarMatch = raw.match(/\$(\d+(?:\.\d+)?)/);
    if (dollarMatch) {
      const dollars = parseFloat(dollarMatch[1]);
      return { generalRate: `$${dollars}`, percentage: dollars * 0.01 };
    }
    
    // Default case - try to extract any number
    const numberMatch = raw.match(/(\d+(?:\.\d+)?)/);
    if (numberMatch) {
      const number = parseFloat(numberMatch[1]);
      // If number is less than 1, assume it's already a decimal
      if (number < 1) {
        return { generalRate: `${(number * 100).toFixed(1)}%`, percentage: number };
      } else {
        return { generalRate: `${number}%`, percentage: number / 100 };
      }
    }
    
    return { generalRate: raw, percentage: 0.05 }; // Default 5%
  }
  
  /**
   * Batch insert entries to database
   */
  private static async batchInsertEntries(entries: InsertHTSData[]): Promise<void> {
    const batchSize = 100;
    
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);
      
      try {
        await db.insert(htsData).values(batch).onConflictDoUpdate({
          target: htsData.hsCode,
          set: {
            description: batch[0].description,
            generalRate: batch[0].generalRate,
            percentage: batch[0].percentage,
            updatedAt: new Date()
          }
        });
        
        console.log(`[EXCEL IMPORTER] Inserted batch ${Math.floor(i / batchSize) + 1}: ${batch.length} entries`);
        
      } catch (error) {
        console.error(`[EXCEL IMPORTER] Error inserting batch:`, error);
        // Continue with next batch
      }
    }
  }
  
  /**
   * Get count of HS codes in database
   */
  static async getHTSCount(): Promise<number> {
    try {
      const result = await db.select().from(htsData);
      return result.length;
    } catch (error) {
      console.error('[EXCEL IMPORTER] Error getting HTS count:', error);
      return 0;
    }
  }
}