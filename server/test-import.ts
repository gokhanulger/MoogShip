/**
 * Test Excel HTS Import
 */

import { ExcelHTSImporter } from './services/excel-hts-importer.js';
import { DatabaseHTSService } from './services/database-hts-service.js';

async function testImport() {
  try {
    console.log('Starting test import...');
    
    // First, run the full import
    const imported = await ExcelHTSImporter.importAllHSCodes();
    console.log(`Successfully imported ${imported} HS codes`);
    
    // Get statistics
    const stats = await DatabaseHTSService.getStats();
    console.log('Database statistics:', stats);
    
    // Test a few lookups
    const testCodes = ['0101.21.00', '6208.19.90', '0406.40.20'];
    
    for (const code of testCodes) {
      const result = await DatabaseHTSService.getDutyRate(code);
      console.log(`\nTest lookup for ${code}:`);
      console.log(result);
    }
    
  } catch (error) {
    console.error('Import test failed:', error);
  }
}

testImport();