/**
 * Analyze the exact payload that would be sent for shipment MOG252159000195
 * to identify why the wrong label was received
 */

import pg from 'pg';
const { Pool } = pg;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function analyzeShipment195() {
  try {
    console.log("=== ANALYZING SHIPMENT MOG252159000195 ===\n");
    
    // Get shipment data
    const shipmentQuery = `
      SELECT 
        id, user_id, number, 
        sender_name, sender_address1, sender_city, sender_postal_code, sender_country,
        receiver_name, receiver_address, receiver_city, receiver_state, receiver_postal_code, receiver_country,
        package_contents, package_weight, package_length, package_width, package_height,
        selected_service, service_level, provider_service_code,
        customs_value, customs_item_count, gtip, ioss_number,
        status, created_at
      FROM shipments 
      WHERE number = 'MOG252159000195'
    `;
    
    const shipmentResult = await pool.query(shipmentQuery);
    
    if (shipmentResult.rows.length === 0) {
      console.log("❌ Shipment MOG252159000195 not found in database");
      return;
    }
    
    const shipment = shipmentResult.rows[0];
    console.log("📦 SHIPMENT DATA:");
    console.log("   ID:", shipment.id);
    console.log("   Number:", shipment.number);
    console.log("   User ID:", shipment.user_id);
    console.log("   Status:", shipment.status);
    console.log("   Selected Service:", shipment.selected_service);
    console.log("   Service Level:", shipment.service_level);
    console.log("   Provider Service Code:", shipment.provider_service_code);
    console.log("   Package Weight:", shipment.package_weight);
    console.log("   Package Contents:", shipment.package_contents);
    console.log("   Destination:", shipment.receiver_country);
    console.log("   GTIP:", shipment.gtip);
    console.log("   IOSS Number:", shipment.ioss_number);
    console.log("");
    
    // Get package items
    const itemsQuery = `
      SELECT 
        id, name, description, quantity, price, gtin, hs_code,
        weight, length, width, height, country_of_origin, manufacturer
      FROM package_items 
      WHERE shipment_id = $1
      ORDER BY id
    `;
    
    const itemsResult = await pool.query(itemsQuery, [shipment.id]);
    console.log("📋 PACKAGE ITEMS:");
    if (itemsResult.rows.length === 0) {
      console.log("   No package items found");
    } else {
      itemsResult.rows.forEach((item, index) => {
        console.log(`   Item ${index + 1}:`);
        console.log(`     ID: ${item.id}`);
        console.log(`     Name: ${item.name}`);
        console.log(`     Description: ${item.description}`);
        console.log(`     Quantity: ${item.quantity}`);
        console.log(`     Price: ${item.price} cents`);
        console.log(`     GTIN: ${item.gtin}`);
        console.log(`     HS Code: ${item.hs_code}`);
        console.log(`     Weight: ${item.weight}`);
        console.log(`     Dimensions: ${item.length}x${item.width}x${item.height}`);
        console.log("");
      });
    }
    
    // Simulate service detection logic
    console.log("🔍 SERVICE DETECTION ANALYSIS:");
    
    // Get service code for label (mimicking getServiceCodeForLabel function)
    let serviceType = shipment.provider_service_code || shipment.selected_service || shipment.service_level || 'shipentegra-eco';
    console.log("   Raw service detection result:", serviceType);
    
    // Detect carrier type (mimicking detectCarrierFromService function)
    let carrierType = null;
    const serviceLower = serviceType.toLowerCase();
    
    if (serviceLower.includes('ups') || serviceLower.includes('ekspress')) {
      carrierType = 'UPS';
    } else if (serviceLower.includes('dhl')) {
      carrierType = 'DHL';
    } else if (serviceLower.includes('fedex')) {
      carrierType = 'FEDEX';
    }
    
    console.log("   Detected carrier type:", carrierType || 'None (will use ECO system)');
    
    // Determine routing
    const willUseCarrierSpecific = carrierType === 'UPS' || carrierType === 'DHL' || carrierType === 'FEDEX';
    console.log("   Will use carrier-specific endpoint:", willUseCarrierSpecific);
    console.log("   Will use ECO endpoint:", !willUseCarrierSpecific);
    
    // Build the payload that would be sent
    console.log("\n🚀 PAYLOAD THAT WOULD BE SENT:");
    
    // Generate order ID (mimicking the system)
    const orderId = Date.now();
    
    // Build items array
    const itemsArray = [];
    
    if (itemsResult.rows.length > 0) {
      for (const item of itemsResult.rows) {
        // GTIP code logic
        let gtipCode = shipment.gtip || null;
        
        if (!gtipCode) {
          const hsCodeValue = item.hs_code || item.gtin || null;
          gtipCode = "9405100000"; // Default
          
          if (hsCodeValue) {
            const cleanHsCode = hsCodeValue.toString().replace(/\D/g, '');
            if (cleanHsCode && cleanHsCode.length >= 6 && cleanHsCode.length <= 15) {
              gtipCode = cleanHsCode;
            } else if (cleanHsCode) {
              gtipCode = cleanHsCode.padEnd(10, '0').substring(0, 15);
            }
          }
        }
        
        itemsArray.push({
          itemId: Number(item.id),
          declaredPrice: Number((item.price ? item.price / 100 : 50.0).toFixed(2)),
          declaredQuantity: Number(item.quantity || 1),
          gtip: Number(gtipCode),
        });
      }
    } else {
      // Fallback item
      itemsArray.push({
        itemId: Number(shipment.id),
        declaredPrice: Number((shipment.customs_value ? shipment.customs_value / 100 : 50.0).toFixed(2)),
        declaredQuantity: Number(shipment.customs_item_count || 1),
        gtip: Number("9405100000"),
      });
    }
    
    // Service mapping (simulated)
    const SERVICE_MAPPING = {
      'shipentegra-eco': {
        url: 'https://publicapi.shipentegra.com/v1/logistics/labels/shipentegra',
        specialService: 'shipentegra-eco',
        displayName: 'MoogShip Eco'
      },
      'shipentegra-ups-ekspress': {
        url: 'https://publicapi.shipentegra.com/v1/logistics/labels/ups',
        specialService: 'express',
        displayName: 'MoogShip UPS Express'
      }
    };
    
    const serviceConfig = SERVICE_MAPPING[serviceType] || SERVICE_MAPPING['shipentegra-eco'];
    
    // Build final payload
    const labelPayload = {
      orderId: Number(orderId),
      specialService: serviceConfig.specialService,
      content: shipment.package_contents || `Package - ${shipment.id}`,
      weight: Number((shipment.package_weight || 1).toFixed(2)),
      currency: "USD",
      items: itemsArray
    };
    
    // Add IOSS if applicable
    const destinationCountry = shipment.receiver_country;
    const euCountries = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES'];
    const hmrcCountries = ['GB', 'SE'];
    
    function getCountryCode(country) {
      if (!country) return '';
      if (country.length === 2) return country.toUpperCase();
      
      const countryMap = {
        'United States': 'US',
        'Germany': 'DE',
        'United Kingdom': 'GB',
        'France': 'FR',
        'Italy': 'IT',
        'Spain': 'ES',
        'Netherlands': 'NL',
        'Turkey': 'TR'
      };
      
      return countryMap[country] || country.substring(0, 2).toUpperCase();
    }
    
    const countryCode = getCountryCode(destinationCountry);
    const isEU = euCountries.includes(countryCode);
    const isHMRC = hmrcCountries.includes(countryCode);
    
    if ((isEU && !isHMRC && shipment.ioss_number) || (isHMRC && shipment.ioss_number)) {
      labelPayload.iossNumber = shipment.ioss_number;
      console.log("   IOSS/HMRC number will be added:", shipment.ioss_number);
    }
    
    console.log("\n📋 COMPLETE PAYLOAD:");
    console.log("   API Endpoint:", serviceConfig.url);
    console.log("   HTTP Method: POST");
    console.log("   Headers: Authorization: Bearer [ACCESS_TOKEN]");
    console.log("   Payload:", JSON.stringify(labelPayload, null, 2));
    
    console.log("\n🎯 ANALYSIS SUMMARY:");
    console.log("   - Service Type:", serviceType);
    console.log("   - Carrier Detection:", carrierType || 'ECO');
    console.log("   - API Endpoint:", serviceConfig.url);
    console.log("   - Special Service:", serviceConfig.specialService);
    console.log("   - Package Items:", itemsArray.length);
    console.log("   - Total Weight:", labelPayload.weight + " kg");
    console.log("   - Destination Country:", destinationCountry, "(" + countryCode + ")");
    console.log("   - IOSS Required:", (isEU && !isHMRC) || isHMRC);
    console.log("   - IOSS Provided:", !!shipment.ioss_number);
    
    // Check for potential issues
    console.log("\n⚠️ POTENTIAL ISSUES:");
    
    if (!shipment.package_contents || shipment.package_contents.trim() === '') {
      console.log("   - Missing package contents description");
    }
    
    if (!shipment.package_weight || shipment.package_weight <= 0) {
      console.log("   - Invalid package weight");
    }
    
    if (itemsArray.length === 0) {
      console.log("   - No package items found");
    }
    
    if ((isEU && !isHMRC) && !shipment.ioss_number) {
      console.log("   - EU destination but no IOSS number provided");
    }
    
    if (serviceType === 'shipentegra-eco' && carrierType) {
      console.log("   - Service suggests carrier-specific but routing to ECO");
    }
    
    console.log("\n=== ANALYSIS COMPLETE ===");
    
  } catch (error) {
    console.error("Error analyzing shipment:", error);
  } finally {
    await pool.end();
  }
}

// Run the analysis
analyzeShipment195().catch(console.error);