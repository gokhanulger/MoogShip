/**
 * Migration script to normalize all existing country data in shipments table
 * Converts inconsistent country names/codes to standardized ISO codes
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Create database connection
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const sql = postgres(connectionString);
const db = drizzle(sql);

// Country normalization function
function normalizeCountryCode(input) {
  if (!input || typeof input !== 'string') {
    return 'US';
  }

  const trimmed = input.trim();
  
  // Valid 2-letter codes
  const validCodes = [
    "US", "CA", "AU", "BR", "IN", "MX", "GB", "DE", "FR", "IT", "ES", "JP", "CN", "RU", "KR",
    "NL", "BE", "CH", "AT", "SE", "NO", "DK", "FI", "IE", "PT", "GR", "PL", "CZ", "HU", "RO",
    "BG", "HR", "RS", "UA", "TR", "BH", "AE", "SA", "IL", "EG", "ZA", "NG", "KE", "SG", "MY",
    "TH", "ID", "PH", "VN", "NZ", "AR", "CL", "CO", "PE", "VE"
  ];
  
  if (trimmed.length === 2) {
    const upperCode = trimmed.toUpperCase();
    if (validCodes.includes(upperCode)) {
      return upperCode;
    }
  }
  
  // Name to code mapping
  const nameToCodeMap = {
    "United States": "US", "USA": "US", "United States of America": "US", "US": "US",
    "United Kingdom": "GB", "UK": "GB", "Great Britain": "GB", "GB": "GB",
    "Germany": "DE", "France": "FR", "Italy": "IT", "Spain": "ES",
    "Netherlands": "NL", "The Netherlands": "NL", "Japan": "JP", "China": "CN",
    "Canada": "CA", "Australia": "AU", "Brazil": "BR", "Mexico": "MX",
    "India": "IN", "Russia": "RU", "South Korea": "KR", "Belgium": "BE",
    "Switzerland": "CH", "Austria": "AT", "Sweden": "SE", "Norway": "NO",
    "Denmark": "DK", "Finland": "FI", "Ireland": "IE", "Portugal": "PT",
    "Greece": "GR", "Poland": "PL", "Czech Republic": "CZ", "Hungary": "HU",
    "Romania": "RO", "Bulgaria": "BG", "Croatia": "HR", "Serbia": "RS",
    "Ukraine": "UA", "Turkey": "TR", "Bahrain": "BH",
    "United Arab Emirates": "AE", "UAE": "AE", "Saudi Arabia": "SA",
    "Israel": "IL", "Egypt": "EG", "South Africa": "ZA", "Nigeria": "NG",
    "Kenya": "KE", "Singapore": "SG", "Malaysia": "MY", "Thailand": "TH",
    "Indonesia": "ID", "Philippines": "PH", "Vietnam": "VN", "New Zealand": "NZ",
    "Argentina": "AR", "Chile": "CL", "Colombia": "CO", "Peru": "PE", "Venezuela": "VE"
  };
  
  const code = nameToCodeMap[trimmed];
  if (code) {
    return code;
  }
  
  // Case-insensitive fallback
  const lowerInput = trimmed.toLowerCase();
  for (const [name, code] of Object.entries(nameToCodeMap)) {
    if (name.toLowerCase() === lowerInput) {
      return code;
    }
  }
  
  return 'US';
}

// State normalization function
function normalizeStateCode(countryCode, state) {
  if (!state || state.trim() === '') {
    // Countries with states get defaults, others get empty
    const countriesWithStates = {
      'US': 'NY',
      'CA': 'ON',
      'AU': 'NSW',
      'BR': 'SP',
      'IN': 'DL',
      'MX': 'CMX'
    };
    return countriesWithStates[countryCode] || '';
  }
  
  const trimmed = state.trim();
  const countriesWithStates = ['US', 'CA', 'AU', 'BR', 'IN', 'MX'];
  
  if (!countriesWithStates.includes(countryCode)) {
    return '';
  }
  
  return trimmed;
}

async function normalizeShipmentCountries() {
  console.log("Starting country normalization migration...");
  
  try {
    // Get all shipments with their current country/state data
    const result = await sql`
      SELECT id, receiver_country, receiver_state 
      FROM shipments 
      ORDER BY id
    `;
    
    console.log(`Found ${result.length} shipments to normalize`);
    
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const shipment of result) {
      try {
        // Normalize the country code
        const normalizedCountry = normalizeCountryCode(shipment.receiver_country);
        
        // Normalize the state code based on the normalized country
        const normalizedState = normalizeStateCode(normalizedCountry, shipment.receiver_state);
        
        // Check if normalization changed anything
        const countryChanged = shipment.receiver_country !== normalizedCountry;
        const stateChanged = (shipment.receiver_state || '') !== normalizedState;
        
        if (countryChanged || stateChanged) {
          console.log(`Normalizing shipment ${shipment.id}:`);
          console.log(`  Country: "${shipment.receiver_country}" → "${normalizedCountry}"`);
          console.log(`  State: "${shipment.receiver_state || '(empty)'}" → "${normalizedState || '(empty)'}"`);
          
          // Update the database
          await sql`
            UPDATE shipments 
            SET receiver_country = ${normalizedCountry},
                receiver_state = ${normalizedState || null}
            WHERE id = ${shipment.id}
          `;
          
          updatedCount++;
        }
      } catch (error) {
        console.error(`Error normalizing shipment ${shipment.id}:`, error);
        errorCount++;
      }
    }
    
    console.log("Country normalization migration completed:");
    console.log(`  - Total shipments: ${result.length}`);
    console.log(`  - Updated: ${updatedCount}`);
    console.log(`  - Unchanged: ${result.length - updatedCount - errorCount}`);
    console.log(`  - Errors: ${errorCount}`);
    
    // Show final country distribution
    const finalResult = await sql`
      SELECT receiver_country, COUNT(*) as count 
      FROM shipments 
      GROUP BY receiver_country 
      ORDER BY count DESC
    `;
    
    console.log("\nFinal country distribution:");
    finalResult.forEach(row => {
      console.log(`  ${row.receiver_country}: ${row.count} shipments`);
    });
    
    return {
      success: true,
      total: result.length,
      updated: updatedCount,
      errors: errorCount
    };
    
  } catch (error) {
    console.error("Migration failed:", error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    await sql.end();
  }
}

// Run migration
normalizeShipmentCountries()
  .then(result => {
    console.log("Migration result:", result);
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error("Migration error:", error);
    process.exit(1);
  });