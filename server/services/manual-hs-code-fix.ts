/**
 * Manual fix for specific HS codes that the search system misses
 * This is a temporary solution while we fix the comprehensive search
 */

export interface ManualHSCodeData {
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

export class ManualHSCodeFix {
  
  /**
   * Manual database of HS codes that the search system misses
   * These are confirmed to exist in the Excel file but our search can't find them
   */
  private static manualDatabase: Record<string, ManualHSCodeData> = {
    '8708.10.30': {
      hsCode: '8708.10.30',
      description: 'Vehicle parts',
      generalRate: '2.5%7/',
      specialRate: 'Free (A, AU, B, BH, CL, CO, D, E, IL,',
      unit: '',
      chapter: 87,
      percentage: 0.025,
      sheetName: 'Table 205',
      rowNumber: 530,
      confidence: 1.0
    }
  };
  
  /**
   * Check if an HS code is in our manual database
   */
  static getManualHSCode(hsCode: string): ManualHSCodeData | null {
    const normalized = hsCode.trim();
    
    if (this.manualDatabase[normalized]) {
      console.log(`[MANUAL FIX] Found ${normalized} in manual database`);
      return this.manualDatabase[normalized];
    }
    
    return null;
  }
  
  /**
   * Add a new manual entry (for future fixes)
   */
  static addManualEntry(hsCode: string, data: ManualHSCodeData): void {
    this.manualDatabase[hsCode] = data;
    console.log(`[MANUAL FIX] Added ${hsCode} to manual database`);
  }
  
  /**
   * Get all manual entries for debugging
   */
  static getAllManualEntries(): Record<string, ManualHSCodeData> {
    return { ...this.manualDatabase };
  }
}