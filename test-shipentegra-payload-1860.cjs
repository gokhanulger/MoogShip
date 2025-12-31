/**
 * Test script to generate real ShipEntegra payload for shipment 1860
 * This directly queries the database to show the exact payload that would be sent
 */

const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('neon.tech') ? { rejectUnauthorized: false } : false
});

// Address formatting functions (inline)
function formatAddressForAPI(address) {
  if (!address) return '';
  return address.replace(/:/g, '.');
}

function formatCityForAPI(city) {
  if (!city) return '';
  return city.toUpperCase()
    .replace(/Ğ/g, 'G')
    .replace(/Ü/g, 'U')
    .replace(/Ş/g, 'S')
    .replace(/İ/g, 'I')
    .replace(/Ö/g, 'O')
    .replace(/Ç/g, 'C');
}

async function generateRealPayload() {
  try {
    console.log('🔍 Fetching shipment 1860 data...');
    
    // Get the shipment data
    const shipmentResult = await pool.query('SELECT * FROM shipments WHERE id = $1', [1860]);
    
    if (shipmentResult.rows.length === 0) {
      console.log('❌ Shipment 1860 not found');
      return;
    }
    
    const shipment = shipmentResult.rows[0];
    
    console.log('📦 Shipment found:', {
      id: shipment.id,
      receiver: shipment.receiver_name,
      destination: shipment.receiver_country,
      service: shipment.service_level,
      weight: shipment.package_weight,
      dimensions: `${shipment.package_length}x${shipment.package_width}x${shipment.package_height}`
    });
    
    // Get package items
    const itemsResult = await pool.query('SELECT * FROM package_items WHERE shipment_id = $1', [1860]);
    const packageItems = itemsResult.rows;
    
    console.log(`📋 Found ${packageItems.length} package items`);
    
    // Get user profile for sender data
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [shipment.user_id]);
    const userProfile = userResult.rows[0];
    
    // Calculate chargeable weight (volumetric vs actual)
    const actualWeight = shipment.package_weight || 0.5;
    const volumetricWeight = (shipment.package_length * shipment.package_width * shipment.package_height) / 5000;
    const chargeableWeight = Math.max(actualWeight, volumetricWeight);
    
    console.log('⚖️ Weight calculation:', {
      actualWeight: `${actualWeight} kg`,
      volumetricWeight: `${volumetricWeight.toFixed(2)} kg`,
      chargeableWeight: `${chargeableWeight.toFixed(2)} kg`
    });
    
    // Generate MoogShip tracking number
    const trackingNumber = `MOG${new Date().getFullYear().toString().slice(-2)}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}${String(shipment.id).padStart(6, '0')}`;
    
    // Build the real payload
    const payload = {
      number: trackingNumber,
      packageQuantity: 1,
      reference1: `SKU-${shipment.id}`,
      description: (packageItems.length > 0 ? packageItems[0].name : (shipment.package_contents || 'Package')).substring(0, 50), // Truncate to 50 characters as required by ShipEntegra API
      currency: "USD",
      weight: chargeableWeight,
      width: shipment.package_width,
      height: shipment.package_height,
      length: shipment.package_length,
      shipFrom: {
        name: userProfile?.name || shipment.sender_name,
        address: formatAddressForAPI(
          userProfile?.address || shipment.sender_address || shipment.sender_address1 || ""
        ).substring(0, 35),
        city: formatCityForAPI(userProfile?.city || shipment.sender_city || ""),
        country: "TR",
        zipCode: userProfile?.postal_code || shipment.sender_postal_code || "",
        phone: "905407447911",
        email: "info@moogship.com"
      },
      shippingAddress: {
        name: shipment.receiver_name,
        address: formatAddressForAPI(shipment.receiver_address || "").slice(0, 100),
        city: formatCityForAPI(shipment.receiver_city),
        country: shipment.receiver_country,
        state: shipment.receiver_state,
        postalCode: shipment.receiver_postal_code,
        phone: shipment.receiver_phone || "+14252987618",
        email: shipment.receiver_email || "info@moogship.com"
      },
      items: []
    };
    
    // Process items array
    if (packageItems && packageItems.length > 0) {
      console.log('🔄 Processing package items...');
      
      packageItems.forEach((item, index) => {
        // Get GTIP code from item
        const hsCodeValue = item.hs_code || item.gtin || null;
        let gtipCode = 940510; // Default
        
        if (hsCodeValue) {
          try {
            const cleanHsCode = hsCodeValue.toString().replace(/\D/g, "");
            if (cleanHsCode) {
              gtipCode = parseInt(cleanHsCode, 10);
            }
          } catch (error) {
            console.warn(`Failed to parse HS code for item ${item.id}`);
          }
        }
        
        // Validate item name (1-100 characters)
        let itemName = item.name || `Item - ${item.id}`;
        if (itemName.length < 1) {
          itemName = `Item - ${item.id}`;
        } else if (itemName.length > 100) {
          itemName = itemName.substring(0, 100);
          console.warn(`Item name truncated for item ${item.id}: "${itemName}"`);
        }
        
        console.log(`📝 Item ${index + 1}:`, {
          id: item.id,
          name: `${itemName.substring(0, 50)}${itemName.length > 50 ? '...' : ''}`,
          fullLength: itemName.length,
          quantity: item.quantity,
          price: item.price,
          gtip: gtipCode
        });
        
        payload.items.push({
          name: itemName,
          quantity: item.quantity || 1,
          unitPrice: item.price ? item.price / 100 : 50.0,
          sku: item.sku || `SKU-${shipment.id}-${item.id}`,
          gtip: gtipCode
        });
      });
    } else {
      console.log('📦 No package items found, using fallback...');
      
      // Fallback to package contents
      let itemName = shipment.package_contents || shipment.description || `Package Item - ${shipment.id}`;
      if (itemName.length > 100) {
        itemName = itemName.substring(0, 100);
        console.warn(`Package contents truncated: "${itemName}"`);
      }
      
      payload.items.push({
        name: itemName,
        quantity: shipment.customs_item_count || 1,
        unitPrice: shipment.customs_value ? shipment.customs_value / 100 : 50.0,
        sku: `SKU-${shipment.id}`,
        gtip: 940510
      });
    }
    
    console.log('\n🚀 REAL SHIPENTEGRA PAYLOAD FOR SHIPMENT 1860:');
    console.log('=====================================');
    console.log(JSON.stringify(payload, null, 2));
    
    console.log('\n📊 PAYLOAD SUMMARY:');
    console.log(`- Tracking Number: ${payload.number}`);
    console.log(`- Weight: ${payload.weight} kg`);
    console.log(`- Dimensions: ${payload.length}x${payload.width}x${payload.height} cm`);
    console.log(`- Items Count: ${payload.items.length}`);
    console.log(`- Destination: ${payload.shippingAddress.city}, ${payload.shippingAddress.country}`);
    console.log(`- Service: ${shipment.serviceLevel}`);
    
    console.log('\n🔍 ITEMS BREAKDOWN:');
    payload.items.forEach((item, index) => {
      console.log(`${index + 1}. ${item.name} (${item.name.length} chars) - $${item.unitPrice} x ${item.quantity}`);
    });
    
  } catch (error) {
    console.error('❌ Error generating payload:', error);
  } finally {
    await pool.end();
  }
}

// Run the test
generateRealPayload();