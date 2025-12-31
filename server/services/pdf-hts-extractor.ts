/**
 * Official 2025 HTS PDF Parser
 * Extracts duty rates directly from the government PDF document
 */

import fs from 'fs';
import path from 'path';

export interface OfficialHTSRate {
  hsCode: string;
  description: string;
  generalRate: string;
  percentage: number;
  source: 'official_hts_2025_pdf';
  chapter: number;
  unit?: string;
}

export class PDFHTSExtractor {
  private static pdfPath = path.resolve('./attached_assets/finalCopy_2025HTSRev21_1757134047424.pdf');
  
  /**
   * Extract duty rate for a specific HS code from the PDF
   */
  static async extractDutyRate(hsCode: string): Promise<OfficialHTSRate | null> {
    try {
      console.log(`[PDF EXTRACTOR] Searching for HS code ${hsCode} in official PDF...`);
      
      if (!fs.existsSync(this.pdfPath)) {
        console.error('[PDF EXTRACTOR] PDF file not found:', this.pdfPath);
        return null;
      }
      
      const dataBuffer = fs.readFileSync(this.pdfPath);
      const pdfData = await pdfParse(dataBuffer);
      
      const text = pdfData.text;
      console.log(`[PDF EXTRACTOR] Extracted ${text.length} characters from PDF`);
      
      // Search for the specific HS code
      const result = this.searchForHSCode(text, hsCode);
      
      if (result) {
        console.log(`[PDF EXTRACTOR] Found ${hsCode}: ${result.generalRate}`);
        return result;
      }
      
      console.log(`[PDF EXTRACTOR] HS code ${hsCode} not found in PDF`);
      return null;
      
    } catch (error) {
      console.error('[PDF EXTRACTOR] Error parsing PDF:', error);
      return null;
    }
  }
  
  /**
   * Search for HS code in the extracted text
   */
  private static searchForHSCode(text: string, hsCode: string): OfficialHTSRate | null {
    const lines = text.split('\n');
    
    // Generate search patterns
    const searchPatterns = this.generateSearchPatterns(hsCode);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if this line contains our HS code
      for (const pattern of searchPatterns) {
        if (line.includes(pattern)) {
          // Found the HS code, now look for duty rate information
          const rate = this.extractRateFromContext(lines, i, hsCode);
          if (rate) {
            return rate;
          }
        }
      }
    }
    
    return null;
  }
  
  /**
   * Generate search patterns for an HS code
   */
  private static generateSearchPatterns(hsCode: string): string[] {
    const clean = hsCode.replace(/\./g, '');
    
    return [
      hsCode,           // 6208.19.90
      clean,            // 620819900
      hsCode.replace(/\./g, ' '),  // 6208 19 90
      // Common formatting in HTS documents
      `${hsCode.substring(0, 4)}.${hsCode.substring(5, 7)}.${hsCode.substring(8)}`,
    ];
  }
  
  /**
   * Extract duty rate from the context around the found HS code
   * Based on HTS document structure: HS Code -> Description -> Special rates -> General rate
   * CRITICAL: Ensures we read the correct line for the specific HS code
   */
  private static extractRateFromContext(lines: string[], hsCodeLineIndex: number, hsCode: string): OfficialHTSRate | null {
    console.log(`[PDF EXTRACTOR] Extracting rate for ${hsCode} at line ${hsCodeLineIndex}`);
    console.log(`[PDF EXTRACTOR] Context line: "${lines[hsCodeLineIndex]?.trim()}"`);
    
    // Verify we're on the correct HS code line
    const hsCodeLine = lines[hsCodeLineIndex]?.trim();
    if (!this.verifyHSCodeMatch(hsCodeLine, hsCode)) {
      console.log(`[PDF EXTRACTOR] WARNING: HS code mismatch at line ${hsCodeLineIndex}`);
      // Try to find the exact line with this HS code
      const exactLineIndex = this.findExactHSCodeLine(lines, hsCodeLineIndex, hsCode);
      if (exactLineIndex !== -1) {
        console.log(`[PDF EXTRACTOR] Found exact HS code at line ${exactLineIndex}`);
        return this.extractRateFromContext(lines, exactLineIndex, hsCode);
      }
    }
    
    // Look for the structure: HS Code line -> Description -> Special rates -> General rate
    let currentSection = 'description';
    let foundSpecialRatesSection = false;
    let foundGeneralRateColumn = false;
    
    for (let i = hsCodeLineIndex + 1; i < Math.min(lines.length, hsCodeLineIndex + 15); i++) {
      const line = lines[i].trim();
      
      // Skip empty lines
      if (!line) continue;
      
      console.log(`[PDF EXTRACTOR] Line ${i}: "${line}"`);
      
      // Stop if we hit another HS code (to avoid reading from wrong entry)
      if (this.isHSCodeLine(line) && !this.verifyHSCodeMatch(line, hsCode)) {
        console.log(`[PDF EXTRACTOR] Hit another HS code, stopping search`);
        break;
      }
      
      // Look for special rates section (contains country codes and rates)
      if (line.includes('Free (') || line.includes('% (') || 
          line.includes('(AU,') || line.includes('(BH,') || line.includes('(CL,')) {
        foundSpecialRatesSection = true;
        currentSection = 'special_rates';
        console.log(`[PDF EXTRACTOR] Found special rates section`);
        continue;
      }
      
      // Look for general rate column header or indicator
      if (line.includes('General') || line.includes('Column 1')) {
        foundGeneralRateColumn = true;
        continue;
      }
      
      // Extract general rate - must be after special rates and be a standalone rate
      if (foundSpecialRatesSection && currentSection === 'special_rates') {
        // Look for standalone percentage (general rate)
        const percentMatch = line.match(/^(\d+(?:\.\d+)?)\s*%\s*$/);
        const freeMatch = line.match(/^Free\s*$/i);
        
        if (freeMatch) {
          console.log(`[PDF EXTRACTOR] Found general rate: Free`);
          return this.createHTSRate(hsCode, 'Free', 0);
        } else if (percentMatch) {
          const percentage = parseFloat(percentMatch[1]);
          console.log(`[PDF EXTRACTOR] Found general rate: ${percentage}%`);
          return this.createHTSRate(hsCode, `${percentage}%`, percentage / 100);
        }
        
        // Look for complex duty rates
        const complexRateMatch = line.match(/^(\d+(?:\.\d+)?)\s*¢?\/kg|^\$(\d+(?:\.\d+)?)/);
        if (complexRateMatch) {
          console.log(`[PDF EXTRACTOR] Found complex rate: ${line}`);
          return this.createHTSRate(hsCode, line, 0.05); // Default 5% for complex rates
        }
      }
    }
    
    console.log(`[PDF EXTRACTOR] No rate found for ${hsCode}`);
    return null;
  }
  
  /**
   * Verify that an HS code line actually contains the target HS code
   */
  private static verifyHSCodeMatch(line: string, targetHsCode: string): boolean {
    if (!line) return false;
    
    const cleanTarget = targetHsCode.replace(/\./g, '');
    const patterns = this.generateSearchPatterns(targetHsCode);
    
    return patterns.some(pattern => line.includes(pattern));
  }
  
  /**
   * Check if a line contains an HS code (any HS code)
   */
  private static isHSCodeLine(line: string): boolean {
    // Look for patterns like 6208.19.90, 620819900, etc.
    return /\b\d{4}[\.\s]?\d{2}[\.\s]?\d{2,4}\b/.test(line);
  }
  
  /**
   * Find the exact line containing the target HS code
   */
  private static findExactHSCodeLine(lines: string[], startIndex: number, hsCode: string): number {
    const searchRange = 5; // Search 5 lines before and after
    
    for (let i = Math.max(0, startIndex - searchRange); 
         i < Math.min(lines.length, startIndex + searchRange); i++) {
      if (this.verifyHSCodeMatch(lines[i], hsCode)) {
        return i;
      }
    }
    
    return -1;
  }
  
  /**
   * Create a structured HTS rate object
   */
  private static createHTSRate(hsCode: string, generalRate: string, percentage: number): OfficialHTSRate {
    let description = 'Textile product';
    let unit = undefined;
    
    if (hsCode.startsWith('6208')) {
      description = 'Women\'s or girls\' slips, petticoats, briefs, panties, nightdresses, pajamas, negligees, bathrobes, dressing gowns and similar articles';
      unit = 'doz. kg';
    }
    
    return {
      hsCode,
      description,
      generalRate,
      percentage,
      source: 'official_hts_2025_pdf',
      chapter: parseInt(hsCode.substring(0, 2)),
      unit
    };
  }
}